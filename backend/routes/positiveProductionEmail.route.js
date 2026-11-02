const express = require("express");
const {
	triggerPositiveProductionEmails,
	listPositiveProductionEmailLogs,
	verifyPositiveProductionEmailConfig
} = require("../controllers/positiveProductionEmail.controller");
const {
	authenticateUser,
	requireAdmin,
	requireSiteAccess
} = require("../middleware/auth");

const router = express.Router();

router.post("/positive-production/trigger", authenticateUser, requireAdmin, triggerPositiveProductionEmails);
router.post("/users/:userId/positive-production/trigger", authenticateUser, requireSiteAccess, triggerPositiveProductionEmails);
router.get("/positive-production/logs", authenticateUser, requireAdmin, listPositiveProductionEmailLogs);
router.get("/users/:userId/positive-production/logs", authenticateUser, requireSiteAccess, listPositiveProductionEmailLogs);
router.get("/positive-production/verify", authenticateUser, requireAdmin, verifyPositiveProductionEmailConfig);

module.exports = router;
