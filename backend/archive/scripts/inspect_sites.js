const mongoose = require("mongoose");
const User = require("../models/data");
require("dotenv").config();

async function check() {
	await mongoose.connect(process.env.MONGO_DB_URI);
	const users = await User.find({}).lean();
	console.log(`Found ${users.length} sites in MongoDB:`);
	users.forEach(u => {
		console.log({
			id: u._id.toString(),
			name: u.name,
			location: u.location,
			systemCapacity: u.systemCapacity,
			tiltDeg: u.tiltDeg,
			azimuthDeg: u.azimuthDeg,
			inverterSerialNumber: u.inverterSerialNumber,
			status: u.status
		});
	});
	await mongoose.disconnect();
}
check().catch(console.error);
