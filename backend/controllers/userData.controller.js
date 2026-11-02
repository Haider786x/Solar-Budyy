const UserData = require("../models/data");
const Account = require("../models/Account");
const MonthlyData = require("../models/monthlydata");
const DailyPrediction = require("../models/DailyPrediction");
const SiteDailyPerformance = require("../models/SiteDailyPerformance");
const UserMonthlyProduction = require("../models/UserMonthlyProduction");
const SiteMonitoringState = require("../models/SiteMonitoringState");
const Alert = require("../models/Alert");
const AlertHistory = require("../models/AlertHistory");

const AIML_API_URL = process.env.AIML_API_URL || "http://127.0.0.1:8000";
const { refreshSolarReportForUser: executeAnalyticsRefresh } = require("../services/analyticsRefreshService");

const createUserData = async (req, res) => {
	try {
		// Strict check for Normal Users: One-site limit enforcement
		if (req.user && req.user.role === "user") {
			const account = await Account.findById(req.user.id);
			if (account && account.siteId) {
				return res.status(409).json({
					success: false,
					message: "Conflict: This account already has a registered solar site. Normal user accounts are limited to exactly one site."
				});
			}

			// Pre-fill site metadata from authenticated account
			req.body.ownerId = req.user.id;
			if (!req.body.email) req.body.email = req.user.email;
			if (!req.body.name && req.user.name) req.body.name = req.user.name;
		} else if (req.user && req.user.role === "admin") {
			req.body.ownerId = req.body.ownerId || req.user.id;
		}

		if (!req.body.location && (req.body.latitude != null || req.body.longitude != null)) {
			req.body.location = {
				latitude: Number(req.body.latitude),
				longitude: Number(req.body.longitude)
			};
		}

		// Ensure schema defaults so minimal onboarding payloads never fail validation
		if (!req.body.phoneNumber) req.body.phoneNumber = "+91 8933827478";
		if (req.body.tiltDeg == null) req.body.tiltDeg = 26;
		if (req.body.azimuthDeg == null) req.body.azimuthDeg = 180;
		if (req.body.soilingLossPercent == null) req.body.soilingLossPercent = 2.0;
		if (req.body.inverterLossPercent == null) req.body.inverterLossPercent = 2.0;
		if (req.body.wiringLossPercent == null) req.body.wiringLossPercent = 2.0;
		if (req.body.miscLossPercent == null) req.body.miscLossPercent = 1.5;
		if (req.body.dc_ac_ratio == null) req.body.dc_ac_ratio = 1.2;
		if (req.body.inv_efficiency == null) req.body.inv_efficiency = 98.0;

		const createdRecord = await UserData.create(req.body);

		// If created by a normal user, associate the site to their Account
		if (req.user && req.user.role === "user") {
			await Account.findByIdAndUpdate(req.user.id, { siteId: createdRecord._id });
		}
		
		let analyticsGenerated = false;
		try {
			await executeAnalyticsRefresh(createdRecord._id.toString());
			analyticsGenerated = true;
		} catch (analyticsError) {
			console.error("[User Creation] Failed to auto-generate analytics for new user:", analyticsError.message);
		}

		return res.status(201).json({
			success: true,
			message: "Solar site created successfully",
			data: createdRecord,
			siteId: createdRecord._id,
			analyticsGenerated
		});
	} catch (error) {
		return res.status(400).json({
			success: false,
			message: "Failed to create user data",
			error: error.message
		});
	}
};

const listUserData = async (req, res) => {
	try {
		if (req.user && req.user.role !== "admin") {
			return res.status(403).json({
				success: false,
				message: "Forbidden: Fleet directory access restricted to administrators."
			});
		}
		const users = await UserData.find().sort({ createdAt: -1, _id: -1 });
		return res.status(200).json({
			message: "Users fetched successfully",
			data: users
		});
	} catch (error) {
		return res.status(500).json({
			message: "Failed to fetch users",
			error: error.message
		});
	}
};

const getUserDataById = async (req, res) => {
	try {
		const { userId } = req.params;
		const user = await UserData.findById(userId);

		if (!user) {
			return res.status(404).json({
				message: "User data not found"
			});
		}

		return res.status(200).json({
			message: "User fetched successfully",
			data: user
		});
	} catch (error) {
		return res.status(500).json({
			message: "Failed to fetch user",
			error: error.message
		});
	}
};

const getSolarReportForUser = async (req, res) => {
	try {
		const { userId } = req.params;
		const report = await MonthlyData.findOne({ userDataId: userId }).lean();
		
		if (!report) {
			return res.status(404).json({
				message: "Solar report not found. Please click Refresh Report to generate one."
			});
		}

		return res.status(200).json({
			message: "Solar report fetched successfully",
			data: report
		});
	} catch (error) {
		return res.status(500).json({
			message: "Failed to fetch solar report",
			error: error.message
		});
	}
};

const refreshSolarReportForUser = async (req, res) => {
	try {
		const { userId } = req.params;
		
		const { report, metadata } = await executeAnalyticsRefresh(userId);

		return res.status(200).json({
			message: "Solar report regenerated successfully",
			data: { report, metadata }
		});
	} catch (error) {
		return res.status(500).json({
			message: "Failed to regenerate solar report",
			error: error.message
		});
	}
};

const deleteUserData = async (req, res) => {
	try {
		const { userId } = req.params;

		const user = await UserData.findByIdAndDelete(userId);

		if (!user) {
			return res.status(404).json({
				message: "User data not found"
			});
		}

		// Cascade delete all associated operational and analytics data
		await Promise.all([
			MonthlyData.deleteOne({ userDataId: userId }),
			DailyPrediction.deleteMany({ userId: userId }),
			SiteDailyPerformance.deleteMany({ user_id: userId }),
			UserMonthlyProduction.deleteMany({ userId: userId }),
			SiteMonitoringState.deleteOne({ user_id: userId }),
			Alert.deleteMany({ user_id: userId }),
			AlertHistory.deleteMany({ user_id: userId }),
			Account.updateMany({ siteId: userId }, { $set: { siteId: null } })
		]);

		return res.status(200).json({
			success: true,
			message: "User data deleted successfully",
			data: user
		});
	} catch (error) {
		return res.status(500).json({
			message: "Failed to delete user data",
			error: error.message
		});
	}
};

const updateUserData = async (req, res) => {
	try {
		const { userId } = req.params;
		const updatedData = { ...req.body };

		if (!updatedData.location && (updatedData.latitude != null || updatedData.longitude != null)) {
			updatedData.location = {
				latitude: Number(updatedData.latitude),
				longitude: Number(updatedData.longitude)
			};
		} else if (updatedData.location) {
			updatedData.location = {
				latitude: Number(updatedData.location.latitude ?? updatedData.latitude ?? 26.8467),
				longitude: Number(updatedData.location.longitude ?? updatedData.longitude ?? 80.9462)
			};
		}

		const user = await UserData.findByIdAndUpdate(userId, updatedData, {
			returnDocument: "after",
			runValidators: true
		});

		if (!user) {
			return res.status(404).json({
				message: "User data not found"
			});
		}

		return res.status(200).json({
			message: "User data updated successfully",
			data: user
		});
	} catch (error) {
		return res.status(400).json({
			message: "Failed to update user data",
			error: error.message
		});
	}
};

const getMonthlyProductionForUser = async (req, res) => {
	try {
		const { userId } = req.params;
		const user = await UserData.findById(userId);
		if (!user) {
			return res.status(404).json({
				message: "User data not found"
			});
		}

		// 1. Fetch static monthly predictions
		const monthlyReport = await MonthlyData.findOne({ userDataId: userId }).lean();
		const staticPredictions = monthlyReport?.monthly_energy_kwh || {};

		// 2. Fetch all recorded monthly actual production records
		const records = await UserMonthlyProduction.find({ userId }).lean();

		// Construct the response data
		const currentYear = new Date().getFullYear();
		const yearsSet = new Set(records.map((r) => r.year));
		yearsSet.add(currentYear);
		const years = Array.from(yearsSet).sort((a, b) => a - b);

		const result = [];
		const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

		for (const year of years) {
			for (let i = 0; i < MONTHS.length; i++) {
				const month = MONTHS[i];
				const monthNumStr = String(i + 1);
				const record = records.find(
					(r) =>
						r.userId.toString() === userId.toString() &&
						r.year === year &&
						(r.month === month || r.month === monthNumStr || r.month === i + 1)
				);

				const predicted = record && record.predicted_kwh
					? record.predicted_kwh
					: (staticPredictions[month] || 0);
				const actual = record ? record.actual_kwh : 0;
				const difference = +(actual - predicted).toFixed(2);
				const performanceRatio = predicted > 0 ? +((actual / predicted) * 100).toFixed(1) : 0;
				const comparison = record?.comparison && record.comparison !== "N/A"
					? record.comparison
					: `${performanceRatio}% of expected target`;
				const hasData = record
					? (record.daily_values && Object.keys(record.daily_values).length > 0) || record.actual_kwh > 0
					: false;

				result.push({
					year,
					month,
					monthIndex: i + 1,
					predicted_kwh: Number(predicted.toFixed(2)),
					actual_kwh: Number(actual.toFixed(2)),
					difference_kwh: difference,
					performance_ratio_percent: performanceRatio,
					bill_savings_inr: Math.round(actual * 7.50),
					comparison,
					hasData
				});
			}
		}

		return res.status(200).json({
			message: "Monthly production retrieved successfully",
			data: result
		});
	} catch (error) {
		return res.status(500).json({
			message: "Failed to fetch monthly production",
			error: error.message
		});
	}
};

module.exports = {
	createUserData,
	listUserData,
	getUserDataById,
	getSolarReportForUser,
	refreshSolarReportForUser,
	deleteUserData,
	updateUserData,
	getMonthlyProductionForUser
};
