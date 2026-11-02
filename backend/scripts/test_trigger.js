require("dotenv").config();
const mongoose = require("mongoose");
const { runManualPredictionFetch } = require("../services/manualFetchService");

async function testTrigger() {
	await mongoose.connect(process.env.MONGO_DB_URI);
	const siteId = "6aafed432204dd7a11df589d";
	console.log("Triggering manual prediction fetch for", siteId);
	const res = await runManualPredictionFetch({ userId: siteId });
	console.log("Result:", JSON.stringify(res, null, 2));
	process.exit(0);
}

testTrigger().catch(e => { console.error(e); process.exit(1); });
