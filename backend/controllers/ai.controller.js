const aiService = require("../services/ai/aiService");

/**
 * POST /api/ai/chat
 * Primary conversation endpoint supporting tool execution, RAG, and optional SSE streaming
 */
exports.chat = async (req, res) => {
	try {
		const { messages, siteId, stream } = req.body;

		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: "Authentication required to consult SolarBuddy AI Operations."
			});
		}

		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			return res.status(400).json({
				success: false,
				message: "Invalid request: 'messages' must be a non-empty array."
			});
		}

		// SSE Streaming mode
		if (stream === true) {
			res.setHeader("Content-Type", "text/event-stream");
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Connection", "keep-alive");
			res.flushHeaders?.();

			try {
				const response = await aiService.processChat({
					messages,
					siteId,
					user: req.user
				});

				// Send status and tool execution steps
				if (response.metadata?.toolExecutionSteps?.length > 0) {
					for (const step of response.metadata.toolExecutionSteps) {
						res.write(`data: ${JSON.stringify({ type: "tool_call", tool: step.tool })}\n\n`);
					}
				}

				// Stream content in simulated words or chunks for natural typing effect
				const content = response.message.content;
				const words = content.split(" ");
				for (let i = 0; i < words.length; i += 3) {
					const chunk = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
					res.write(`data: ${JSON.stringify({ type: "delta", content: chunk })}\n\n`);
					await new Promise((resolve) => setTimeout(resolve, 20));
				}

				// Final done event with complete metadata
				res.write(`data: ${JSON.stringify({ type: "done", metadata: response.metadata })}\n\n`);
				return res.end();
			} catch (streamErr) {
				res.write(`data: ${JSON.stringify({ type: "error", message: streamErr.message })}\n\n`);
				return res.end();
			}
		}

		// Standard JSON response
		const response = await aiService.processChat({
			messages,
			siteId,
			user: req.user
		});

		return res.status(200).json(response);
	} catch (error) {
		console.error("[AI Controller Chat Error]:", error);
		return res.status(500).json({
			success: false,
			message: error.message || "SolarBuddy AI failed to process the request."
		});
	}
};

/**
 * GET /api/ai/status
 * Check AI operational status and active engine
 */
exports.getStatus = async (req, res) => {
	try {
		const status = aiService.getOperationalStatus();
		return res.status(200).json({
			success: true,
			...status
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to retrieve AI system status."
		});
	}
};
