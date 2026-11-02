import { useState, useMemo, useEffect } from "react";
import Layout from "../components/layout/Layout";
import SiteLocationMap from "../components/SiteLocationMap";
import MapPicker from "../components/MapPicker";
import { useAuth, formatLocationString } from "../context/AuthContext";
import { useDemo } from "../context/DemoContext";
import { fetchUserById, updateUser, triggerDailyPredictionByUserId } from "../services/api";
import {
	Sun,
	Sparkles,
	MapPin,
	Edit,
	CheckCircle2,
	ChevronDown,
	Compass,
	ArrowRight,
	SlidersHorizontal,
	Zap,
	ShieldCheck,
	Check,
	Save,
	X,
	AlertCircle
} from "lucide-react";

const SolarSystemPage = () => {
	const { selectedSite, selectedSiteId, refreshFleetSites } = useAuth();
	const { isDemoActive, demoTelemetry } = useDemo();
	const [hour, setHour] = useState(12);
	const [accordionOpen, setAccordionOpen] = useState(false);
	const [washActive, setWashActive] = useState(false);
	const [siteDetails, setSiteDetails] = useState(null);

	// Edit configuration state
	const [showEditModal, setShowEditModal] = useState(false);
	const [savingConfig, setSavingConfig] = useState(false);
	const [editSuccessMsg, setEditSuccessMsg] = useState("");
	const [editError, setEditError] = useState("");
	const [formData, setFormData] = useState({
		name: "",
		systemCapacity: 5.0,
		numberOfPanels: 14,
		tiltDeg: 26,
		azimuthDeg: 180,
		latitude: 26.8467,
		longitude: 80.9462,
		inverterSerialNumber: "SOL-INV-5000H-780609",
		inv_efficiency: 98,
		shadingFactor: 0.95,
		soilingLossPercent: 2.0,
		moduleType: "Monocrystalline"
	});

	// Load real backend specs for selected site
	useEffect(() => {
		const loadSite = async () => {
			if (!selectedSiteId) return;
			try {
				const res = await fetchUserById(selectedSiteId);
				if (res) {
					setSiteDetails(res.data || res);
				}
			} catch (err) {
				console.log("[SolarSystemPage] Using local site specs:", err.message);
			}
		};
		loadSite();
	}, [selectedSiteId]);

	const site = siteDetails || selectedSite;
	const cap = site?.systemCapacity || 5.04;
	const tilt = site?.tiltDeg || 26.0;
	const azimuth = site?.azimuthDeg || 180.0;
	const panels = site?.numberOfPanels || 14;
	const moduleWatts = Math.round((cap * 1000) / panels);

	const handleOpenEditModal = () => {
		setFormData({
			name: site?.name || "Haider Rooftop Solar Array",
			systemCapacity: site?.systemCapacity || 5.04,
			numberOfPanels: site?.numberOfPanels || 14,
			tiltDeg: site?.tiltDeg || 26.0,
			azimuthDeg: site?.azimuthDeg || 180.0,
			latitude: site?.location?.latitude ?? site?.latitude ?? 26.8467,
			longitude: site?.location?.longitude ?? site?.longitude ?? 80.9462,
			inverterSerialNumber: site?.inverterSerialNumber || "SOL-INV-5000H-780609",
			inv_efficiency: site?.inv_efficiency || 98.0,
			shadingFactor: site?.shadingFactor || 0.95,
			soilingLossPercent: site?.soilingLossPercent || 2.0,
			moduleType: site?.moduleType || "Monocrystalline"
		});
		setEditError("");
		setEditSuccessMsg("");
		setShowEditModal(true);
	};

	const handleSaveConfig = async (e) => {
		e.preventDefault();
		setSavingConfig(true);
		setEditError("");
		try {
			const payload = {
				name: formData.name,
				systemCapacity: parseFloat(formData.systemCapacity),
				numberOfPanels: parseInt(formData.numberOfPanels, 10),
				tiltDeg: parseFloat(formData.tiltDeg),
				azimuthDeg: parseFloat(formData.azimuthDeg),
				inverterSerialNumber: formData.inverterSerialNumber,
				inv_efficiency: parseFloat(formData.inv_efficiency),
				shadingFactor: parseFloat(formData.shadingFactor),
				soilingLossPercent: parseFloat(formData.soilingLossPercent),
				moduleType: formData.moduleType
			};
			const res = await updateUser(selectedSiteId, payload);
			if (res) {
				setSiteDetails(res.data || res);
			}
			if (refreshFleetSites) {
				await refreshFleetSites();
			}
			setEditSuccessMsg("System configuration saved successfully!");
			setTimeout(() => {
				setShowEditModal(false);
				setEditSuccessMsg("");
			}, 1200);
		} catch (err) {
			setEditError(err.message || "Failed to update configuration");
		} finally {
			setSavingConfig(false);
		}
	};

	// Solar elevation and azimuth calculations based on hour
	const solarPosition = useMemo(() => {
		const h = hour;
		if (h < 6 || h > 18) {
			return { elevation: 0, azimuth: 180, alignment: 0, currentKw: 0 };
		}
		const angle = ((h - 6) / 12) * Math.PI;
		const elevation = +(Math.sin(angle) * 48.1).toFixed(1);
		const currentAzimuth = +(90 + ((h - 6) / 12) * 180).toFixed(1);
		const alignment = +(Math.sin(angle) * 96).toFixed(0);
		const currentKw = +(Math.sin(angle) * cap * 0.78).toFixed(2);
		return { elevation, azimuth: currentAzimuth, alignment, currentKw };
	}, [hour, cap]);

	const formatHour = (h) => {
		const hourInt = Math.floor(h);
		const minStr = h % 1 !== 0 ? "30" : "00";
		return `${hourInt < 10 ? "0" + hourInt : hourInt}:${minStr}`;
	};

	const handlePerformWash = () => {
		setWashActive(true);
		setTimeout(() => setWashActive(false), 3000);
	};

	return (
		<Layout>
			<div className="space-y-4">
				{/* Top Breadcrumb & Title with Action Buttons */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
					<div>
						<div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
							<span>System Details</span>
							<span className="text-slate-400">/</span>
							<span>Equipment &amp; Layout</span>
						</div>
						<h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
							Solar System Specifications
						</h1>
					</div>

					<div className="flex items-center gap-2 self-start sm:self-auto">
						<button
							type="button"
							onClick={handlePerformWash}
							className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
						>
							<Sparkles className="w-3.5 h-3.5 text-blue-600" />
							<span>{washActive ? "Surface Cleaned (-2% Soiling Restored!)" : "Perform Panel Cleaning"}</span>
						</button>
						<button
							type="button"
							onClick={handleOpenEditModal}
							className="bg-[#2563EB] hover:bg-blue-600 text-white font-semibold px-3.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 shadow-xs transition-colors"
						>
							<Edit className="w-3.5 h-3.5" />
							<span>Edit System Configuration</span>
						</button>
					</div>
				</div>

				{editSuccessMsg && (
					<div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-semibold flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
						<span>{editSuccessMsg}</span>
					</div>
				)}

				{/* 4 Top Spec Badges */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<span className="text-[11px] text-slate-400 font-medium block">Installed Capacity</span>
						<div className="flex items-baseline gap-1 mt-1">
							<span className="text-2xl font-black text-blue-600 tracking-tight">{cap}</span>
							<span className="text-xs font-bold text-slate-600">kWp Rated</span>
						</div>
						<span className="text-[11px] text-slate-500 mt-2 block">
							{panels} Modules ({moduleWatts}W {site?.moduleType || "Mono PERC"})
						</span>
					</div>

					<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<span className="text-[11px] text-slate-400 font-medium block">Roof Mounting Pitch</span>
						<div className="flex items-baseline gap-1 mt-1">
							<span className="text-2xl font-black text-slate-900 tracking-tight">{tilt}°</span>
							<span className="text-xs font-bold text-slate-600">Slope</span>
						</div>
						<span className="text-[11px] text-emerald-600 font-semibold mt-2 block">
							Optimal for {site?.location?.latitude ? `${site.location.latitude}°N` : "26.8467°N"} latitude
						</span>
					</div>

					<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<span className="text-[11px] text-slate-400 font-medium block">Panel Direction</span>
						<div className="flex items-baseline gap-1 mt-1">
							<span className="text-2xl font-black text-slate-900 tracking-tight">{azimuth}°</span>
							<span className="text-xs font-bold text-slate-600">True South</span>
						</div>
						<span className="text-[11px] text-slate-500 mt-2 block">
							180° orientation for maximum solar capture
						</span>
					</div>

					<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<span className="text-[11px] text-slate-400 font-medium block">Inverter Efficiency</span>
						<div className="flex items-baseline gap-1 mt-1">
							<span className="text-2xl font-black text-emerald-600 tracking-tight">
								{site?.inv_efficiency || 98}%
							</span>
							<span className="text-xs font-bold text-slate-600">Euro η</span>
						</div>
						<span className="text-[11px] text-slate-500 mt-2 block">Dual Tracking String Inverter</span>
					</div>
				</div>

				{/* Mid 2 Panels: Sun Trajectory Arc & Compass Bearing */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
					<div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
							<div>
								<h2 className="text-xs font-bold text-slate-900">Sun Trajectory &amp; Rooftop Alignment</h2>
								<p className="text-[11px] text-slate-400">Current sun position relative to your {tilt}° roof pitch.</p>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-xs font-semibold text-slate-600">Hour:</span>
								<span className="font-mono text-xs font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-800">
									{formatHour(hour)}
								</span>
								<input
									type="range"
									min="6"
									max="18"
									step="0.5"
									value={hour}
									onChange={(e) => setHour(parseFloat(e.target.value))}
									className="w-24 accent-blue-600 h-1.5 bg-slate-200 rounded cursor-pointer"
								/>
							</div>
						</div>

						{/* Interactive SVG Arc Visualization */}
						<div className="relative h-44 w-full flex flex-col items-center justify-center my-2 select-none">
							<svg className="w-full h-full max-h-40 overflow-visible" viewBox="0 0 400 160">
								<line x1="40" y1="130" x2="360" y2="130" stroke="#CBD5E1" strokeWidth="2" />
								<path
									d="M 50 130 A 150 110 0 0 1 350 130"
									fill="none"
									stroke="#3B82F6"
									strokeWidth="2"
									strokeDasharray="4 4"
								/>
								{(() => {
									const progress = (hour - 6) / 12;
									const angleRad = Math.PI * (1 - progress);
									const cx = 200 + 150 * Math.cos(angleRad);
									const cy = 130 - 110 * Math.sin(angleRad);
									return (
										<g transform={`translate(${cx}, ${cy})`}>
											<circle r="12" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
											<circle r="6" fill="#F59E0B" />
											<line x1="0" y1="12" x2="0" y2={Math.max(12, 130 - cy)} stroke="#F59E0B" strokeWidth="1" strokeDasharray="2 2" />
										</g>
									);
								})()}

								<g transform="translate(200, 130)">
									<line x1="-35" y1="15" x2="35" y2="-15" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
									<text x="0" y="-22" fontSize="9" fontWeight="bold" fill="#64748B" textAnchor="middle">
										Panel Slope {tilt}°
									</text>
								</g>

								<text x="45" y="145" fontSize="10" fontWeight="bold" fill="#64748B">East (090°)</text>
								<text x="200" y="145" fontSize="10" fontWeight="bold" fill="#1E293B" textAnchor="middle">
									South (180°) - Solar Noon
								</text>
								<text x="350" y="145" fontSize="10" fontWeight="bold" fill="#64748B" textAnchor="end">West (270°)</text>
							</svg>
						</div>

						<div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center">
							<div className="bg-slate-50 border border-slate-200/80 rounded p-2">
								<span className="text-[10px] text-slate-400 block font-medium">Sun Elevation</span>
								<strong className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
									{solarPosition.elevation}°
								</strong>
							</div>
							<div className="bg-slate-50 border border-slate-200/80 rounded p-2">
								<span className="text-[10px] text-slate-400 block font-medium">Sun Azimuth</span>
								<strong className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
									{solarPosition.azimuth}°
								</strong>
							</div>
							<div className="bg-slate-50 border border-slate-200/80 rounded p-2">
								<span className="text-[10px] text-slate-400 block font-medium">Geometric Alignment</span>
								<strong className="text-xs font-bold text-emerald-600 font-mono mt-0.5 block">
									{solarPosition.alignment}%
								</strong>
							</div>
						</div>
					</div>

					<div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-1">
								<div>
									<h2 className="text-xs font-bold text-slate-900">Compass Bearing &amp; Orientation</h2>
									<p className="text-[11px] text-slate-400">Array heading vs real-time solar azimuth.</p>
								</div>
								<span className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">
									{azimuth}° Heading
								</span>
							</div>

							<div className="flex flex-col items-center justify-center py-3">
								<div className="w-36 h-36 rounded-full border-2 border-slate-300 relative flex items-center justify-center bg-slate-50 shadow-inner">
									{/* Cardinal points */}
									<span className="absolute top-1 text-[11px] font-bold text-red-500">N</span>
									<span className="absolute bottom-1 text-[11px] font-bold text-emerald-600 font-mono">S</span>
									<span className="absolute right-1.5 text-[10px] font-semibold text-slate-400">E</span>
									<span className="absolute left-1.5 text-[10px] font-semibold text-slate-400">W</span>

									{/* Dial ring */}
									<div className="absolute inset-2 rounded-full border border-dashed border-slate-300/80 pointer-events-none"></div>

									{/* Fixed Solar Array Pointer (Points South / azimuth) */}
									<div
										className="w-1.5 h-28 absolute flex flex-col items-center justify-between pointer-events-none transition-transform duration-300"
										style={{ transform: `rotate(${azimuth - 180}deg)` }}
										title={`Solar Array Orientation: ${azimuth}°`}
									>
										<div className="w-1 h-12 bg-slate-200 rounded-t"></div>
										<div className="w-2 h-12 bg-blue-600 rounded-b shadow-xs"></div>
									</div>

									{/* Dynamic Sun Bearing Pointer (Rotates with Sun Position) */}
									<div
										className="w-1.5 h-28 absolute flex flex-col items-center justify-start pointer-events-none transition-transform duration-200 ease-out"
										style={{ transform: `rotate(${solarPosition.azimuth - 180}deg)` }}
										title={`Sun Azimuth: ${solarPosition.azimuth}°`}
									>
										<div className="w-3.5 h-3.5 -mt-1 rounded-full bg-amber-400 border border-amber-600 shadow-sm flex items-center justify-center text-[8px]">
											☀️
										</div>
										<div className="w-1 h-12 bg-amber-500 rounded-t shadow-xs"></div>
									</div>

									{/* Center Hub */}
									<div className="w-4 h-4 rounded-full bg-white border-2 border-slate-800 z-10 flex items-center justify-center shadow-xs">
										<div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
									</div>
								</div>

								{/* Compass Legend */}
								<div className="flex items-center gap-3 mt-2.5 text-[10px] font-medium">
									<span className="flex items-center gap-1 text-blue-700">
										<span className="w-2 h-2 rounded-full bg-blue-600"></span>
										Array Heading ({azimuth}°)
									</span>
									<span className="flex items-center gap-1 text-amber-700">
										<span className="w-2 h-2 rounded-full bg-amber-500"></span>
										Sun Azimuth ({solarPosition.azimuth}°)
									</span>
								</div>
							</div>
						</div>

						<div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
							<span className="text-slate-500 text-[11px]">Instantaneous Yield:</span>
							<span className="text-blue-700 font-bold font-mono text-xs">
								{solarPosition.currentKw} kW ({solarPosition.alignment}% rated)
							</span>
						</div>
					</div>
				</div>

				{/* Geographic Installation Location & Footprint Map */}
				<SiteLocationMap
					siteName={site?.name || "Haider Rooftop Solar Array"}
					capacity={cap}
					latitude={site?.location?.latitude ?? site?.coordinates?.lat ?? 26.8467}
					longitude={site?.location?.longitude ?? site?.coordinates?.lng ?? 80.9462}
					locationName={typeof site?.location === "string" ? site.location : (site?.city ? `${site.city}, India` : formatLocationString(site?.location, "Lucknow, Uttar Pradesh, India"))}
					tilt={tilt}
					azimuth={azimuth}
					height={280}
				/>

				{/* Bottom Panel: System Electrical Configuration */}
				<div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs">
					<h2 className="text-xs font-bold text-slate-900 mb-4">System Electrical Configuration</h2>

					<div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
						<div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-center">
							<div className="text-xs font-bold text-slate-900">{panels}x Solar Modules</div>
							<div className="text-[10px] text-slate-500 mt-0.5">2 Strings of {Math.round(panels / 2)}</div>
							<div className="text-[10px] font-semibold text-blue-600 mt-1">{moduleWatts}W Mono PERC</div>
						</div>

						<div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-center">
							<div className="text-xs font-bold text-slate-900">DC Disconnect</div>
							<div className="text-[10px] text-slate-500 mt-0.5">1000V DC Isolator</div>
							<div className="text-[10px] font-semibold text-emerald-600 mt-1 flex items-center justify-center gap-1">
								<Check className="w-3 h-3" /> Engaged
							</div>
						</div>

						<div className="p-3 bg-blue-50/60 border border-blue-300 rounded-md text-center ring-1 ring-blue-500/20">
							<div className="text-xs font-bold text-blue-900">{cap} kW Inverter</div>
							<div className="text-[10px] text-slate-600 mt-0.5 font-mono">
								{site?.inverterSerialNumber || "SOL-INV-5000H-780609"}
							</div>
							<div className="text-[10px] font-bold text-blue-700 mt-1">
								Output: {solarPosition.currentKw} kW (η: {site?.inv_efficiency || 98.0}%)
							</div>
						</div>

						<div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-center">
							<div className="text-xs font-bold text-slate-900">AC Breaker</div>
							<div className="text-[10px] text-slate-500 mt-0.5">32A MCB + RCD</div>
							<div className="text-[10px] font-semibold text-emerald-600 mt-1 flex items-center justify-center gap-1">
								<Check className="w-3 h-3" /> Engaged
							</div>
						</div>

						<div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-center">
							<div className="text-xs font-bold text-slate-900">Net Metering</div>
							<div className="text-[10px] text-slate-500 mt-0.5">Grid Interconnect</div>
							<div className="text-[10px] font-semibold text-emerald-600 mt-1">230V / 50Hz</div>
						</div>
					</div>
				</div>

				{/* Accordion: Advanced Technical Parameters & Loss Derates (Level 2) */}
				<div className="bg-white border border-slate-200/90 rounded-lg shadow-xs overflow-hidden">
					<button
						type="button"
						onClick={() => setAccordionOpen(!accordionOpen)}
						className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
					>
						<div className="flex items-center gap-2">
							<SlidersHorizontal className="w-4 h-4 text-blue-600" />
							<span>Advanced Technical Parameters &amp; Loss Derates (Level 2)</span>
						</div>
						<div className="flex items-center gap-1 text-slate-500 font-semibold text-[11px]">
							<span>{accordionOpen ? "Hide Detailed Loss Factors" : "View Detailed Loss Factors"}</span>
							<ChevronDown className={`w-3.5 h-3.5 transition-transform ${accordionOpen ? "rotate-180" : ""}`} />
						</div>
					</button>

					{accordionOpen && (
						<div className="p-4 border-t border-slate-200 bg-white grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
							<div className="p-3 bg-slate-50 rounded border border-slate-200/70">
								<span className="text-[10px] text-slate-400 block font-medium">Cell Temp Derating</span>
								<strong className="text-slate-800 text-xs mt-0.5 block">4.8% Loss (γ = -0.38%/°C)</strong>
							</div>
							<div className="p-3 bg-slate-50 rounded border border-slate-200/70">
								<span className="text-[10px] text-slate-400 block font-medium">Dust &amp; Soiling</span>
								<strong className="text-slate-800 text-xs mt-0.5 block">{site?.soilingLossPercent || 2.0}% Loss (Cleaned surface)</strong>
							</div>
							<div className="p-3 bg-slate-50 rounded border border-slate-200/70">
								<span className="text-[10px] text-slate-400 block font-medium">Inverter Efficiency</span>
								<strong className="text-slate-800 text-xs mt-0.5 block">{site?.inverterLossPercent || 2.0}% Loss ({site?.inv_efficiency || 98}% Euro η)</strong>
							</div>
							<div className="p-3 bg-slate-50 rounded border border-slate-200/70">
								<span className="text-[10px] text-slate-400 block font-medium">Cabling Resistance</span>
								<strong className="text-slate-800 text-xs mt-0.5 block">{site?.wiringLossPercent || 2.0}% Loss (DC String drop)</strong>
							</div>
						</div>
					)}
				</div>

				{/* Modal for Edit System Configuration */}
				{showEditModal && (
					<div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
						<div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
							<div className="flex items-center justify-between pb-3 border-b border-slate-100">
								<div className="flex items-center gap-2">
									<div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
										<Edit className="w-4 h-4" />
									</div>
									<div>
										<h2 className="text-sm font-bold text-slate-900">Edit System Configuration</h2>
										<p className="text-[11px] text-slate-400">Update hardware specifications &amp; solar array physical layout.</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setShowEditModal(false)}
									className="text-slate-400 hover:text-slate-600 p-1"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							{editError && (
								<div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-2">
									<AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
									<span>{editError}</span>
								</div>
							)}

							<form onSubmit={handleSaveConfig} className="space-y-4">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
									<div className="sm:col-span-2">
										<label className="block text-[11px] font-bold text-slate-700 mb-1">
											Installation Name / Designation
										</label>
										<input
											type="text"
											required
											value={formData.name}
											onChange={(e) => setFormData({ ...formData, name: e.target.value })}
											className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
										/>
									</div>

									<div>
										<label className="block text-[11px] font-bold text-slate-700 mb-1">
											Rated Capacity (kWp)
										</label>
										<input
											type="number"
											step="0.01"
											min="0.5"
											max="100.0"
											required
											value={formData.systemCapacity}
											onChange={(e) => setFormData({ ...formData, systemCapacity: e.target.value })}
											className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
										/>
									</div>

									<div>
										<label className="block text-[11px] font-bold text-slate-700 mb-1">
											Number of Solar Modules
										</label>
										<input
											type="number"
											min="1"
											max="500"
											required
											value={formData.numberOfPanels}
											onChange={(e) => setFormData({ ...formData, numberOfPanels: e.target.value })}
											className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
										/>
									</div>

									<div>
										<label className="block text-[11px] font-bold text-slate-700 mb-1">
											Roof Mounting Pitch (Tilt Angle °)
										</label>
										<input
											type="number"
											step="0.5"
											min="0"
											max="90"
											required
											value={formData.tiltDeg}
											onChange={(e) => setFormData({ ...formData, tiltDeg: e.target.value })}
											className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
										/>
									</div>

									<div>
										<label className="block text-[11px] font-bold text-slate-700 mb-1">
											Panel Direction (Azimuth °)
										</label>
										<input
											type="number"
											step="0.5"
											min="0"
											max="360"
											required
											value={formData.azimuthDeg}
											onChange={(e) => setFormData({ ...formData, azimuthDeg: e.target.value })}
											className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
										/>
										<span className="text-[10px] text-slate-400">180° = True South (Optimal in Northern Hemisphere)</span>
									</div>

									<div>
										<label className="block text-[11px] font-bold text-slate-700 mb-1">
											Inverter Hardware Serial
										</label>
										<input
											type="text"
											required
											value={formData.inverterSerialNumber}
											onChange={(e) => setFormData({ ...formData, inverterSerialNumber: e.target.value })}
											className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
										/>
									</div>

									<div>
										<label className="block text-[11px] font-bold text-slate-700 mb-1">
											Inverter Efficiency (%)
										</label>
										<input
											type="number"
											step="0.1"
											min="80"
											max="99.9"
											required
											value={formData.inv_efficiency}
											onChange={(e) => setFormData({ ...formData, inv_efficiency: e.target.value })}
											className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
										/>
									</div>

									<div>
										<label className="block text-[11px] font-bold text-slate-700 mb-1">
											Soiling Loss Derate (%)
										</label>
										<input
											type="number"
											step="0.1"
											min="0"
											max="20"
											value={formData.soilingLossPercent}
											onChange={(e) => setFormData({ ...formData, soilingLossPercent: e.target.value })}
											className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
										/>
									</div>

									<div>
										<label className="block text-[11px] font-bold text-slate-700 mb-1">
											Shading Factor (0.00 – 1.00)
										</label>
										<input
											type="number"
											step="0.01"
											min="0.1"
											max="1.0"
											value={formData.shadingFactor}
											onChange={(e) => setFormData({ ...formData, shadingFactor: e.target.value })}
											className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
										/>
									</div>
								</div>

								<div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
									<button
										type="button"
										onClick={() => setShowEditModal(false)}
										className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
									>
										Cancel
									</button>
									<button
										type="submit"
										disabled={savingConfig}
										className="bg-[#2563EB] hover:bg-blue-600 text-white font-semibold px-4 py-1.5 rounded-md text-xs shadow-xs transition-colors flex items-center gap-1.5"
									>
										<Save className="w-3.5 h-3.5" />
										<span>{savingConfig ? "Saving..." : "Save Configuration"}</span>
									</button>
								</div>
							</form>
						</div>
					</div>
				)}
			</div>
		</Layout>
	);
};

export default SolarSystemPage;
