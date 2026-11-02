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
	console.log('--- STARTING STEP 4 REGISTRATION & ONBOARDING TEST SUITE ---');
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

		const testEmail = 'new_customer_step4@solarbuddy.test';
		await Account.deleteOne({ email: testEmail });

		// 1. STEP 1: ACCOUNT REGISTRATION
		console.log('\n1. Registering new customer account (Step 1)...');
		const regRes = await fetch(`${baseUrl}/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'Vikram Sharma',
				email: testEmail,
				password: 'CustomerPass2026!',
				confirmPassword: 'CustomerPass2026!'
			})
		});
		const regData = await regRes.json();
		assert(regRes.status === 201 && regData.token, 'Step 1 registration returns 201 Created and JWT');
		assert(regData.user.siteId === null, 'Initial account has siteId: null');
		const token = regData.token;

		// 2. STEP 2: SOLAR SITE ONBOARDING
		console.log('\n2. Onboarding solar installation (Step 2)...');
		const siteRes = await fetch(`${baseUrl}/enter`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({
				name: 'Vikram Sharma Rooftop Array',
				email: testEmail,
				phoneNumber: '+91 98765 12345',
				location: { latitude: 26.8500, longitude: 80.9500 },
				systemCapacity: 6.5,
				numberOfPanels: 16,
				tiltDeg: 26,
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
		const siteData = await siteRes.json();
		assert(siteRes.status === 201 && siteData.siteId, 'Step 2 site creation returns 201 Created with siteId');
		const createdSiteId = siteData.siteId;

		// 3. VERIFY SESSION AND ACCOUNT UPDATE
		console.log('\n3. Verifying updated account session via /auth/me...');
		const meRes = await fetch(`${baseUrl}/auth/me`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});
		const meData = await meRes.json();
		assert(meRes.status === 200 && meData.user.siteId === createdSiteId.toString(), 'GET /auth/me confirms account is now linked to the newly created site');

		// 4. ATTEMPTING SECOND SITE (ONE-SITE RULE ENFORCEMENT)
		console.log('\n4. Verifying One-Site Rule blocks 2nd installation...');
		const secondSiteRes = await fetch(`${baseUrl}/enter`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({
				name: 'Vikram Second Illegal Site',
				email: testEmail,
				phoneNumber: '+91 98765 12345',
				location: { latitude: 26.8500, longitude: 80.9500 },
				systemCapacity: 5.0,
				numberOfPanels: 12,
				tiltDeg: 26,
				azimuthDeg: 180,
				soilingLossPercent: 2.0,
				inverterLossPercent: 2.0,
				wiringLossPercent: 2.0,
				miscLossPercent: 1.5
			})
		});
		assert(secondSiteRes.status === 409, 'Attempt to create 2nd site returns 409 Conflict');

		// 5. CLEANUP
		console.log('\n5. Cleaning up test data...');
		await UserData.findByIdAndDelete(createdSiteId);
		await Account.deleteOne({ email: testEmail });
		console.log('  Cleaned up temporary customer and site.');

		console.log(`\nTEST RESULTS: ${passed} Passed, ${failed} Failed\n`);
		if (failed > 0) process.exit(1);
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
