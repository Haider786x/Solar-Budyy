const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Account = require("../models/Account");
const UserData = require("../models/data");
const Alert = require("../models/Alert");
const DailyPrediction = require("../models/DailyPrediction");
const UserMonthlyProduction = require("../models/UserMonthlyProduction");

async function seedFleetData() {
	console.log("Connecting to MongoDB Atlas...");
	await mongoose.connect(process.env.MONGO_DB_URI, {
		serverSelectionTimeoutMS: 8000
	});
	console.log("Connected to MongoDB Atlas.");

	const defaultHashedPassword = await bcrypt.hash("UserSolarBuddy2026!", 10);
	const adminHashedPassword = await bcrypt.hash("AdminSolarBuddy2026!", 10);

	// 1. Ensure Admin Account Exists (Idempotent)
	let adminAccount = await Account.findOne({ email: "admin@solarbuddy.internal" });
	if (!adminAccount) {
		adminAccount = await Account.create({
			name: "Fleet Operations Admin",
			email: "admin@solarbuddy.internal",
			passwordHash: adminHashedPassword,
			role: "admin",
			isActive: true
		});
		console.log("Created Admin Account:", adminAccount.email);
	} else {
		console.log("Admin Account already exists:", adminAccount.email);
	}

	// 2. Installations to ensure (Idempotent check by email)
	const installations = [
		{
			name: "Mohammad Haider - Lucknow Rooftop Array",
			shortName: "Lucknow — Mohammad Haider",
			email: "lordxgrimx786@gmail.com",
			ownerName: "Mohammad Haider",
			phoneNumber: "8933827478",
			siteId: "SITE-LUCKNOW-01",
			inverterSerialNumber: "INV-LKO-88219",
			location: { latitude: 26.8467, longitude: 80.9462 },
			systemCapacity: 5.04,
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
		},
		{
			name: "New Delhi Commercial Solar Hub",
			shortName: "New Delhi — Solar Hub",
			email: "facilities@delhitech.in",
			ownerName: "Delhi Tech Park Facilities",
			phoneNumber: "9811223344",
			siteId: "SITE-DELHI-02",
			inverterSerialNumber: "INV-DEL-10492",
			location: { latitude: 28.6139, longitude: 77.2090 },
			systemCapacity: 14.91,
			numberOfPanels: 42,
			tiltDeg: 28.0,
			azimuthDeg: 180.0,
			shadingFactor: 0.98,
			soilingLossPercent: 2.5,
			inverterLossPercent: 2.0,
			wiringLossPercent: 1.8,
			miscLossPercent: 1.0,
			dc_ac_ratio: 1.2,
			inv_efficiency: 98.2,
			bifaciality: 0
		},
		{
			name: "Bengaluru Innovation Tech Park",
			shortName: "Bengaluru — Tech Park",
			email: "green@bangalorecampus.org",
			ownerName: "Bangalore Green Energy Group",
			phoneNumber: "9845012345",
			siteId: "SITE-BLR-03",
			inverterSerialNumber: "INV-BLR-33921",
			location: { latitude: 12.9716, longitude: 77.5946 },
			systemCapacity: 25.2,
			numberOfPanels: 70,
			tiltDeg: 13.0,
			azimuthDeg: 180.0,
			shadingFactor: 0.99,
			soilingLossPercent: 1.5,
			inverterLossPercent: 1.8,
			wiringLossPercent: 1.5,
			miscLossPercent: 1.0,
			dc_ac_ratio: 1.2,
			inv_efficiency: 98.5,
			bifaciality: 0
		},
		{
			name: "Jaipur Solar Farm West",
			shortName: "Jaipur — Solar Farm West",
			email: "ops@rajasthansolar.co",
			ownerName: "Rajasthan Solar Operations",
			phoneNumber: "9414098765",
			siteId: "SITE-JPR-04",
			inverterSerialNumber: "INV-JPR-99410",
			location: { latitude: 26.9124, longitude: 75.7873 },
			systemCapacity: 50.4,
			numberOfPanels: 140,
			tiltDeg: 27.0,
			azimuthDeg: 180.0,
			shadingFactor: 0.97,
			soilingLossPercent: 3.0,
			inverterLossPercent: 2.5,
			wiringLossPercent: 2.0,
			miscLossPercent: 1.5,
			dc_ac_ratio: 1.2,
			inv_efficiency: 98.0,
			bifaciality: 0
		}
	];

	const seededSites = [];

	for (const inst of installations) {
		// Idempotent Account check
		let account = await Account.findOne({ email: inst.email });
		if (!account) {
			account = await Account.create({
				name: inst.ownerName,
				email: inst.email,
				passwordHash: defaultHashedPassword,
				role: "user",
				isActive: true
			});
			console.log(`Created Account for ${inst.email}`);
		}

		// Idempotent UserData check
		let site = await UserData.findOne({ email: inst.email });
		if (!site) {
			site = await UserData.create({
				...inst,
				ownerId: account._id
			});
			console.log(`Created Installation for ${inst.name}`);
		} else {
			// Update siteId/inverterSerialNumber if empty
			if (!site.siteId) {
				site.siteId = inst.siteId;
				await site.save();
			}
			console.log(`Installation already exists: ${site.name} (${site._id})`);
		}

		// Link account to site if not set
		if (!account.siteId || account.siteId.toString() !== site._id.toString()) {
			account.siteId = site._id;
			await account.save();
			console.log(`Linked Account ${account.email} to site ${site._id}`);
		}

		seededSites.push({ account, site, inst });
	}

	// 3. Ensure Active Incident for Jaipur Solar Farm West (Idempotent)
	const jaipurData = seededSites.find((s) => s.inst.name.includes("Jaipur"));
	if (jaipurData) {
		const existingAlert = await Alert.findOne({
			user_id: jaipurData.site._id,
			status: { $in: ["OPEN", "ACKNOWLEDGED"] }
		});

		if (!existingAlert) {
			await Alert.create({
				user_id: jaipurData.site._id,
				site_id: jaipurData.site.siteId || "SITE-JPR-04",
				site_name: jaipurData.site.name,
				severity: "CRITICAL",
				status: "ACKNOWLEDGED",
				predicted_kwh: 245.0,
				actual_kwh: 0.0,
				difference_kwh: -245.0,
				performance_percent: 1.5,
				consecutive_days: 1,
				notes: "String 2 open circuit failure & inverter MPPT lockout. Daytime output flatlined."
			});
			console.log("Created Active Critical Incident for Jaipur Solar Farm West");
		} else {
			console.log("Active incident already exists for Jaipur Solar Farm West");
		}
	}

	// 4. Ensure 10-Day Historical DailyPrediction records for each site (Idempotent upsert)
	const historyTemplates = [
		{ date: "2026-10-22", expRatio: 0.95, actRatio: 0.93, diffPct: -1.7, temp: 28.5, cloud: 10 },
		{ date: "2026-10-23", expRatio: 0.96, actRatio: 0.94, diffPct: -2.1, temp: 29.0, cloud: 12 },
		{ date: "2026-10-24", expRatio: 0.94, actRatio: 0.91, diffPct: -3.1, temp: 28.2, cloud: 15 },
		{ date: "2026-10-25", expRatio: 0.92, actRatio: 0.88, diffPct: -4.5, temp: 27.8, cloud: 20 },
		{ date: "2026-10-26", expRatio: 0.94, actRatio: 0.85, diffPct: -9.8, temp: 26.5, cloud: 25 },
		{ date: "2026-10-27", expRatio: 0.95, actRatio: 0.82, diffPct: -14.1, temp: 27.0, cloud: 18 },
		{ date: "2026-10-28", expRatio: 0.96, actRatio: 0.76, diffPct: -20.8, temp: 28.8, cloud: 14 },
		{ date: "2026-10-29", expRatio: 0.95, actRatio: 0.72, diffPct: -24.0, temp: 29.5, cloud: 11 },
		{ date: "2026-10-30", expRatio: 0.96, actRatio: 0.73, diffPct: -24.0, temp: 30.1, cloud: 10 },
		{ date: "2026-10-31", expRatio: 0.97, actRatio: 0.95, diffPct: -2.4, temp: 31.5, cloud: 8 }
	];

	for (const { site, inst } of seededSites) {
		const cap = site.systemCapacity || 5.0;
		// Special handling for Jaipur outage on recent dates
		const isOutageSite = inst.name.includes("Jaipur");

		for (const h of historyTemplates) {
			const expectedKwh = +(cap * 4.9 * h.expRatio).toFixed(2);
			const actualKwh = isOutageSite && (h.date >= "2026-10-30")
				? 0
				: +(expectedKwh * (1 + h.diffPct / 100)).toFixed(2);
			const diffKwh = +(actualKwh - expectedKwh).toFixed(2);

			await DailyPrediction.updateOne(
				{ userId: site._id, date: h.date },
				{
					$setOnInsert: {
						userId: site._id,
						date: h.date,
						predicted_kwh: expectedKwh,
						inverter_real_time_kwh: actualKwh.toString(),
						difference_kwh: diffKwh,
						comparison: `${((actualKwh / expectedKwh) * 100).toFixed(1)}% of expected target`,
						avg_temperature: h.temp,
						avg_cloud_cover: h.cloud,
						peak_power_kw: +(cap * 0.75).toFixed(2),
						source: "seeded_telemetry",
						sample_type: "FINAL"
					}
				},
				{ upsert: true }
			);
		}
		console.log(`Verified 10-day historical predictions for ${site.name}`);
	}

	// 5. Ensure 12-Month UserMonthlyProduction Records (Idempotent upsert)
	const monthlyLedger = [
		{ month: 1, name: "Jan", expected: 580, actual: 572 },
		{ month: 2, name: "Feb", expected: 640, actual: 635 },
		{ month: 3, name: "Mar", expected: 750, actual: 742 },
		{ month: 4, name: "Apr", expected: 820, actual: 805 },
		{ month: 5, name: "May", expected: 860, actual: 830 },
		{ month: 6, name: "Jun", expected: 790, actual: 750 },
		{ month: 7, name: "Jul", expected: 680, actual: 645 },
		{ month: 8, name: "Aug", expected: 690, actual: 660 },
		{ month: 9, name: "Sep", expected: 710, actual: 692 },
		{ month: 10, name: "Oct", expected: 730, actual: 668 }
	];

	for (const { site } of seededSites) {
		const scale = (site.systemCapacity || 5.0) / 5.04;
		for (const m of monthlyLedger) {
			const expected_kwh = +(m.expected * scale).toFixed(1);
			const actual_kwh = +(m.actual * scale).toFixed(1);
			const diff = +(actual_kwh - expected_kwh).toFixed(1);

			await UserMonthlyProduction.updateOne(
				{ userId: site._id, year: 2026, month: String(m.month) },
				{
					$set: {
						userId: site._id,
						year: 2026,
						month: String(m.month),
						predicted_kwh: expected_kwh,
						actual_kwh,
						difference_kwh: diff,
						comparison: `${+((actual_kwh / expected_kwh) * 100).toFixed(1)}% of expected target`,
						performance_ratio_percent: +((actual_kwh / expected_kwh) * 100).toFixed(1),
						bill_savings_inr: +(actual_kwh * 7.50).toFixed(0),
						source: "monthly_reconciliation"
					}
				},
				{ upsert: true }
			);
		}
		console.log(`Verified 2026 monthly production ledger for ${site.name}`);
	}

	console.log("\n==========================================");
	console.log("✅ IDEMPOTENT FLEET SEEDING COMPLETE!");
	console.log("==========================================");
	process.exit(0);
}

seedFleetData().catch((err) => {
	console.error("[Seeding Error]:", err);
	process.exit(1);
});
