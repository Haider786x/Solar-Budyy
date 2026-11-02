const mongoose = require('mongoose');
require('dotenv').config();
const { getDemoSettings } = require('../services/demoInverterService');

async function run() {
	await mongoose.connect(process.env.MONGO_DB_URI);
	const s = await getDemoSettings();
	console.log('DEMO_SETTINGS_RESULT:', JSON.stringify(s));
	process.exit(0);
}

run().catch(err => {
	console.error(err);
	process.exit(1);
});
