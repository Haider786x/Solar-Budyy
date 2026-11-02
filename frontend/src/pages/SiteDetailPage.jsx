import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Layout from "../components/layout/Layout";
import MetricStrip from "../components/ui/MetricStrip";
import StatusBadge from "../components/ui/StatusBadge";
import SiteContextPanel from "../components/SiteContextPanel";
import ActualVsExpectedChart from "../components/charts/ActualVsExpectedChart";
import DailyPredictionTable from "../components/DailyPredictionTable";
import MonthlyLineChartWithTable from "../components/MonthlyLineChartWithTable";
import StatsStrip from "../components/StatsStrip";
import PreviewAlertModal from "../components/PreviewAlertModal";
import {
	fetchUserById,
	fetchSolarReportByUserId,
	refreshSolarReportByUserId,
	fetchDailyPredictionsByUserId,
	fetchMonthlyProductionByUserId,
	triggerDailyPredictionByUserId
} from "../services/api";
import { fetchSOICPreviewAlert, fetchSOICDashboard } from "../services/soicApi";
import { exportReportToExcel } from "../utils/exportToExcel";
import { useAuth } from "../context/AuthContext";

const SiteDetailPage = () => {
	const { siteId } = useParams();
	const navigate = useNavigate();
	const { user: authUser, isAdmin } = useAuth();

	const [user, setUser] = useState(null);
	const [report, setReport] = useState(null);
	const [dailyPredictions, setDailyPredictions] = useState([]);
	const [monthlyProduction, setMonthlyProduction] = useState([]);
	const [reportSource, setReportSource] = useState("pvgis");
	const [activeTab, setActiveTab] = useState("daily"); // "daily" or "monthly"

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [fetchingToday, setFetchingToday] = useState(false);
	const [error, setError] = useState("");
	const [dailyPredictionError, setDailyPredictionError] = useState("");
	const [refreshMetadata, setRefreshMetadata] = useState(null);
	const [backendPerformance, setBackendPerformance] = useState(null);

	// Preview Alert modal state
	const [previewingAlert, setPreviewingAlert] = useState(false);
	const [previewModalOpen, setPreviewModalOpen] = useState(false);
	const [previewData, setPreviewData] = useState(null);

	const loadAllSiteData = useCallback(async () => {
		if (!siteId) return;

		setLoading(true);
		setError("");
		setDailyPredictionError("");

		try {
			const [userRes, reportRes, dailyRes, monthlyRes, dashboardRes] = await Promise.allSettled([
				fetchUserById(siteId),
				fetchSolarReportByUserId(siteId),
				fetchDailyPredictionsByUserId(siteId),
				fetchMonthlyProductionByUserId(siteId),
				fetchSOICDashboard()
			]);

			if (userRes.status === "rejected") {
				throw new Error(userRes.reason?.message || "Failed to load site profile");
			}
			setUser(userRes.value);

			if (reportRes.status === "fulfilled") {
				setReport(reportRes.value);
			}

			if (dailyRes.status === "fulfilled" && Array.isArray(dailyRes.value)) {
				setDailyPredictions(dailyRes.value);
			} else if (dailyRes.status === "rejected") {
				setDailyPredictionError(dailyRes.reason?.message || "Daily prediction history is unavailable");
			}

			if (monthlyRes.status === "fulfilled" && Array.isArray(monthlyRes.value)) {
				setMonthlyProduction(monthlyRes.value);
			}

			if (dashboardRes.status === "fulfilled" && dashboardRes.value) {
				const d = dashboardRes.value;
				const siteActive = d.active_sites?.find((s) => s.site_id === siteId);
				const siteAlert = d.active_alerts?.find((a) => String(a.user_id) === siteId);

				if (siteActive?.performance_percent && siteActive.performance_percent !== "N/A") {
					setBackendPerformance(siteActive.performance_percent);
				} else if (siteAlert?.performance_percent != null) {
					setBackendPerformance(`${Number(siteAlert.performance_percent).toFixed(1)}%`);
				} else {
					setBackendPerformance(null);
				}
			}
		} catch (err) {
			setError(err.message || "Failed to load site analytics");
		} finally {
			setLoading(false);
		}
	}, [siteId]);

	useEffect(() => {
		loadAllSiteData();
	}, [loadAllSiteData]);

	// Actions
	const handleRefreshReport = async () => {
		setRefreshing(true);
		setError("");
		setRefreshMetadata(null);
		try {
			const res = await refreshSolarReportByUserId(siteId);
			setReport(res.report);
			if (res.metadata) setRefreshMetadata(res.metadata);
			const monthlyRes = await fetchMonthlyProductionByUserId(siteId);
			if (Array.isArray(monthlyRes)) setMonthlyProduction(monthlyRes);
		} catch (err) {
			setError(err.message || "Failed to recalculate physical solar model");
		} finally {
			setRefreshing(false);
		}
	};

	const handleFetchTodayPrediction = async () => {
		setFetchingToday(true);
		setDailyPredictionError("");
		try {
			await triggerDailyPredictionByUserId(siteId);
			const [dailyRes, monthlyRes] = await Promise.all([
				fetchDailyPredictionsByUserId(siteId),
				fetchMonthlyProductionByUserId(siteId)
			]);
			if (Array.isArray(dailyRes)) setDailyPredictions(dailyRes);
			if (Array.isArray(monthlyRes)) setMonthlyProduction(monthlyRes);
		} catch (err) {
			setDailyPredictionError(err.message || "Failed to trigger prediction fetch");
		} finally {
			setFetchingToday(false);
		}
	};

	const handlePreviewAlert = async () => {
		setPreviewingAlert(true);
		try {
			const latestDate = dailyPredictions[0]?.date || new Date().toISOString().split("T")[0];
			const result = await fetchSOICPreviewAlert(siteId, latestDate);
			if (result) {
				setPreviewData(result);
				setPreviewModalOpen(true);
			} else {
				alert("No incident payload: site is operating within nominal thresholds.");
			}
		} catch (err) {
			alert(`Preview Failed: ${err.message}`);
		} finally {
			setPreviewingAlert(false);
		}
	};

	// Latest prediction stats
	const latestPrediction = dailyPredictions[0] || null;

	const hasActualTelemetry = useMemo(() => {
		if (!latestPrediction) return false;
		const raw = latestPrediction.inverter_real_time_kwh;
		return (
			raw !== null &&
			raw !== undefined &&
			String(raw).trim() !== "" &&
			String(raw).trim().toUpperCase() !== "N/A" &&
			Number.isFinite(Number(raw))
		);
	}, [latestPrediction]);

	const selectedReportData = report?.[reportSource] ?? report ?? null;

	// Authoritative Performance Ratio directly from existing backend calculation
	const performancePercentage = useMemo(() => {
		if (backendPerformance) {
			return backendPerformance.endsWith("%") ? backendPerformance.slice(0, -1) : backendPerformance;
		}
		const reportRatio = selectedReportData?.performance_ratio ?? report?.performance_ratio;
		if (reportRatio != null && Number.isFinite(Number(reportRatio)) && Number(reportRatio) > 0) {
			const ratioNum = Number(reportRatio);
			return (ratioNum <= 1 ? ratioNum * 100 : ratioNum).toFixed(1);
		}
		return null;
	}, [backendPerformance, selectedReportData, report]);

	const siteKpis = [
		{
			label: "Today Expected",
			value: latestPrediction?.predicted_kwh != null ? Number(latestPrediction.predicted_kwh).toFixed(2) : "—",
			unit: "kWh",
			valueColor: "text-blue-600",
			subtext: "Context-aware forecast"
		},
		{
			label: "Today Actual",
			value: hasActualTelemetry ? Number(latestPrediction.inverter_real_time_kwh).toFixed(2) : "—",
			unit: "kWh",
			valueColor: hasActualTelemetry ? "text-emerald-600" : "text-slate-400",
			subtext: hasActualTelemetry ? "Inverter real-time" : "Telemetry unavailable"
		},
		{
			label: "Yield Difference",
			value: latestPrediction?.difference_kwh != null ? `${latestPrediction.difference_kwh > 0 ? "+" : ""}${Number(latestPrediction.difference_kwh).toFixed(2)}` : "—",
			unit: "kWh",
			valueColor: latestPrediction?.difference_kwh < 0 ? "text-rose-600" : "text-emerald-700",
			subtext: "Actual vs Expected variance"
		},
		{
			label: "Performance Ratio",
			value: performancePercentage != null ? `${performancePercentage}%` : "—",
			unit: "",
			valueColor: performancePercentage != null && Number(performancePercentage) < 90 ? "text-amber-700" : "text-slate-900",
			subtext: "Authoritative daily ratio"
		},
		{
			label: "Peak Power",
			value: latestPrediction?.peak_power_kw != null ? Number(latestPrediction.peak_power_kw).toFixed(2) : "—",
			unit: "kW",
			subtext: "Modeled peak irradiance"
		}
	];

	if (loading) {
		return (
			<Layout>
				<div className="py-24 text-center space-y-3">
					<div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
					<p className="text-xs font-semibold text-slate-600">Loading site telemetry and model parameters...</p>
				</div>
			</Layout>
		);
	}

	if (error && !user) {
		return (
			<Layout>
				<div className="bg-white border border-rose-200 rounded-lg p-8 text-center space-y-4 max-w-md mx-auto my-12">
					<div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
						✕
					</div>
					<h2 className="text-sm font-bold text-slate-900">Site Profile Unavailable</h2>
					<p className="text-xs text-rose-700">{error}</p>
					<button
						type="button"
						onClick={() => navigate(isAdmin ? "/sites" : authUser?.siteId ? `/sites/${authUser.siteId}` : "/")}
						className="px-4 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold"
					>
						{isAdmin ? "Back to Sites Directory" : "Return to My Site"}
					</button>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="space-y-6">
				{/* Top Navigation & Breadcrumb */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200 gap-3">
					<div className="flex items-center gap-2 text-xs">
						<Link to="/sites" className="text-slate-500 hover:text-blue-600 font-medium">
							Sites Directory
						</Link>
						<span className="text-slate-300">/</span>
						<span className="font-semibold text-slate-800">{user?.name}</span>
					</div>

					{/* Action Buttons Toolbar */}
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={handleFetchTodayPrediction}
							disabled={fetchingToday}
							className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
						>
							<svg className={`w-3.5 h-3.5 ${fetchingToday ? "animate-spin text-blue-600" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{fetchingToday ? "Evaluating..." : "Fetch Prediction Now"}
						</button>

						<button
							type="button"
							onClick={handleRefreshReport}
							disabled={refreshing}
							className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
						>
							<svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
							</svg>
							{refreshing ? "Recalculating..." : "Refresh Report"}
						</button>

						{selectedReportData && (
							<button
								type="button"
								onClick={() => exportReportToExcel(selectedReportData, user, {
									dailyPredictions,
									source: reportSource
								})}
								className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
							>
								<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								Export Report
							</button>
						)}
					</div>
				</div>

				{/* Site Header Banner */}
				<div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
								<StatusBadge status="Healthy" />
							</div>
							<div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
								<span>Rating: <strong className="text-slate-800 font-mono">{user?.systemCapacity} kWp</strong></span>
								<span>•</span>
								<span>Coordinates: <strong className="text-slate-800 font-mono">{Number(user?.location?.latitude).toFixed(3)}°N, {Number(user?.location?.longitude).toFixed(3)}°E</strong></span>
								<span>•</span>
								<span>Orientation: <strong className="text-slate-800 font-mono">{user?.tiltDeg}° tilt / {user?.azimuthDeg}° az</strong></span>
								{user?.siteId && (
									<>
										<span>•</span>
										<span className="text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
											Site ID: {user.siteId}
										</span>
									</>
								)}
							</div>
						</div>

						{/* Alert check shortcut */}
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handlePreviewAlert}
								disabled={previewingAlert}
								className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
							>
								{previewingAlert ? "Testing..." : "Test Monitoring Threshold"}
							</button>
						</div>
					</div>

					{refreshMetadata && (
						<div className="mt-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/70 rounded p-2 flex items-center justify-between">
							<span>Physical model synchronized: {refreshMetadata.months_updated} months updated using {refreshMetadata.prediction_model}.</span>
							<span className="text-[10px] text-emerald-600">{new Date(refreshMetadata.refreshed_at).toLocaleTimeString()}</span>
						</div>
					)}
					{dailyPredictionError && (
						<div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200/70 rounded p-2">
							{dailyPredictionError}
						</div>
					)}
				</div>

				{/* High-density Performance KPIs */}
				<MetricStrip metrics={siteKpis} />

				{/* Actual vs Expected Chart (Core Feature) */}
				<ActualVsExpectedChart data={dailyPredictions} />

				{/* Environmental & Plant Context Panel */}
				<SiteContextPanel user={user} prediction={latestPrediction} />

				{/* Analytical Breakdown: Daily vs Monthly */}
				<div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
					{/* Tab Navigation Header */}
					<div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div className="inline-flex rounded-md p-1 bg-slate-200/70 text-xs font-semibold">
							<button
								type="button"
								onClick={() => setActiveTab("daily")}
								className={`px-3 py-1 rounded transition-colors ${
									activeTab === "daily" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
								}`}
							>
								Daily Predictions History ({dailyPredictions.length})
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("monthly")}
								className={`px-3 py-1 rounded transition-colors ${
									activeTab === "monthly" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
								}`}
							>
								Monthly Energy Yield
							</button>
						</div>

						{activeTab === "monthly" && (
							<div className="inline-flex items-center gap-1.5 text-xs font-medium">
								<span className="text-slate-500">Model Engine:</span>
								<div className="inline-flex rounded-md p-0.5 bg-slate-200/70">
									<button
										type="button"
										onClick={() => setReportSource("pvgis")}
										className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
											reportSource === "pvgis" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600"
										}`}
									>
										PVGIS
									</button>
									<button
										type="button"
										onClick={() => setReportSource("pvwatts")}
										className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
											reportSource === "pvwatts" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600"
										}`}
									>
										PVWatts
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Tab Content */}
					<div className="p-4">
						{activeTab === "daily" ? (
							<DailyPredictionTable
								predictions={dailyPredictions}
								loading={loading}
								error={dailyPredictionError}
								fetching={fetchingToday}
								onFetchNow={handleFetchTodayPrediction}
								onPreviewAlert={handlePreviewAlert}
								previewing={previewingAlert}
							/>
						) : (
							<div className="space-y-4">
								<StatsStrip report={selectedReportData} source={reportSource} />
								<MonthlyLineChartWithTable
									predictions={selectedReportData?.monthly_energy_kwh}
									actuals={monthlyProduction}
								/>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Alert Evaluation Modal */}
			<PreviewAlertModal
				isOpen={previewModalOpen}
				onClose={() => setPreviewModalOpen(false)}
				previewData={previewData}
				siteName={user?.name || "Installation"}
				businessDate={latestPrediction?.date || new Date().toISOString().split("T")[0]}
				isRefreshing={previewingAlert}
				onRefresh={handlePreviewAlert}
			/>
		</Layout>
	);
};

export default SiteDetailPage;
