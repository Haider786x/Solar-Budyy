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
	console.log('================================================================');
	console.log(' SOLARBUDDY END-TO-END VERIFICATION & AUTHORIZATION SUITE ');
	console.log('================================================================');
	let passed = 0;
	let failed = 0;

	const assert = (condition, testName) => {
		if (condition) {
			console.log(`  ✓ [PASS] ${testName}`);
			passed++;
		} else {
			console.error(`  ✗ [FAIL] ${testName}`);
			failed++;
		}
	};

	try {
		await mongoose.connect(process.env.MONGO_DB_URI);
		console.log('Database connected: MongoDB Atlas');

		// Start ephemeral test server
		server = http.createServer(app);
		await new Promise((resolve) => {
			server.listen(0, () => {
				const port = server.address().port;
				baseUrl = `http://127.0.0.1:${port}`;
				console.log(`Test server initialized at ${baseUrl}\n`);
				resolve();
			});
		});

		const testCustomerEmail = 'e2e_customer_test@solarbuddy.test';
		await Account.deleteOne({ email: testCustomerEmail });

		// SECTION 1: CUSTOMER REGISTRATION & ONE-SITE ENFORCEMENT
		console.log('--- SECTION 1: CUSTOMER REGISTRATION & ONE-SITE POLICY ---');
		const regRes = await fetch(`${baseUrl}/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'Aarav Patel',
				email: testCustomerEmail,
				password: 'CustomerSecurePass2026!',
				confirmPassword: 'CustomerSecurePass2026!'
			})
		});
		const regData = await regRes.json();
		assert(regRes.status === 201 && regData.token, 'Customer registers account successfully (201 Created)');
		assert(regData.user.role === 'user', 'Account role is assigned as "user"');
		assert(regData.user.siteId === null, 'Initial account has no site linked (siteId: null)');
		const customerToken = regData.token;

		// Customer onboards their 1 site
		const siteCreateRes = await fetch(`${baseUrl}/enter`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${customerToken}`
			},
			body: JSON.stringify({
				name: 'Aarav Rooftop Solar Plant',
				email: testCustomerEmail,
				phoneNumber: '+91 99887 76655',
				location: { latitude: 26.8467, longitude: 80.9462 },
				systemCapacity: 4.5,
				numberOfPanels: 12,
				tiltDeg: 25,
				azimuthDeg: 180,
				shadingFactor: 0.95,
				soilingLossPercent: 2.0,
				inverterLossPercent: 2.0,
				wiringLossPercent: 2.0,
				miscLossPercent: 1.5,
				dc_ac_ratio: 1.2,
				inv_efficiency: 98.0,
				bifaciality: 0
			})
		});
		const siteCreateData = await siteCreateRes.json();
		assert(siteCreateRes.status === 201 && siteCreateData.siteId, 'Customer onboards single solar site (201 Created)');
		const customerSiteId = siteCreateData.siteId;
		const customerSiteName = 'Aarav Rooftop Solar Plant';

		// Verify account is now linked to site
		const checkMeRes = await fetch(`${baseUrl}/auth/me`, {
			headers: { 'Authorization': `Bearer ${customerToken}` }
		});
		const checkMeData = await checkMeRes.json();
		assert(checkMeData.user.siteId === customerSiteId.toString(), 'Account now reflects site ownership');

		// Attempting 2nd site must fail with 409 Conflict
		const secondSiteRes = await fetch(`${baseUrl}/enter`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${customerToken}`
			},
			body: JSON.stringify({
				name: 'Illegal Second Solar Plant',
				email: testCustomerEmail,
				phoneNumber: '+91 99887 76655',
				location: { latitude: 26.8467, longitude: 80.9462 },
				systemCapacity: 10,
				numberOfPanels: 24,
				tiltDeg: 25,
				azimuthDeg: 180,
				soilingLossPercent: 2,
				inverterLossPercent: 2,
				wiringLossPercent: 2,
				miscLossPercent: 2
			})
		});
		assert(secondSiteRes.status === 409, 'One-Site Rule: customer blocked from creating 2nd site (409 Conflict)');

		// SECTION 2: PORTAL ISOLATION & LOGIN ENFORCEMENT
		console.log('\n--- SECTION 2: PORTAL LOGIN ISOLATION ---');
		// Customer attempting to log in via Admin Portal must get 403 Forbidden
		const customerAtAdminPortalRes = await fetch(`${baseUrl}/auth/admin/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: testCustomerEmail,
				password: 'CustomerSecurePass2026!'
			})
		});
		assert(customerAtAdminPortalRes.status === 403, 'Customer blocked from Admin Portal (403 Forbidden)');

		// Admin attempting to log in via Customer Login must get 403 Forbidden
		const adminAtCustomerPortalRes = await fetch(`${baseUrl}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'admin@solarbuddy.internal',
				password: 'AdminSolarBuddy2026!'
			})
		});
		assert(adminAtCustomerPortalRes.status === 403, 'Admin blocked from Customer Portal with redirection hint (403 Forbidden)');

		// Successful Admin Login via Admin Portal
		const adminLoginRes = await fetch(`${baseUrl}/auth/admin/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'admin@solarbuddy.internal',
				password: 'AdminSolarBuddy2026!'
			})
		});
		const adminLoginData = await adminLoginRes.json();
		assert(adminLoginRes.status === 200 && adminLoginData.token, 'Admin logs in via Admin Portal (200 OK)');
		const adminToken = adminLoginData.token;

		// SECTION 3: CROSS-TENANT DEFENSE & PARAMETER TAMPERING
		console.log('\n--- SECTION 3: CROSS-TENANT DEFENSE & PARAMETER TAMPERING ---');
		// Seeded user site (Haider site)
		const seededSite = await UserData.findOne({ name: /Haider/i });
		const foreignSiteId = seededSite._id.toString();
		const foreignSiteName = seededSite.name;

		// Customer accessing own site
		const ownSiteRes = await fetch(`${baseUrl}/users/${customerSiteId}`, {
			headers: { 'Authorization': `Bearer ${customerToken}` }
		});
		assert(ownSiteRes.status === 200, 'Customer successfully accesses own site');

		// Customer attempting to view foreign site
		const foreignSiteRes = await fetch(`${baseUrl}/users/${foreignSiteId}`, {
			headers: { 'Authorization': `Bearer ${customerToken}` }
		});
		assert(foreignSiteRes.status === 403, 'Customer blocked from reading foreign site (403 Forbidden)');

		// Customer attempting to edit foreign site
		const foreignEditRes = await fetch(`${baseUrl}/users/${foreignSiteId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${customerToken}`
			},
			body: JSON.stringify({ name: 'Tampered Hack' })
		});
		assert(foreignEditRes.status === 403, 'Customer blocked from modifying foreign site (403 Forbidden)');

		// Customer attempting to trigger predictions on foreign site
		const foreignTriggerRes = await fetch(`${baseUrl}/users/${foreignSiteId}/daily-predictions/trigger`, {
			method: 'POST',
			headers: { 'Authorization': `Bearer ${customerToken}` }
		});
		assert(foreignTriggerRes.status === 403, 'Customer blocked from triggering prediction for foreign site (403 Forbidden)');

		// Customer attempting query parameter tampering on alerts/reports
		const foreignHistoryRes = await fetch(`${baseUrl}/soic/alerts/history?siteName=${encodeURIComponent(foreignSiteName)}`, {
			headers: { 'Authorization': `Bearer ${customerToken}` }
		});
		assert(foreignHistoryRes.status === 403, 'Customer query parameter tampering on alert history blocked (403 Forbidden)');

		const foreignPdfRes = await fetch(`${baseUrl}/soic/alerts/history/report/pdf?siteName=${encodeURIComponent(foreignSiteName)}`, {
			headers: { 'Authorization': `Bearer ${customerToken}` }
		});
		assert(foreignPdfRes.status === 403, 'Customer query parameter tampering on PDF download blocked (403 Forbidden)');

		const foreignExcelRes = await fetch(`${baseUrl}/soic/alerts/history/report/excel?siteName=${encodeURIComponent(foreignSiteName)}`, {
			headers: { 'Authorization': `Bearer ${customerToken}` }
		});
		assert(foreignExcelRes.status === 403, 'Customer query parameter tampering on Excel download blocked (403 Forbidden)');

		// SECTION 4: SCOPED CUSTOMER VIEW VS GLOBAL ADMIN FLEET VIEW
		console.log('\n--- SECTION 4: SCOPED CUSTOMER VIEW VS FLEET ADMIN VIEW ---');
		// Customer dropdown returns only own site
		const custDropdownRes = await fetch(`${baseUrl}/soic/alerts/sites`, {
			headers: { 'Authorization': `Bearer ${customerToken}` }
		});
		const custDropdownData = await custDropdownRes.json();
		assert(custDropdownData.data.length === 1 && custDropdownData.data[0] === customerSiteName, 'Customer site selector contains only their own installation');

		// Customer dashboard returns scoped metrics
		const custDashRes = await fetch(`${baseUrl}/soic/dashboard`, {
			headers: { 'Authorization': `Bearer ${customerToken}` }
		});
		const custDashData = await custDashRes.json();
		assert(custDashData.data.metrics.total_sites === 1, 'Customer dashboard metrics scoped to 1 site');

		// Customer blocked from fleet-wide site list
		const custFleetListRes = await fetch(`${baseUrl}/users`, {
			headers: { 'Authorization': `Bearer ${customerToken}` }
		});
		assert(custFleetListRes.status === 403, 'Customer blocked from fleet-wide sites list (403 Forbidden)');

		// Admin can access fleet sites list
		const adminFleetListRes = await fetch(`${baseUrl}/users`, {
			headers: { 'Authorization': `Bearer ${adminToken}` }
		});
		const adminFleetListData = await adminFleetListRes.json();
		assert(adminFleetListRes.status === 200 && adminFleetListData.data.length >= 2, 'Admin accesses full fleet directory');

		// Admin can access customer site and foreign site
		const adminCustSiteRes = await fetch(`${baseUrl}/users/${customerSiteId}`, {
			headers: { 'Authorization': `Bearer ${adminToken}` }
		});
		const adminForeignSiteRes = await fetch(`${baseUrl}/users/${foreignSiteId}`, {
			headers: { 'Authorization': `Bearer ${adminToken}` }
		});
		assert(adminCustSiteRes.status === 200 && adminForeignSiteRes.status === 200, 'Admin can inspect any site in the fleet');

		// Admin dashboard has full fleet totals
		const adminDashRes = await fetch(`${baseUrl}/soic/dashboard`, {
			headers: { 'Authorization': `Bearer ${adminToken}` }
		});
		const adminDashData = await adminDashRes.json();
		assert(adminDashData.data.metrics.total_sites >= 2, 'Admin dashboard aggregates all fleet sites');

		// Admin dropdown contains multiple fleet sites
		const adminDropdownRes = await fetch(`${baseUrl}/soic/alerts/sites`, {
			headers: { 'Authorization': `Bearer ${adminToken}` }
		});
		const adminDropdownData = await adminDropdownRes.json();
		assert(adminDropdownData.data.length >= 2, 'Admin site selector contains full fleet');

		// SECTION 5: CLEANUP
		console.log('\n--- SECTION 5: CLEANUP & TEARDOWN ---');
		await UserData.findByIdAndDelete(customerSiteId);
		await Account.deleteOne({ email: testCustomerEmail });
		console.log('  Cleaned up temporary customer and solar installation.');

		console.log('\n================================================================');
		console.log(` FINAL RESULTS: ${passed} Passed, ${failed} Failed`);
		console.log('================================================================\n');

		if (failed > 0) process.exit(1);
	} catch (err) {
		console.error('Fatal E2E Error:', err);
		process.exit(1);
	} finally {
		if (server) server.close();
		await mongoose.disconnect();
		process.exit(0);
	}
};

runTests();
