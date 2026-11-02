import { useCallback, useEffect, useState, useMemo } from "react";
import Layout from "../components/layout/Layout";
import MetricStrip from "../components/ui/MetricStrip";
import ActualVsExpectedChart from "../components/charts/ActualVsExpectedChart";
import MonthlyLineChartWithTable from "../components/MonthlyLineChartWithTable";
import { useAuth } from "../context/AuthContext";
import {
	fetchUsers,
	fetchUserById,
	fetchDailyPredictionsByUserId,
	fetchSolarReportByUserId,
	fetchMonthlyProductionByUserId
} from "../services/api";
import {
	ResponsiveContainer,
	ComposedChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend
} from "recharts";

const ContextComparisonTooltip = ({ active, payload, label, unitY1 = "kWh", unitY2 = "" }) => {
	if (!active || !payload || !payload.length) return null;

	return (
		<div className="bg-white border border-slate-200 rounded-md p-2.5 shadow-md text-xs space-y-1">
			<div className="font-bold text-slate-800 border-b border-slate-100 pb-1">{label}</div>
			{payload.map((entry, index) => (
				<div key={index} className="flex items-center justify-between gap-3 text-[11px]">
					<span className="font-medium" style={{ color: entry.color }}>
						{entry.name}:
					</span>
					<span className="font-mono font-bold text-slate-900">
						{entry.value != null ? `${Number(entry.value).toFixed(1)} ${entry.dataKey === "predicted" ? unitY1 : unitY2}` : "—"}
					</span>
				</div>
			))}
		</div>
	);
};

const AnalyticsPage = () => {
	const { user, isAdmin } = useAuth();
	const [sites, setSites] = useState([]);
	const [selectedSiteId, setSelectedSiteId] = useState("");
	const [selectedSite, setSelectedSite] = useState(null);

	const [dailyPredictions, setDailyPredictions] = useState([]);
	const [report, setReport] = useState(null);
	const [monthlyProduction, setMonthlyProduction] = useState([]);

	const [loadingSites, setLoadingSites] = useState(true);
	const [loadingData, setLoadingData] = useState(false);
	const [error, setError] = useState("");
	const [dataError, setDataError] = useState("");

	// Load site(s) for selector
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
				setError(err.message || "Failed to load site list");
			} finally {
				setLoadingSites(false);
			}
		};
		loadSites();
	}, [isAdmin, user?.siteId]);

	// Load analytics data for selected site
	const loadAnalytics = useCallback(async (siteId) => {
		if (!siteId) return;

		setLoadingData(true);
		setDataError("");

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
					setDataError(dailyRes.reason?.message || "Daily history is unavailable");
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
			setDataError(err.message || "Failed to load analytical time-series");
		} finally {
			setLoadingData(false);
		}
	}, []);

	useEffect(() => {
		if (selectedSiteId) {
			const found = sites.find((s) => s._id === selectedSiteId) || null;
			setSelectedSite(found);
			loadAnalytics(selectedSiteId);
		}
	}, [selectedSiteId, sites, loadAnalytics]);

	// Format data for descriptive context comparisons
	const contextTimeSeries = useMemo(() => {
		if (!dailyPredictions || !dailyPredictions.length) return [];
		const sorted = [...dailyPredictions].sort((a, b) => new Date(a.date) - new Date(b.date));
		return sorted.map((item) => ({
			date: item.date,
			predicted: Number.isFinite(Number(item.predicted_kwh)) ? Number(item.predicted_kwh) : 0,
			temperature: item.avg_temperature != null && Number.isFinite(Number(item.avg_temperature)) ? Number(item.avg_temperature) : null,
			cloudCover: item.avg_cloud_cover != null && Number.isFinite(Number(item.avg_cloud_cover)) ? Number(item.avg_cloud_cover) : null
		}));
	}, [dailyPredictions]);

	// KPI calculation from real data
	const analyticsKpis = useMemo(() => {
		const totalPred = dailyPredictions.reduce((sum, p) => sum + (Number(p.predicted_kwh) || 0), 0);
		const telemetryDays = dailyPredictions.filter((p) => {
			const raw = p.inverter_real_time_kwh;
			return raw !== null && raw !== undefined && raw !== "N/A" && String(raw).trim() !== "" && Number.isFinite(Number(raw));
		});
		const totalActual = telemetryDays.reduce((sum, p) => sum + Number(p.inverter_real_time_kwh), 0);

		return [
			{
				label: "Historical Window",
				value: dailyPredictions.length,
				unit: "days",
				subtext: "Evaluated daily dates"
			},
			{
				label: "Total Expected Yield",
				value: totalPred > 0 ? totalPred.toFixed(1) : "—",
				unit: "kWh",
				valueColor: "text-blue-600",
				subtext: "Aggregated model baseline"
			},
			{
				label: "Verified Generation",
				value: telemetryDays.length > 0 ? totalActual.toFixed(1) : "—",
				unit: telemetryDays.length > 0 ? "kWh" : "",
				valueColor: telemetryDays.length > 0 ? "text-emerald-700" : "text-slate-400",
				subtext: telemetryDays.length > 0 ? `${telemetryDays.length} of ${dailyPredictions.length} days with telemetry` : "Actual telemetry unavailable"
			},
			{
				label: "Array Peak Rating",
				value: selectedSite?.systemCapacity ?? "—",
				unit: "kWp",
				subtext: "Physical nominal rating"
			}
		];
	}, [dailyPredictions, selectedSite]);

	return (
		<Layout>
			<div className="space-y-6">
				{/* Header Strip */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
					<div>
						<h1 className="text-xl font-bold tracking-tight text-slate-900">Historical &amp; Context Analytics</h1>
						<p className="text-xs text-slate-500 mt-0.5">
							Descriptive atmospheric comparisons and multi-timescale yield behavior analysis.
						</p>
					</div>

					{/* Site Selector */}
					<div className="flex items-center gap-1.5">
						<label htmlFor="analytics-site-select" className="text-xs font-medium text-slate-600 whitespace-nowrap">
							Select Installation:
						</label>
						<select
							id="analytics-site-select"
							value={selectedSiteId}
							onChange={(e) => setSelectedSiteId(e.target.value)}
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
				</div>

				{error && (
					<div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
						{error}
					</div>
				)}

				{/* High-density Analytical Summary KPI Strip */}
				<MetricStrip metrics={analyticsKpis} />

				{dataError && (
					<div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
						{dataError}
					</div>
				)}

				{/* SECTION 1: Actual vs Expected Generation (Primary Historical Comparison) */}
				<ActualVsExpectedChart data={dailyPredictions} />

				{/* SECTION 2: Descriptive Context Comparisons */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Temperature & Expected Generation Comparison */}
					<div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
						<div className="border-b border-slate-100 pb-2">
							<h3 className="text-sm font-bold text-slate-900">Temperature and Predicted Generation</h3>
							<p className="text-xs text-slate-500">
								Descriptive comparison of daily peak ambient temperature alongside model-predicted energy yield.
							</p>
						</div>

						{contextTimeSeries.length === 0 ? (
							<div className="h-56 flex items-center justify-center text-xs text-slate-400">
								No recorded temperature time-series available.
							</div>
						) : (
							<div className="h-60 w-full pt-1">
								<ResponsiveContainer width="100%" height="100%">
									<ComposedChart data={contextTimeSeries} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
										<CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
										<XAxis
											dataKey="date"
											tick={{ fontSize: 10, fill: "#64748B" }}
											tickLine={false}
											axisLine={{ stroke: "#E2E8F0" }}
										/>
										<YAxis
											yAxisId="left"
											tick={{ fontSize: 10, fill: "#3574E3" }}
											tickLine={false}
											axisLine={{ stroke: "#E2E8F0" }}
											unit=" kWh"
										/>
										<YAxis
											yAxisId="right"
											orientation="right"
											tick={{ fontSize: 10, fill: "#D97706" }}
											tickLine={false}
											axisLine={{ stroke: "#E2E8F0" }}
											unit="°C"
										/>
										<Tooltip content={<ContextComparisonTooltip unitY1="kWh" unitY2="°C" />} />
										<Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} iconSize={8} />
										<Line
											yAxisId="left"
											type="monotone"
											dataKey="predicted"
											name="Predicted Yield"
											stroke="#3574E3"
											strokeWidth={2}
											dot={{ r: 2 }}
										/>
										<Line
											yAxisId="right"
											type="monotone"
											dataKey="temperature"
											name="Peak Ambient Temp"
											stroke="#D97706"
											strokeWidth={2}
											strokeDasharray="4 4"
											dot={{ r: 2 }}
										/>
									</ComposedChart>
								</ResponsiveContainer>
							</div>
						)}
						<div className="text-[10px] text-slate-400 italic">
							* Note: Descriptive historical observation. Cell temperatures in the SAPM model derate PV efficiency at elevated thermal regimes.
						</div>
					</div>

					{/* Cloud Cover & Expected Generation Comparison */}
					<div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
						<div className="border-b border-slate-100 pb-2">
							<h3 className="text-sm font-bold text-slate-900">Cloud Cover and Predicted Generation</h3>
							<p className="text-xs text-slate-500">
								Descriptive comparison of daily average cloud cover index alongside model-predicted energy yield.
							</p>
						</div>

						{contextTimeSeries.length === 0 ? (
							<div className="h-56 flex items-center justify-center text-xs text-slate-400">
								No recorded cloud cover time-series available.
							</div>
						) : (
							<div className="h-60 w-full pt-1">
								<ResponsiveContainer width="100%" height="100%">
									<ComposedChart data={contextTimeSeries} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
										<CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
										<XAxis
											dataKey="date"
											tick={{ fontSize: 10, fill: "#64748B" }}
											tickLine={false}
											axisLine={{ stroke: "#E2E8F0" }}
										/>
										<YAxis
											yAxisId="left"
											tick={{ fontSize: 10, fill: "#3574E3" }}
											tickLine={false}
											axisLine={{ stroke: "#E2E8F0" }}
											unit=" kWh"
										/>
										<YAxis
											yAxisId="right"
											orientation="right"
											tick={{ fontSize: 10, fill: "#64748B" }}
											tickLine={false}
											axisLine={{ stroke: "#E2E8F0" }}
											unit="%"
										/>
										<Tooltip content={<ContextComparisonTooltip unitY1="kWh" unitY2="%" />} />
										<Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} iconSize={8} />
										<Line
											yAxisId="left"
											type="monotone"
											dataKey="predicted"
											name="Predicted Yield"
											stroke="#3574E3"
											strokeWidth={2}
											dot={{ r: 2 }}
										/>
										<Line
											yAxisId="right"
											type="monotone"
											dataKey="cloudCover"
											name="Average Cloud Cover"
											stroke="#64748B"
											strokeWidth={2}
											strokeDasharray="4 4"
											dot={{ r: 2 }}
										/>
									</ComposedChart>
								</ResponsiveContainer>
							</div>
						)}
						<div className="text-[10px] text-slate-400 italic">
							* Note: Descriptive historical observation. Cloud cover attenuates direct normal irradiance (DNI) in the Open-Meteo radiation profile.
						</div>
					</div>
				</div>

				{/* SECTION 3: Multi-Month Historical Energy Profile */}
				<div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
					<div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
						<div>
							<h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
								Long-Term Monthly Production Profile
							</h3>
							<p className="text-[11px] text-slate-500 mt-0.5">
								Monthly physics energy yield baseline alongside recorded inverter billing production.
							</p>
						</div>
					</div>
					<div className="p-4">
						<MonthlyLineChartWithTable
							predictions={report?.pvgis?.monthly_energy_kwh || report?.monthly_energy_kwh || {}}
							actuals={monthlyProduction}
						/>
					</div>
				</div>
			</div>
		</Layout>
	);
};

export default AnalyticsPage;
