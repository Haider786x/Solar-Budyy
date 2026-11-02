import { useCallback, useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import MetricStrip from "../components/ui/MetricStrip";
import SiteContextPanel from "../components/SiteContextPanel";
import DailyPredictionTable from "../components/DailyPredictionTable";
import StatsStrip from "../components/StatsStrip";
import MonthlyLineChartWithTable from "../components/MonthlyLineChartWithTable";
import { useAuth } from "../context/AuthContext";
import {
	fetchUsers,
	fetchUserById,
	fetchDailyPredictionsByUserId,
	fetchSolarReportByUserId,
	triggerDailyPredictionByUserId,
	fetchMonthlyProductionByUserId
} from "../services/api";

const PredictionsPage = () => {
	const { user, isAdmin } = useAuth();
	const [sites, setSites] = useState([]);
	const [selectedSiteId, setSelectedSiteId] = useState("");
	const [selectedSite, setSelectedSite] = useState(null);

	const [dailyPredictions, setDailyPredictions] = useState([]);
	const [report, setReport] = useState(null);
	const [monthlyProduction, setMonthlyProduction] = useState([]);
	const [reportSource, setReportSource] = useState("pvgis");

	const [loadingSites, setLoadingSites] = useState(true);
	const [loadingData, setLoadingData] = useState(false);
	const [fetchingToday, setFetchingToday] = useState(false);
	const [error, setError] = useState("");
	const [predictionError, setPredictionError] = useState("");

	// Load active site(s) for the selector
	useEffect(() => {
		const loadSites = async () => {
			setLoadingSites(true);
			setError("");
			try {
				let list = [];
				if (isAdmin) {
					const res = await fetchUsers();
					list = Array.isArray(res) ? res : [];
				} else if (user?.siteId) {
					const single = await fetchUserById(user.siteId);
					list = single ? [single] : [];
				}
				setSites(list);
				if (list.length > 0) {
					setSelectedSiteId(list[0]._id);
					setSelectedSite(list[0]);
				}
			} catch (err) {
				setError(err.message || "Failed to load solar sites");
			} finally {
				setLoadingSites(false);
			}
		};
		loadSites();
	}, [isAdmin, user?.siteId]);

	// Load prediction & report data when selected site changes
	const loadSitePredictions = useCallback(async (siteId) => {
		if (!siteId) return;

		setLoadingData(true);
		setPredictionError("");

		try {
			const [dailyRes, reportRes, monthlyRes] = await Promise.allSettled([
				fetchDailyPredictionsByUserId(siteId),
				fetchSolarReportByUserId(siteId),
				fetchMonthlyProductionByUserId(siteId)
			]);

			if (dailyRes.status === "fulfilled" && Array.isArray(dailyRes.value)) {
				setDailyPredictions(dailyRes.value);
			} else {
				setDailyPredictions([]);
				if (dailyRes.status === "rejected") {
					setPredictionError(dailyRes.reason?.message || "Daily predictions currently unavailable");
				}
			}

			if (reportRes.status === "fulfilled") {
				setReport(reportRes.value);
			} else {
				setReport(null);
			}

			if (monthlyRes.status === "fulfilled" && Array.isArray(monthlyRes.value)) {
				setMonthlyProduction(monthlyRes.value);
			} else {
				setMonthlyProduction([]);
			}
		} catch (err) {
			setPredictionError(err.message || "Failed to load prediction records");
		} finally {
			setLoadingData(false);
		}
	}, []);

	useEffect(() => {
		if (selectedSiteId) {
			const found = sites.find((s) => s._id === selectedSiteId) || null;
			setSelectedSite(found);
			loadSitePredictions(selectedSiteId);
		}
	}, [selectedSiteId, sites, loadSitePredictions]);

	const handleSiteChange = (e) => {
		setSelectedSiteId(e.target.value);
	};

	const handleTriggerFetch = async () => {
		if (!selectedSiteId) return;
		setFetchingToday(true);
		setPredictionError("");
		try {
			await triggerDailyPredictionByUserId(selectedSiteId);
			await loadSitePredictions(selectedSiteId);
		} catch (err) {
			setPredictionError(err.message || "Failed to trigger prediction evaluation");
		} finally {
			setFetchingToday(false);
		}
	};

	const latestPrediction = dailyPredictions[0] || null;

	const hasActualTelemetry = Boolean(
		latestPrediction &&
		latestPrediction.inverter_real_time_kwh !== null &&
		latestPrediction.inverter_real_time_kwh !== undefined &&
		String(latestPrediction.inverter_real_time_kwh).trim() !== "" &&
		String(latestPrediction.inverter_real_time_kwh).trim().toUpperCase() !== "N/A" &&
		Number.isFinite(Number(latestPrediction.inverter_real_time_kwh))
	);

	const predictionKpis = [
		{
			label: "Today's Expected Yield",
			value: latestPrediction?.predicted_kwh != null ? Number(latestPrediction.predicted_kwh).toFixed(2) : "—",
			unit: "kWh",
			valueColor: "text-blue-600",
			subtext: "Contextual physics model"
		},
		{
			label: "Inverter Telemetry",
			value: hasActualTelemetry ? Number(latestPrediction.inverter_real_time_kwh).toFixed(2) : "—",
			unit: "kWh",
			valueColor: hasActualTelemetry ? "text-emerald-700" : "text-slate-400",
			subtext: hasActualTelemetry ? "Verified generation" : "Actual telemetry unavailable"
		},
		{
			label: "Modeled Peak Power",
			value: latestPrediction?.peak_power_kw != null ? Number(latestPrediction.peak_power_kw).toFixed(2) : "—",
			unit: "kW",
			subtext: "Clear-sky peak rating"
		},
		{
			label: "Ambient Temp (Stored)",
			value: latestPrediction?.avg_temperature != null ? `${latestPrediction.avg_temperature}°C` : "—",
			unit: "",
			subtext: "Recorded daily maximum"
		},
		{
			label: "Cloud Cover (Stored)",
			value: latestPrediction?.avg_cloud_cover != null ? `${latestPrediction.avg_cloud_cover}%` : "—",
			unit: "",
			subtext: "Recorded atmospheric cover"
		}
	];

	const selectedReportData = report?.[reportSource] ?? report ?? null;

	return (
		<Layout>
			<div className="space-y-6">
				{/* Header Strip */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
					<div>
						<h1 className="text-xl font-bold tracking-tight text-slate-900">Context-Aware Prediction Engine</h1>
						<p className="text-xs text-slate-500 mt-0.5">
							Predictive solar yield estimation incorporating atmospheric meteorological parameters and PV system geometry.
						</p>
					</div>

					{/* Site Selector & Action */}
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1.5">
							<label htmlFor="site-select" className="text-xs font-medium text-slate-600 whitespace-nowrap">
								Target Site:
							</label>
							<select
								id="site-select"
								value={selectedSiteId}
								onChange={handleSiteChange}
								disabled={loadingSites || sites.length === 0}
								className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 shadow-2xs"
							>
								{sites.map((s) => (
									<option key={s._id} value={s._id}>
										{s.name} ({s.systemCapacity} kW)
									</option>
								))}
							</select>
						</div>

						<button
							type="button"
							onClick={handleTriggerFetch}
							disabled={fetchingToday || !selectedSiteId}
							className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
						>
							<svg className={`w-3.5 h-3.5 mr-1.5 ${fetchingToday ? "animate-spin text-blue-600" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{fetchingToday ? "Executing Model..." : "Trigger Prediction"}
						</button>
					</div>
				</div>

				{/* Global Loading / Error */}
				{error && (
					<div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
						{error}
					</div>
				)}

				{/* Academic Architecture Framework Banner */}
				<div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
					<div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
						Prediction Pipeline Architecture
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
						<div className="p-2.5 rounded bg-slate-50 border border-slate-100">
							<span className="font-bold text-slate-800">1. Context Inputs</span>
							<p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
								Open-Meteo atmospheric variables (GTI, GHI, DNI, temperature, cloud cover, wind).
							</p>
						</div>
						<div className="p-2.5 rounded bg-slate-50 border border-slate-100">
							<span className="font-bold text-slate-800">2. Plant Geometry</span>
							<p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
								Array capacity, tilt angle, azimuth, inverter efficiency, and derating factors.
							</p>
						</div>
						<div className="p-2.5 rounded bg-slate-50 border border-slate-100">
							<span className="font-bold text-slate-800">3. Physics Model</span>
							<p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
								pvlib SAPM cell thermal model &amp; PVWatts DC/AC inverter conversion.
							</p>
						</div>
						<div className="p-2.5 rounded bg-blue-50 border border-blue-100">
							<span className="font-bold text-blue-900">4. Expected Yield</span>
							<p className="text-[11px] text-blue-700 mt-0.5 leading-snug">
								Authoritative expected daily generation baseline (kWh) for monitoring comparison.
							</p>
						</div>
					</div>
					<div className="mt-2 text-[11px] text-slate-400 italic">
						* Note: The backend prediction pipeline incorporates contextual environmental and system parameters when estimating expected solar generation.
					</div>
				</div>

				{/* Prediction KPIs for Selected Site */}
				<MetricStrip metrics={predictionKpis} />

				{predictionError && (
					<div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
						{predictionError}
					</div>
				)}

				{/* Context Inputs Component (Reused from Step 5) */}
				{selectedSite && (
					<SiteContextPanel user={selectedSite} prediction={latestPrediction} />
				)}

				{/* Historical Prediction Table */}
				<div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
					<div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
						<div>
							<h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
								Daily Generation Prediction History ({dailyPredictions.length} Records)
							</h3>
							<p className="text-[11px] text-slate-500 mt-0.5">
								Recorded daily model evaluations with meteorological indicators.
							</p>
						</div>
					</div>
					<div className="p-4">
						<DailyPredictionTable
							predictions={dailyPredictions}
							loading={loadingData}
							error={predictionError}
							fetching={fetchingToday}
							onFetchNow={handleTriggerFetch}
						/>
					</div>
				</div>

				{/* Physical Monthly Yield Breakdown (PVGIS / PVWatts) */}
				{selectedReportData && (
					<div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
						<div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
							<div>
								<h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
									Physical Climate Baseline Yield (PVGIS / PVWatts)
								</h3>
								<p className="text-[11px] text-slate-500 mt-0.5">
									Long-term satellite meteorological reanalysis for nominal monthly yield profile.
								</p>
							</div>

							<div className="inline-flex rounded-md p-0.5 bg-slate-200/70 text-xs font-semibold">
								<button
									type="button"
									onClick={() => setReportSource("pvgis")}
									className={`px-3 py-1 rounded transition-colors ${
										reportSource === "pvgis" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600"
									}`}
								>
									PVGIS (JRC)
								</button>
								<button
									type="button"
									onClick={() => setReportSource("pvwatts")}
									className={`px-3 py-1 rounded transition-colors ${
										reportSource === "pvwatts" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600"
									}`}
								>
									PVWatts (NREL)
								</button>
							</div>
						</div>

						<div className="p-4 space-y-4">
							<StatsStrip report={selectedReportData} source={reportSource} />
							<MonthlyLineChartWithTable
								predictions={selectedReportData?.monthly_energy_kwh}
								actuals={monthlyProduction}
							/>
						</div>
					</div>
				)}
			</div>
		</Layout>
	);
};

export default PredictionsPage;
