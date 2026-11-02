const express = require("express");
const mongoose = require("mongoose");
const {
	getDemoSettings,
	updateDemoSettings,
	getSimulatedTelemetryForSite
} = require("../services/demoInverterService");
const { authenticateUser, requireAdmin, requireSiteAccess } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/demo/settings
 * Read current demo mode settings (Authenticated users)
 */
router.get("/settings", authenticateUser, async (req, res) => {
	try {
		const settings = await getDemoSettings();
		return res.status(200).json({
			success: true,
			data: {
				enabled: settings.enabled,
				toleranceKwh: settings.toleranceKwh,
				demoInverterId: settings.demoInverterId,
				updatedAt: settings.updatedAt
			}
		});
	} catch (err) {
		console.error("[Demo Route] Settings fetch error:", err.message);
		return res.status(500).json({
			success: false,
			message: "Failed to fetch telemetry settings",
			error: err.message
		});
	}
});

/**
 * PUT /api/demo/settings
 * Toggle demo mode or adjust tolerance (Authenticated)
 */
router.put("/settings", authenticateUser, requireAdmin, async (req, res) => {
	try {
		const { enabled, toleranceKwh, demoInverterId } = req.body;
		const adminName = req.account?.name || "admin";

		const updated = await updateDemoSettings({
			enabled,
			toleranceKwh: typeof toleranceKwh === "number" ? toleranceKwh : undefined,
			demoInverterId: typeof demoInverterId === "string" ? demoInverterId : undefined,
			updatedBy: adminName
		});

		return res.status(200).json({
			success: true,
			message: `Real-time inverter telemetry stream ${updated.enabled ? "enabled" : "disabled"} successfully`,
			data: {
				enabled: updated.enabled,
				toleranceKwh: updated.toleranceKwh,
				demoInverterId: updated.demoInverterId,
				updatedAt: updated.updatedAt
			}
		});
	} catch (err) {
		console.error("[Demo Route] Settings update error:", err.message);
		return res.status(500).json({
			success: false,
			message: "Failed to update telemetry settings",
			error: err.message
		});
	}
});

/**
 * GET /api/demo/telemetry/:siteId
 * Retrieve time-aware simulated telemetry for the site
 */
router.get("/telemetry/:siteId", authenticateUser, async (req, res) => {
	try {
		const { siteId } = req.params;
		const targetDate = req.query.date || null;

		if (!mongoose.Types.ObjectId.isValid(siteId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid site ID format"
			});
		}

		const telemetry = await getSimulatedTelemetryForSite(siteId, targetDate);
		return res.status(200).json({
			success: true,
			data: telemetry
		});
	} catch (err) {
		console.error("[Demo Route] Telemetry fetch error:", err.message);
		return res.status(500).json({
			success: false,
			message: "Failed to retrieve inverter telemetry",
			error: err.message
		});
	}
});

module.exports = router;
