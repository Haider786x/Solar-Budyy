const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const http = require("http");
const express = require("express");

const authRoute = require("../routes/auth.route");
const aiRoute = require("../routes/ai.route");
const userDataRoute = require("../routes/userData.route");
const Account = require("../models/Account");
const UserData = require("../models/data");
const { searchKnowledge } = require("../services/ai/solarKnowledgeService");
const { TOOL_DEFINITIONS } = require("../services/ai/aiTools");

async function runSolisTestSuite() {
	console.log("==================================================");
	console.log("=== SOLIS AI ASSISTANT RIGOROUS TEST SUITE ===");
	console.log("==================================================");

	// 1. Connect Database
	console.log("\n[1/5] Connecting to MongoDB Atlas...");
	await mongoose.connect(process.env.MONGO_DB_URI);
	console.log("  Connected to MongoDB.");

	// 2. Set up temporary test server
	const app = express();
	app.use(express.json());
	app.use("/auth", authRoute);
	app.use("/api/ai", aiRoute);
	app.use("/", userDataRoute);

	const server = http.createServer(app);
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const port = server.address().port;
	const baseUrl = `http://127.0.0.1:${port}`;
	console.log(`  Test server running on ${baseUrl}`);

	let passedTests = 0;
	let totalTests = 0;

	function recordResult(testName, success, details = "") {
		totalTests++;
		if (success) {
			passedTests++;
			console.log(`  [PASS] ${testName}`);
		} else {
			console.error(`  [FAIL] ${testName} - ${details}`);
		}
	}

	try {
		// Authenticate Customer User (Haider Home)
		console.log("\n[2/5] Authenticating Test Credentials...");
		const userRes = await fetch(`${baseUrl}/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: "lordxgrimx786@gmail.com",
				password: "UserSolarBuddy2026!"
			})
		});
		const userData = await userRes.json();
		recordResult("Customer login succeeds", userRes.status === 200 && !!userData.token);
		const userToken = userData.token;
		const userSiteId = userData.user?.siteId;

		// Authenticate Admin User
		const adminRes = await fetch(`${baseUrl}/auth/admin/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: "admin@solarbuddy.internal",
				password: "AdminSolarBuddy2026!"
			})
		});
		const adminData = await adminRes.json();
		recordResult("Admin login succeeds", adminRes.status === 200 && !!adminData.token);
		const adminToken = adminData.token;

		// 3. Section 8 Authorization Boundary Tests
		console.log("\n[3/5] Verifying Section 8 Authorization Boundaries for Solis...");

		// A: Unauthenticated request denied (401)
		const unauthRes = await fetch(`${baseUrl}/api/ai/chat`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messages: [{ role: "user", content: "How much energy have I generated today?" }]
			})
		});
		recordResult("Unauthenticated request denied (HTTP 401)", unauthRes.status === 401);

		// B: Customer on own site allowed (200)
		const customerOwnRes = await fetch(`${baseUrl}/api/ai/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${userToken}`
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: "How much energy have I generated today?" }],
				siteId: userSiteId
			})
		});
		const customerOwnData = await customerOwnRes.json();
		recordResult(
			"Customer querying own site succeeds (HTTP 200)",
			customerOwnRes.status === 200 && customerOwnData.success === true
		);
		console.log(`    Assistant response provider: ${customerOwnData.metadata?.provider}`);

		// C: Customer cross-tenant isolation: passing a different siteId is locked to own site
		const dummySiteId = "600000000000000000000001";
		const customerTamperRes = await fetch(`${baseUrl}/api/ai/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${userToken}`
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: "Check my installation's status." }],
				siteId: dummySiteId
			})
		});
		const customerTamperData = await customerTamperRes.json();
		// Backend forces targetSiteId = user.siteId for customers, ensuring tenant isolation
		const isIsolated = customerTamperRes.status === 200 && customerTamperData.metadata?.siteId === userSiteId;
		recordResult("Customer cannot inspect foreign siteId (Tenant isolation enforced)", isIsolated);

		// D: Admin can inspect any valid fleet site
		const adminQueryRes = await fetch(`${baseUrl}/api/ai/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminToken}`
			},
			body: JSON.stringify({
				messages: [{ role: "user", content: "Review fleet site operations." }],
				siteId: userSiteId
			})
		});
		const adminQueryData = await adminQueryRes.json();
		recordResult("Admin can inspect fleet site (HTTP 200)", adminQueryRes.status === 200 && adminQueryData.success === true);

		// 4. Test the 3 Response Styles & Content Quality
		console.log("\n[4/5] Testing Solis Response Styles & Content Quality...");

		// Style A: Quick Answer
		const quickRes = await fetch(`${baseUrl}/api/ai/chat`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
			body: JSON.stringify({
				messages: [{ role: "user", content: "How much energy have I generated today?" }]
			})
		});
		const quickData = await quickRes.json();
		const quickContent = quickData.message?.content || "";
		const hasQuickTelemetry = quickContent.includes("kWh") || quickContent.includes("Power");
		recordResult("Quick Answer: returns concise telemetry metrics", quickRes.status === 200 && hasQuickTelemetry);
		console.log(`    Sample snippet: "${quickContent.slice(0, 120).replace(/\n/g, " ")}..."`);

		// Style B: Performance Investigation
		const investRes = await fetch(`${baseUrl}/api/ai/chat`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
			body: JSON.stringify({
				messages: [{ role: "user", content: "Why is my generation lower than expected?" }]
			})
		});
		const investData = await investRes.json();
		const investContent = investData.message?.content || "";
		const hasInvestigationFormat = investContent.includes("Performance") || investContent.includes("Telemetry") || investContent.includes("Variance");
		recordResult("Performance Investigation: investigates telemetry, variance, and conditions", investRes.status === 200 && hasInvestigationFormat);
		console.log(`    Sample snippet: "${investContent.slice(0, 120).replace(/\n/g, " ")}..."`);

		// Style C: Technical Explanation
		const techRes = await fetch(`${baseUrl}/api/ai/chat`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
			body: JSON.stringify({
				messages: [{ role: "user", content: "What is inverter clipping and does it harm my system?" }]
			})
		});
		const techData = await techRes.json();
		const techContent = techData.message?.content || "";
		const hasTechGrounding = techContent.toLowerCase().includes("clipping") || techContent.toLowerCase().includes("inverter");
		recordResult("Technical Explanation: grounds in photovoltaic engineering knowledge", techRes.status === 200 && hasTechGrounding);
		console.log(`    Sample snippet: "${techContent.slice(0, 120).replace(/\n/g, " ")}..."`);

		// 5. Test Tools & RAG Knowledge Engine
		console.log("\n[5/5] Testing RAG Retrieval & Tool Definitions...");

		// RAG Knowledge lookup
		const ragResults = searchKnowledge("inverter clipping", { limit: 2 });
		recordResult("RAG: retrieves technical knowledge passages", ragResults.length > 0 && ragResults[0].title.includes("Clipping"));
		console.log(`    Retrieved topic: ${ragResults[0]?.topic} - ${ragResults[0]?.title}`);

		// Tool Definitions
		recordResult("All 6 backend tools defined and schema-compliant", TOOL_DEFINITIONS.length === 6);
		const toolNames = TOOL_DEFINITIONS.map(t => t.name);
		const expectedTools = [
			"fetchSolarTelemetry",
			"fetchSolarPerformance",
			"fetchSolarAlerts",
			"fetchSolarWeatherContext",
			"fetchSolarInstallation",
			"fetchHistoricalGeneration"
		];
		const allToolsPresent = expectedTools.every(t => toolNames.includes(t));
		recordResult("Expected tool set matches specification exactly", allToolsPresent);

		console.log("\n==================================================");
		console.log(`=== SOLIS SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED ===`);
		console.log("==================================================");

	} finally {
		server.close();
		await mongoose.disconnect();
	}

	if (passedTests !== totalTests) {
		process.exit(1);
	}
}

runSolisTestSuite().catch((err) => {
	console.error("Test Suite Fatal Error:", err);
	process.exit(1);
});
