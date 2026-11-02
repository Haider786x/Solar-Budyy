const express = require("express");
const {
	createUserData,
	listUserData,
	getUserDataById,
	getSolarReportForUser,
	refreshSolarReportForUser,
	deleteUserData,
	updateUserData,
	getMonthlyProductionForUser
} = require("../controllers/userData.controller");
const {
	authenticateUser,
	requireAdmin,
	requireSiteAccess
} = require("../middleware/auth");

const router = express.Router();

// Site Creation (Authenticated users only; normal users restricted to 1 site)
router.post("/enter", authenticateUser, createUserData);

// Fleet site list (Authenticated users)
router.get("/users", authenticateUser, listUserData);

// Individual site operations (Owner or Admin only)
router.get("/users/:userId", authenticateUser, requireSiteAccess, getUserDataById);
router.get("/users/:userId/solar-report", authenticateUser, requireSiteAccess, getSolarReportForUser);
router.get("/:userId/solar-report", authenticateUser, requireSiteAccess, getSolarReportForUser);
router.post("/users/:userId/solar-report/refresh", authenticateUser, requireSiteAccess, refreshSolarReportForUser);
router.get("/users/:userId/monthly-production", authenticateUser, requireSiteAccess, getMonthlyProductionForUser);
router.put("/users/:userId", authenticateUser, requireSiteAccess, updateUserData);
router.delete("/users/:userId", authenticateUser, requireSiteAccess, deleteUserData);

module.exports = router;
