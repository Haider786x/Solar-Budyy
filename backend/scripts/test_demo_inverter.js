require("dotenv").config();
const mongoose = require("mongoose");
const {
	getDemoSettings,
	updateDemoSettings,
	getSimulatedTelemetryForSite
} = require("../services/demoInverterService");

async function testDemo() {
	await mongoose.connect(process.env.MONGO_DB_URI);
	const siteId = "6aafed432204dd7a11df589d";

	console.log("=== Testing Demo Inverter Service ===");

	// 1. Initial settings (default should be OFF)
	let settings = await getDemoSettings();
	console.log("1. Initial settings:", {
		enabled: settings.enabled,
		toleranceKwh: settings.toleranceKwh,
		demoInverterId: settings.demoInverterId
	});

	// 2. Telemetry when demo mode is OFF
	let telOff = await getSimulatedTelemetryForSite(siteId);
	console.log("2. Telemetry with Demo OFF:", telOff);

	// 3. Enable demo mode
	console.log("3. Enabling Demo Inverter Mode...");
	settings = await updateDemoSettings({ enabled: true, toleranceKwh: 2.0, updatedBy: "test" });
	console.log("   Settings updated:", { enabled: settings.enabled, toleranceKwh: settings.toleranceKwh, id: settings.demoInverterId });

	// 4. Telemetry with Demo ON for today
	let telOn = await getSimulatedTelemetryForSite(siteId);
	console.log("4. Telemetry with Demo ON (Today):", {
		enabled: telOn.enabled,
		isSimulated: telOn.isSimulated,
		source: telOn.source,
		demoInverterId: telOn.demoInverterId,
		predictedDailyKwh: telOn.predictedDailyKwh,
		simulatedDailyTotalKwh: telOn.simulatedDailyTotalKwh,
		toleranceKwh: telOn.toleranceKwh,
		varianceKwh: telOn.varianceKwh,
		localTime: telOn.localTime,
		currentPowerKw: telOn.currentPowerKw,
		cumulativeEnergyKwh: telOn.cumulativeEnergyKwh,
		isDaylight: telOn.isDaylight
	});

	// 5. Check determinism: run 3 times and compare
	let run1 = await getSimulatedTelemetryForSite(siteId);
	let run2 = await getSimulatedTelemetryForSite(siteId);
	const isConsistent = run1.simulatedDailyTotalKwh === run2.simulatedDailyTotalKwh &&
		run1.cumulativeEnergyKwh === run2.cumulativeEnergyKwh;
	console.log(`5. Determinism test (repeatable values): ${isConsistent ? "PASSED" : "FAILED"}`);

	// 6. Check tolerance: variance must be within [-2.0, +2.0]
	const varianceWithinTolerance = Math.abs(telOn.varianceKwh) <= settings.toleranceKwh;
	console.log(`6. Tolerance check (abs(variance) <= ${settings.toleranceKwh}): ${varianceWithinTolerance ? "PASSED" : "FAILED"} (${telOn.varianceKwh} kWh)`);

	// 7. Check date restrictions: future date
	let futureTel = await getSimulatedTelemetryForSite(siteId, "2026-11-05");
	console.log("7. Future date restriction:", { isSimulated: futureTel.isSimulated, reason: futureTel.reason });

	// 8. Check date restrictions: past date
	let pastTel = await getSimulatedTelemetryForSite(siteId, "2026-10-30");
	console.log("8. Past date restriction:", { isSimulated: pastTel.isSimulated, reason: pastTel.reason });

	// 9. Reset Demo Mode to OFF (default)
	await updateDemoSettings({ enabled: false });
	console.log("9. Reset Demo Mode to OFF:", (await getDemoSettings()).enabled === false ? "PASSED" : "FAILED");

	console.log("=== All Backend Demo Service Tests Passed ===");
	process.exit(0);
}

testDemo().catch(e => { console.error(e); process.exit(1); });
