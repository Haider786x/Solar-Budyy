const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Account = require("../models/Account");
const UserData = require("../models/data");
const Alert = require("../models/Alert");
const DailyPrediction = require("../models/DailyPrediction");
const UserMonthlyProduction = require("../models/UserMonthlyProduction");
const MonthlyData = require("../models/monthlydata");
const SiteDailyPerformance = require("../models/SiteDailyPerformance");
const SiteMonitoringState = require("../models/SiteMonitoringState");

async function cleanAndSetupHaider() {
	console.log("Connecting to MongoDB Atlas...");
	await mongoose.connect(process.env.MONGO_DB_URI);
	console.log("Connected successfully.");

	const adminName = process.env.ADMIN_NAME || "Haider";
	const adminEmail = (process.env.ADMIN_EMAIL || "admin@solarbuddy.internal").toLowerCase().trim();
	const adminPassword = process.env.ADMIN_PASSWORD || "AdminSolarBuddy2026!";

	const userName = process.env.USER_NAME || "Haider";
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
			name: "Haider Rooftop Solar Array",
			email: userEmail,
			ownerName: userName,
			phoneNumber: "9876543210",
			siteId: "SITE-LKO-01",
			inverterSerialNumber: "PENDING_INVERTER_ID",
			location: { latitude: 26.8467, longitude: 80.9462 },
			systemCapacity: 5.0,
			numberOfPanels: 14,
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
		primarySite.name = "Haider Rooftop Solar Array";
		primarySite.email = userEmail;
		primarySite.ownerName = userName;
		primarySite.inverterSerialNumber = "PENDING_INVERTER_ID";
		primarySite.systemCapacity = 5.0;
		primarySite.numberOfPanels = 14;
		primarySite.tiltDeg = 26.0;
		primarySite.azimuthDeg = 180.0;
		primarySite.location = { latitude: 26.8467, longitude: 80.9462 };
		await primarySite.save();
	}
	console.log(`✓ Primary site updated: ${primarySite.name} | Inverter: ${primarySite.inverterSerialNumber} | ID: ${primarySite._id}`);

	const primarySiteId = primarySite._id;

	// 2. Remove confirmed demo installations (Delhi, Bengaluru, Jaipur)
	const deletedSites = await UserData.deleteMany({ _id: { $ne: primarySiteId } });
	console.log(`✓ Deleted ${deletedSites.deletedCount} demo installations from userdatas`);

	// 3. Remove simulated alerts (Jaipur outage alert)
	const deletedAlerts = await Alert.deleteMany({});
	console.log(`✓ Cleared ${deletedAlerts.deletedCount} simulated alerts from soic_alerts`);

	// 4. Remove fake telemetry & manufactured historical records
	// Remove all daily predictions from seeded demo telemetry
	const deletedPreds = await DailyPrediction.deleteMany({
		$or: [
			{ userId: { $ne: primarySiteId } },
			{ source: "seeded_telemetry" }
		]
	});
	console.log(`✓ Deleted ${deletedPreds.deletedCount} manufactured records from dailypredictions`);

	// Remove manufactured monthly ledger reconciliation records
	const deletedMonthly = await UserMonthlyProduction.deleteMany({
		$or: [
			{ userId: { $ne: primarySiteId } },
			{ source: "monthly_reconciliation" }
		]
	});
	console.log(`✓ Deleted ${deletedMonthly.deletedCount} manufactured records from user_monthly_production`);

	// Clean other demo collections
	await MonthlyData.deleteMany({ userDataId: { $ne: primarySiteId } });
	await SiteDailyPerformance.deleteMany({ user_id: { $ne: primarySiteId } });
	await SiteMonitoringState.deleteMany({ user_id: { $ne: primarySiteId } });

	// 5. Clean accounts: Remove all demo accounts except the 2 target accounts
	const deletedAccounts = await Account.deleteMany({
		email: { $nin: [adminEmail, userEmail] }
	});
	console.log(`✓ Deleted ${deletedAccounts.deletedCount} demo accounts from accounts`);

	// 6. Securely set up the Admin Account ("Haider")
	const adminSalt = await bcrypt.genSalt(10);
	const adminHash = await bcrypt.hash(adminPassword, adminSalt);
	const adminAccount = await Account.findOneAndUpdate(
		{ email: adminEmail },
		{
			name: adminName,
			email: adminEmail,
			passwordHash: adminHash,
			role: "admin",
			siteId: null,
			isActive: true
		},
		{ upsert: true, returnDocument: "after" }
	);
	console.log(`✓ Admin Account active: ${adminAccount.name} <${adminAccount.email}> (Role: ${adminAccount.role})`);

	// 7. Securely set up the Customer Account ("Haider")
	const userSalt = await bcrypt.genSalt(10);
	const userHash = await bcrypt.hash(userPassword, userSalt);
	const userAccount = await Account.findOneAndUpdate(
		{ email: userEmail },
		{
			name: userName,
			email: userEmail,
			passwordHash: userHash,
			role: "user",
			siteId: primarySiteId,
			isActive: true
		},
		{ upsert: true, returnDocument: "after" }
	);
	console.log(`✓ Customer Account active: ${userAccount.name} <${userAccount.email}> (Role: ${userAccount.role}) linked to Site: ${primarySiteId}`);

	console.log("\n==========================================");
	console.log("✅ DATABASE CLEANUP & HAIDER SETUP COMPLETE!");
	console.log("==========================================");
	process.exit(0);
}

cleanAndSetupHaider().catch((err) => {
	console.error("[Cleanup Error]:", err);
	process.exit(1);
});
