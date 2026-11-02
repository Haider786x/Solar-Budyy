const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const Account = require("../models/Account");
const UserData = require("../models/data");

const seedDatabase = async () => {
	try {
		console.log("Connecting to MongoDB for seeding...");
		await mongoose.connect(process.env.MONGO_DB_URI);
		console.log("Connected to MongoDB.");

		const adminEmail = (process.env.ADMIN_EMAIL || "admin@solarbuddy.internal").toLowerCase().trim();
		const adminPassword = process.env.ADMIN_PASSWORD || "AdminSolarBuddy2026!";

		// 1. Seed or update Administrator Account
		let admin = await Account.findOne({ email: adminEmail });
		if (!admin) {
			const passwordHash = await Account.hashPassword(adminPassword);
			admin = await Account.create({
				name: "SolarBuddy Administrator",
				email: adminEmail,
				passwordHash,
				role: "admin",
				siteId: null
			});
			console.log(`[Seed] Admin account created: ${adminEmail}`);
		} else {
			console.log(`[Seed] Admin account already exists: ${adminEmail}`);
		}

		// 2. Link or seed existing UserData sites with a normal user account
		const existingSites = await UserData.find().lean();
		for (const site of existingSites) {
			const userEmail = site.email ? site.email.toLowerCase().trim() : null;
			if (!userEmail) continue;

			let userAccount = await Account.findOne({ email: userEmail });
			if (!userAccount) {
				const defaultUserPassword = "UserSolarBuddy2026!";
				const passwordHash = await Account.hashPassword(defaultUserPassword);
				userAccount = await Account.create({
					name: site.name || "Solar Site Owner",
					email: userEmail,
					passwordHash,
					role: "user",
					siteId: site._id
				});
				console.log(`[Seed] Normal user created for site "${site.name}": ${userEmail} (Password: ${defaultUserPassword})`);
			} else if (!userAccount.siteId) {
				userAccount.siteId = site._id;
				await userAccount.save();
				console.log(`[Seed] Linked site "${site.name}" to account ${userEmail}`);
			}
		}

		console.log("[Seed] Database seeding completed successfully.");
		process.exit(0);
	} catch (error) {
		console.error("[Seed Error]:", error);
		process.exit(1);
	}
};

seedDatabase();
