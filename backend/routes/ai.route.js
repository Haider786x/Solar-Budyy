const express = require("express");
const { chat, getStatus } = require("../controllers/ai.controller");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

// Require authentication for all AI operational capabilities
router.post("/chat", authenticateUser, chat);
router.get("/status", authenticateUser, getStatus);

module.exports = router;
