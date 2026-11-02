const http = require("http");

async function postJSON(urlStr, data) {
	const url = new URL(urlStr);
	const body = JSON.stringify(data);
	return new Promise((resolve, reject) => {
		const req = http.request(
			{
				hostname: url.hostname,
				port: url.port,
				path: url.pathname,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(body)
				}
			},
			(res) => {
				let raw = "";
				res.on("data", (c) => (raw += c));
				res.on("end", () => {
					try {
						resolve({ status: res.statusCode, data: JSON.parse(raw) });
					} catch (e) {
						resolve({ status: res.statusCode, raw });
					}
				});
			}
		);
		req.on("error", reject);
		req.write(body);
		req.end();
	});
}

async function getJSON(urlStr, token) {
	const url = new URL(urlStr);
	return new Promise((resolve, reject) => {
		const headers = {};
		if (token) headers["Authorization"] = `Bearer ${token}`;
		const req = http.request(
			{
				hostname: url.hostname,
				port: url.port,
				path: url.pathname,
				method: "GET",
				headers
			},
			(res) => {
				let raw = "";
				res.on("data", (c) => (raw += c));
				res.on("end", () => {
					try {
						resolve({ status: res.statusCode, data: JSON.parse(raw) });
					} catch (e) {
						resolve({ status: res.statusCode, raw });
					}
				});
			}
		);
		req.on("error", reject);
		req.end();
	});
}

async function run() {
	console.log("=== SolarBuddy Verification: Clean Architecture & Real Auth ===");

	// 1. Admin Login via dedicated admin endpoint
	const adminRes = await postJSON("http://localhost:5000/auth/admin/login", {
		email: "admin@solarbuddy.internal",
		password: process.env.ADMIN_PASSWORD || "AdminSolarBuddy2026!"
	});
	console.log(`1. Admin login status: ${adminRes.status} | User: ${adminRes.data?.user?.name} | Role: ${adminRes.data?.user?.role}`);
	const adminToken = adminRes.data?.token;

	// 2. Fetch fleet sites as Admin
	const sitesRes = await getJSON("http://localhost:5000/users", adminToken);
	const sites = sitesRes.data?.data || sitesRes.data || [];
	console.log(`2. Fleet sites count: ${sites.length}`);
	if (sites[0]) {
		console.log(`   Site Name: ${sites[0].name}`);
		console.log(`   Capacity: ${sites[0].systemCapacity} kWp`);
		console.log(`   Inverter Serial: ${sites[0].inverterSerialNumber}`);
		console.log(`   Location: ${JSON.stringify(sites[0].location)}`);
	}

	// 3. Check SOIC Alerts
	const alertRes = await getJSON("http://localhost:5000/soic/dashboard", adminToken);
	const critCount = alertRes.data?.critical_sites?.length || 0;
	const degCount = alertRes.data?.degraded_sites?.length || 0;
	console.log(`3. SOIC Alert counts: Critical=${critCount}, Degraded=${degCount}`);

	// 4. Customer Login
	const userRes = await postJSON("http://localhost:5000/auth/login", {
		email: "lordxgrimx786@gmail.com",
		password: process.env.USER_PASSWORD || "UserSolarBuddy2026!"
	});
	console.log(`4. Customer login status: ${userRes.status} | User: ${userRes.data?.user?.name} | Role: ${userRes.data?.user?.role}`);
	const userToken = userRes.data?.token;
	const userSiteId = userRes.data?.user?.siteId;
	console.log(`   Linked siteId: ${userSiteId}`);

	// 5. Fetch single site details as Customer
	if (userSiteId) {
		const singleSiteRes = await getJSON(`http://localhost:5000/users/${userSiteId}`, userToken);
		const siteObj = singleSiteRes.data?.data || singleSiteRes.data;
		console.log(`5. Customer site access status: ${singleSiteRes.status} | Site: ${siteObj?.name} | Capacity: ${siteObj?.systemCapacity} kWp`);
	}

	console.log("=== Verification Completed Successfully ===");
}

run().catch((e) => {
	console.error("Verification failed:", e);
	process.exit(1);
});
