const mongoose = require("mongoose");
require("dotenv").config();

const UserData = require("../models/data");
const Account = require("../models/Account");
const Alert = require("../models/Alert");
const DailyPrediction = require("../models/DailyPrediction");
const UserMonthlyProduction = require("../models/UserMonthlyProduction");
const MonthlyData = require("../models/monthlydata");
const SiteDailyPerformance = require("../models/SiteDailyPerformance");
const SiteMonitoringState = require("../models/SiteMonitoringState");

async function keepOnlyHaider() {
	await mongoose.connect(process.env.MONGO_DB_URI);
	console.log("Connected to MongoDB Atlas.");

	const haiderSiteId = new mongoose.Types.ObjectId("6aafed432204dd7a11df589d");

	// 1. Ensure Haider site is clean, active, and fully configured
	let haiderSite = await UserData.findById(haiderSiteId);
	if (!haiderSite) {
		console.log("Creating Haider Rooftop Solar Array...");
		haiderSite = await UserData.create({
			_id: haiderSiteId,
			name: "Haider Rooftop Solar Array",
			email: "lordxgrimx786@gmail.com",
			ownerName: "Haider",
			phoneNumber: "8933827478",
			siteId: "SITE-LKO-01",
			inverterSerialNumber: "SOL-INV-5000H-780609",
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
			bifaciality: 0,
			status: "Normal"
		});
	} else {
		haiderSite.name = "Haider Rooftop Solar Array";
		haiderSite.email = "lordxgrimx786@gmail.com";
		haiderSite.ownerName = "Haider";
		haiderSite.inverterSerialNumber = "SOL-INV-5000H-780609";
		haiderSite.location = { latitude: 26.8467, longitude: 80.9462 };
		haiderSite.systemCapacity = 5.0;
		haiderSite.numberOfPanels = 14;
		haiderSite.tiltDeg = 26.0;
		haiderSite.azimuthDeg = 180.0;
		haiderSite.status = "Normal";
		await haiderSite.save();
	}
	console.log(`✓ Kept Haider site: ${haiderSite.name} (ID: ${haiderSite._id})`);

	// 2. Remove all other sites
	const delSites = await UserData.deleteMany({ _id: { $ne: haiderSiteId } });
	console.log(`✓ Removed ${delSites.deletedCount} non-Haider sites from UserData`);

	// 3. Remove non-Haider accounts (Keep admin and Haider user)
	const delAccounts = await Account.deleteMany({
		email: { $nin: ["admin@solarbuddy.internal", "lordxgrimx786@gmail.com"] }
	});
	console.log(`✓ Removed ${delAccounts.deletedCount} non-Haider accounts`);

	// 4. Ensure Haider user account points to haiderSiteId
	await Account.updateOne(
		{ email: "lordxgrimx786@gmail.com" },
		{ siteId: haiderSiteId, name: "Haider", role: "user" }
	);
	console.log("✓ Updated Haider customer account link");

	// 5. Remove all alerts (Jaipur outage alert, etc.)
	const delAlerts = await Alert.deleteMany({});
	console.log(`✓ Cleared ${delAlerts.deletedCount} fake alerts`);

	// 6. Remove predictions for non-Haider sites
	const delPreds = await DailyPrediction.deleteMany({ userId: { $ne: haiderSiteId } });
	console.log(`✓ Removed ${delPreds.deletedCount} non-Haider daily predictions`);

	// 7. Remove non-Haider monthly and performance data
	await MonthlyData.deleteMany({ userDataId: { $ne: haiderSiteId } });
	await UserMonthlyProduction.deleteMany({ userId: { $ne: haiderSiteId } });
	await SiteDailyPerformance.deleteMany({ user_id: { $ne: haiderSiteId } });
	await SiteMonitoringState.deleteMany({ user_id: { $ne: haiderSiteId } });
	console.log("✓ Removed non-Haider monthly and monitoring records");

	const remainingSites = await UserData.find({}).lean();
	console.log("\nRemaining sites in database:", remainingSites.map(s => ({ id: s._id.toString(), name: s.name, cap: s.systemCapacity, loc: s.location })));

	const remainingAccounts = await Account.find({}).lean();
	console.log("Remaining accounts:", remainingAccounts.map(a => ({ email: a.email, role: a.role, siteId: a.siteId })));

	await mongoose.disconnect();
	console.log("\nCleanup finished successfully.");
}

keepOnlyHaider().catch(console.error);
