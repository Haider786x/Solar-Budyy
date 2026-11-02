import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth, formatLocationString } from "../context/AuthContext";
import { useDemo } from "../context/DemoContext";
import Layout from "../components/layout/Layout";
import SiteLocationMap from "../components/SiteLocationMap";
import { fetchDailyPredictionsByUserId, fetchUserById } from "../services/api";
import {
	Sun,
	CheckCircle2,
	Sliders,
	Calendar,
	CloudSun,
	Zap,
	Home,
	TrendingDown,
	Leaf,
	TreePine,
	Flame,
	Cpu,
	Activity,
	Radio,
	ArrowRight,
	Clock
} from "lucide-react";
import {
	AreaChart,
	Area,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine
} from "recharts";

// 24-Hour Production Bell Curve Telemetry & Yield Model Data
const BASE_HOURLY_CURVE = [
	{ time: "00:00", actual: 0, expected: 0, group1: 0, group2: 0, group3: 0 },
	{ time: "01:00", actual: 0, expected: 0, group1: 0, group2: 0, group3: 0 },
	{ time: "02:00", actual: 0, expected: 0, group1: 0, group2: 0, group3: 0 },
	{ time: "03:00", actual: 0, expected: 0, group1: 0, group2: 0, group3: 0 },
	{ time: "04:00", actual: 0, expected: 0, group1: 0, group2: 0, group3: 0 },
	{ time: "05:00", actual: 0, expected: 0, group1: 0, group2: 0, group3: 0 },
	{ time: "06:00", actual: 0.15, expected: 0.20, group1: 0.05, group2: 0.15, group3: 0.00 },
	{ time: "07:00", actual: 0.85, expected: 0.90, group1: 0.45, group2: 0.55, group3: 0.10 },
	{ time: "08:00", actual: 1.65, expected: 1.70, group1: 0.85, group2: 0.80, group3: 0.22 },
	{ time: "09:00", actual: 2.30, expected: 2.35, group1: 1.15, group2: 0.95, group3: 0.35 },
	{ time: "10:00", actual: 3.00, expected: 3.10, group1: 1.50, group2: 0.90, group3: 0.60 },
	{ time: "11:00", actual: 3.45, expected: 3.52, group1: 1.70, group2: 0.85, group3: 0.70 },
	{ time: "12:00", actual: 3.68, expected: 3.75, group1: 1.80, group2: 0.65, group3: 0.85 },
	{ time: "13:00", actual: 3.55, expected: 3.60, group1: 1.72, group2: 0.45, group3: 0.88 },
	{ time: "14:00", actual: 2.95, expected: 3.05, group1: 1.45, group2: 0.30, group3: 0.85 },
	{ time: "15:00", actual: 2.20, expected: 2.25, group1: 1.05, group2: 0.20, group3: 0.82 },
	{ time: "16:00", actual: 1.15, expected: 1.20, group1: 0.55, group2: 0.05, group3: 0.50 },
	{ time: "17:00", actual: 0.25, expected: 0.30, group1: 0.10, group2: 0.00, group3: 0.15 },
	{ time: "18:00", actual: 0, expected: 0, group1: 0, group2: 0, group3: 0 },
	{ time: "19:00", actual: 0, expected: 0, group1: 0, group2: 0, group3: 0 },
	{ time: "20:00", actual: 0, expected: 0, group1: 0, group2: 0, group3: 0 },
	{ time: "21:00", actual: 0, expected: 0, group1: 0, group2: 0, group3: 0 },
	{ time: "22:00", actual: 0, expected: 0, group1: 0, group2: 0, group3: 0 },
	{ time: "23:00", actual: 0, expected: 0, group1: 0, group2: 0, group3: 0 }
];

const OverviewPage = () => {
	const { selectedSite, selectedSiteId } = useAuth();
	const { isDemoActive, demoTelemetry } = useDemo();

	// Interactive states
	const [graphMode, setGraphMode] = useState("power"); // 'power' | 'energy'
	const [scrubberHour, setScrubberHour] = useState(12);
	const [siteDetails, setSiteDetails] = useState(null);
	const [_backendPredictions, setBackendPredictions] = useState([]);
	const [_loading, setLoading] = useState(false);

	// Fetch site & prediction details from backend when selected site changes
	useEffect(() => {
		const loadData = async () => {
			if (!selectedSiteId) return;
			setLoading(true);
			try {
				const [siteRes, predRes] = await Promise.allSettled([
					fetchUserById(selectedSiteId),
					fetchDailyPredictionsByUserId(selectedSiteId)
				]);

				if (siteRes.status === "fulfilled" && siteRes.value) {
					const val = siteRes.value;
					setSiteDetails({
						...val,
						location: formatLocationString(val.location, "Lucknow, India")
					});
				}
				if (predRes.status === "fulfilled" && predRes.value) {
					const list = predRes.value.data || predRes.value;
					if (Array.isArray(list)) {
						setBackendPredictions(list);
					}
				}
			} catch (err) {
				console.log("[OverviewPage] Backend fetch notice:", err.message);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, [selectedSiteId]);

	const site = siteDetails || selectedSite;
	const cap = site?.systemCapacity || 5.04;
	const isOutage = site?.status === "System Outage";

	// Inverter identification
	const serial = site?.inverterSerialNumber || "SOL-INV-5000H-780609";
	const isPendingHardware = !isDemoActive && (!serial || serial === "PENDING_INVERTER_ID");
	const effectiveInverterId = isDemoActive ? (demoTelemetry?.demoInverterId || serial) : serial;

	// Target generation for today
	const targetToday = isDemoActive ? (demoTelemetry?.predictedDailyKwh ?? +(cap * 4.88).toFixed(1)) : +(cap * 4.88).toFixed(1);

	// Dynamically scrubbed accumulation based on time of day
	const energyToday = useMemo(() => {
		if (isOutage) return 0;
		if (scrubberHour <= 6) return 0;
		if (scrubberHour >= 18) {
			return isDemoActive
				? (demoTelemetry?.cumulativeEnergyKwh ?? +(targetToday * 0.98).toFixed(1))
				: +(targetToday * 0.98).toFixed(1);
		}
		const angle = ((scrubberHour - 6) / 12) * Math.PI;
		const fraction = (1 - Math.cos(angle)) / 2;
		return +(targetToday * fraction).toFixed(1);
	}, [scrubberHour, targetToday, isOutage, isDemoActive, demoTelemetry]);

	const diffToday = isOutage ? -targetToday : +(energyToday - targetToday).toFixed(1);
	const diffPercent = isOutage ? "-100%" : (energyToday > 0 ? `${((diffToday / targetToday) * 100).toFixed(1)}%` : "0.0%");
	const billSavingsToday = Math.max(0, +(energyToday * 7.50).toFixed(0));

	// Environmental totals - derived from actual recorded generation
	const ytdEnergy = isOutage ? 0 : (site?.ytdGeneratedKwh || 0);
	const co2SavedKg = +(ytdEnergy * 0.71).toFixed(0);
	const treesPlanted = Math.round(co2SavedKg / 20);
	const coalSavedKg = +(ytdEnergy * 0.40).toFixed(0);

	// Scrubbed dynamic live power calculation (reacts instantaneously to scrubberHour)
	const liveOutput = useMemo(() => {
		if (isOutage) {
			return { panels: 0, home: 1.2, grid: -1.2 };
		}
		if (scrubberHour < 6 || scrubberHour > 18) {
			return { panels: 0, home: 0.65, grid: -0.65 };
		}
		const factor = Math.sin(((scrubberHour - 6) / 12) * Math.PI);
		const panels = +(factor * cap * 0.78).toFixed(2);
		const home = +(1.1 + (factor * 0.55)).toFixed(2);
		const grid = +(panels - home).toFixed(2);
		return { panels, home, grid };
	}, [scrubberHour, cap, isOutage]);

	// Chart datasets (productionChartData reacts to graphMode, panelGroupData always stays in kW)
	const { productionChartData, panelGroupData } = useMemo(() => {
		const scale = cap / 5.0;

		// 1. Dedicated Panel Group performance dataset (kW)
		const panelGroup = BASE_HOURLY_CURVE.map((row) => ({
			time: row.time,
			group1: isOutage ? 0 : +(row.group1 * scale).toFixed(2),
			group2: isOutage ? 0 : +(row.group2 * scale).toFixed(2),
			group3: isOutage ? 0 : +(row.group3 * scale).toFixed(2)
		}));

		// 2. Production Chart: switches between instantaneous Power (kW) and cumulative Energy (kWh)
		if (graphMode === "energy") {
			const energyData = BASE_HOURLY_CURVE.map((row) => {
				const hour = parseInt(row.time.split(":")[0], 10);
				let expectedKwh = 0;
				let actualKwh = 0;

				if (hour <= 6) {
					expectedKwh = 0;
					actualKwh = 0;
				} else if (hour >= 18) {
					expectedKwh = targetToday;
					actualKwh = isOutage ? 0 : +(targetToday * 0.98).toFixed(1);
				} else {
					const angle = ((hour - 6) / 12) * Math.PI;
					const fraction = (1 - Math.cos(angle)) / 2;
					expectedKwh = +(targetToday * fraction).toFixed(2);
					actualKwh = isOutage ? 0 : +(targetToday * 0.98 * fraction).toFixed(2);
				}

				return {
					time: row.time,
					expected: expectedKwh,
					actual: hour <= scrubberHour ? actualKwh : null
				};
			});

			return { productionChartData: energyData, panelGroupData: panelGroup };
		}

		// Power mode: instantaneous bell curve in kW
		const powerData = BASE_HOURLY_CURVE.map((row) => {
			const hour = parseInt(row.time.split(":")[0], 10);
			return {
				time: row.time,
				actual: isOutage ? 0 : (hour <= scrubberHour ? +(row.actual * scale).toFixed(2) : null),
				expected: +(row.expected * scale).toFixed(2)
			};
		});

		return { productionChartData: powerData, panelGroupData: panelGroup };
	}, [cap, isOutage, scrubberHour, targetToday, graphMode]);

	const scrubberTimeStr = `${String(Math.floor(scrubberHour)).padStart(2, "0")}:${scrubberHour % 1 !== 0 ? "30" : "00"}`;
	const chartScrubberX = `${String(Math.min(23, Math.max(0, Math.round(scrubberHour)))).padStart(2, "0")}:00`;

	const formatHour = (hourVal) => {
		const h = Math.floor(hourVal);
		const m = hourVal % 1 !== 0 ? "30" : "00";
		const period = h >= 12 ? "PM" : "AM";
		const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
		return `${displayH < 10 ? "0" + displayH : displayH}:${m} ${period}`;
	};

	return (
		<Layout>
			<div className="space-y-4">
				{/* Top Sub-Header Banner Strip */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-transparent pb-1">
					<div className="flex flex-wrap items-center gap-2 text-xs">
						<span className="font-bold text-slate-900 text-sm">
							{site?.name || "Mohammad Haider - Lucknow Rooftop Array"}
						</span>
						<span className="text-slate-400">•</span>
						<span className="text-slate-600 font-medium">
							{site?.location?.latitude ? `${site.location.latitude}°N, ${site.location.longitude}°E` : (site?.location || "Lucknow, India")}
						</span>
						<span className="text-slate-400">•</span>
						<span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-200">
							{cap} kWp Rated
						</span>
						{isOutage ? (
							<span className="bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
								<span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
								System Outage (Under Repair)
							</span>
						) : isPendingHardware ? (
							<span className="bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
								<span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
								Pending Inverter Link
							</span>
						) : (
							<span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
								<CheckCircle2 className="w-3.5 h-3.5" />
								Normal Operation
							</span>
						)}
					</div>

					<div className="flex items-center gap-2 text-xs">
						<div className="bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-700 font-medium flex items-center gap-1.5 shadow-2xs">
							<CloudSun className="w-4 h-4 text-amber-500" />
							<span>31.5°C - Sunny</span>
						</div>
						<div className="bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-700 font-medium flex items-center gap-1.5 shadow-2xs">
							<Calendar className="w-3.5 h-3.5 text-slate-400" />
							<span>Today - Oct 31, 2026</span>
						</div>
						<Link
							to="/solar-system"
							className="bg-white hover:bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-700 font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
						>
							<Sliders className="w-3.5 h-3.5 text-slate-500" />
							<span>Technical Details</span>
						</Link>
					</div>
				</div>

				{/* 4 KPI Metric Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					{/* KPI 1: Energy Generated Today */}
					<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<div className="flex items-center justify-between text-xs text-slate-500 font-medium">
							<span>Energy Generated Today</span>
							<span className={`font-bold flex items-center gap-1 text-[11px] ${
								isOutage
									? "text-rose-600"
									: isPendingHardware
									? "text-amber-600"
									: "text-emerald-600"
							}`}>
								<span className={`w-1.5 h-1.5 rounded-full ${
									isOutage
										? "bg-rose-500"
										: isPendingHardware
										? "bg-amber-500"
										: "bg-emerald-500 animate-pulse"
								}`}></span>
								{isOutage ? "Offline" : isPendingHardware ? "Pending Inverter Link" : "Active"}
							</span>
						</div>
						<div className="flex items-baseline gap-1 mt-2">
							<span className="text-3xl font-extrabold text-slate-900 tracking-tight">{energyToday}</span>
							<span className="text-sm font-semibold text-slate-500">kWh</span>
							<span className="text-xs text-slate-400 ml-auto">
								target: {targetToday} kWh
							</span>
						</div>
						<div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
							<span className="flex items-center gap-1 text-emerald-700 font-semibold">
								<span className="w-2 h-2 rounded-full bg-emerald-500"></span>
								Self-use: {+(energyToday * 0.53).toFixed(1)} kWh
							</span>
							<span className="flex items-center gap-1 text-blue-700 font-semibold">
								<span className="w-2 h-2 rounded-full bg-blue-500"></span>
								Grid: {+(energyToday * 0.47).toFixed(1)} kWh
							</span>
						</div>
					</div>

					{/* KPI 2: Production vs Expected */}
					<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<div className="text-xs text-slate-500 font-medium">Production vs Expected</div>
						<div className="flex items-baseline gap-2 mt-2">
							<span className={`text-3xl font-extrabold tracking-tight ${
								isOutage ? "text-rose-600" : isPendingHardware ? "text-slate-600" : "text-emerald-600"
							}`}>
								{diffPercent}
							</span>
							<span className="text-xs font-semibold text-slate-400">
								{isPendingHardware
									? "(Awaiting Telemetry)"
									: `(${diffToday >= 0 ? "+" : ""}${diffToday} kWh)`}
							</span>
						</div>
						<div className="text-[11px] text-slate-500 mt-2.5 leading-snug">
							{isOutage
								? "MPPT lockout detected. Inverter output zeroed out."
								: isPendingHardware
								? "Inverter serial set to PENDING_INVERTER_ID. Production tracking begins upon hardware link."
								: "System is producing at 100% optimum capacity under today's weather conditions."}
						</div>
					</div>

					{/* KPI 3: Electricity Bill Savings */}
					<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<div className="text-xs text-slate-500 font-medium">Electricity Bill Savings</div>
						<div className="flex items-baseline gap-1 mt-2">
							<span className="text-3xl font-extrabold text-emerald-600 tracking-tight">₹{billSavingsToday}</span>
							<span className="text-xs font-semibold text-slate-500">today</span>
						</div>
						<div className="text-[11px] text-slate-500 mt-2.5 leading-snug">
							Calculated using standard local net metering tariff of ₹7.50 / kWh.
						</div>
					</div>

					{/* KPI 4: System Health */}
					<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<div className="text-xs text-slate-500 font-medium">System Health</div>
						<div className="flex items-center gap-2 mt-2">
							{isOutage ? (
								<span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">!</span>
							) : (
								<CheckCircle2 className="w-6 h-6 text-emerald-600 stroke-[2.5]" />
							)}
							<span className={`text-base font-bold ${isOutage ? "text-rose-700" : isPendingHardware ? "Ready for Inverter Link" : "Normal Operation"}`}>
								{isOutage ? "System Outage" : isPendingHardware ? "Ready for Inverter Link" : "Normal Operation"}
							</span>
						</div>
						<div className="text-[11px] text-slate-500 mt-2.5 leading-snug">
							{cap} kWp Rated Array • {site?.numberOfPanels || 14} Panels Configured
						</div>
					</div>
				</div>

				{/* 3-Column Dashboard Layout */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
					{/* LEFT COLUMN: Live Power Flow & Environmental Impact */}
					<div className="lg:col-span-3 space-y-4">
						{/* Live Power Flow Widget with Scrubber */}
						<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
							<div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-2">
								<span>Live Power Flow</span>
								<div className="flex items-center gap-1 text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
									<Clock className="w-3 h-3 text-slate-400" />
									<span>{formatHour(scrubberHour)}</span>
								</div>
							</div>

							<div className="space-y-1 mb-4">
								<div className="flex justify-between text-[10px] text-slate-400 font-medium">
									<span>06:00 AM</span>
									<span className="text-blue-600 font-semibold">Drag to scrub time</span>
									<span>06:00 PM</span>
								</div>
								<input
									type="range"
									min="6"
									max="18"
									step="0.5"
									value={scrubberHour}
									onChange={(e) => setScrubberHour(parseFloat(e.target.value))}
									className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
								/>
							</div>

							<div className="flex flex-col items-center py-2 relative">
								<div className="flex flex-col items-center z-10">
									<div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-2xs ${isOutage ? "bg-rose-50 border-rose-400 text-rose-600" : "bg-emerald-50 border-emerald-500 text-emerald-600"}`}>
										<Sun className="w-5 h-5" />
									</div>
									<span className="text-[11px] font-bold text-slate-800 mt-1">Solar Panels</span>
									<span className={`text-[10px] font-semibold ${isOutage ? "text-rose-600" : "text-emerald-600"}`}>{liveOutput.panels} kW</span>
								</div>

								<div className="w-0.5 h-6 bg-slate-300 my-0.5 border-dashed border-l"></div>

								<div className="flex flex-col items-center z-10">
									<div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-400 flex items-center justify-center text-blue-600">
										<Cpu className="w-4 h-4" />
									</div>
									<span className="text-[10px] text-slate-500 mt-0.5 font-medium">Inverter (98%)</span>
								</div>

								<div className="w-44 h-5 border-t border-l border-r border-slate-300 mt-1 rounded-t-sm"></div>

								<div className="w-full flex justify-between px-2 -mt-0.5 z-10">
									<div className="flex flex-col items-center">
										<div className="w-9 h-9 rounded-full bg-blue-50 border-2 border-blue-500 flex items-center justify-center text-blue-600">
											<Home className="w-4 h-4" />
										</div>
										<span className="text-[10px] font-bold text-slate-800 mt-1">Home Use</span>
										<span className="text-[10px] font-semibold text-blue-600">{liveOutput.home} kW</span>
									</div>

									<div className="flex flex-col items-center">
										<div className="w-9 h-9 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600">
											<Radio className="w-4 h-4" />
										</div>
										<span className="text-[10px] font-bold text-slate-800 mt-1">Grid Export</span>
										<span className="text-[10px] font-semibold text-emerald-600">{liveOutput.grid} kW</span>
									</div>
								</div>
							</div>
						</div>

						{/* System Status Card */}
						<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
							{isOutage ? (
								<>
									<div className="flex items-center gap-2 text-rose-700 text-xs font-bold">
										<span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
										<span>Critical Outage Detected</span>
									</div>
									<p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
										String 2 open circuit failure &amp; MPPT lockout. Technician dispatch recommended.
									</p>
								</>
							) : (
								<>
									<div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
										<CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
										<span>System Operating Normally</span>
									</div>
									<p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
										No active issues or performance deficits detected. Generation matches weather expectations.
									</p>
								</>
							)}
						</div>

						{/* Environmental Impact Card */}
						<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
							<div className="text-xs font-bold text-slate-900">Environmental Impact</div>
							<div className="text-[10px] text-slate-400 mt-0.5 mb-3">
								Standard CEA factor: 0.71 kg CO₂ saved per kWh.
							</div>
							<div className="grid grid-cols-3 gap-2 text-center">
								<div className="p-2 rounded bg-slate-50 border border-slate-100 flex flex-col items-center">
									<Leaf className="w-4 h-4 text-emerald-600 mb-1" />
									<span className="text-xs font-extrabold text-slate-800">{Number(co2SavedKg).toLocaleString("en-IN")}</span>
									<span className="text-[9px] text-slate-400">kg CO₂ Saved</span>
								</div>
								<div className="p-2 rounded bg-slate-50 border border-slate-100 flex flex-col items-center">
									<TreePine className="w-4 h-4 text-emerald-700 mb-1" />
									<span className="text-xs font-extrabold text-slate-800">{treesPlanted}</span>
									<span className="text-[9px] text-slate-400">Trees Planted</span>
								</div>
								<div className="p-2 rounded bg-slate-50 border border-slate-100 flex flex-col items-center">
									<Flame className="w-4 h-4 text-amber-600 mb-1" />
									<span className="text-xs font-extrabold text-slate-800">{Number(coalSavedKg).toLocaleString("en-IN")}</span>
									<span className="text-[9px] text-slate-400">kg Coal Saved</span>
								</div>
							</div>
						</div>
					</div>

					{/* CENTER COLUMN: Solar Production Graph & String Performance */}
					<div className="lg:col-span-6 space-y-4">
						<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
								<div>
									<h2 className="text-xs font-bold text-slate-900">Solar Production Graph</h2>
									<p className="text-[11px] text-slate-400">
										Actual solar generation compared to the expected production target throughout the day.
									</p>
								</div>
								<div className="flex items-center bg-slate-100 p-0.5 rounded text-[11px] font-semibold">
									<button
										type="button"
										onClick={() => setGraphMode("power")}
										className={`px-2.5 py-1 rounded transition-colors ${
											graphMode === "power" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500"
										}`}
									>
										Power (kW)
									</button>
									<button
										type="button"
										onClick={() => setGraphMode("energy")}
										className={`px-2.5 py-1 rounded transition-colors ${
											graphMode === "energy" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500"
										}`}
									>
										Energy (kWh)
									</button>
								</div>
							</div>

							<div className="h-64 w-full pt-2">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart key={graphMode} data={productionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
										<defs>
											<linearGradient id="actualProdGradLive" x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor={isOutage ? "#EF4444" : "#10B981"} stopOpacity={0.35} />
												<stop offset="95%" stopColor={isOutage ? "#EF4444" : "#10B981"} stopOpacity={0.02} />
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
										<XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} />
										<YAxis
											tick={{ fontSize: 10, fill: "#64748B" }}
											tickLine={false}
											unit={graphMode === "energy" ? " kWh" : " kW"}
											domain={graphMode === "energy" ? [0, Math.ceil(targetToday * 1.2)] : [0, +(cap * 0.85).toFixed(1)]}
										/>
										<Tooltip
											contentStyle={{ backgroundColor: "#1E293B", border: "none", borderRadius: "6px", color: "#FFF", fontSize: "11px" }}
											formatter={(value, name) => [`${value} ${graphMode === "energy" ? "kWh" : "kW"}`, name]}
										/>
										<ReferenceLine
											x={chartScrubberX}
											stroke="#2563EB"
											strokeWidth={2}
											strokeDasharray="3 3"
										/>
										<Area
											type="monotone"
											dataKey="actual"
											name={graphMode === "energy" ? "Actual Energy (Green)" : "Actual Output (Green)"}
											stroke={isOutage ? "#EF4444" : "#10B981"}
											strokeWidth={2.5}
											fillOpacity={1}
											fill="url(#actualProdGradLive)"
										/>
										<Line
											type="monotone"
											dataKey="expected"
											name={graphMode === "energy" ? "Expected Energy Target (Blue)" : "Expected Production (Blue)"}
											stroke="#2563EB"
											strokeWidth={2}
											dot={false}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>

							<div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 text-xs">
								<div className="flex items-center gap-4 text-[11px]">
									<span className="flex items-center gap-1.5 text-slate-700 font-medium">
										<span className={`w-2.5 h-0.5 rounded ${isOutage ? "bg-rose-500" : "bg-emerald-500"}`}></span>
										{graphMode === "energy" ? "Actual Energy (Green)" : `Actual Production (${isOutage ? "0 kW Outage" : "Green"})`}
									</span>
									<span className="flex items-center gap-1.5 text-slate-700 font-medium">
										<span className="w-2.5 h-0.5 bg-blue-600 rounded"></span>
										{graphMode === "energy" ? "Expected Energy Target (Blue)" : "Expected Production (Blue)"}
									</span>
								</div>
								<Link
									to="/energy"
									className="text-blue-600 font-semibold hover:underline flex items-center gap-1 text-[11px]"
								>
									Full Energy Analysis
									<ArrowRight className="w-3 h-3" />
								</Link>
							</div>

							<div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 font-mono">
								<span>
									{graphMode === "energy" ? "Target Total: " : "Peak Power: "}
									<strong className="text-slate-800">
										{graphMode === "energy" ? `${targetToday} kWh` : (isOutage ? "0.00 kW" : `${+(cap * 0.75).toFixed(2)} kW`)}
									</strong>
									{graphMode === "energy" ? " estimated" : " at 12:30 PM"}
								</span>
								<span>Sunrise: <strong className="text-slate-800">06:14 AM</strong></span>
								<span>Sunset: <strong className="text-slate-800">05:48 PM</strong></span>
							</div>
						</div>

						{/* Panel Group Performance Chart */}
						<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
							<div className="flex items-center justify-between pb-2">
								<div>
									<h2 className="text-xs font-bold text-slate-900">Panel Group Performance</h2>
									<p className="text-[11px] text-slate-400">
										Individual power delivery across roof sections.
									</p>
								</div>
								<span className={`border text-[10px] font-bold px-2 py-0.5 rounded ${isOutage ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
									{isOutage ? "String 2 Locked Out" : "All 3 Groups Active"}
								</span>
							</div>

							<div className="h-44 w-full pt-1">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={panelGroupData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
										<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
										<XAxis dataKey="time" tick={{ fontSize: 9, fill: "#64748B" }} tickLine={false} />
										<YAxis tick={{ fontSize: 9, fill: "#64748B" }} tickLine={false} unit=" kW" domain={[0, +(cap * 0.4).toFixed(1)]} />
										<Tooltip
											contentStyle={{ backgroundColor: "#1E293B", border: "none", borderRadius: "6px", color: "#FFF", fontSize: "11px" }}
											formatter={(val, name) => [`${val} kW`, name]}
										/>
										<ReferenceLine
											x={chartScrubberX}
											stroke="#2563EB"
											strokeWidth={2}
											strokeDasharray="3 3"
										/>
										<Line type="monotone" dataKey="group1" name="Roof Group 1 (South Roof)" stroke="#2563EB" strokeWidth={1.8} dot={false} />
										<Line type="monotone" dataKey="group2" name="Roof Group 2 (East Roof)" stroke="#10B981" strokeWidth={1.8} dot={false} />
										<Line type="monotone" dataKey="group3" name="Roof Group 3 (West Roof)" stroke="#F59E0B" strokeWidth={1.8} dot={false} />
									</LineChart>
								</ResponsiveContainer>
							</div>

							<div className="flex items-center gap-3 pt-2 text-[10px] text-slate-600 font-medium border-t border-slate-100">
								<span className="flex items-center gap-1">
									<span className="w-2 h-0.5 bg-blue-600 rounded"></span>
									Roof Group 1 (South Roof)
								</span>
								<span className="flex items-center gap-1">
									<span className="w-2 h-0.5 bg-emerald-500 rounded"></span>
									Roof Group 2 (East Roof)
								</span>
								<span className="flex items-center gap-1">
									<span className="w-2 h-0.5 bg-amber-500 rounded"></span>
									Roof Group 3 (West Roof)
								</span>
							</div>
						</div>
					</div>

					{/* RIGHT COLUMN: Installation Details & Equipment Health */}
					<div className="lg:col-span-3 space-y-4">
						<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
							<div className="text-xs font-bold text-slate-900 mb-2">Installation Details</div>

							<div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col items-center text-center mb-3">
								<div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-red-500 shadow-2xs mb-1.5">
									<Sun className="w-4 h-4 stroke-[2.5]" />
								</div>
								<span className="text-xs font-bold text-slate-900">
									{site?.name}
								</span>
								<span className="text-[10px] text-slate-500 font-medium">{cap} kWp Monocrystalline</span>
							</div>

							<div className="space-y-2 text-xs">
								<div className="flex justify-between py-1 border-b border-slate-100">
									<span className="text-slate-500 text-[11px]">Installation Date</span>
									<span className="font-semibold text-slate-800">{site?.installationDate || "Nov 12, 2023"}</span>
								</div>
								<div className="flex justify-between py-1 border-b border-slate-100">
									<span className="text-slate-500 text-[11px]">Panel Direction</span>
									<span className="font-semibold text-slate-800">Facing South ({site?.azimuthDeg || 180}°)</span>
								</div>
								<div className="flex justify-between py-1 border-b border-slate-100">
									<span className="text-slate-500 text-[11px]">Roof Pitch</span>
									<span className="font-semibold text-slate-800">{site?.tiltDeg || 26}° Slope</span>
								</div>
								<div className="flex justify-between py-1 border-b border-slate-100">
									<span className="text-slate-500 text-[11px]">Location</span>
									<span className="font-semibold text-slate-800">
										{site?.city || (typeof site?.location === "string" ? site.location : formatLocationString(site?.location, "Lucknow, India"))}
									</span>
								</div>
								<div className="flex justify-between py-1">
									<span className="text-slate-500 text-[11px]">System Connection</span>
									<span className={`font-semibold flex items-center gap-1 text-[11px] ${
										isOutage ? "text-rose-600" : "text-emerald-600"
									}`}>
										<span className={`w-1.5 h-1.5 rounded-full ${
											isOutage ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
										}`}></span>
										{isOutage ? "No Telemetry" : "Connected & Synchronized"}
									</span>
								</div>
							</div>

							<div className="mt-3 overflow-hidden rounded-md border border-slate-200">
								<SiteLocationMap
									siteName={site?.name || "Haider Rooftop Solar Array"}
									capacity={cap}
									latitude={site?.location?.latitude ?? site?.coordinates?.lat ?? 26.8467}
									longitude={site?.location?.longitude ?? site?.coordinates?.lng ?? 80.9462}
									locationName={site?.city || (typeof site?.location === "string" ? site.location : formatLocationString(site?.location, "Lucknow, India"))}
									tilt={site?.tiltDeg || 26}
									azimuth={site?.azimuthDeg || 180}
									height={150}
									compact={true}
								/>
							</div>

							<Link
								to="/solar-system"
								className="mt-3 w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-1.5 px-3 rounded border border-slate-200 text-xs flex items-center justify-center gap-1 transition-colors"
							>
								View System Details &amp; Array Map
								<ArrowRight className="w-3.5 h-3.5" />
							</Link>
						</div>

						<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
							<div className="text-xs font-bold text-slate-900 mb-3">Installed Equipment</div>
							<div className="space-y-2.5 text-xs">
								<div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
									<div className="flex items-center gap-2">
										<Cpu className="w-4 h-4 text-blue-600" />
										<span className="font-medium text-slate-700">Inverter (1)</span>
									</div>
									<div className="flex items-center gap-1.5">
										<span className="text-[10px] text-slate-400 font-mono">{effectiveInverterId}</span>
										<span className={`font-bold text-[11px] ${
											isOutage
												? "text-rose-600"
												: isPendingHardware
												? "text-amber-600"
												: "text-emerald-700"
										}`}>
											{isOutage ? "MPPT Lockout" : isPendingHardware ? "Pending ID" : "Normal"}
										</span>
									</div>
								</div>

								<div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
									<div className="flex items-center gap-2">
										<Sun className="w-4 h-4 text-amber-500" />
										<span className="font-medium text-slate-700">Modules ({site?.numberOfPanels || 14})</span>
									</div>
									<span className="text-emerald-700 font-bold text-[11px]">Online</span>
								</div>

								<div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
									<div className="flex items-center gap-2">
										<Activity className="w-4 h-4 text-indigo-600" />
										<span className="font-medium text-slate-700">Smart Meters (1)</span>
									</div>
									<span className="text-emerald-700 font-bold text-[11px]">Connected</span>
								</div>

								<div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
									<div className="flex items-center gap-2">
										<Radio className="w-4 h-4 text-slate-600" />
										<span className="font-medium text-slate-700">System Gateway</span>
									</div>
									<span className={`font-bold text-[11px] ${isOutage ? "text-rose-600" : "text-emerald-700"}`}>
										{isOutage ? "Error" : "Active"}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Layout>
	);
};

export default OverviewPage;
