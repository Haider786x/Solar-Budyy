const fs = require("fs");
const path = require("path");

class SolarKnowledgeService {
	constructor() {
		this.documents = [];
		this.isInitialized = false;
		this.searchKnowledge = this.searchKnowledge.bind(this);
		this.loadKnowledgeBase = this.loadKnowledgeBase.bind(this);
		this.getAllDocuments = this.getAllDocuments.bind(this);
		this.loadKnowledgeBase();
	}

	loadKnowledgeBase() {
		try {
			const dataDir = path.join(__dirname, "../../data/solarKnowledge");
			if (!fs.existsSync(dataDir)) {
				console.warn("[SolarKnowledgeService] Knowledge data directory missing:", dataDir);
				this.documents = [];
				return;
			}

			const files = fs.readdirSync(dataDir).filter((file) => file.endsWith(".json"));
			const allDocs = [];

			for (const file of files) {
				const filePath = path.join(dataDir, file);
				const content = fs.readFileSync(filePath, "utf8");
				const parsed = JSON.parse(content);
				if (Array.isArray(parsed)) {
					allDocs.push(...parsed);
				}
			}

			this.documents = allDocs;
			this.isInitialized = true;
			console.log(`[SolarKnowledgeService] Loaded ${this.documents.length} knowledge passages.`);
		} catch (error) {
			console.error("[SolarKnowledgeService] Error loading knowledge base:", error.message);
			this.documents = [];
		}
	}

	tokenize(text) {
		if (!text) return [];
		return text
			.toLowerCase()
			.replace(/[^a-z0-9%°\-\s]/g, " ")
			.split(/\s+/)
			.filter((t) => t.length > 1);
	}

	/**
	 * Search knowledge base using multi-tier term matching & relevance scoring
	 * @param {string} query
	 * @param {object} options { limit: 3, minScore: 0.12 }
	 * @returns {Array} Scored, sorted passages
	 */
	searchKnowledge(query, options = {}) {
		if (!this.isInitialized || this.documents.length === 0) {
			this.loadKnowledgeBase();
		}

		const limit = options.limit || 3;
		const minScore = options.minScore !== undefined ? options.minScore : 0.12;

		if (!query || typeof query !== "string") {
			return [];
		}

		const queryTokens = this.tokenize(query);
		if (queryTokens.length === 0) {
			return [];
		}

		const scoredDocs = this.documents.map((doc) => {
			let score = 0;
			const titleTokens = this.tokenize(doc.title);
			const keywordTokens = Array.isArray(doc.keywords)
				? doc.keywords.flatMap((k) => this.tokenize(k))
				: [];
			const contentTokens = this.tokenize(doc.content);
			const topicTokens = this.tokenize(doc.topic);

			for (const qToken of queryTokens) {
				// Exact title match weight
				if (titleTokens.includes(qToken)) {
					score += 3.0;
				}
				// Keyword tag match weight
				if (keywordTokens.includes(qToken)) {
					score += 2.5;
				}
				// Topic match weight
				if (topicTokens.includes(qToken)) {
					score += 1.5;
				}
				// Content term occurrences (with diminishing returns)
				const countInContent = contentTokens.filter((t) => t === qToken).length;
				if (countInContent > 0) {
					score += Math.min(countInContent * 0.4, 2.0);
				}
			}

			// Normalized by log-length to prevent very long docs from dominating artificially
			const normalizedScore = score / Math.max(1, Math.log10(contentTokens.length + 10));

			return {
				id: doc.id,
				title: doc.title,
				topic: doc.topic,
				summary: doc.summary,
				content: doc.content,
				score: Number(normalizedScore.toFixed(3))
			};
		});

		return scoredDocs
			.filter((d) => d.score >= minScore)
			.sort((a, b) => b.score - a.score)
			.slice(0, limit);
	}

	/**
	 * Retrieve all documents for reference
	 */
	getAllDocuments() {
		if (!this.isInitialized) this.loadKnowledgeBase();
		return this.documents;
	}
}

// Export singleton instance
const solarKnowledgeService = new SolarKnowledgeService();
module.exports = solarKnowledgeService;
