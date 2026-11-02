const jwt = require("jsonwebtoken");
const Account = require("../models/Account");
const UserData = require("../models/data");

const JWT_SECRET = process.env.JWT_SECRET || "solarbuddy_jwt_secret_key_2026_etmn100_minor_proj";

/**
 * Authenticate incoming Bearer token and attach fresh account & user context
 */
const authenticateUser = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({
				success: false,
				message: "Authentication required. No Bearer token provided."
			});
		}

		const token = authHeader.split(" ")[1];
		if (!token) {
			return res.status(401).json({
				success: false,
				message: "Authentication token missing."
			});
		}

		const decoded = jwt.verify(token, JWT_SECRET);

		// Always query fresh account status to reflect real-time active status and site link
		const account = await Account.findById(decoded.id);
		if (!account || !account.isActive) {
			return res.status(401).json({
				success: false,
				message: "Authentication failed. Account not found or deactivated."
			});
		}

		req.account = account;
		req.user = {
			id: account._id.toString(),
			name: account.name,
			email: account.email,
			role: account.role,
			siteId: account.siteId ? account.siteId.toString() : null
		};

		next();
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return res.status(401).json({
				success: false,
				message: "Authentication session has expired. Please sign in again."
			});
		}
		return res.status(401).json({
			success: false,
			message: "Invalid or malformed authentication token."
		});
	}
};

/**
 * Require administrator role
 */
const requireAdmin = (req, res, next) => {
	if (!req.user || req.user.role !== "admin") {
		return res.status(403).json({
			success: false,
			message: "Forbidden: Administrator privileges required."
		});
	}
	next();
};

/**
 * Require access to a specific solar site.
 * - Admin has global access to all sites.
 * - Normal user must own the site (matched against site ID or siteName).
 */
const requireSiteAccess = async (req, res, next) => {
	try {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: "Authentication required."
			});
		}

		// Admins have unrestricted fleet access
		if (req.user.role === "admin") {
			return next();
		}

		// Normal user must have a linked site for modifications
		if (!req.user.siteId) {
			return res.status(403).json({
				success: false,
				message: "Forbidden: No solar site associated with this account."
			});
		}

		const userSiteId = req.user.siteId.toString();

		// Check by Site ID for modifications
		const targetSiteId = req.params?.userId || req.params?.siteId || req.body?.userId || req.query?.userId;
		if (targetSiteId && targetSiteId.toString() !== userSiteId) {
			return res.status(403).json({
				success: false,
				message: "Forbidden: You do not have permission to modify this solar site."
			});
		}

		// Check by Site Name (query param or body)
		const targetSiteName = req.query?.siteName || req.body?.siteName;
		if (targetSiteName) {
			const userSite = await UserData.findById(userSiteId).select("name");
			if (!userSite || userSite.name.trim().toLowerCase() !== targetSiteName.trim().toLowerCase()) {
				return res.status(403).json({
					success: false,
					message: "Forbidden: You do not have permission to access reports or data for this site."
				});
			}
		}

		next();
	} catch (error) {
		console.error("[requireSiteAccess] Error:", error.message);
		return res.status(500).json({
			success: false,
			message: "Internal authorization check failed."
		});
	}
};

module.exports = {
	authenticateUser,
	requireAdmin,
	requireSiteAccess
};
