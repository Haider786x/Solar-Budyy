import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDemo } from "../../context/DemoContext";
import { streamAIChatMessage, sendAIChatMessage } from "../../services/api";
import {
	BookOpen,
	X,
	Send,
	Trash2,
	RefreshCw,
	ChevronDown,
	AlertTriangle,
	Maximize2,
	Minimize2,
	Copy,
	Check,
	ChevronRight,
	Sun,
	Zap,
	Activity
} from "lucide-react";

// ─── Solis brand colours (match SolarBuddy dashboard tokens) ─────────────────
// accent-green : #16A34A  (solar-green, healthy)
// accent-amber : #D97706  (solar-amber, warnings)
// navy         : #0F172A  (nav background)
// blue         : #2563EB  (primary actions)

// ─── Suggested solar questions ────────────────────────────────────────────────
const SUGGESTED_QUESTIONS = [
	"How much energy have I generated today?",
	"Why is my generation lower than expected?",
	"Compare expected vs actual generation.",
	"Is my inverter communicating correctly?",
	"Do I have any active alerts?",
	"How has my installation performed this week?",
	"What is affecting my solar production?",
	"Explain my installation's performance ratio."
];

// ─── Contextual loading messages ─────────────────────────────────────────────
const TOOL_LABELS = {
	fetchSolarTelemetry:      "Checking your installation…",
	fetchSolarPerformance:    "Reviewing generation data…",
	fetchSolarAlerts:         "Checking operational alerts…",
	fetchSolarWeatherContext: "Reading weather conditions…",
	fetchSolarInstallation:   "Loading installation details…",
	fetchHistoricalGeneration:"Reviewing historical data…"
};

// ─── Inline markdown formatter ────────────────────────────────────────────────
function InlineFormatted({ text = "" }) {
	const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
	return (
		<>
			{parts.map((part, i) => {
				if (part.startsWith("**") && part.endsWith("**")) {
					return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
				}
				if (part.startsWith("`") && part.endsWith("`")) {
					return (
						<code key={i} className="bg-slate-100 text-slate-800 px-1 rounded font-mono text-[11px]">
							{part.slice(1, -1)}
						</code>
					);
				}
				return part;
			})}
		</>
	);
}

function FormattedMessage({ text = "" }) {
	if (!text) return null;
	const lines = text.split("\n");
	const elements = [];
	let tableRows = [];
	let inTable = false;

	const flushTable = (key) => {
		if (tableRows.length > 0) {
			const headers = tableRows[0];
			const dataRows = tableRows.slice(2);
			elements.push(
				<div key={`table-${key}`} className="my-2 overflow-x-auto rounded-lg border border-slate-200">
					<table className="w-full text-xs text-left border-collapse">
						<thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
							<tr>
								{headers.map((h, i) => (
									<th key={i} className="px-3 py-2 border-r border-slate-200 last:border-r-0">{h.trim()}</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 bg-white">
							{dataRows.map((row, rIdx) => (
								<tr key={rIdx} className="hover:bg-slate-50/80">
									{row.map((cell, cIdx) => (
										<td key={cIdx} className="px-3 py-1.5 border-r border-slate-100 last:border-r-0 text-slate-800 font-mono text-[11px]">{cell.trim()}</td>
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

		if (line.startsWith("|") && line.endsWith("|")) {
			inTable = true;
			tableRows.push(line.split("|").slice(1, -1));
			return;
		} else if (inTable) {
			flushTable(idx);
		}

		if (line.startsWith("> [!NOTE]")) {
			elements.push(
				<div key={idx} className="bg-blue-50 border-l-2 border-blue-400 px-3 py-1.5 text-xs text-blue-800 rounded-r my-1.5">
					Source note
				</div>
			);
			return;
		}
		if (line.startsWith("> ")) {
			elements.push(
				<blockquote key={idx} className="bg-slate-50 border-l-2 border-slate-300 px-3 py-1 text-xs text-slate-600 italic my-1">
					{line.replace("> ", "")}
				</blockquote>
			);
			return;
		}

		if (line.startsWith("### ")) {
			elements.push(
				<h4 key={idx} className="text-xs font-bold text-slate-800 mt-3 mb-1.5">
					{line.replace("### ", "")}
				</h4>
			);
			return;
		}
		if (line.startsWith("## ")) {
			elements.push(
				<h3 key={idx} className="text-sm font-bold text-slate-900 mt-3 mb-1.5">
					{line.replace("## ", "")}
				</h3>
			);
			return;
		}

		if (line.startsWith("- ") || line.startsWith("* ")) {
			const content = line.replace(/^[-*]\s+/, "");
			elements.push(
				<li key={idx} className="ml-4 list-disc text-slate-700 text-xs leading-relaxed my-0.5">
					<InlineFormatted text={content} />
				</li>
			);
			return;
		}

		if (!line) {
			elements.push(<div key={idx} className="h-1.5" />);
			return;
		}

		elements.push(
			<p key={idx} className="text-slate-700 leading-relaxed text-xs">
				<InlineFormatted text={line} />
			</p>
		);
	});

	if (inTable) flushTable("end");
	return <div className="space-y-0.5">{elements}</div>;
}

// ─── Copy button for assistant messages ──────────────────────────────────────
function CopyButton({ text }) {
	const [copied, setCopied] = useState(false);
	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {}
	};
	return (
		<button
			type="button"
			onClick={handleCopy}
			className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
			title="Copy response"
		>
			{copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
		</button>
	);
}

// ─── Collapsible source / evidence detail ────────────────────────────────────
function SourceDetail({ toolExecutionSteps = [], retrievedKnowledgePassages = [] }) {
	const [open, setOpen] = useState(false);
	if (!toolExecutionSteps.length && !retrievedKnowledgePassages.length) return null;
	return (
		<div className="mt-1.5">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
			>
				<ChevronRight className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} />
				How I got this
			</button>
			{open && (
				<div className="mt-1.5 pl-3 border-l border-slate-200 space-y-1">
					{toolExecutionSteps.map((s, i) => (
						<div key={i} className="text-[10px] text-slate-500 font-mono">
							{TOOL_LABELS[s.tool] || s.tool}
						</div>
					))}
					{retrievedKnowledgePassages.map((p, i) => (
						<div key={i} className="text-[10px] text-slate-500">
							<span className="flex items-center gap-1"><BookOpen className="w-2.5 h-2.5 text-blue-500" />{p.title}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Context panel shown in the welcome screen ───────────────────────────────
function SiteContextPanel({ site, isDemoActive, demoTelemetry }) {
	if (!site) return null;
	const capacity = site.systemCapacity || "—";
	const status = site.status || "Active";
	const isSimulated = isDemoActive || !site.inverterSerialNumber || site.inverterSerialNumber === "PENDING_INVERTER_ID";
	const currentKw = isDemoActive ? demoTelemetry?.currentPowerKw : null;

	return (
		<div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-200">
			<div className="px-3 py-2 flex items-center justify-between">
				<div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
					<Sun className="w-3.5 h-3.5 text-amber-500" />
					<span className="truncate max-w-[160px]">{site.shortName || site.name}</span>
				</div>
				<span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
					status === "System Outage"
						? "bg-red-100 text-red-700"
						: "bg-green-100 text-green-700"
				}`}>
					{status === "System Outage" ? "Outage" : "Active"}
				</span>
			</div>
			<div className="px-3 py-2 flex items-center justify-between text-[11px] text-slate-600">
				<span className="flex items-center gap-1">
					<Zap className="w-3 h-3 text-blue-500" />
					{capacity} kWp rated
				</span>
				{isSimulated ? (
					<span className="text-amber-600 font-medium">Demo mode</span>
				) : (
					<span className="text-green-600 font-medium">Live telemetry</span>
				)}
			</div>
			{isDemoActive && currentKw != null && (
				<div className="px-3 py-2 flex items-center justify-between text-[11px] text-slate-600">
					<span className="flex items-center gap-1">
						<Activity className="w-3 h-3 text-green-600" />
						Now
					</span>
					<span className="font-mono font-semibold text-slate-800">{currentKw} kW</span>
				</div>
			)}
		</div>
	);
}

// ─── Solis floating launcher icon (uses the logo mark) ───────────────────────
function SolisLauncherIcon() {
	return (
		<div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-green-500/40 bg-[#0F172A] flex items-center justify-center shrink-0">
			<img
				src="/solis-logo.png"
				alt="Solis"
				className="w-7 h-7 object-contain"
				draggable={false}
			/>
		</div>
	);
}

// ─── Main widget ─────────────────────────────────────────────────────────────
export default function SolarBuddyAIChatWidget() {
	const { user, selectedSite, selectedSiteId } = useAuth();
	const { isDemoActive, demoTelemetry } = useDemo();

	const [isOpen, setIsOpen]         = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [input, setInput]           = useState("");
	const [loading, setLoading]       = useState(false);
	const [activeTool, setActiveTool] = useState(null);
	const [error, setError]           = useState("");
	const [showClearConfirm, setShowClearConfirm] = useState(false);

	const storageKey = `solis_chat_${user?.id || "guest"}`;

	// Welcome message — never hardcodes site metrics, just introduces Solis
	const makeWelcomeMessage = useCallback(() => ({
		id: "welcome-msg",
		role: "assistant",
		content: `Hey! I'm **Solis**.\n\nI help you understand your solar generation, investigate performance issues, monitor installation health and make sense of your energy data.\n\nWhat would you like to explore?`,
		metadata: {
			provider: "local_operations_engine",
			isLocalFallback: true,
			toolExecutionSteps: [],
			retrievedKnowledgePassages: []
		}
	}), []);

	const [messages, setMessages] = useState(() => {
		try {
			const saved = localStorage.getItem(storageKey);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			}
		} catch {}
		return [makeWelcomeMessage()];
	});

	const messagesEndRef = useRef(null);
	const inputRef       = useRef(null);
	const lastUserMsgRef = useRef("");

	// Only show suggestions when chat only has the welcome message
	const isWelcomeOnly = messages.length === 1 && messages[0]?.id === "welcome-msg";

	// Persist messages
	useEffect(() => {
		try { localStorage.setItem(storageKey, JSON.stringify(messages)); }
		catch {}
	}, [messages, storageKey]);

	// Auto-scroll
	useEffect(() => {
		if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isOpen, activeTool]);

	// Focus input when panel opens
	useEffect(() => {
		if (isOpen) setTimeout(() => inputRef.current?.focus(), 120);
	}, [isOpen]);

	const handleSend = async (queryText) => {
		const textToSend = (typeof queryText === "string" ? queryText : input).trim();
		if (!textToSend || loading) return;

		lastUserMsgRef.current = textToSend;
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
			metadata: { provider: "local_operations_engine", toolExecutionSteps: [] }
		};

		const updatedConversation = [...messages, userMsg];
		setMessages([...updatedConversation, placeholderAssistantMsg]);
		setLoading(true);

		const apiMessages = updatedConversation
			.filter((m) => m.role === "user" || m.role === "assistant")
			.map((m) => ({ role: m.role, content: m.content }));

		try {
			let accumulatedContent = "";
			await streamAIChatMessage({
				messages: apiMessages,
				siteId: selectedSiteId,
				onToolCall: (toolName) => setActiveTool(toolName),
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
				onError: (streamErr) => { throw streamErr; }
			});
		} catch {
			try {
				const fallbackRes = await sendAIChatMessage({ messages: apiMessages, siteId: selectedSiteId });
				setMessages((prev) =>
					prev.map((msg) =>
						msg.id === assistantMsgId
							? { ...msg, content: fallbackRes.message.content, metadata: fallbackRes.metadata }
							: msg
					)
				);
			} catch (fallbackErr) {
				setError("I couldn't retrieve the latest data. Let's try again.");
				setMessages((prev) => prev.filter((msg) => msg.id !== assistantMsgId));
			} finally {
				setLoading(false);
				setActiveTool(null);
			}
		}
	};

	const handleRetry = () => {
		if (lastUserMsgRef.current) handleSend(lastUserMsgRef.current);
	};

	const handleClearConversation = () => {
		setMessages([makeWelcomeMessage()]);
		setError("");
		setShowClearConfirm(false);
		try { localStorage.removeItem(storageKey); } catch {}
	};

	return (
		<>
			{/* ── Floating launcher ── */}
			<div className="fixed bottom-6 right-6 z-50 select-none">
				{!isOpen && (
					<button
						type="button"
						onClick={() => setIsOpen(true)}
						className="group flex items-center gap-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white border border-slate-700 shadow-xl rounded-full px-4 py-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
						title="Open Solis — Solar Intelligence Assistant"
					>
						<SolisLauncherIcon />
						<div className="flex flex-col text-left">
							<span className="text-xs font-bold tracking-tight text-white">Solis</span>
							<span className="text-[10px] text-slate-400 leading-tight">Solar Intelligence</span>
						</div>
					</button>
				)}
			</div>

			{/* ── Main chat panel ── */}
			{isOpen && (
				<div
					className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
						isExpanded
							? "w-[620px] h-[720px] max-w-[95vw] max-h-[90vh]"
							: "w-[420px] h-[600px] max-w-[92vw] max-h-[85vh]"
					}`}
				>
					{/* ── Header ── */}
					<div className="bg-[#0F172A] text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
						<div className="flex items-center gap-2.5">
							{/* Logo mark in header */}
							<div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
								<img src="/solis-logo.png" alt="Solis" className="w-6 h-6 object-contain" draggable={false} />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h3 className="text-sm font-bold text-white tracking-tight">Solis</h3>
									<span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
								</div>
								<div className="text-[10px] text-slate-400 truncate max-w-[200px]">
									{selectedSite?.shortName || selectedSite?.name || "Solar Intelligence Assistant"}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-1 text-slate-400">
							<button
								type="button"
								onClick={() => setShowClearConfirm(true)}
								className="p-1.5 rounded hover:text-white hover:bg-slate-800 transition-colors"
								title="Clear conversation"
							>
								<Trash2 className="w-3.5 h-3.5" />
							</button>
							<button
								type="button"
								onClick={() => setIsExpanded(!isExpanded)}
								className="p-1.5 rounded hover:text-white hover:bg-slate-800 transition-colors hidden sm:block"
								title={isExpanded ? "Collapse" : "Expand"}
							>
								{isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
							</button>
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								className="p-1.5 rounded hover:text-white hover:bg-slate-800 transition-colors"
								title="Close"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* ── Clear confirm banner ── */}
					{showClearConfirm && (
						<div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between shrink-0">
							<span className="text-xs text-amber-800">Clear this conversation?</span>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setShowClearConfirm(false)}
									className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleClearConversation}
									className="text-xs text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded font-medium"
								>
									Clear
								</button>
							</div>
						</div>
					)}

					{/* ── Message feed ── */}
					<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
						{messages.map((msg) => {
							const isUser = msg.role === "user";
							return (
								<div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
									{/* Assistant avatar row */}
									{!isUser && (
										<div className="flex items-center gap-1.5 mb-1">
											<div className="w-5 h-5 rounded-full bg-[#0F172A] flex items-center justify-center overflow-hidden border border-slate-700 shrink-0">
												<img src="/solis-logo.png" alt="Solis" className="w-4 h-4 object-contain" draggable={false} />
											</div>
											<span className="text-[10px] font-semibold text-slate-500">Solis</span>
										</div>
									)}

									<div
										className={`rounded-xl text-xs max-w-[92%] ${
											isUser
												? "bg-[#2563EB] text-white px-3.5 py-2.5 shadow-sm"
												: "bg-white border border-slate-200 text-slate-800 px-3.5 py-3 shadow-sm"
										}`}
									>
										{isUser ? (
											<span className="whitespace-pre-wrap text-[12px]">{msg.content}</span>
										) : (
											<>
												{/* Welcome screen context panel */}
												{msg.id === "welcome-msg" && (
													<SiteContextPanel
														site={selectedSite}
														isDemoActive={isDemoActive}
														demoTelemetry={demoTelemetry}
													/>
												)}
												<FormattedMessage text={msg.content} />

												{/* Footer: copy + source detail */}
												{msg.content && (
													<div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
														<SourceDetail
															toolExecutionSteps={msg.metadata?.toolExecutionSteps || []}
															retrievedKnowledgePassages={msg.metadata?.retrievedKnowledgePassages || []}
														/>
														<CopyButton text={msg.content} />
													</div>
												)}
											</>
										)}
									</div>

									{/* Timestamp for user messages */}
									{isUser && msg.timestamp && (
										<span className="text-[9px] text-slate-400 mt-0.5 mr-0.5">{msg.timestamp}</span>
									)}
								</div>
							);
						})}

						{/* Active tool indicator */}
						{activeTool && (
							<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs">
								<RefreshCw className="w-3 h-3 animate-spin shrink-0" />
								<span>{TOOL_LABELS[activeTool] || "Working…"}</span>
							</div>
						)}

						{/* Generic loading (no active tool) */}
						{loading && !activeTool && (
							<div className="flex items-center gap-2 px-3 py-2 text-slate-400 text-xs">
								<RefreshCw className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
								<span>Thinking…</span>
							</div>
						)}

						{/* Error state */}
						{error && (
							<div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
								<div className="flex items-center gap-2">
									<AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
									<span>{error}</span>
								</div>
								<button
									type="button"
									onClick={handleRetry}
									className="text-xs font-semibold text-red-800 underline hover:no-underline ml-2 shrink-0"
								>
									Retry
								</button>
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>

					{/* ── Suggested questions (welcome state only) ── */}
					{isWelcomeOnly && !loading && (
						<div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100 shrink-0">
							<p className="text-[10px] text-slate-400 font-medium mb-1.5 px-1">Suggested</p>
							<div className="flex flex-wrap gap-1.5">
								{SUGGESTED_QUESTIONS.map((q, i) => (
									<button
										key={i}
										type="button"
										disabled={loading}
										onClick={() => handleSend(q)}
										className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50 text-[11px] font-medium transition-all disabled:opacity-50"
									>
										{q}
									</button>
								))}
							</div>
						</div>
					)}

					{/* ── Input bar ── */}
					<div className="p-3 bg-white border-t border-slate-200 shrink-0">
						<form
							onSubmit={(e) => { e.preventDefault(); handleSend(); }}
							className="flex items-center gap-2"
						>
							<input
								ref={inputRef}
								type="text"
								value={input}
								onChange={(e) => setInput(e.target.value)}
								placeholder="Ask about your installation…"
								disabled={loading}
								className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[12px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-60"
							/>
							<button
								type="submit"
								disabled={!input.trim() || loading}
								className="bg-[#2563EB] hover:bg-blue-600 disabled:bg-slate-200 text-white rounded-lg p-2 transition-colors shrink-0"
								title="Send"
							>
								{loading
									? <RefreshCw className="w-4 h-4 animate-spin" />
									: <Send className="w-4 h-4" />
								}
							</button>
						</form>
						<div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 px-0.5">
							<span>Answers grounded in live telemetry</span>
							<span>Enter to send</span>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
