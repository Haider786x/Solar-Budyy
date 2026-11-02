const mongoose = require("mongoose");

mongoose
	.connect(process.env.MONGO_DB_URI, {
		serverSelectionTimeoutMS: 5000
	})
	.then(() => {
		console.log("MongoDB connected");
	})
	.catch((err) => {
		console.error("[MongoDB Error]:", err.message);
		if (err.message.includes("ENOTFOUND")) {
			console.error("⚠️ Atlas cluster domain was not found. If using MongoDB Atlas Free Tier, please log in to https://cloud.mongodb.com and click 'Resume' on your cluster.");
		}
	});