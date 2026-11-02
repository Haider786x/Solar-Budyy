const { searchKnowledge } = require("./solarKnowledgeService");
const { TOOL_DEFINITIONS } = require("./aiTools");

/**
 * Identify if an external AI key is available
 */
function getActiveProvider() {
	if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
		return "gemini";
	}
	if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
		return "openai";
	}
	return "local_operations_engine";
}

/**
 * Call Google Gemini REST API with tool calling
 */
async function callGeminiProvider({ messages, systemInstruction, tools, toolsMap, userContext }) {
	const apiKey = process.env.GEMINI_API_KEY.trim();
	const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

	// Convert tools to Gemini format
	const geminiTools = [
		{
			functionDeclarations: tools.map((t) => ({
				name: t.name,
				description: t.description,
				parameters: t.parameters
			}))
		}
	];

	// Convert messages
	const contents = messages.map((m) => ({
		role: m.role === "assistant" ? "model" : "user",
		parts: [{ text: m.content }]
	}));

	let payload = {
		systemInstruction: { parts: [{ text: systemInstruction }] },
		contents,
		tools: geminiTools
	};

	let toolExecutionSteps = [];

	// Tool execution loop (up to 3 iterations)
	for (let i = 0; i < 3; i++) {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});

		if (!res.ok) {
			const errText = await res.text();
			throw new Error(`Gemini API error (${res.status}): ${errText}`);
		}

		const data = await res.json();
		const candidate = data.candidates?.[0];
		const modelParts = candidate?.content?.parts || [];

		// Check for function calls
		const functionCallPart = modelParts.find((p) => p.functionCall);
		if (functionCallPart) {
			const call = functionCallPart.functionCall;
			const toolDef = toolsMap[call.name];
			let toolResult = null;

			if (toolDef) {
				toolExecutionSteps.push({ tool: call.name, params: call.args });
				try {
					toolResult = await toolDef.execute(call.args || {}, userContext);
				} catch (toolErr) {
					toolResult = { error: toolErr.message };
				}
			} else {
				toolResult = { error: `Tool ${call.name} not found.` };
			}

			// Add model call and function response to contents
			payload.contents.push({ role: "model", parts: [functionCallPart] });
			payload.contents.push({
				role: "function",
				parts: [
					{
						functionResponse: {
							name: call.name,
							response: { result: toolResult }
						}
					}
				]
			});
			continue;
		}

		// Final text response
		const textParts = modelParts.map((p) => p.text).filter(Boolean);
		return {
			text: textParts.join("\n"),
			provider: "gemini",
			model,
			toolExecutionSteps
		};
	}

	return {
		text: "Analysis completed based on the retrieved operational context.",
		provider: "gemini",
		model,
		toolExecutionSteps
	};
}

/**
 * Call OpenAI compatible REST API
 */
async function callOpenAIProvider({ messages, systemInstruction, tools, toolsMap, userContext }) {
	const apiKey = process.env.OPENAI_API_KEY.trim();
	const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
	const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
	const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

	const openAITools = tools.map((t) => ({
		type: "function",
		function: {
			name: t.name,
			description: t.description,
			parameters: t.parameters
		}
	}));

	const chatMessages = [
		{ role: "system", content: systemInstruction },
		...messages.map((m) => ({ role: m.role, content: m.content }))
	];

	let toolExecutionSteps = [];

	for (let i = 0; i < 3; i++) {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model,
				messages: chatMessages,
				tools: openAITools,
				tool_choice: "auto"
			})
		});

		if (!res.ok) {
			const errText = await res.text();
			throw new Error(`OpenAI API error (${res.status}): ${errText}`);
		}

		const data = await res.json();
		const message = data.choices?.[0]?.message;

		if (message?.tool_calls && message.tool_calls.length > 0) {
			chatMessages.push(message);
			for (const call of message.tool_calls) {
				const toolDef = toolsMap[call.function.name];
				const args = JSON.parse(call.function.arguments || "{}");
				toolExecutionSteps.push({ tool: call.function.name, params: args });

				let result = null;
				if (toolDef) {
					try {
						result = await toolDef.execute(args, userContext);
					} catch (e) {
						result = { error: e.message };
					}
				} else {
					result = { error: `Tool ${call.function.name} not found.` };
				}

				chatMessages.push({
					role: "tool",
					tool_call_id: call.id,
					content: JSON.stringify(result)
				});
			}
			continue;
		}

		return {
			text: message?.content || "Analysis completed.",
			provider: "openai",
			model,
			toolExecutionSteps
		};
	}

	return {
		text: "Completed operational review with available tools.",
		provider: "openai",
		model,
		toolExecutionSteps
	};
}

/**
 * Intelligent Local Operational Fallback Engine
 * Executes actual live backend tools and RAG knowledge retrieval to generate
 * precise, analytical, data-grounded responses when no external API key is present.
 */
async function callLocalOperationsEngine({ messages, toolsMap, userContext, site, user }) {
	const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
	const lower = lastUserMessage.toLowerCase();
	const toolExecutionSteps = [];

	// Tool intent detection
	const needsTelemetry = /(today|current|power|energy|generate|kwh|kw|output|producing|real-time|telemetry)/.test(lower);
	const needsPerformance = /(performance|expected|target|ratio|pr%|underperform|lower|less|difference|delta|efficiency|loss)/.test(lower);
	const needsAlerts = /(alert|issue|problem|fault|outage|incident|error|offline|warning)/.test(lower);
	const needsWeather = /(weather|cloud|irradiance|gti|sun|temperature|heat|rain|forecast|degrees)/.test(lower);
	const needsInstallation = /(installation|panel|capacity|tilt|azimuth|module|inverter spec|rating|specifications|orientation|how many panels)/.test(lower);
	const needsHistory = /(history|yesterday|past|week|month|historical|previous|last)/.test(lower);

	// RAG knowledge lookup
	const ragPassages = searchKnowledge(lastUserMessage, { limit: 2, minScore: 0.15 });

	let telemetryData = null;
	let performanceData = null;
	let alertsData = null;
	let weatherData = null;
	let installationData = null;
	let historyData = null;

	// Execute relevant tools against live DB
	if (needsTelemetry || needsPerformance) {
		toolExecutionSteps.push({ tool: "fetchSolarTelemetry", params: {} });
		telemetryData = await toolsMap.fetchSolarTelemetry.execute({}, userContext);
	}
	if (needsPerformance || needsTelemetry) {
		toolExecutionSteps.push({ tool: "fetchSolarPerformance", params: {} });
		performanceData = await toolsMap.fetchSolarPerformance.execute({}, userContext);
	}
	if (needsAlerts || needsPerformance) {
		toolExecutionSteps.push({ tool: "fetchSolarAlerts", params: {} });
		alertsData = await toolsMap.fetchSolarAlerts.execute({}, userContext);
	}
	if (needsWeather || needsPerformance) {
		toolExecutionSteps.push({ tool: "fetchSolarWeatherContext", params: {} });
		weatherData = await toolsMap.fetchSolarWeatherContext.execute({}, userContext);
	}
	if (needsInstallation) {
		toolExecutionSteps.push({ tool: "fetchSolarInstallation", params: {} });
		installationData = await toolsMap.fetchSolarInstallation.execute({}, userContext);
	}
	if (needsHistory) {
		toolExecutionSteps.push({ tool: "fetchHistoricalGeneration", params: {} });
		historyData = await toolsMap.fetchHistoricalGeneration.execute({ limit: 7 }, userContext);
	}

	// Synthesize grounded operations response
	let text = "";

	if (needsAlerts && alertsData) {
		text += `### Operational Alert Analysis\n\n`;
		text += `**Monitored Installation:** ${alertsData.siteName}\n`;
		text += `**Status:** ${alertsData.systemOperationalState}\n\n`;

		if (alertsData.activeAlerts.length === 0) {
			text += `No active hardware alerts or anomalies are currently detected. The array is operating within normal parameters.\n\n`;
		} else {
			text += `**Active Incidents (${alertsData.activeAlerts.length}):**\n`;
			for (const a of alertsData.activeAlerts) {
				text += `- **Severity [${a.severity}]:** ${a.notes}\n`;
				text += `  - *Status:* ${a.status} (Active for ${a.consecutiveDays} days)\n`;
				text += `  - *Recommended Action:* ${a.recommendedAction}\n`;
			}
			text += `\n`;
		}

		if (alertsData.recentResolvedHistory.length > 0) {
			text += `**Recent Maintenance Record:** Incident ${alertsData.recentResolvedHistory[0].incidentId} (${alertsData.recentResolvedHistory[0].highestSeverity}) was verified and resolved.\n\n`;
		}
	} else if (needsInstallation && installationData) {
		text += `### Installation Technical Specifications\n\n`;
		text += `**Site:** ${installationData.installationName} (${installationData.location.region})\n\n`;
		text += `| Parameter | Configured Value |\n`;
		text += `| :--- | :--- |\n`;
		text += `| **Rated Capacity** | ${installationData.systemCapacityKwp} kWp |\n`;
		text += `| **Photovoltaic Modules** | ${installationData.numberOfPanels} panels (${installationData.moduleRatingWatts}W Monocrystalline) |\n`;
		text += `| **Roof Tilt / Azimuth** | ${installationData.tiltDegrees}° Slope / ${installationData.azimuthDirection} |\n`;
		text += `| **Inverter Efficiency** | ${installationData.inverterEfficiencyPercent}% |\n`;
		text += `| **DC/AC Ratio** | ${installationData.dcAcRatio} |\n`;
		text += `| **Inverter Telemetry Status** | ${installationData.telemetryStatus} (${installationData.inverterSerialNumber}) |\n\n`;
		text += `**Engineered Loss Budget:** Soiling: ${installationData.lossBreakdownPercent.soiling}%, Inverter Conversion: ${installationData.lossBreakdownPercent.inverterConversion}%, Wiring: ${installationData.lossBreakdownPercent.wiringResistance}%, Misc: ${installationData.lossBreakdownPercent.miscUnaccounted}%.\n\n`;
	} else if (needsPerformance || needsTelemetry) {
		text += `### Solar Performance & Telemetry Briefing\n\n`;
		text += `**Site:** ${telemetryData?.siteName || performanceData?.siteName || "Haider Rooftop Solar Array"}\n`;
		text += `**Date:** ${telemetryData?.date || performanceData?.date || "Today"}\n\n`;

		text += `| Operational Metric | Live Telemetry | Expected Target | Variance |\n`;
		text += `| :--- | :--- | :--- | :--- |\n`;
		text += `| **Instantaneous Power (kW)** | ${telemetryData?.currentPowerKw ?? 0} kW | ${(weatherData?.peakPowerExpectedKw || 3.75)} kW Peak | — |\n`;
		text += `| **Accumulated Energy (kWh)** | ${telemetryData?.accumulatedEnergyKwh ?? performanceData?.actualAccumulatedKwh ?? 0} kWh | ${performanceData?.expectedDailyKwh ?? 19.8} kWh | ${performanceData?.differencePercent ?? "—"} |\n`;
		text += `| **Performance State** | **${performanceData?.performanceState || "Nominal Generation"}** | 100% Target | PR: ${performanceData?.performanceRatioPercent || "Optimal"} |\n\n`;

		if (telemetryData?.isSimulated) {
			text += `> [!NOTE]\n> Telemetry Source: **Simulated Testbed Telemetry** (${telemetryData.inverterSerialNumber}). Physical inverter hardware link is pending synchronization.\n\n`;
		} else {
			text += `> [!NOTE]\n> Telemetry Source: **Live Physical Hardware SCADA** (${telemetryData?.inverterSerialNumber || "Linked Inverter"}).\n\n`;
		}

		if (weatherData) {
			text += `**Atmospheric Context:** Ambient temperature is **${weatherData.avgTemperatureC}°C** with **${weatherData.avgCloudCoverPercent}%** cloud cover (${weatherData.weatherCategory}). Plane-of-array peak irradiance is approximately **${weatherData.estimatedGlobalTiltedIrradianceWm2} W/m²**.\n\n`;
		}
	} else if (needsHistory && historyData) {
		text += `### Historical Generation Summary\n\n`;
		text += `Retrieved stored production telemetry across recent cycles for **${historyData.siteName}**:\n\n`;
		text += `| Date | Expected Target | Actual Output | Difference |\n`;
		text += `| :--- | :--- | :--- | :--- |\n`;
		for (const d of historyData.dailyHistory) {
			text += `| ${d.date} | ${d.expectedKwh} kWh | ${d.actualKwh !== null ? `${d.actualKwh} kWh` : "Pending Telemetry"} | ${d.differenceKwh !== null ? `${d.differenceKwh} kWh` : "—"} |\n`;
		}
		text += `\n*No artificial records are manufactured; missing entries indicate unlinked telemetry periods.*\n\n`;
	}

	// Append technical RAG reference if relevant concepts were asked
	if (ragPassages.length > 0) {
		const top = ragPassages[0];
		text += `### Technical Reference: ${top.title} (${top.topic})\n\n`;
		text += `${top.content}\n\n`;
	} else if (!text) {
		text = `I am SolarBuddy AI, your Solar Energy Operations Specialist. I can inspect authorized live telemetry, calculate performance differences, interpret SOIC alerts, analyze weather impacts, and explain technical solar engineering concepts.\n\n` +
			`You can ask me questions like:\n` +
			`- *"How much energy has my system generated today?"*\n` +
			`- *"Why is my production lower than expected?"*\n` +
			`- *"What is inverter clipping and does it harm my system?"*\n` +
			`- *"Check my installation's active alerts and health status."*`;
	}

	return {
		text,
		provider: "local_operations_engine",
		model: "SolarBuddy Deterministic Operations Agent v1.0",
		toolExecutionSteps
	};
}

/**
 * Universal dispatcher
 */
async function generateAIResponse({ messages, systemInstruction, userContext, site, user }) {
	const provider = getActiveProvider();
	const toolsMap = TOOL_DEFINITIONS.reduce((acc, t) => {
		acc[t.name] = t;
		return acc;
	}, {});

	if (provider === "gemini") {
		try {
			return await callGeminiProvider({
				messages,
				systemInstruction,
				tools: TOOL_DEFINITIONS,
				toolsMap,
				userContext
			});
		} catch (err) {
			console.warn("[ModelProvider] Gemini API call failed, falling back to local operations engine:", err.message);
		}
	} else if (provider === "openai") {
		try {
			return await callOpenAIProvider({
				messages,
				systemInstruction,
				tools: TOOL_DEFINITIONS,
				toolsMap,
				userContext
			});
		} catch (err) {
			console.warn("[ModelProvider] OpenAI API call failed, falling back to local operations engine:", err.message);
		}
	}

	// Local Operational Fallback Engine
	return await callLocalOperationsEngine({
		messages,
		toolsMap,
		userContext,
		site,
		user
	});
}

module.exports = {
	getActiveProvider,
	generateAIResponse
};
