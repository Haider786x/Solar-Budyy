const mongoose = require("mongoose");

const demoSettingsSchema = new mongoose.Schema(
	{
		key: {
			type: String,
			default: "default",
			unique: true,
			index: true
		},
		enabled: {
			type: Boolean,
			default: false
		},
		toleranceKwh: {
			type: Number,
			default: 2.0,
			min: 0.1,
			max: 10.0
		},
		demoInverterId: {
			type: String,
			default: "DEMO-SOL-847291"
		},
		updatedBy: {
			type: String,
			default: "system"
		}
	},
	{
		collection: "demo_settings",
		timestamps: true
	}
);

module.exports = mongoose.model("DemoSettings", demoSettingsSchema);
