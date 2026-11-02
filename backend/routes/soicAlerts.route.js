const express = require("express");
const {
	getDashboard,
	acknowledgeAlert,
	resolveAlert,
	getResolvedAlerts,
	getSiteAlertHistory,
	generateReportPDF,
	generateReportExcel,
	getValidSites,
	getOperationalHealth,
	previewAlertEvaluation,
	runManualEvaluation
} = require("../controllers/soicAlerts.controller");
const {
	authenticateUser,
	requireAdmin,
	requireSiteAccess
} = require("../middleware/auth");

const router = express.Router();

// Dashboard & Metrics (Admin gets fleet, User gets scoped to their site)
router.get("/dashboard", authenticateUser, getDashboard);
router.get("/alerts/resolved", authenticateUser, getResolvedAlerts);

// Sites list for dropdowns (Admin gets all, User gets only their site)
router.get("/alerts/sites", authenticateUser, getValidSites);

// Incident History and Reports (Requires site ownership or Admin)
router.get("/alerts/history", authenticateUser, requireSiteAccess, getSiteAlertHistory);
router.get("/alerts/history/report/pdf", authenticateUser, requireSiteAccess, generateReportPDF);
router.get("/alerts/history/report/excel", authenticateUser, requireSiteAccess, generateReportExcel);

// Alert Engine Evaluation
router.get("/alerts/preview/:userId", authenticateUser, requireSiteAccess, previewAlertEvaluation);
router.post("/alerts/manual-evaluation", authenticateUser, requireAdmin, runManualEvaluation);

// Incident Resolution & Acknowledgment (Admin only)
router.patch("/alerts/:id/acknowledge", authenticateUser, requireAdmin, acknowledgeAlert);
router.patch("/alerts/:id/resolve", authenticateUser, requireAdmin, resolveAlert);

// Operational Telemetry Health (Admin only)
router.get("/health", authenticateUser, requireAdmin, getOperationalHealth);

module.exports = router;
