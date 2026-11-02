const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function backupDatabase() {
	const mongoUri = process.env.MONGO_DB_URI;
	if (!mongoUri) {
		console.error("MONGO_DB_URI is not defined in .env");
		process.exit(1);
	}

	console.log("Connecting to MongoDB Atlas for backup...");
	await mongoose.connect(mongoUri);
	console.log("Connected successfully.");

	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const backupDir = path.join(__dirname, "..", "backups", `backup_${timestamp}`);
	fs.mkdirSync(backupDir, { recursive: true });

	const collections = await mongoose.connection.db.listCollections().toArray();
	console.log(`Found ${collections.length} collections to backup in ${backupDir}:`);

	const manifest = {
		timestamp,
		collections: {}
	};

	for (const col of collections) {
		const name = col.name;
		const docs = await mongoose.connection.db.collection(name).find({}).toArray();
		const filePath = path.join(backupDir, `${name}.json`);
		fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf8");
		console.log(`  ✓ Backed up ${name}: ${docs.length} documents -> ${name}.json`);
		manifest.collections[name] = docs.length;
	}

	fs.writeFileSync(path.join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
	console.log("\n==========================================");
	console.log(`✅ DATABASE BACKUP COMPLETE! Stored at: ${backupDir}`);
	console.log("==========================================");
	process.exit(0);
}

backupDatabase().catch((err) => {
	console.error("[Backup Error]:", err);
	process.exit(1);
});
