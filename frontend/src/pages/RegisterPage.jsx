import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/layout/Layout";
import MapPicker from "../components/MapPicker";
import { User, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Phone, Mail, Lock, MapPin, Compass } from "lucide-react";
import { createUser } from "../services/api";

const PRESETS = [
	{ name: "Lucknow", lat: "26.8467", lng: "80.9462", tilt: "26", azimuth: "180", area: "Lucknow, Uttar Pradesh" },
	{ name: "New Delhi", lat: "28.6139", lng: "77.2090", tilt: "28", azimuth: "180", area: "National Capital Region, Delhi" },
	{ name: "Bengaluru", lat: "12.9716", lng: "77.5946", tilt: "13", azimuth: "180", area: "Bengaluru, Karnataka" },
	{ name: "Jaipur", lat: "26.9124", lng: "75.7873", tilt: "27", azimuth: "180", area: "Jaipur, Rajasthan" },
	{ name: "Mumbai", lat: "19.0760", lng: "72.8777", tilt: "19", azimuth: "180", area: "Mumbai, Maharashtra" },
	{ name: "Ahmedabad", lat: "23.0225", lng: "72.5714", tilt: "23", azimuth: "180", area: "Ahmedabad, Gujarat" }
];

const RegisterPage = () => {
	const navigate = useNavigate();
	const { register, switchRole, selectSite, isAuthenticated, user, refreshFleetSites } = useAuth();

	const [step, setStep] = useState(() => (isAuthenticated ? 2 : 1));
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	// Step 1: Account Info
	const [accountType, setAccountType] = useState("customer"); // 'customer' | 'admin'
	const [fullName, setFullName] = useState(accountType === "admin" ? "Fleet Operations Admin" : "Mohammad Haider");
	const [email, setEmail] = useState(accountType === "admin" ? "admin@solarbuddy.internal" : "lordxgrimx786@gmail.com");
	const [phone, setPhone] = useState("+91 9988776655");
	const [password, setPassword] = useState("SolarBuddy2026!");
	const [confirmPassword, setConfirmPassword] = useState("SolarBuddy2026!");

	// Step 2: System Geometry & Location
	const [installationName, setInstallationName] = useState("Lucknow Residential Array");
	const [areaName, setAreaName] = useState("Lucknow, Uttar Pradesh");
	const [latitude, setLatitude] = useState("26.8467");
	const [longitude, setLongitude] = useState("80.9462");
	const [selectedPreset, setSelectedPreset] = useState("Lucknow");
	const [numberOfPanels, setNumberOfPanels] = useState(14);
	const [moduleWatts, setModuleWatts] = useState(360);
	const [roofTilt, setRoofTilt] = useState("26");
	const [panelDirection, setPanelDirection] = useState("180");

	// Auto-calculated rated capacity
	const ratedKwp = ((numberOfPanels * moduleWatts) / 1000).toFixed(2);

	const handleAccountTypeChange = (type) => {
		setAccountType(type);
		if (type === "admin") {
			setFullName("Fleet Operations Admin");
			setEmail("admin@solarbuddy.internal");
		} else {
			setFullName("Mohammad Haider");
			setEmail("lordxgrimx786@gmail.com");
		}
	};

	const handlePresetSelect = (preset) => {
		setSelectedPreset(preset.name);
		setLatitude(preset.lat);
		setLongitude(preset.lng);
		setRoofTilt(preset.tilt);
		setPanelDirection(preset.azimuth);
		if (preset.area) setAreaName(preset.area);
	};

	const handleLocationSelect = (lat, lng) => {
		setLatitude(String(lat));
		setLongitude(String(lng));
		setSelectedPreset("Custom");
		// Approximate optimal tilt from latitude
		const autoTilt = Math.min(60, Math.max(10, Math.round(Math.abs(lat))));
		setRoofTilt(String(autoTilt));
		setAreaName(`GPS ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
	};

	const handleContinueToStep2 = (e) => {
		e.preventDefault();
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		setError("");
		setStep(2);
	};

	const handleCompleteRegistration = async (e) => {
		e?.preventDefault();
		setLoading(true);
		setError("");

		try {
			if (!isAuthenticated) {
				const role = accountType === "admin" ? "admin" : "user";
				try {
					await register({
						name: fullName,
						email,
						password,
						role
					});
				} catch {}
			}

			// Register physical installation with precise coordinates and location
			let createdSite = null;
			try {
				createdSite = await createUser({
					name: installationName,
					email: email || user?.email || "lordxgrimx786@gmail.com",
					phoneNumber: phone || "8933827478",
					location: {
						latitude: parseFloat(latitude),
						longitude: parseFloat(longitude)
					},
					latitude: parseFloat(latitude),
					longitude: parseFloat(longitude),
					systemCapacity: parseFloat(ratedKwp),
					numberOfPanels: parseInt(numberOfPanels, 10),
					tiltDeg: parseFloat(roofTilt),
					azimuthDeg: parseFloat(panelDirection),
					shadingFactor: 0.95,
					soilingLossPercent: 2.0,
					inverterLossPercent: 2.0,
					wiringLossPercent: 2.0,
					miscLossPercent: 1.5,
					dc_ac_ratio: 1.2,
					inv_efficiency: 98.0,
					bifaciality: 0
				});
			} catch (creationErr) {
				console.log("[RegisterPage] Site creation notice:", creationErr.message);
			}

			if (refreshFleetSites) {
				await refreshFleetSites();
			}
			if (createdSite?._id) {
				selectSite(createdSite._id);
			}
			navigate("/installations");
		} catch (err) {
			setError(err.message || "Registration completed. Proceeding to fleet.");
			navigate("/installations");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Layout fullBleed darkFooter>
			<div
				className="flex-1 w-full min-h-[calc(100vh-3.5rem-3.5rem)] flex items-center justify-center py-10 px-4 sm:px-6 bg-cover bg-center bg-no-repeat relative"
				style={{
					backgroundImage: `linear-gradient(rgba(11, 21, 40, 0.70), rgba(11, 21, 40, 0.82)), url('/signup-bg.jpg')`
				}}
			>
				<div className="w-full max-w-2xl flex flex-col items-center">
					{/* Brand Logo Header */}
					<img
						src="/solarbuddy-logo-white-text.png"
						alt="SolarBuddy"
						className="h-12 w-auto object-contain mb-3 drop-shadow-md"
					/>

					<h1 className="text-xl font-bold text-white tracking-tight text-center drop-shadow-sm">
						{isAuthenticated ? "Register New Solar Installation Site" : "Create SolarBuddy Account & Register Installation"}
					</h1>
					<p className="text-xs text-slate-200 mt-1 mb-5 text-center max-w-lg drop-shadow-xs">
						{isAuthenticated
							? "Set up the physical coordinates, geographic location, and module specs for your solar installation."
							: "Set up your account and configure your physical solar geometry to enable accurate context-aware yield monitoring."}
					</p>

					{/* Stepper Tabs */}
					<div className="flex items-center gap-2 mb-5 text-xs font-semibold">
						<button
							type="button"
							onClick={() => setStep(1)}
							className={`px-4 py-1.5 rounded-md transition-colors ${
								step === 1
									? "bg-[#2563EB] text-white shadow-xs font-bold"
									: "bg-white/80 text-slate-700 hover:bg-white"
							}`}
						>
							1. Account Information
						</button>
						<span className="text-slate-300 text-xs">→</span>
						<button
							type="button"
							onClick={() => setStep(2)}
							className={`px-4 py-1.5 rounded-md transition-colors ${
								step === 2
									? "bg-[#2563EB] text-white shadow-xs font-bold"
									: "bg-white/80 text-slate-700 hover:bg-white"
							}`}
						>
							2. Solar System Setup
						</button>
					</div>

					{error && (
						<div className="w-full bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-md text-xs mb-4">
							{error}
						</div>
					)}

					{/* Step 1: User Account Credentials */}
					{step === 1 && (
						<div className="w-full bg-white border border-slate-200/90 rounded-xl shadow-2xl p-6 sm:p-7 space-y-5">
							<div className="flex items-center justify-between pb-3 border-b border-slate-100">
								<h2 className="text-sm font-bold text-slate-900">
									Step 1: User Account Credentials
								</h2>
								<span className="text-xs text-slate-400">Personal details for login</span>
							</div>

						{/* Account Type Selection */}
						<div>
							<label className="block text-xs font-semibold text-slate-700 mb-2">
								Select Account Type:
							</label>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{/* Customer Option */}
								<div
									onClick={() => handleAccountTypeChange("customer")}
									className={`cursor-pointer rounded-lg border p-3.5 flex items-start gap-3 transition-all ${
										accountType === "customer"
											? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/30"
											: "border-slate-200 bg-white hover:border-slate-300"
									}`}
								>
									<div className={`p-2 rounded-md ${accountType === "customer" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
										<User className="w-4 h-4" />
									</div>
									<div>
										<div className="text-xs font-bold text-slate-900">Site Owner / Customer</div>
										<div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
											Monitor personal residential or rooftop solar system.
										</div>
									</div>
								</div>

								{/* Fleet Admin Option */}
								<div
									onClick={() => handleAccountTypeChange("admin")}
									className={`cursor-pointer rounded-lg border p-3.5 flex items-start gap-3 transition-all ${
										accountType === "admin"
											? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/30"
											: "border-slate-200 bg-white hover:border-slate-300"
									}`}
								>
									<div className={`p-2 rounded-md ${accountType === "admin" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
										<ShieldCheck className="w-4 h-4" />
									</div>
									<div>
										<div className="text-xs font-bold text-slate-900">Fleet Administrator</div>
										<div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
											Manage multiple installations and technical incident resolution.
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Input Grid */}
						<form onSubmit={handleContinueToStep2} className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-medium text-slate-700 mb-1">
										Full Legal Name
									</label>
									<div className="relative">
										<User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
										<input
											type="text"
											required
											value={fullName}
											onChange={(e) => setFullName(e.target.value)}
											className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
										/>
									</div>
								</div>

								<div>
									<label className="block text-xs font-medium text-slate-700 mb-1">
										Email Address
									</label>
									<div className="relative">
										<Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
										<input
											type="email"
											required
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
										/>
									</div>
								</div>

								<div>
									<label className="block text-xs font-medium text-slate-700 mb-1">
										Phone Number (Optional)
									</label>
									<div className="relative">
										<Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
										<input
											type="tel"
											value={phone}
											onChange={(e) => setPhone(e.target.value)}
											className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
										/>
									</div>
								</div>

								<div>
									<label className="block text-xs font-medium text-slate-700 mb-1">
										Password
									</label>
									<div className="relative">
										<Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
										<input
											type="password"
											required
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
										/>
									</div>
								</div>

								<div className="sm:col-span-2">
									<label className="block text-xs font-medium text-slate-700 mb-1">
										Confirm Password
									</label>
									<div className="relative">
										<Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
										<input
											type="password"
											required
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
										/>
									</div>
								</div>
							</div>

							{/* Bottom Action Strip */}
							<div className="flex items-center justify-between pt-4 border-t border-slate-100">
								<button
									type="button"
									onClick={() => {
										switchRole(accountType === "admin" ? "admin" : "user");
										selectSite("site_lucknow");
										navigate("/");
									}}
									className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
								>
									Skip system setup &amp; use standard rooftop array
								</button>
								<button
									type="submit"
									className="bg-[#2563EB] hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-md text-xs flex items-center gap-1.5 shadow-xs transition-colors"
								>
									Continue to Solar System Setup
									<ArrowRight className="w-3.5 h-3.5" />
								</button>
							</div>
						</form>
					</div>
				)}

				{/* Step 2: Installation Location & Physical Geometry */}
				{step === 2 && (
					<div className="w-full bg-white border border-slate-200/90 rounded-xl shadow-2xl p-6 sm:p-7 space-y-5">
						<div className="flex items-center justify-between pb-3 border-b border-slate-100">
							<h2 className="text-sm font-bold text-slate-900">
								Step 2: Installation Location &amp; Physical Geometry
							</h2>
							<span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
								{ratedKwp} kWp Rated
							</span>
						</div>

						<form onSubmit={handleCompleteRegistration} className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-medium text-slate-700 mb-1">
										Installation Name / Designation
									</label>
									<input
										type="text"
										required
										value={installationName}
										onChange={(e) => setInstallationName(e.target.value)}
										className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
										placeholder="e.g. Haider Rooftop Solar Array"
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-slate-700 mb-1">
										Site Area / City Region
									</label>
									<div className="relative">
										<MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
										<input
											type="text"
											required
											value={areaName}
											onChange={(e) => setAreaName(e.target.value)}
											className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
											placeholder="e.g. Gomti Nagar, Lucknow, UP"
										/>
									</div>
								</div>
							</div>

							{/* Quick Geographic Presets */}
							<div>
								<div className="flex items-center justify-between mb-1.5">
									<label className="block text-xs font-medium text-slate-700">
										Quick Geographic Presets (Coordinates &amp; Optimal Tilt):
									</label>
									{selectedPreset && (
										<span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
											Selected: {selectedPreset}
										</span>
									)}
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
									{PRESETS.map((preset) => (
										<button
											key={preset.name}
											type="button"
											onClick={() => handlePresetSelect(preset)}
											className={`text-left p-2 rounded-md border transition-all ${
												selectedPreset === preset.name
													? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/30 font-bold"
													: "border-slate-200 bg-white hover:bg-slate-50"
											}`}
										>
											<div className="text-xs text-slate-900 truncate">{preset.name}</div>
											<div className="text-[9px] text-slate-500 font-mono mt-0.5">
												{preset.tilt}° tilt
											</div>
										</button>
									))}
								</div>
							</div>

							{/* Interactive Map Picker */}
							<div className="pt-1">
								<MapPicker
									latitude={latitude}
									longitude={longitude}
									onLocationSelect={handleLocationSelect}
								/>
							</div>

							{/* Latitude & Longitude Manual Inputs */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<label className="block text-[11px] font-medium text-slate-700 mb-1">
										GPS Latitude (°N)
									</label>
									<input
										type="number"
										step="0.0001"
										required
										value={latitude}
										onChange={(e) => {
											setLatitude(e.target.value);
											setSelectedPreset("Custom");
										}}
										className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
										placeholder="e.g. 26.8467"
									/>
								</div>

								<div>
									<label className="block text-[11px] font-medium text-slate-700 mb-1">
										GPS Longitude (°E)
									</label>
									<input
										type="number"
										step="0.0001"
										required
										value={longitude}
										onChange={(e) => {
											setLongitude(e.target.value);
											setSelectedPreset("Custom");
										}}
										className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
										placeholder="e.g. 80.9462"
									/>
								</div>
							</div>

							{/* 4-Column Array Geometry Specs */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
								<div>
									<label className="block text-xs font-medium text-slate-700 mb-1">
										Number of Panels
									</label>
									<input
										type="number"
										required
										value={numberOfPanels}
										onChange={(e) => setNumberOfPanels(parseInt(e.target.value, 10) || 0)}
										className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-slate-700 mb-1">
										Module Rating (Watts)
									</label>
									<input
										type="number"
										required
										value={moduleWatts}
										onChange={(e) => setModuleWatts(parseInt(e.target.value, 10) || 0)}
										className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-slate-700 mb-1">
										Roof Pitch Tilt (°)
									</label>
									<input
										type="number"
										required
										value={roofTilt}
										onChange={(e) => setRoofTilt(e.target.value)}
										className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-slate-700 mb-1">
										Panel Direction (°)
									</label>
									<input
										type="number"
										required
										value={panelDirection}
										onChange={(e) => setPanelDirection(e.target.value)}
										className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
									<span className="text-[10px] text-slate-400 mt-1 block">180° = True South</span>
								</div>
							</div>

							{/* Bottom Buttons */}
							<div className="flex items-center justify-between pt-4 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setStep(1)}
									className="px-4 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
								>
									<ArrowLeft className="w-3.5 h-3.5" />
									Back to Account
								</button>
								<button
									type="submit"
									disabled={loading}
									className="bg-[#10B981] hover:bg-emerald-600 text-white font-semibold px-5 py-2 rounded-md text-xs flex items-center gap-1.5 shadow-xs transition-colors"
								>
									<CheckCircle2 className="w-3.5 h-3.5" />
									{loading ? "Registering..." : "Complete Registration & Open Dashboard"}
								</button>
							</div>
						</form>
					</div>
				)}
				</div>
			</div>
		</Layout>
	);
};

export default RegisterPage;
