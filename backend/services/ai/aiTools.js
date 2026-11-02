const mongoose = require("mongoose");
const UserData = require("../../models/data");
const DailyPrediction = require("../../models/DailyPrediction");
const Alert = require("../../models/Alert");
const AlertHistory = require("../../models/AlertHistory");
const SiteMonitoringState = require("../../models/SiteMonitoringState");
const UserMonthlyProduction = require("../../models/UserMonthlyProduction");
const { getTodayDateString, getNowInTimezone } = require("../../utils/dateUtils");
const { getSimulatedTelemetryForSite } = require("../../services/demoInverterService");

/**
 * Enforce authorization boundaries: customers are locked to their own siteId;
 * administrators can specify a target site or default to the primary site.
 */
async function resolveAuthorizedSiteId(requestedSiteId, userContext) {
	if (!userContext) {
		throw new Error("Authorization context missing.");
	}

	// Normal customer is strictly locked to their owned site
	if (userContext.role !== "admin") {
		if (!userContext.siteId) {
			// Find primary user site if not directly on token
			const userSite = await UserData.findOne({ ownerId: userContext.id });
			if (userSite) return userSite._id.toString();
			throw new Error("No solar installation linked to your customer account.");
		}
		return userContext.siteId.toString();
	}

	// Admin role: can specify any valid siteId, or default to the userContext site or primary monitored installation
	const candidateId = requestedSiteId || userContext.siteId;
	if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
		const exists = await UserData.findById(candidateId);
		if (exists) return candidateId.toString();
	}

	// Default to primary installation
	const primary = await UserData.findOne({ isDeleted: { $ne: true } });
	if (primary) return primary._id.toString();

	return "6aafed432204dd7a11df589d";
}

/**
 * Tool A: fetchSolarTelemetry
 */
async function fetchSolarTelemetry(params = {}, userContext = {}) {
	const siteId = await resolveAuthorizedSiteId(params.siteId, userContext);
	const targetDate = params.date || getTodayDateString();

	const site = await UserData.findById(siteId).lean();
	if (!site) {
		return { error: `Site with ID ${siteId} not found.` };
	}

	const latestPred = await DailyPrediction.findOne({ userId: siteId, date: targetDate }).lean();

	// Check if this site uses real physical inverter hardware or simulated testbed
	const serial = site.inverterSerialNumber || "";
	const isSimulated = !serial || serial === "PENDING_INVERTER_ID" || serial.includes("DEMO");

	let currentPowerKw = 0;
	let accumulatedTodayKwh = 0;
	let dataSource = isSimulated ? "simulated_telemetry" : "actual_hardware";

	if (isSimulated) {
		const sim = await getSimulatedTelemetryForSite(siteId, targetDate);
		currentPowerKw = sim?.currentPowerKw || 0;
		accumulatedTodayKwh = sim?.todayAccumulatedKwh || 0;
	} else if (latestPred && latestPred.inverter_real_time_kwh !== "N/A" && latestPred.inverter_real_time_kwh != null) {
		accumulatedTodayKwh = Number(latestPred.inverter_real_time_kwh) || 0;
		currentPowerKw = latestPred.peak_power_kw ? +(latestPred.peak_power_kw * 0.85).toFixed(2) : 0;
	} else {
		accumulatedTodayKwh = 0;
		currentPowerKw = 0;
	}

	const now = getNowInTimezone();

	return {
		siteId,
		siteName: site.name,
		inverterSerialNumber: serial || "PENDING_INVERTER_ID",
		currentPowerKw: Number(currentPowerKw.toFixed(2)),
		accumulatedEnergyKwh: Number(accumulatedTodayKwh.toFixed(2)),
		inverterStatus: currentPowerKw > 0 ? "Normal Generation" : "Standby / Low Irradiance",
		timestamp: now.toISO(),
		date: targetDate,
		dataSource,
		isSimulated,
		ratedCapacityKw: site.systemCapacity,
		environmentalConditions: {
			ambientTempC: latestPred?.avg_temperature || 26.5,
			cloudCoverPercent: latestPred?.avg_cloud_cover || 15,
			estimatedPeakIrradianceWm2: latestPred?.peak_power_kw ? +(latestPred.peak_power_kw * 220).toFixed(0) : 840
		}
	};
}

/**
 * Tool B: fetchSolarPerformance
 */
async function fetchSolarPerformance(params = {}, userContext = {}) {
	const siteId = await resolveAuthorizedSiteId(params.siteId, userContext);
	const targetDate = params.date || getTodayDateString();

	const site = await UserData.findById(siteId).lean();
	if (!site) return { error: `Site with ID ${siteId} not found.` };

	const prediction = await DailyPrediction.findOne({ userId: siteId, date: targetDate }).lean();

	const expectedKwh = prediction?.predicted_kwh || 0;
	const hasRealActual = prediction && prediction.inverter_real_time_kwh !== "N/A" && prediction.inverter_real_time_kwh != null;
	const actualKwh = hasRealActual ? Number(prediction.inverter_real_time_kwh) : null;

	const diffKwh = (actualKwh !== null && expectedKwh > 0) ? +(actualKwh - expectedKwh).toFixed(2) : null;
	const diffPercent = (actualKwh !== null && expectedKwh > 0) ? +(((actualKwh - expectedKwh) / expectedKwh) * 100).toFixed(1) : null;

	// Calculate Performance Ratio (PR%) if data is present
	let performanceRatioPercent = null;
	if (actualKwh !== null && site.systemCapacity > 0) {
		const theoreticalPeakKwh = site.systemCapacity * 5.0; // Standard 5.0 peak sun hours
		performanceRatioPercent = +((actualKwh / theoreticalPeakKwh) * 100).toFixed(1);
	}

	// Performance state classification
	let performanceState = "Awaiting Final Telemetry";
	if (diffPercent !== null) {
		if (diffPercent >= -10) performanceState = "Optimal (Normal)";
		else if (diffPercent >= -25) performanceState = "Mild Underperformance (Needs Cleaning / High Heat)";
		else if (diffPercent >= -50) performanceState = "Degraded (Partial Shading / String Anomaly)";
		else performanceState = "Critical Deficit (Check Inverter & String Fuses)";
	}

	return {
		siteId,
		siteName: site.name,
		date: targetDate,
		ratedCapacityKwp: site.systemCapacity,
		expectedDailyKwh: expectedKwh,
		actualAccumulatedKwh: actualKwh !== null ? actualKwh : "Pending Telemetry",
		differenceKwh: diffKwh,
		differencePercent: diffPercent !== null ? `${diffPercent}%` : "—",
		performanceRatioPercent: performanceRatioPercent !== null ? `${performanceRatioPercent}%` : "Calculated at EOD",
		performanceState,
		ambientTempC: prediction?.avg_temperature || 26.5,
		cloudCoverPercent: prediction?.avg_cloud_cover || 12,
		modelUsed: "pvlib Sandia / PVWatts"
	};
}

/**
 * Tool C: fetchSolarAlerts
 */
async function fetchSolarAlerts(params = {}, userContext = {}) {
	const siteId = await resolveAuthorizedSiteId(params.siteId, userContext);

	const site = await UserData.findById(siteId).lean();
	if (!site) return { error: `Site with ID ${siteId} not found.` };

	// Find active and acknowledged alerts
	const activeAlerts = await Alert.find({
		user_id: siteId,
		status: { $ne: "RESOLVED" }
	}).sort({ created_at: -1 }).lean();

	// Find historical resolved records
	const resolvedHistory = await AlertHistory.find({
		user_id: siteId
	}).sort({ created_at: -1 }).limit(5).lean();

	const formattedActive = activeAlerts.map((a) => ({
		id: a._id.toString(),
		severity: a.severity,
		status: a.status,
		notes: a.notes,
		consecutiveDays: a.consecutive_days,
		performancePercent: a.performance_percent,
		createdAt: a.created_at,
		recommendedAction: a.severity === "CRITICAL"
			? "Inspect inverter string fuses, DC isolation switch, and MPPT lockouts."
			: a.severity === "RED"
			? "Check string wiring connections and DC breaker contacts."
			: "Inspect panel glass for dust/soiling accumulation and wash if dry."
	}));

	const formattedHistory = resolvedHistory.map((h) => ({
		incidentId: h.incident_id,
		highestSeverity: h.highest_severity_reached,
		status: h.status,
		notes: h.notes,
		totalDaysActive: h.total_days_active,
		resolvedAt: h.resolved_at
	}));

	return {
		siteId,
		siteName: site.name,
		totalActiveCount: formattedActive.length,
		activeAlerts: formattedActive,
		recentResolvedHistory: formattedHistory,
		systemOperationalState: formattedActive.length === 0 ? "All Systems Operating Normally" : "Operational Attention Required"
	};
}

/**
 * Tool D: fetchSolarWeatherContext
 */
async function fetchSolarWeatherContext(params = {}, userContext = {}) {
	const siteId = await resolveAuthorizedSiteId(params.siteId, userContext);
	const targetDate = params.date || getTodayDateString();

	const site = await UserData.findById(siteId).lean();
	if (!site) return { error: `Site with ID ${siteId} not found.` };

	const pred = await DailyPrediction.findOne({ userId: siteId, date: targetDate }).lean();

	const lat = site.location?.latitude || 26.8467;
	const lon = site.location?.longitude || 80.9462;

	return {
		siteId,
		siteName: site.name,
		location: {
			latitude: lat,
			longitude: lon,
			city: "Lucknow, India"
		},
		date: targetDate,
		avgTemperatureC: pred?.avg_temperature || 26.8,
		avgCloudCoverPercent: pred?.avg_cloud_cover || 14,
		peakPowerExpectedKw: pred?.peak_power_kw || +(site.systemCapacity * 0.75).toFixed(2),
		estimatedGlobalTiltedIrradianceWm2: pred?.peak_power_kw ? +(pred.peak_power_kw * 220).toFixed(0) : 842,
		weatherCategory: (pred?.avg_cloud_cover || 14) < 20 ? "Clear / Sunny" : (pred?.avg_cloud_cover || 14) < 50 ? "Partly Cloudy" : "Overcast",
		weatherImpactAnalysis: (pred?.avg_cloud_cover || 14) < 20
			? "Optimal atmospheric clarity. Little to no cloud attenuation on solar production."
			: "Intermittent cloud cover causing slight diffuse scattering on plane-of-array irradiance."
	};
}

/**
 * Tool E: fetchSolarInstallation
 */
async function fetchSolarInstallation(params = {}, userContext = {}) {
	const siteId = await resolveAuthorizedSiteId(params.siteId, userContext);

	const site = await UserData.findById(siteId).lean();
	if (!site) return { error: `Site with ID ${siteId} not found.` };

	return {
		siteId: site._id.toString(),
		installationName: site.name,
		ownerEmail: site.email,
		systemCapacityKwp: site.systemCapacity,
		numberOfPanels: site.numberOfPanels,
		moduleRatingWatts: site.numberOfPanels > 0 ? +( (site.systemCapacity * 1000) / site.numberOfPanels ).toFixed(0) : 360,
		tiltDegrees: site.tiltDeg,
		azimuthDegrees: site.azimuthDeg,
		azimuthDirection: site.azimuthDeg === 180 ? "South (180°)" : `${site.azimuthDeg}°`,
		shadingFactor: site.shadingFactor,
		lossBreakdownPercent: {
			soiling: site.soilingLossPercent,
			inverterConversion: site.inverterLossPercent,
			wiringResistance: site.wiringLossPercent,
			miscUnaccounted: site.miscLossPercent
		},
		dcAcRatio: site.dc_ac_ratio,
		inverterEfficiencyPercent: site.inv_efficiency,
		bifaciality: site.bifaciality,
		location: {
			latitude: site.location?.latitude || 26.8467,
			longitude: site.location?.longitude || 80.9462,
			region: "Lucknow, Uttar Pradesh, India"
		},
		inverterSerialNumber: site.inverterSerialNumber || "PENDING_INVERTER_ID",
		telemetryStatus: site.inverterSerialNumber && site.inverterSerialNumber !== "PENDING_INVERTER_ID" ? "Transmitting" : "Awaiting Hardware Link"
	};
}

/**
 * Tool F: fetchHistoricalGeneration
 */
async function fetchHistoricalGeneration(params = {}, userContext = {}) {
	const siteId = await resolveAuthorizedSiteId(params.siteId, userContext);
	const site = await UserData.findById(siteId).lean();
	if (!site) return { error: `Site with ID ${siteId} not found.` };

	const limit = Math.min(Number(params.limit || 10), 30);

	const query = { userId: siteId };
	if (params.startDate && params.endDate) {
		query.date = { $gte: params.startDate, $lte: params.endDate };
	}

	const records = await DailyPrediction.find(query)
		.sort({ date: -1 })
		.limit(limit)
		.lean();

	const monthlyRecords = await UserMonthlyProduction.find({ userId: siteId })
		.sort({ year: -1, month: -1 })
		.limit(12)
		.lean();

	const formattedDaily = records.map((r) => ({
		date: r.date,
		expectedKwh: r.predicted_kwh,
		actualKwh: r.inverter_real_time_kwh !== "N/A" && r.inverter_real_time_kwh != null ? Number(r.inverter_real_time_kwh) : null,
		differenceKwh: r.difference_kwh,
		status: r.inverter_real_time_kwh !== "N/A" && r.inverter_real_time_kwh != null ? "Recorded" : "Pending Telemetry"
	}));

	const formattedMonthly = monthlyRecords.map((m) => ({
		year: m.year,
		month: m.month,
		predictedKwh: m.predicted_kwh,
		actualKwh: m.actual_kwh
	}));

	return {
		siteId,
		siteName: site.name,
		recordsRetrievedCount: formattedDaily.length,
		dailyHistory: formattedDaily,
		monthlyAggregates: formattedMonthly
	};
}

/**
 * Definitions for tool schemas exposed to AI / LLM orchestrator
 */
const TOOL_DEFINITIONS = [
	{
		name: "fetchSolarTelemetry",
		description: "Retrieve instantaneous power generation (kW), accumulated daily energy (kWh), inverter status, and telemetry data source for the authorized solar installation.",
		parameters: {
			type: "object",
			properties: {
				siteId: { type: "string", description: "Optional solar installation ID (Admin only)." },
				date: { type: "string", description: "Optional target ISO date YYYY-MM-DD. Defaults to today." }
			}
		},
		execute: fetchSolarTelemetry
	},
	{
		name: "fetchSolarPerformance",
		description: "Analyze actual versus expected solar energy generation (kWh), calculate percentage variance, and check Performance Ratio (PR%) and efficiency states.",
		parameters: {
			type: "object",
			properties: {
				siteId: { type: "string", description: "Optional solar installation ID (Admin only)." },
				date: { type: "string", description: "Optional target ISO date YYYY-MM-DD. Defaults to today." }
			}
		},
		execute: fetchSolarPerformance
	},
	{
		name: "fetchSolarAlerts",
		description: "Retrieve active operational incidents, severity levels (CRITICAL, RED, ORANGE, YELLOW), status, diagnostic notes, and recommended field maintenance actions.",
		parameters: {
			type: "object",
			properties: {
				siteId: { type: "string", description: "Optional solar installation ID (Admin only)." }
			}
		},
		execute: fetchSolarAlerts
	},
	{
		name: "fetchSolarWeatherContext",
		description: "Retrieve meteorological parameters used by SolarBuddy's physics models: plane-of-array GTI (W/m²), cloud cover (%), ambient temperature (°C), and wind speed.",
		parameters: {
			type: "object",
			properties: {
				siteId: { type: "string", description: "Optional solar installation ID (Admin only)." },
				date: { type: "string", description: "Optional target ISO date YYYY-MM-DD. Defaults to today." }
			}
		},
		execute: fetchSolarWeatherContext
	},
	{
		name: "fetchSolarInstallation",
		description: "Retrieve the physical hardware configuration: capacity (kWp), panel count and wattage, tilt angle, azimuth orientation, inverter efficiency, and system loss budget.",
		parameters: {
			type: "object",
			properties: {
				siteId: { type: "string", description: "Optional solar installation ID (Admin only)." }
			}
		},
		execute: fetchSolarInstallation
	},
	{
		name: "fetchHistoricalGeneration",
		description: "Compare stored historical daily and monthly energy yields over a date range without manufacturing artificial values.",
		parameters: {
			type: "object",
			properties: {
				siteId: { type: "string", description: "Optional solar installation ID (Admin only)." },
				startDate: { type: "string", description: "Start date YYYY-MM-DD." },
				endDate: { type: "string", description: "End date YYYY-MM-DD." },
				limit: { type: "number", description: "Max records to return (default 10)." }
			}
		},
		execute: fetchHistoricalGeneration
	}
];

module.exports = {
	TOOL_DEFINITIONS,
	fetchSolarTelemetry,
	fetchSolarPerformance,
	fetchSolarAlerts,
	fetchSolarWeatherContext,
	fetchSolarInstallation,
	fetchHistoricalGeneration
};
