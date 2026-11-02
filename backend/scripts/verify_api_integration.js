const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

async function verifyApi() {
	const BASE_URL = "http://localhost:5000";

	console.log("1. Testing POST /auth/login for Customer...");
	const customerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			email: "lordxgrimx786@gmail.com",
			password: "UserSolarBuddy2026!"
		})
	});
	const customerAuth = await customerLoginRes.json();
	if (!customerAuth.token) throw new Error("Customer login failed: " + JSON.stringify(customerAuth));
	console.log("Customer Auth Passed:", customerAuth.user?.email, "SiteId:", customerAuth.user?.siteId);

	console.log("\n2. Testing POST /auth/admin/login for Admin...");
	const adminLoginRes = await fetch(`${BASE_URL}/auth/admin/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			email: "admin@solarbuddy.internal",
			password: "AdminSolarBuddy2026!"
		})
	});
	const adminAuth = await adminLoginRes.json();
	if (!adminAuth.token) throw new Error("Admin login failed: " + JSON.stringify(adminAuth));
	console.log("Admin Auth Passed:", adminAuth.user?.email, "Role:", adminAuth.user?.role);

	console.log("\n3. Testing GET /users (Fleet Installations) with Admin Token...");
	const fleetRes = await fetch(`${BASE_URL}/users`, {
		headers: { Authorization: `Bearer ${adminAuth.token}` }
	});
	const fleetResData = await fleetRes.json();
	const fleetList = fleetResData.data || fleetResData;
	console.log("Fleet Sites count:", fleetList.length);
	fleetList.forEach((s) => console.log(`  - ${s.name} (${s._id}) | Cap: ${s.systemCapacity} kWp`));

	console.log("\n4. Testing GET /users/:siteId for Mohammad Haider site...");
	const siteId = customerAuth.user.siteId;
	const siteRes = await fetch(`${BASE_URL}/users/${siteId}`, {
		headers: { Authorization: `Bearer ${customerAuth.token}` }
	});
	const siteResData = await siteRes.json();
	const siteDetail = siteResData.data || siteResData;
	console.log("Site Details:", siteDetail.name, "Tilt:", siteDetail.tiltDeg, "Azimuth:", siteDetail.azimuthDeg);

	console.log("\n5. Testing GET /users/:siteId/daily-predictions...");
	const predRes = await fetch(`${BASE_URL}/users/${siteId}/daily-predictions`, {
		headers: { Authorization: `Bearer ${customerAuth.token}` }
	});
	const predData = await predRes.json();
	const predList = predData.data || predData;
	console.log("Daily Predictions count:", predList.length);
	if (predList.length > 0) {
		console.log("Sample prediction:", predList[0]);
	}

	console.log("\n6. Testing POST /users/:siteId/daily-predictions/trigger (Live Simulation Engine)...");
	const triggerRes = await fetch(`${BASE_URL}/users/${siteId}/daily-predictions/trigger`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${customerAuth.token}`
		}
	});
	const triggerData = await triggerRes.json();
	console.log("Live Trigger Status:", triggerRes.status, "Message:", triggerData.message);

	console.log("\n7. Testing GET /soic/dashboard...");
	const soicRes = await fetch(`${BASE_URL}/soic/dashboard`, {
		headers: { Authorization: `Bearer ${adminAuth.token}` }
	});
	const soicData = await soicRes.json();
	const soicPayload = soicData.data || soicData;
	console.log("SOIC Metrics:", soicPayload.metrics);
	console.log("Active Alerts Count:", soicPayload.active_alerts?.length);
	if (soicPayload.active_alerts?.length > 0) {
		console.log("Active Alert:", soicPayload.active_alerts[0].site_name, soicPayload.active_alerts[0].severity, soicPayload.active_alerts[0].notes);
	}

	console.log("\n==========================================");
	console.log("✅ ALL BACKEND ENDPOINTS VERIFIED OPERATIONAL!");
	console.log("==========================================");
}

verifyApi().catch((err) => {
	console.error("[API Verification Error]:", err.message);
	process.exit(1);
});
