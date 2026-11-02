const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Account = require("../models/Account");
const UserData = require("../models/data");
const DailyPrediction = require("../models/DailyPrediction");
const Alert = require("../models/Alert");
const UserMonthlyProduction = require("../models/UserMonthlyProduction");

async function cleanAndSetupHaider() {
	console.log("Connecting to MongoDB Atlas...");
	await mongoose.connect(process.env.MONGO_DB_URI);
	console.log("Connected successfully.");

	const adminName = process.env.ADMIN_NAME || "Haider-admin";
	const adminEmail = (process.env.ADMIN_EMAIL || "admin@solarbuddy.internal").toLowerCase().trim();
	const adminPassword = process.env.ADMIN_PASSWORD || "AdminSolarBuddy2026!";

	const userName = process.env.USER_NAME || "Haider (Home)";
	const userEmail = (process.env.USER_EMAIL || "lordxgrimx786@gmail.com").toLowerCase().trim();
	const userPassword = process.env.USER_PASSWORD || "UserSolarBuddy2026!";

	console.log(`\n1. Target Accounts:`);
	console.log(`  - Admin: ${adminName} <${adminEmail}>`);
	console.log(`  - User:  ${userName} <${userEmail}>`);

	// 1. Locate or create primary installation for Haider
	let primarySite = await UserData.findOne({ email: userEmail });
	if (!primarySite) {
		primarySite = await UserData.findById("6aafed432204dd7a11df589d");
	}

	if (!primarySite) {
		console.log("Creating new primary installation for Haider...");
		primarySite = await UserData.create({
			_id: new mongoose.Types.ObjectId("6aafed432204dd7a11df589d"),
			name: "Haider (Home)",
			email: userEmail,
			ownerName: userName,
			phoneNumber: "+91 8933827478",
			siteId: "SITE-LKO-4000H",
			inverterSerialNumber: "SOL-INV-4000H-780609",
			location: { latitude: 26.853177, longitude: 80.892815 },
			systemCapacity: 4.0,
			numberOfPanels: 6,
			tiltDeg: 26.0,
			azimuthDeg: 180.0,
			shadingFactor: 0.95,
			soilingLossPercent: 2.0,
			inverterLossPercent: 2.0,
			wiringLossPercent: 2.0,
			miscLossPercent: 1.5,
			dc_ac_ratio: 1.2,
			inv_efficiency: 98.0,
			bifaciality: 0
		});
	} else {
		console.log(`Found primary installation: ${primarySite.name} (${primarySite._id})`);
		primarySite.name = "Haider (Home)";
		primarySite.email = userEmail;
		primarySite.ownerName = userName;
		primarySite.phoneNumber = "+91 8933827478";
		primarySite.inverterSerialNumber = "SOL-INV-4000H-780609";
		primarySite.systemCapacity = 4.0;
		primarySite.numberOfPanels = 6;
		primarySite.tiltDeg = 26.0;
		primarySite.azimuthDeg = 180.0;
		primarySite.location = { latitude: 26.853177, longitude: 80.892815 };
		await primarySite.save();
	}

	const primarySiteId = primarySite._id;
	console.log(`✓ Primary site updated: ${primarySite.name} | Inverter: ${primarySite.inverterSerialNumber} | ID: ${primarySiteId}`);

	// 2. Remove all non-primary sites
	const delSitesRes = await UserData.deleteMany({ _id: { $ne: primarySiteId } });
	console.log(`✓ Deleted ${delSitesRes.deletedCount} non-primary installations from userdatas`);

	// 3. Clean alerts
	const delAlertsRes = await Alert.deleteMany({ user_id: { $ne: primarySiteId } });
	console.log(`✓ Cleared ${delAlertsRes.deletedCount} alerts from soic_alerts`);

	// 4. Clean predictions
	const delPredsRes = await DailyPrediction.deleteMany({ userId: { $ne: primarySiteId } });
	console.log(`✓ Deleted ${delPredsRes.deletedCount} predictions`);

	// 5. Clean monthly production
	const delMonthlyRes = await UserMonthlyProduction.deleteMany({ userId: { $ne: primarySiteId } });
	console.log(`✓ Deleted ${delMonthlyRes.deletedCount} monthly production records`);

	// 6. Securely set up the Admin Account ("Haider-admin")
	const adminSalt = await bcrypt.genSalt(10);
	const adminHash = await bcrypt.hash(adminPassword, adminSalt);
	const adminAccount = await Account.findOneAndUpdate(
		{ email: adminEmail },
		{
			$set: {
				name: adminName,
				email: adminEmail,
				passwordHash: adminHash,
				role: "admin",
				siteId: null,
				isActive: true
			}
		},
		{ upsert: true, new: true }
	);
	console.log(`✓ Admin Account active: ${adminAccount.name} <${adminAccount.email}> (Role: ${adminAccount.role})`);

	// 7. Securely set up the Customer Account ("Haider (Home)")
	const userSalt = await bcrypt.genSalt(10);
	const userHash = await bcrypt.hash(userPassword, userSalt);
	const userAccount = await Account.findOneAndUpdate(
		{ email: userEmail },
		{
			$set: {
				name: userName,
				email: userEmail,
				passwordHash: userHash,
				role: "user",
				siteId: primarySiteId,
				isActive: true
			}
		},
		{ upsert: true, new: true }
	);
	console.log(`✓ Customer Account active: ${userAccount.name} <${userAccount.email}> (Role: ${userAccount.role}) linked to Site: ${userAccount.siteId}`);

	// 8. Delete all other accounts
	const delAccountsRes = await Account.deleteMany({
		email: { $nin: [adminEmail, userEmail] }
	});
	console.log(`✓ Deleted ${delAccountsRes.deletedCount} old accounts from accounts`);

	console.log("\n==========================================");
	console.log("✅ DATABASE CLEANUP & HAIDER SETUP COMPLETE!");
	console.log("==========================================");

	await mongoose.disconnect();
}

cleanAndSetupHaider().catch((err) => {
	console.error("Setup error:", err);
	process.exit(1);
});
