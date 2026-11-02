const mongoose = require("mongoose");

const alertHistorySchema = new mongoose.Schema(
	{
		alert_id: { type: mongoose.Schema.Types.ObjectId, ref: "Alert", index: true },
		user_id: { type: mongoose.Schema.Types.ObjectId, ref: "UserData", required: true, index: true },
		site_id: { type: String, required: true },
		site_name: { type: String, required: true },
		incident_id: { type: String, required: true },
		incident_start_date: { type: String },
		incident_end_date: { type: String },
		highest_severity_reached: { type: String, required: true },
		total_days_active: { type: Number, default: 0 },
		status: { type: String, required: true },
		performance_window: [{
			date: { type: String, required: true },
			predicted_kwh: { type: Number, required: true },
			actual_kwh: { type: Number, required: true },
			difference_kwh: { type: Number, required: true },
			performance_percent: { type: Number, default: null }
		}],
		notes: { type: String, default: "" },
		resolved_at: { type: Date, default: null },
		resolved_by: { type: String, default: "" }
	},
	{
		collection: "soic_alert_history",
		timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
	}
);

const immutableHistoryError = new Error("AlertHistory is immutable and cannot be modified after creation.");

alertHistorySchema.pre("save", function preventHistoryDocumentUpdate() {
	if (!this.isNew) throw immutableHistoryError;
});

["updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete"].forEach((hook) => {
	alertHistorySchema.pre(hook, function preventHistoryMutation() {
		if (this.getOptions()?.skipImmutableCheck) return;
		throw immutableHistoryError;
	});
});

module.exports = mongoose.model("AlertHistory", alertHistorySchema);
