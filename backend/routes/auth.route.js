const express = require("express");
const {
	register,
	login,
	adminLogin,
	getMe,
	logout
} = require("../controllers/auth.controller");
const { authenticateUser } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/admin/login", adminLogin);
router.get("/me", authenticateUser, getMe);
router.post("/logout", logout);

module.exports = router;
