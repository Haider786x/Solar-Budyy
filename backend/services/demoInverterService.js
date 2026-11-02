const crypto = require("crypto");
const DemoSettings = require("../models/DemoSettings");
const DailyPrediction = require("../models/DailyPrediction");
const UserData = require("../models/data");
const { getNowInTimezone, getTodayDateString, TIMEZONE } = require("../utils/dateUtils");

const DEFAULT_TOLERANCE_KWH = Number(process.env.DEMO_ENERGY_TOLERANCE_KWH || 2.0);
const SUNRISE_HOUR = 6.25; // 06:15 AM
const SUNSET_HOUR = 17.75; // 05:45 PM
const DAYLIGHT_HOURS = SUNSET_HOUR - SUNRISE_HOUR; // 11.5 hours

/**
 * Get or initialize persistent demo settings document
 */
async function getDemoSettings() {
	let settings = await DemoSettings.findOne({ key: "default" });
	if (!settings) {
		const randomSixDigits = Math.floor(100000 + Math.random() * 900000);
		settings = await DemoSettings.create({
			key: "default",
			enabled: false,
			toleranceKwh: DEFAULT_TOLERANCE_KWH,
			demoInverterId: `SOL-INV-5000H-${randomSixDigits}`,
			updatedBy: "system"
		});
	}
	return settings;
}

/**
 * Update demo settings (Admin only)
 */
async function updateDemoSettings({ enabled, toleranceKwh, demoInverterId, updatedBy }) {
	const settings = await getDemoSettings();

	if (typeof enabled === "boolean") {
		settings.enabled = enabled;
	}
	if (typeof toleranceKwh === "number" && toleranceKwh >= 0.1 && toleranceKwh <= 10.0) {
		settings.toleranceKwh = Number(toleranceKwh.toFixed(1));
	}
	if (typeof demoInverterId === "string" && demoInverterId.trim()) {
		settings.demoInverterId = demoInverterId.trim().toUpperCase();
	}
	if (updatedBy) {
		settings.updatedBy = updatedBy;
	}

	await settings.save();
	return settings;
}

/**
 * Deterministic delta in [-toleranceKwh, +toleranceKwh] based on siteId and date string
 */
function getDeterministicDelta(siteId, dateStr, toleranceKwh) {
	const hash = crypto.createHash("sha256").update(`${siteId}:${dateStr}`).digest("hex");
	// Take first 8 chars of hex hash as 32-bit unsigned int
	const intVal = parseInt(hash.slice(0, 8), 16);
	// Normalize to [-1.0, 1.0]
	const factor = (intVal / 0xffffffff) * 2 - 1;
	return Number((factor * toleranceKwh).toFixed(2));
}

/**
 * Calculate time-aware simulated telemetry for a given site
 * Strictly accumulates up to the current minute in Asia/Kolkata
 */
async function getSimulatedTelemetryForSite(siteId, targetDate = null) {
	const settings = await getDemoSettings();

	if (!settings.enabled) {
		return {
			enabled: false,
			isSimulated: false,
			reason: "Telemetry stream is in standby"
		};
	}

	const user = await UserData.findById(siteId).lean();
	if (!user) {
		return {
			enabled: true,
			isSimulated: false,
			reason: "Site not found"
		};
	}

	// Inverter hardware telemetry active
	const effectiveInverterId = user.inverterSerialNumber || settings.demoInverterId || "SOL-INV-5000H-780609";
	const nowInTz = getNowInTimezone();
	const todayDateStr = getTodayDateString();
	const requestedDateStr = targetDate || todayDateStr;

	// Date restrictions (Requirement 6)
	if (requestedDateStr > todayDateStr) {
		return {
			enabled: true,
			isSimulated: false,
			date: requestedDateStr,
			isFuture: true,
			reason: "Future date requested. Inverter telemetry stream is active for today."
		};
	}

	if (requestedDateStr < todayDateStr) {
		return {
			enabled: true,
			isSimulated: false,
			date: requestedDateStr,
			isPast: true,
			reason: "Past date requested. Stored historical inverter telemetry applies."
		};
	}

	// Fetch today's prediction from database
	const prediction = await DailyPrediction.findOne({
		userId: user._id,
		date: todayDateStr
	}).lean();

	if (!prediction || !prediction.predicted_kwh || prediction.predicted_kwh <= 0) {
		return {
			enabled: true,
			isSimulated: false,
			predictionAvailable: false,
			date: todayDateStr,
			demoInverterId: settings.demoInverterId,
			message: "Today's solar prediction is pending calculation. Telemetry stream will synchronize once daily prediction is ready."
		};
	}

	const predictedKwh = Number(prediction.predicted_kwh);
	const delta = getDeterministicDelta(user._id.toString(), todayDateStr, settings.toleranceKwh);
	const simulatedDailyTotalKwh = Math.max(0.1, Number((predictedKwh + delta).toFixed(2)));

	// Current local time calculations in Asia/Kolkata
	const currentHour = nowInTz.hour;
	const currentMinute = nowInTz.minute;
	const currentSecond = nowInTz.second;
	const timeFraction = currentHour + currentMinute / 60 + currentSecond / 3600;

	let currentPowerKw = 0.0;
	let cumulativeEnergyKwh = 0.0;
	let isDaylight = false;

	if (timeFraction <= SUNRISE_HOUR) {
		// Before sunrise: 0 kW power, 0 kWh cumulative energy
		currentPowerKw = 0.0;
		cumulativeEnergyKwh = 0.0;
		isDaylight = false;
	} else if (timeFraction >= SUNSET_HOUR) {
		// After sunset: 0 kW power, cumulative energy capped at final daily simulated total
		currentPowerKw = 0.0;
		cumulativeEnergyKwh = simulatedDailyTotalKwh;
		isDaylight = false;
	} else {
		// During daylight hours: smooth sinusoidal progression
		isDaylight = true;
		const progressAngle = ((timeFraction - SUNRISE_HOUR) / DAYLIGHT_HOURS) * Math.PI;

		// Cumulative energy is the integral of the solar half-sine wave: (1 - cos(theta)) / 2
		const cumulativeFraction = (1 - Math.cos(progressAngle)) / 2;
		cumulativeEnergyKwh = Number((simulatedDailyTotalKwh * cumulativeFraction).toFixed(2));

		// Instantaneous power (kW) at this exact moment
		const peakPowerFactor = Math.PI / (2 * DAYLIGHT_HOURS);
		const instantaneousKw = simulatedDailyTotalKwh * peakPowerFactor * Math.sin(progressAngle);
		currentPowerKw = Math.max(0, Number(instantaneousKw.toFixed(2)));
	}

	// Build 24-hour hourly curve for chart visualization
	const hourlyCurve = [];
	for (let h = 0; h < 24; h++) {
		const hourStr = `${String(h).padStart(2, "0")}:00`;
		if (h < Math.floor(SUNRISE_HOUR) || h > Math.ceil(SUNSET_HOUR)) {
			hourlyCurve.push({
				time: hourStr,
				expected: 0.0,
				actual: h <= currentHour ? 0.0 : null,
				powerKw: 0.0
			});
		} else {
			const theta = ((h + 0.5 - SUNRISE_HOUR) / DAYLIGHT_HOURS) * Math.PI;
			const hourlyPowerKw = Number(
				Math.max(0, simulatedDailyTotalKwh * (Math.PI / (2 * DAYLIGHT_HOURS)) * Math.sin(theta)).toFixed(2)
			);
			const expectedPowerKw = Number(
				Math.max(0, predictedKwh * (Math.PI / (2 * DAYLIGHT_HOURS)) * Math.sin(theta)).toFixed(2)
			);

			hourlyCurve.push({
				time: hourStr,
				expected: expectedPowerKw,
				actual: h <= currentHour ? hourlyPowerKw : null,
				powerKw: hourlyPowerKw
			});
		}
	}

	return {
		enabled: true,
		isSimulated: true,
		source: "telemetry",
		siteId: user._id.toString(),
		siteName: user.name,
		date: todayDateStr,
		timezone: TIMEZONE,
		localTime: `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`,
		demoInverterId: settings.demoInverterId,
		isSynchronized: true,
		predictedDailyKwh: predictedKwh,
		simulatedDailyTotalKwh,
		toleranceKwh: settings.toleranceKwh,
		varianceKwh: delta,
		currentPowerKw,
		cumulativeEnergyKwh,
		isDaylight,
		sunrise: "06:15 AM",
		sunset: "05:45 PM",
		hourlyCurve
	};
}

module.exports = {
	getDemoSettings,
	updateDemoSettings,
	getDeterministicDelta,
	getSimulatedTelemetryForSite,
	DEFAULT_TOLERANCE_KWH
};
