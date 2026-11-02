const mongoose = require("mongoose");
const UserData = require("../../models/data");
const { buildSystemPromptWithContext } = require("./systemPrompt");
const { searchKnowledge } = require("./solarKnowledgeService");
const { generateAIResponse, getActiveProvider } = require("./modelProvider");

class AIService {
	/**
	 * Process a user chat message through RAG, tool calling, and model generation
	 * @param {object} params
	 * @param {Array} params.messages Array of { role: 'user'|'assistant', content: string }
	 * @param {string} params.siteId Optional target site ID (Admin only)
	 * @param {object} params.user Authenticated user object from req.user
	 * @returns {Promise<object>} AI response payload
	 */
	async processChat({ messages, siteId, user }) {
		if (!Array.isArray(messages) || messages.length === 0) {
			throw new Error("Chat messages array cannot be empty.");
		}

		// Keep context bounded (last 10 turns)
		const boundedMessages = messages.slice(-10);
		const lastMessage = boundedMessages[boundedMessages.length - 1];
		if (!lastMessage || lastMessage.role !== "user") {
			throw new Error("The last message in conversation must be from the user.");
		}

		// Resolve authorized site context
		let targetSiteId = siteId;
		if (user.role === "admin") {
			targetSiteId = siteId || user.siteId;
		} else {
			// Normal customer: strictly locked to own site or sites they own
			if (targetSiteId && mongoose.Types.ObjectId.isValid(targetSiteId)) {
				const owned = await UserData.findOne({ _id: targetSiteId, ownerId: user.id });
				if (owned) {
					targetSiteId = owned._id.toString();
				} else {
					targetSiteId = user.siteId;
				}
			} else {
				targetSiteId = user.siteId;
			}
		}

		let site = null;
		if (targetSiteId && mongoose.Types.ObjectId.isValid(targetSiteId)) {
			site = await UserData.findById(targetSiteId).lean();
		}
		if (!site) {
			site = await UserData.findOne({ isDeleted: { $ne: true } }).lean();
		}

		// RAG: Query solar technical knowledge base for relevant concepts
		const userQuery = lastMessage.content || "";
		const relevantPassages = searchKnowledge(userQuery, { limit: 2, minScore: 0.14 });

		// Build strict system prompt
		const systemInstruction = buildSystemPromptWithContext({
			user,
			site,
			knowledgeContext: relevantPassages
		});

		const userContext = {
			id: user.id,
			siteId: site?._id?.toString() || user.siteId,
			role: user.role
		};

		// Generate response via provider abstraction
		const result = await generateAIResponse({
			messages: boundedMessages,
			systemInstruction,
			userContext,
			site,
			user
		});

		return {
			success: true,
			message: {
				role: "assistant",
				content: result.text
			},
			metadata: {
				provider: result.provider,
				model: result.model,
				isLocalFallback: result.provider === "local_operations_engine",
				siteId: site?._id?.toString(),
				siteName: site?.name || "Selected Solar Site",
				toolExecutionSteps: result.toolExecutionSteps || [],
				retrievedKnowledgePassages: relevantPassages.map((p) => ({ id: p.id, title: p.title, topic: p.topic })),
				timestamp: new Date().toISOString()
			}
		};
	}

	getOperationalStatus() {
		return {
			status: "active",
			activeProvider: getActiveProvider(),
			features: {
				ragKnowledgeRetrieval: true,
				liveTelemetryTools: true,
				multiRoleAuthorization: true
			}
		};
	}
}

const aiService = new AIService();
module.exports = aiService;
