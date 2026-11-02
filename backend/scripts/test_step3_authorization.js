const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const http = require('http');
const app = require('../app');
const Account = require('../models/Account');
const UserData = require('../models/data');

let server;
let baseUrl;

const runTests = async () => {
	console.log('--- STARTING STEP 3 AUTHORIZATION TEST SUITE ---');
	let passed = 0;
	let failed = 0;

	const assert = (condition, testName) => {
		if (condition) {
			console.log(`  [PASS] ${testName}`);
			passed++;
		} else {
			console.error(`  [FAIL] ${testName}`);
			failed++;
		}
	};

	try {
		await mongoose.connect(process.env.MONGO_DB_URI);
		console.log('Connected to MongoDB.');

		// Start ephemeral server
		server = http.createServer(app);
		await new Promise((resolve) => {
			server.listen(0, () => {
				const port = server.address().port;
				baseUrl = `http://127.0.0.1:${port}`;
				console.log(`Test server running at ${baseUrl}`);
				resolve();
			});
		});

		// 1. UNAUTHENTICATED REQUESTS ARE BLOCKED (401)
		console.log('\n1. Testing Unauthenticated Request Blocks (HTTP 401)...');
		const resUsersNoAuth = await fetch(`${baseUrl}/users`);
		assert(resUsersNoAuth.status === 401, 'GET /users without token returns 401');

		const resEnterNoAuth = await fetch(`${baseUrl}/enter`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Hacker Site' })
		});
		assert(resEnterNoAuth.status === 401, 'POST /enter without token returns 401');

		const resDashboardNoAuth = await fetch(`${baseUrl}/soic/dashboard`);
		assert(resDashboardNoAuth.status === 401, 'GET /soic/dashboard without token returns 401');

		// 2. LOGINS & PREPARATION
		console.log('\n2. Authenticating Test Accounts...');
		// Normal User A
		const loginUserARes = await fetch(`${baseUrl}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'lordxgrimx786@gmail.com',
				password: 'UserSolarBuddy2026!'
			})
		});
		const loginUserData = await loginUserARes.json();
		assert(loginUserARes.status === 200 && loginUserData.token, 'User A login succeeds');
		const userAToken = loginUserData.token;
		const userASiteId = loginUserData.user.siteId;
		assert(!!userASiteId, `User A has linked siteId: ${userASiteId}`);

		const siteARecord = await UserData.findById(userASiteId);
		const siteAName = siteARecord.name;
		console.log(`  User A Site: ${siteAName} (${userASiteId})`);

		// Admin
		const loginAdminRes = await fetch(`${baseUrl}/auth/admin/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'admin@solarbuddy.internal',
				password: 'AdminSolarBuddy2026!'
			})
		});
		const loginAdminData = await loginAdminRes.json();
		assert(loginAdminRes.status === 200 && loginAdminData.token, 'Admin login succeeds');
		const adminToken = loginAdminData.token;

		// Create Test User B & Site B for cross-tenant testing
		console.log('\n3. Creating User B & Site B for Cross-Tenant Testing...');
		await Account.deleteOne({ email: 'user_b_test@solarbuddy.test' });
		const regUserBRes = await fetch(`${baseUrl}/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'User B Test',
				email: 'user_b_test@solarbuddy.test',
				password: 'UserBSecret123!',
				confirmPassword: 'UserBSecret123!'
			})
		});
		const regUserBData = await regUserBRes.json();
		assert(regUserBRes.status === 201 && regUserBData.token, 'User B registration succeeds');
		const userBToken = regUserBData.token;

		// User B creates Site B
		const createSiteBRes = await fetch(`${baseUrl}/enter`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${userBToken}`
			},
			body: JSON.stringify({
				name: 'Site B Test Installation',
				location: { latitude: 26.85, longitude: 80.95 },
				email: 'user_b_test@solarbuddy.test',
				phoneNumber: '9876543210',
				systemCapacity: 5,
				numberOfPanels: 10,
				tiltDeg: 20,
				azimuthDeg: 180,
				soilingLossPercent: 2,
				inverterLossPercent: 2,
				wiringLossPercent: 2,
				miscLossPercent: 2
			})
		});
		const createSiteBData = await createSiteBRes.json();
		assert(createSiteBRes.status === 201 && createSiteBData.siteId, 'User B created Site B');
		const userBSiteId = createSiteBData.siteId;
		const siteBName = 'Site B Test Installation';

		// Verify User B account now has siteId
		const updatedAccountB = await Account.findOne({ email: 'user_b_test@solarbuddy.test' });
		assert(updatedAccountB.siteId && updatedAccountB.siteId.toString() === userBSiteId.toString(), 'User B Account automatically linked to Site B');

		// 4. ONE-SITE ENFORCEMENT (409 Conflict)
		console.log('\n4. Testing One-Site Enforcement (HTTP 409)...');
		const userASecondSiteRes = await fetch(`${baseUrl}/enter`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${userAToken}`
			},
			body: JSON.stringify({
				name: 'Illegal Second Site A',
				location: { latitude: 26.85, longitude: 80.95 },
				systemCapacity: 10,
				numberOfPanels: 20,
				tiltDeg: 20,
				azimuthDeg: 180,
				soilingLossPercent: 2,
				inverterLossPercent: 2,
				wiringLossPercent: 2,
				miscLossPercent: 2
			})
		});
		assert(userASecondSiteRes.status === 409, 'User A blocked from creating 2nd site (returns 409 Conflict)');

		const userBSecondSiteRes = await fetch(`${baseUrl}/enter`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${userBToken}`
			},
			body: JSON.stringify({
				name: 'Illegal Second Site B',
				location: { latitude: 26.85, longitude: 80.95 },
				systemCapacity: 10,
				numberOfPanels: 20,
				tiltDeg: 20,
				azimuthDeg: 180,
				soilingLossPercent: 2,
				inverterLossPercent: 2,
				wiringLossPercent: 2,
				miscLossPercent: 2
			})
		});
		assert(userBSecondSiteRes.status === 409, 'User B blocked from creating 2nd site (returns 409 Conflict)');

		// 5. USER A ACCESSING OWN SITE (200 OK)
		console.log('\n5. Testing User A Accessing Own Site (HTTP 200)...');
		const ownSiteRes = await fetch(`${baseUrl}/users/${userASiteId}`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(ownSiteRes.status === 200, 'User A can GET own site data');

		const ownMonthlyRes = await fetch(`${baseUrl}/users/${userASiteId}/monthly-production`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(ownMonthlyRes.status === 200, 'User A can GET own monthly production');

		const ownPredRes = await fetch(`${baseUrl}/users/${userASiteId}/daily-predictions`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(ownPredRes.status === 200, 'User A can GET own daily predictions');

		const ownHistoryRes = await fetch(`${baseUrl}/soic/alerts/history?siteName=${encodeURIComponent(siteAName)}`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(ownHistoryRes.status === 200, 'User A can GET own incident history');

		const ownSitesDropdownRes = await fetch(`${baseUrl}/soic/alerts/sites`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		const ownSitesData = await ownSitesDropdownRes.json();
		assert(ownSitesDropdownRes.status === 200 && ownSitesData.data.length === 1 && ownSitesData.data[0] === siteAName, 'User A sees only their own site in dropdown');

		const ownDashboardRes = await fetch(`${baseUrl}/soic/dashboard`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		const ownDashboardData = await ownDashboardRes.json();
		assert(ownDashboardRes.status === 200 && ownDashboardData.data.metrics.total_sites === 1, 'User A dashboard is scoped strictly to 1 site');

		// 6. CROSS-TENANT SITE ISOLATION & PARAMETER TAMPERING (HTTP 403 FORBIDDEN)
		console.log('\n6. Testing Cross-Tenant Isolation & Query Tampering (HTTP 403)...');
		const tamperGetSite = await fetch(`${baseUrl}/users/${userBSiteId}`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(tamperGetSite.status === 403, 'User A blocked from GET /users/:siteB (403 Forbidden)');

		const tamperPutSite = await fetch(`${baseUrl}/users/${userBSiteId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${userAToken}`
			},
			body: JSON.stringify({ name: 'Tampered Name' })
		});
		assert(tamperPutSite.status === 403, 'User A blocked from PUT /users/:siteB (403 Forbidden)');

		const tamperDeleteSite = await fetch(`${baseUrl}/users/${userBSiteId}`, {
			method: 'DELETE',
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(tamperDeleteSite.status === 403, 'User A blocked from DELETE /users/:siteB (403 Forbidden)');

		const tamperSolarReport = await fetch(`${baseUrl}/users/${userBSiteId}/solar-report`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(tamperSolarReport.status === 403, 'User A blocked from GET /users/:siteB/solar-report (403 Forbidden)');

		const tamperRefreshReport = await fetch(`${baseUrl}/users/${userBSiteId}/solar-report/refresh`, {
			method: 'POST',
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(tamperRefreshReport.status === 403, 'User A blocked from POST /users/:siteB/solar-report/refresh (403 Forbidden)');

		const tamperDailyPred = await fetch(`${baseUrl}/users/${userBSiteId}/daily-predictions`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(tamperDailyPred.status === 403, 'User A blocked from GET /users/:siteB/daily-predictions (403 Forbidden)');

		const tamperTriggerPred = await fetch(`${baseUrl}/users/${userBSiteId}/daily-predictions/trigger`, {
			method: 'POST',
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(tamperTriggerPred.status === 403, 'User A blocked from POST /users/:siteB/daily-predictions/trigger (403 Forbidden)');

		const tamperSiteNameHistory = await fetch(`${baseUrl}/soic/alerts/history?siteName=${encodeURIComponent(siteBName)}`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(tamperSiteNameHistory.status === 403, 'User A blocked from query parameter tampering ?siteName=SiteB (403 Forbidden)');

		const tamperReportPdf = await fetch(`${baseUrl}/soic/alerts/history/report/pdf?siteName=${encodeURIComponent(siteBName)}`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(tamperReportPdf.status === 403, 'User A blocked from PDF download for Site B (403 Forbidden)');

		const tamperReportExcel = await fetch(`${baseUrl}/soic/alerts/history/report/excel?siteName=${encodeURIComponent(siteBName)}`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(tamperReportExcel.status === 403, 'User A blocked from Excel download for Site B (403 Forbidden)');

		// 7. ADMIN PRIVILEGES & FLEET ACCESS
		console.log('\n7. Testing Admin Privileges & Role Isolation...');
		const normalUserFleetList = await fetch(`${baseUrl}/users`, {
			headers: { 'Authorization': `Bearer ${userAToken}` }
		});
		assert(normalUserFleetList.status === 403, 'Normal user blocked from GET /users (403 Forbidden)');

		const normalUserManualEval = await fetch(`${baseUrl}/soic/alerts/manual-evaluation`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${userAToken}`
			},
			body: JSON.stringify({ confirm: true })
		});
		assert(normalUserManualEval.status === 403, 'Normal user blocked from running manual alert evaluation (403 Forbidden)');

		const adminFleetList = await fetch(`${baseUrl}/users`, {
			headers: { 'Authorization': `Bearer ${adminToken}` }
		});
		const adminFleetData = await adminFleetList.json();
		assert(adminFleetList.status === 200 && Array.isArray(adminFleetData.data), 'Admin can GET /users fleet list');

		const adminGetSiteA = await fetch(`${baseUrl}/users/${userASiteId}`, {
			headers: { 'Authorization': `Bearer ${adminToken}` }
		});
		assert(adminGetSiteA.status === 200, 'Admin can view Site A');

		const adminGetSiteB = await fetch(`${baseUrl}/users/${userBSiteId}`, {
			headers: { 'Authorization': `Bearer ${adminToken}` }
		});
		assert(adminGetSiteB.status === 200, 'Admin can view Site B');

		const adminHistorySiteB = await fetch(`${baseUrl}/soic/alerts/history?siteName=${encodeURIComponent(siteBName)}`, {
			headers: { 'Authorization': `Bearer ${adminToken}` }
		});
		assert(adminHistorySiteB.status === 200, 'Admin can view incident history for Site B');

		const adminSitesDropdown = await fetch(`${baseUrl}/soic/alerts/sites`, {
			headers: { 'Authorization': `Bearer ${adminToken}` }
		});
		const adminSitesData = await adminSitesDropdown.json();
		assert(adminSitesDropdown.status === 200 && adminSitesData.data.length >= 2, 'Admin dropdown contains entire fleet');

		const adminDashboard = await fetch(`${baseUrl}/soic/dashboard`, {
			headers: { 'Authorization': `Bearer ${adminToken}` }
		});
		const adminDashboardData = await adminDashboard.json();
		assert(adminDashboard.status === 200 && adminDashboardData.data.metrics.total_sites >= 2, 'Admin dashboard reflects entire multi-site fleet');

		// 8. CLEANUP
		console.log('\n8. Cleaning up test data...');
		await UserData.findByIdAndDelete(userBSiteId);
		await Account.deleteOne({ email: 'user_b_test@solarbuddy.test' });
		console.log('  Cleaned up temporary User B and Site B.');

		console.log(`\nTEST RESULTS: ${passed} Passed, ${failed} Failed\n`);
		if (failed > 0) {
			process.exit(1);
		}
	} catch (err) {
		console.error('Fatal Test Runner Error:', err);
		process.exit(1);
	} finally {
		if (server) server.close();
		await mongoose.disconnect();
		process.exit(0);
	}
};

runTests();
