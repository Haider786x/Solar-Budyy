import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { streamAIChatMessage, sendAIChatMessage } from "../../services/api";
import {
	Bot,
	X,
	Send,
	Trash2,
	RefreshCw,
	ChevronDown,
	Sparkles,
	CheckCircle2,
	AlertTriangle,
	Wrench,
	Cpu,
	BookOpen,
	ShieldCheck,
	Maximize2,
	Minimize2,
	ArrowUpRight
} from "lucide-react";

const SUGGESTED_QUESTIONS = [
	"How much energy have I generated today?",
	"Why is my generation lower than expected?",
	"Explain my current performance alerts.",
	"What is inverter clipping?",
	"What are the technical specs of my solar installation?",
	"Compare today's actual and expected generation."
];

/**
 * Render lightweight formatted markdown without external bloat
 */
function FormattedMessage({ text = "" }) {
	if (!text) return null;

	const lines = text.split("\n");
	const elements = [];
	let tableRows = [];
	let inTable = false;

	const flushTable = (key) => {
		if (tableRows.length > 0) {
			const headers = tableRows[0];
			const dataRows = tableRows.slice(2); // Skip separator row
			elements.push(
				<div key={`table-${key}`} className="my-2 overflow-x-auto rounded border border-slate-200">
					<table className="w-full text-[11px] text-left border-collapse">
						<thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
							<tr>
								{headers.map((h, i) => (
									<th key={i} className="px-2.5 py-1.5 border-r border-slate-200 last:border-r-0">
										{h.trim()}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 bg-white">
							{dataRows.map((row, rIdx) => (
								<tr key={rIdx} className="hover:bg-slate-50/80">
									{row.map((cell, cIdx) => (
										<td key={cIdx} className="px-2.5 py-1 border-r border-slate-100 last:border-r-0 font-medium text-slate-800">
											{cell.trim()}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			);
			tableRows = [];
			inTable = false;
		}
	};

	lines.forEach((rawLine, idx) => {
		const line = rawLine.trim();

		// Table row detection
		if (line.startsWith("|") && line.endsWith("|")) {
			inTable = true;
			const cells = line.split("|").slice(1, -1);
			tableRows.push(cells);
			return;
		} else if (inTable) {
			flushTable(idx);
		}

		// Heading 3
		if (line.startsWith("### ")) {
			elements.push(
				<h4 key={idx} className="text-xs font-bold text-slate-900 mt-2 mb-1 flex items-center gap-1.5">
					<span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
					{line.replace("### ", "")}
				</h4>
			);
			return;
		}

		// Blockquote / Alerts
		if (line.startsWith("> [!NOTE]")) {
			elements.push(
				<div key={idx} className="bg-blue-50/70 border-l-2 border-blue-500 px-2.5 py-1 text-[11px] text-blue-900 rounded-r my-1 font-medium">
					System Notice:
				</div>
			);
			return;
		}
		if (line.startsWith("> ")) {
			elements.push(
				<blockquote key={idx} className="bg-slate-100/80 border-l-2 border-slate-400 px-2.5 py-1 text-[11px] text-slate-700 italic my-1">
					{line.replace("> ", "")}
				</blockquote>
			);
			return;
		}

		// Bullet point
		if (line.startsWith("- ") || line.startsWith("* ")) {
			const bulletContent = line.replace(/^[-*]\s+/, "");
			elements.push(
				<li key={idx} className="ml-3 list-disc text-slate-700 text-[11px] leading-relaxed">
					<InlineFormatted text={bulletContent} />
				</li>
			);
			return;
		}

		// Empty line spacer
		if (!line) {
			elements.push(<div key={idx} className="h-1.5" />);
			return;
		}

		// Standard paragraph
		elements.push(
			<p key={idx} className="text-slate-800 leading-relaxed text-[11px]">
				<InlineFormatted text={line} />
			</p>
		);
	});

	if (inTable) {
		flushTable("end");
	}

	return <div className="space-y-1">{elements}</div>;
}

function InlineFormatted({ text = "" }) {
	// Parse bold **text** and code `text`
	const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
	return (
		<>
			{parts.map((part, i) => {
				if (part.startsWith("**") && part.endsWith("**")) {
					return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
				}
				if (part.startsWith("`") && part.endsWith("`")) {
					return <code key={i} className="bg-slate-200/70 text-slate-800 px-1 py-0.2 rounded font-mono text-[10px]">{part.slice(1, -1)}</code>;
				}
				return part;
			})}
		</>
	);
}

export default function SolarBuddyAIChatWidget() {
	const { user, selectedSite, selectedSiteId } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [activeTool, setActiveTool] = useState(null);
	const [error, setError] = useState("");

	const storageKey = `solarbuddy_ai_chat_${user?.id || "guest"}`;

	const initialWelcomeMessage = {
		id: "welcome-msg",
		role: "assistant",
		content: `### Welcome to SolarBuddy AI Operations\n\nI am your **Solar Energy Operations Specialist** directly integrated into **${selectedSite?.shortName || selectedSite?.name || "Haider Rooftop Solar Array"}**.\n\nI can analyze real-time inverter telemetry, compute expected vs. actual yield variances, inspect SOIC operational alerts, and answer technical photovoltaic engineering questions.\n\nAsk a question below or choose a suggested topic to get started!`,
		metadata: {
			provider: "local_operations_engine",
			isLocalFallback: true,
			siteName: selectedSite?.name || "Haider Rooftop Solar Array",
			toolExecutionSteps: []
		}
	};

	const [messages, setMessages] = useState(() => {
		try {
			const saved = localStorage.getItem(storageKey);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			}
		} catch (e) {}
		return [initialWelcomeMessage];
	});

	const messagesEndRef = useRef(null);

	// Persist messages per authenticated user
	useEffect(() => {
		try {
			localStorage.setItem(storageKey, JSON.stringify(messages));
		} catch (e) {}
	}, [messages, storageKey]);

	// Auto scroll to bottom
	useEffect(() => {
		if (isOpen) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages, isOpen, activeTool]);

	const handleSend = async (queryText) => {
		const textToSend = (typeof queryText === "string" ? queryText : input).trim();
		if (!textToSend || loading) return;

		setInput("");
		setError("");
		setActiveTool(null);

		const userMsg = {
			id: `user-${Date.now()}`,
			role: "user",
			content: textToSend,
			timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
		};

		const assistantMsgId = `assistant-${Date.now()}`;
		const placeholderAssistantMsg = {
			id: assistantMsgId,
			role: "assistant",
			content: "",
			metadata: {
				provider: "local_operations_engine",
				toolExecutionSteps: []
			}
		};

		const updatedConversation = [...messages, userMsg];
		setMessages([...updatedConversation, placeholderAssistantMsg]);
		setLoading(true);

		// Format request messages history (role + content only)
		const apiMessages = updatedConversation
			.filter((m) => m.role === "user" || m.role === "assistant")
			.map((m) => ({ role: m.role, content: m.content }));

		try {
			let accumulatedContent = "";

			await streamAIChatMessage({
				messages: apiMessages,
				siteId: selectedSiteId,
				onToolCall: (toolName) => {
					setActiveTool(toolName);
				},
				onDelta: (deltaChunk) => {
					accumulatedContent += deltaChunk;
					setMessages((prev) =>
						prev.map((msg) =>
							msg.id === assistantMsgId ? { ...msg, content: accumulatedContent } : msg
						)
					);
				},
				onDone: (metadata) => {
					setActiveTool(null);
					setLoading(false);
					setMessages((prev) =>
						prev.map((msg) =>
							msg.id === assistantMsgId ? { ...msg, metadata } : msg
						)
					);
				},
				onError: (streamErr) => {
					throw streamErr;
				}
			});
		} catch (err) {
			// Fallback to standard non-streaming POST if stream fails
			try {
				const fallbackRes = await sendAIChatMessage({
					messages: apiMessages,
					siteId: selectedSiteId
				});

				setMessages((prev) =>
					prev.map((msg) =>
						msg.id === assistantMsgId
							? {
									...msg,
									content: fallbackRes.message.content,
									metadata: fallbackRes.metadata
							  }
							: msg
					)
				);
			} catch (fallbackErr) {
				setError(fallbackErr.message || "Failed to receive response from SolarBuddy AI.");
				setMessages((prev) => prev.filter((msg) => msg.id !== assistantMsgId));
			} finally {
				setLoading(false);
				setActiveTool(null);
			}
		}
	};

	const handleClearConversation = () => {
		if (window.confirm("Clear current conversation history with SolarBuddy AI?")) {
			setMessages([initialWelcomeMessage]);
			setError("");
			localStorage.removeItem(storageKey);
		}
	};

	const getToolLabel = (toolName) => {
		switch (toolName) {
			case "fetchSolarTelemetry":
				return "Polling real-time inverter telemetry...";
			case "fetchSolarPerformance":
				return "Analyzing expected vs. actual performance...";
			case "fetchSolarAlerts":
				return "Reviewing SOIC operational alerts...";
			case "fetchSolarWeatherContext":
				return "Retrieving atmospheric irradiance & GTI context...";
			case "fetchSolarInstallation":
				return "Querying physical module & inverter parameters...";
			case "fetchHistoricalGeneration":
				return "Loading verified historical daily yields...";
			default:
				return `Executing ${toolName}...`;
		}
	};

	return (
		<>
			{/* Collapsible Floating Action Button */}
			<div className="fixed bottom-6 right-6 z-50 select-none">
				{!isOpen && (
					<button
						type="button"
						onClick={() => setIsOpen(true)}
						className="group flex items-center gap-2.5 bg-[#0B1528] hover:bg-[#1E293B] text-white border border-slate-700/80 shadow-2xl rounded-full px-4 py-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
						title="Open SolarBuddy AI Operations Specialist"
					>
						<div className="relative flex items-center justify-center">
							<Bot className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
							<span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
						</div>
						<div className="flex flex-col text-left">
							<span className="text-xs font-bold tracking-tight text-white flex items-center gap-1">
								SolarBuddy AI
								<Sparkles className="w-3 h-3 text-amber-400" />
							</span>
							<span className="text-[10px] text-slate-400 leading-tight">
								Operations Specialist
							</span>
						</div>
					</button>
				)}
			</div>

			{/* Main Expandable AI Chat Panel */}
			{isOpen && (
				<div
					className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white border border-slate-300/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-4 ${
						isExpanded
							? "w-[620px] h-[720px] max-w-[95vw] max-h-[90vh]"
							: "w-[410px] h-[580px] max-w-[92vw] max-h-[82vh]"
					}`}
				>
					{/* Header matching SolarBuddy dark navy theme */}
					<div className="bg-[#0B1528] text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
						<div className="flex items-center gap-2.5">
							<div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
								<Bot className="w-4 h-4" />
							</div>
							<div>
								<div className="flex items-center gap-1.5">
									<h3 className="text-xs font-bold text-white tracking-tight">SolarBuddy AI</h3>
									<span className="text-[9px] bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded font-semibold border border-blue-700/50">
										RAG + Tools
									</span>
								</div>
								<div className="flex items-center gap-1.5 text-[10px] text-slate-400">
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
									<span className="truncate max-w-[170px]">
										{selectedSite?.shortName || selectedSite?.name || "Haider Rooftop"}
									</span>
								</div>
							</div>
						</div>

						{/* Top Controls */}
						<div className="flex items-center gap-1 text-slate-400">
							<button
								type="button"
								onClick={handleClearConversation}
								className="p-1.5 rounded hover:text-white hover:bg-slate-800 transition-colors"
								title="Clear conversation history"
							>
								<Trash2 className="w-3.5 h-3.5" />
							</button>
							<button
								type="button"
								onClick={() => setIsExpanded(!isExpanded)}
								className="p-1.5 rounded hover:text-white hover:bg-slate-800 transition-colors hidden sm:block"
								title={isExpanded ? "Collapse panel" : "Expand panel"}
							>
								{isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
							</button>
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								className="p-1.5 rounded hover:text-white hover:bg-slate-800 transition-colors"
								title="Minimize chat"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* Message Feed */}
					<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
						{messages.map((msg) => {
							const isUser = msg.role === "user";
							return (
								<div
									key={msg.id}
									className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
								>
									<div
										className={`p-3 rounded-xl text-xs max-w-[92%] transition-all ${
											isUser
												? "bg-[#2563EB] text-white rounded-tr-xs shadow-xs"
												: "bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs space-y-2"
										}`}
									>
										{isUser ? (
											<span className="font-normal text-[11px] whitespace-pre-wrap">{msg.content}</span>
										) : (
											<>
												<FormattedMessage text={msg.content} />

												{/* Engine & Tool Badges Footer */}
												{msg.metadata && (
													<div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 select-none">
														<span className="flex items-center gap-1 font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
															<Cpu className="w-2.5 h-2.5 text-blue-600" />
															{msg.metadata.isLocalFallback ? "Local Operations Engine" : (msg.metadata.model || "Gemini AI")}
														</span>

														{msg.metadata.toolExecutionSteps?.map((s, idx) => (
															<span key={idx} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-mono">
																<Wrench className="w-2.5 h-2.5" />
																{s.tool}
															</span>
														))}

														{msg.metadata.retrievedKnowledgePassages?.map((p, idx) => (
															<span key={idx} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
																<BookOpen className="w-2.5 h-2.5" />
																{p.title}
															</span>
														))}
													</div>
												)}
											</>
										)}
									</div>
								</div>
							);
						})}

						{/* Live Tool Calling Activity Indicator */}
						{activeTool && (
							<div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[11px] animate-pulse">
								<Wrench className="w-3.5 h-3.5 animate-spin" />
								<span>{getToolLabel(activeTool)}</span>
							</div>
						)}

						{loading && !activeTool && (
							<div className="flex items-center gap-2 text-slate-400 text-[11px] p-2">
								<RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
								<span>Synthesizing verified solar operations briefing...</span>
							</div>
						)}

						{error && (
							<div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
								<div className="flex items-center gap-2">
									<AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
									<span>{error}</span>
								</div>
								<button
									type="button"
									onClick={() => handleSend(messages[messages.length - 1]?.content)}
									className="text-[11px] font-bold text-rose-800 underline hover:no-underline"
								>
									Retry
								</button>
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>

					{/* Suggested Questions Strip */}
					<div className="px-3 py-2 bg-slate-50 border-t border-slate-200 shrink-0 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
						{SUGGESTED_QUESTIONS.map((q, i) => (
							<button
								key={i}
								type="button"
								disabled={loading}
								onClick={() => handleSend(q)}
								className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 text-[10px] font-medium transition-all shrink-0 flex items-center gap-1 shadow-2xs disabled:opacity-50"
							>
								<span>{q}</span>
								<ArrowUpRight className="w-2.5 h-2.5 text-slate-400" />
							</button>
						))}
					</div>

					{/* Input & Action Bar */}
					<div className="p-3 bg-white border-t border-slate-200 shrink-0">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								handleSend();
							}}
							className="flex items-center gap-2"
						>
							<input
								type="text"
								value={input}
								onChange={(e) => setInput(e.target.value)}
								placeholder="Ask about generation, alerts, clipping, weather..."
								disabled={loading}
								className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-sans disabled:opacity-60"
							/>
							<button
								type="submit"
								disabled={!input.trim() || loading}
								className="bg-[#2563EB] hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-lg p-2 transition-colors shrink-0 shadow-2xs"
								title="Send question"
							>
								{loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
							</button>
						</form>
						<div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400 px-1">
							<span>Grounds answers in live telemetry &amp; physics models</span>
							<span>Shift+Enter for newline</span>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
