const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const authRoute = require("./routes/auth.route");
const userDataRoute = require("./routes/userData.route");
const dailyPredictionRoute = require("./routes/dailyPrediction.route");
const soicAlertsRoute = require("./routes/soicAlerts.route");
const positiveProductionEmailRoute = require("./routes/positiveProductionEmail.route");
const demoRoute = require("./routes/demo.route");
const aiRoute = require("./routes/ai.route");
const { initializeDailyPredictionScheduler } = require("./services/dailyPredictionScheduler");
const { syncAllHistoricalMonthlyProduction } = require("./services/monthlyProductionService");

require("./services/db");

const app = express();
app.use(express.json());
const allowedOrigins = process.env.FRONTEND_ORIGIN
	? process.env.FRONTEND_ORIGIN.split(",").map(o => o.trim())
	: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"];

app.use((req, res, next) => {
	const origin = req.headers.origin;
	if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
		res.header("Access-Control-Allow-Origin", origin || "*");
	}
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
	res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Credentials", "true");

	if (req.method === "OPTIONS") {
		return res.sendStatus(204);
	}

	next();
});

app.use("/auth", authRoute);
app.use("/", userDataRoute);
app.use("/users", dailyPredictionRoute);
app.use("/soic", soicAlertsRoute);
app.use("/notifications", positiveProductionEmailRoute);
app.use("/api/demo", demoRoute);
app.use("/api/ai", aiRoute);

app.get("/", (req, res) => {
	res.send("Backend running");
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);

		if (process.env.DAILY_PREDICTION_SCHEDULER_DISABLED !== "true") {
			initializeDailyPredictionScheduler();
		}

		// Trigger historical sync on startup
		syncAllHistoricalMonthlyProduction();
	});
}

module.exports = app;
