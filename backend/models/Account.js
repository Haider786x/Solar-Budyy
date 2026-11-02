const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const accountSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, "Name is required"],
			trim: true
		},
		email: {
			type: String,
			required: [true, "Email is required"],
			unique: true,
			lowercase: true,
			trim: true,
			index: true
		},
		passwordHash: {
			type: String,
			required: [true, "Password hash is required"]
		},
		role: {
			type: String,
			enum: ["user", "admin"],
			default: "user",
			index: true
		},
		siteId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "UserData",
			default: null,
			index: true
		},
		isActive: {
			type: Boolean,
			default: true
		}
	},
	{
		collection: "accounts",
		timestamps: true
	}
);

// Helper method to compare password
accountSchema.methods.comparePassword = async function (candidatePassword) {
	return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash password
accountSchema.statics.hashPassword = async function (password) {
	const salt = await bcrypt.genSalt(10);
	return bcrypt.hash(password, salt);
};

// Clean JSON representation (omit passwordHash)
accountSchema.methods.toSafeObject = function () {
	return {
		id: this._id.toString(),
		name: this.name,
		email: this.email,
		role: this.role,
		siteId: this.siteId ? this.siteId.toString() : null,
		createdAt: this.createdAt
	};
};

module.exports = mongoose.model("Account", accountSchema);
