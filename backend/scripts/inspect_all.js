const mongoose = require("mongoose");
const UserData = require("../models/data");
const Account = require("../models/Account");
const Alert = require("../models/Alert");
const DailyPrediction = require("../models/DailyPrediction");
require("dotenv").config();

async function inspectAll() {
	await mongoose.connect(process.env.MONGO_DB_URI);
	const sites = await UserData.find({}).lean();
	console.log(`Sites (${sites.length}):`, sites.map(s => ({ id: s._id.toString(), name: s.name, serial: s.inverterSerialNumber, capacity: s.systemCapacity })));

	const accounts = await Account.find({}).lean();
	console.log(`Accounts (${accounts.length}):`, accounts.map(a => ({ id: a._id.toString(), email: a.email, role: a.role, siteId: a.siteId })));

	const alerts = await Alert.find({}).lean();
	console.log(`Alerts (${alerts.length}):`, alerts.map(a => ({ id: a._id.toString(), site_name: a.site_name, severity: a.severity, status: a.status })));

	const preds = await DailyPrediction.aggregate([
		{ $group: { _id: "$userId", count: { $sum: 1 } } }
	]);
	console.log("Prediction counts per userId:", preds);

	await mongoose.disconnect();
}

inspectAll().catch(console.error);
