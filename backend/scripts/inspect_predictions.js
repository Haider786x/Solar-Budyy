require("dotenv").config();
const mongoose = require("mongoose");
const DailyPrediction = require("../models/DailyPrediction");
const UserData = require("../models/data");

async function check() {
	await mongoose.connect(process.env.MONGO_DB_URI || process.env.MONGODB_URI);
	const user = await UserData.findOne().lean();
	console.log("User site:", user?.name, user?._id, "Inverter:", user?.inverterSerialNumber);
	const preds = await DailyPrediction.find({ userId: user?._id }).lean();
	console.log("Predictions count:", preds.length);
	for (const p of preds) {
		console.log(`- Date: ${p.date} | Predicted: ${p.predicted_kwh} kWh | Inverter: ${p.inverter_real_time_kwh} | Peak: ${p.peak_power_kw} kW`);
	}
	process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
