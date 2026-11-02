const express = require("express");
const mongoose = require("mongoose");
const DailyPrediction = require("../models/DailyPrediction");
const UserData = require("../models/data");
const { fetchJsonWithTimeout } = require("../services/predictionCollectionService");

const AIML_BASE_URL = process.env.AIML_BASE_URL || process.env.AIML_API_URL || "http://127.0.0.1:8000";
const { runManualPredictionFetch } = require("../services/manualFetchService");
const { getDateDaysAgo, getTodayDateString } = require("../utils/dateUtils");
const { getSimulatedTelemetryForSite } = require("../services/demoInverterService");

const { authenticateUser, requireSiteAccess } = require("../middleware/auth");

const router = express.Router();

const formatNumber = (value) => {
	const numberValue = Number(value ?? 0);
	return Number.isFinite(numberValue) ? Number(numberValue.toFixed(2)) : 0;
};

/**
 * GET /users/:userId/daily-predictions
 * Fetch 6-day prediction history (today + previous 5 days)
 * Returns predictions with predicted column and inverter real-time column (N/A for now)
 */
router.get("/:userId/daily-predictions", authenticateUser, requireSiteAccess, async (req, res) => {
	try {
		const { userId } = req.params;

		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid user ID format"
			});
		}

		const todayStr = getTodayDateString();
		const sixDaysAgoStr = getDateDaysAgo(5);

		const predictions = await DailyPrediction.find({
			userId,
			date: {
				$gte: sixDaysAgoStr,
				$lte: todayStr
			}
		})
			.sort({ date: -1 })
			.lean();

		const simRes = await getSimulatedTelemetryForSite(userId, todayStr);

		const formattedData = predictions.map((pred) => {
			let actualKwhStr = pred.inverter_real_time_kwh ?? "N/A";
			let isSimulated = false;
			let demoInverterId = null;
			let currentPowerKw = null;

			// Demo Inverter Failsafe Mode: only for current site-local date (today) when simulated telemetry is active
			if (pred.date === todayStr && simRes.isSimulated) {
				actualKwhStr = String(simRes.cumulativeEnergyKwh);
				isSimulated = true;
				demoInverterId = simRes.demoInverterId;
				currentPowerKw = simRes.currentPowerKw;
			}

			const predKwh = formatNumber(pred.predicted_kwh);
			const actKwh = actualKwhStr !== "N/A" ? Number(actualKwhStr) : null;
			const diff = (actKwh !== null && predKwh > 0) ? Number((actKwh - predKwh).toFixed(2)) : pred.difference_kwh;

			return {
				date: pred.date,
				predicted_kwh: predKwh,
				inverter_real_time_kwh: actualKwhStr,
				isSimulated,
				demoInverterId,
				currentPowerKw,
				peak_power_kw: formatNumber(pred.peak_power_kw),
				avg_temperature: formatNumber(pred.avg_temperature),
				avg_cloud_cover: formatNumber(pred.avg_cloud_cover),
				difference_kwh: diff,
				comparison: diff !== null ? (diff > 0 ? "greater" : diff < 0 ? "lesser" : "equal") : (pred.comparison ?? "N/A")
			};
		});

		res.status(200).json({
			success: true,
			data: formattedData,
			count: formattedData.length,
			message: "Daily predictions retrieved successfully"
		});
	} catch (err) {
		console.error("[Daily Predictions Route] Error:", err.message);
		res.status(500).json({
			success: false,
			message: "Failed to fetch daily predictions",
			error: err.message
		});
	}
});

/**
 * POST /users/:userId/daily-predictions/trigger
 * Manual monitoring fetch. This endpoint must never evaluate or modify alerts.
 */
router.post("/:userId/daily-predictions/trigger", authenticateUser, requireSiteAccess, async (req, res) => {
	try {
		const { userId } = req.params;

		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid user ID format"
			});
		}

		const result = await runManualPredictionFetch({ userId });

		if (result.totalUsers === 0) {
			return res.status(404).json({
				success: false,
				message: "User data not found"
			});
		}

		if (result.failed > 0 && result.stored === 0 && result.updated === 0) {
			return res.status(502).json({
				success: false,
				message: result.errors[0]?.message || "Daily prediction could not be fetched",
				data: result
			});
		}

		if (result.stored === 0 && result.updated === 0) {
			return res.status(200).json({
				success: true,
				data: result,
				message: result.warnings[0]?.message || "No new prediction was stored"
			});
		}

		res.status(200).json({
			success: true,
			data: result,
			message: "Manual daily prediction fetch completed without alert evaluation"
		});
	} catch (err) {
		console.error("[Daily Predictions Trigger] Error:", err.message);
		res.status(500).json({
			success: false,
			message: "Failed to trigger daily prediction fetch",
			error: err.message
		});
	}
});


/**
 * GET /users/:userId/forecast-7days
 * Real-time 7-day meteorological solar forecast scaled to site capacity and location
 */
router.get("/:userId/forecast-7days", authenticateUser, requireSiteAccess, async (req, res) => {
	try {
		const { userId } = req.params;

		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({ success: false, message: "Invalid user ID format" });
		}

		const user = await UserData.findById(userId).lean();
		if (!user) {
			return res.status(404).json({ success: false, message: "Site not found" });
		}

		const lat = user.location?.latitude || 26.8467;
		const lon = user.location?.longitude || 80.9462;
		const cap = user.systemCapacity || 5.0;
		const tilt = user.tiltDeg || 26.0;
		const az = user.azimuthDeg || 180.0;

		const aimlUrl = new URL("/forecast-7days", AIML_BASE_URL);
		aimlUrl.searchParams.append("lat", lat);
		aimlUrl.searchParams.append("lon", lon);
		aimlUrl.searchParams.append("capacity_kw", cap);
		aimlUrl.searchParams.append("tilt", tilt);
		aimlUrl.searchParams.append("azimuth", az);

		const forecastData = await fetchJsonWithTimeout(aimlUrl.toString(), 10000);
		return res.status(200).json({
			success: true,
			data: forecastData,
			siteCapacity: cap
		});
	} catch (err) {
		console.error("[Forecast 7-Days Route] Error:", err.message);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch 7-day forecast",
			error: err.message
		});
	}
});

module.exports = router;
