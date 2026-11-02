const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Account = require("../models/Account");
const UserData = require("../models/data");
const DailyPrediction = require("../models/DailyPrediction");

const PRIMARY_SITE_ID = new mongoose.Types.ObjectId("6aafed432204dd7a11df589d");

async function resetDatabase() {
	console.log("Connecting to MongoDB Atlas...");
	await mongoose.connect(process.env.MONGO_DB_URI);
	console.log("Connected successfully.\n");

	// 1. Clear all existing collections completely using native mongo collection calls
	console.log("Clearing all existing accounts, installations, alerts, and predictions...");
	const colNames = [
		"accounts",
		"userdatas",
		"dailypredictions",
		"soic_alerts",
		"soic_alert_history",
		"user_monthly_production",
		"monthlydata",
		"site_daily_performance",
		"site_monitoring_states"
	];

	for (const col of colNames) {
		try {
			await mongoose.connection.collection(col).deleteMany({});
			console.log(`  - Cleared ${col}`);
		} catch (e) {
			// Collection may not exist yet
		}
	}
	console.log("✓ All collections cleared.\n");

	// 2. Create the new Admin account: Haider-admin
	const adminEmail = "admin@solarbuddy.internal";
	const adminSalt = await bcrypt.genSalt(10);
	const adminHash = await bcrypt.hash("AdminSolarBuddy2026!", adminSalt);

	const adminAccount = await Account.create({
		name: "Haider-admin",
		email: adminEmail,
		passwordHash: adminHash,
		role: "admin",
		siteId: null,
		isActive: true
	});
	console.log(`✓ Admin account created: ${adminAccount.name} <${adminAccount.email}> (Role: ${adminAccount.role})`);

	// 3. Create the new customer installation: Haider (Home) 4kW, 6 panels
	const customerEmail = "lordxgrimx786@gmail.com";

	const newSite = await UserData.create({
		_id: PRIMARY_SITE_ID,
		name: "Haider (Home)",
		email: customerEmail,
		phoneNumber: "+91 8933827478",
		siteId: "SITE-LKO-4000H",
		inverterSerialNumber: "SOL-INV-4000H-780609",
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
		bifaciality: 0,
		location: {
			latitude: 26.853177,
			longitude: 80.892815
		}
	});
	console.log(`✓ Solar installation created: ${newSite.name} (Capacity: ${newSite.systemCapacity} kW, ${newSite.numberOfPanels} panels at ${newSite.location.latitude}, ${newSite.location.longitude})`);

	// 4. Create the new customer account: Haider (Home)
	const userSalt = await bcrypt.genSalt(10);
	const userHash = await bcrypt.hash("UserSolarBuddy2026!", userSalt);

	const customerAccount = await Account.create({
		name: "Haider (Home)",
		email: customerEmail,
		passwordHash: userHash,
		role: "user",
		siteId: newSite._id,
		isActive: true
	});
	console.log(`✓ Customer account created: ${customerAccount.name} <${customerAccount.email}> (Role: ${customerAccount.role}, Linked Site: ${newSite._id})`);

	// 5. Update site's ownerId to the customerAccount
	await UserData.findByIdAndUpdate(newSite._id, { ownerId: customerAccount._id });

	// 6. Seed today's prediction for the 4kW 6-panel system
	const todayStr = new Date().toISOString().split("T")[0];
	const todayPred = await DailyPrediction.create({
		userId: newSite._id,
		date: todayStr,
		predicted_kwh: 15.84,
		peak_power_kw: 3.12,
		avg_temperature: 26.8,
		avg_cloud_cover: 12,
		inverter_real_time_kwh: "N/A",
		difference_kwh: null,
		comparison: "N/A",
		sample_type: "INTRADAY",
		source: "manual_fetch"
	});
	console.log(`✓ Today's prediction seeded: ${todayPred.date} (Expected: ${todayPred.predicted_kwh} kWh, Peak: ${todayPred.peak_power_kw} kW)`);

	console.log("\n=======================================================");
	console.log("✅ DATABASE SUCCESSFULLY RESET TO REQUESTED STATE!");
	console.log("   Admin:    Haider-admin <admin@solarbuddy.internal>");
	console.log("   Customer: Haider (Home) <lordxgrimx786@gmail.com>");
	console.log("   Site:     Haider (Home) - 4KW, 6 Panels (26.853177, 80.892815)");
	console.log("=======================================================");

	await mongoose.disconnect();
}

resetDatabase().catch((err) => {
	console.error("Error resetting database:", err);
	process.exit(1);
});
