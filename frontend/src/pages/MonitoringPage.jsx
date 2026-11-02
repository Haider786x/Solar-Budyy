import React, { useCallback, useEffect, useState, useRef } from "react";
import Layout from "../components/layout/Layout";
import MetricStrip from "../components/ui/MetricStrip";
import StatusBadge from "../components/ui/StatusBadge";
import { useAuth } from "../context/AuthContext";
import {
	fetchSOICDashboard,
	fetchSOICResolvedAlerts,
	acknowledgeSOICAlert,
	resolveSOICAlert,
	fetchSOICSiteHistory,
	fetchSOICSites
} from "../services/soicApi";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const EMPTY_METRICS = {
	total_sites: 0,
	connected_sites: 0,
	active_sites: 0,
	offline_sites: 0,
	active_alerts: 0,
	critical_sites: 0
};

// Searchable Site Dropdown Helper
const SearchableDropdown = ({ options, value, onChange, placeholder, disabled }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const wrapperRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const filteredOptions = options.filter((opt) => opt.toLowerCase().includes(search.toLowerCase()));

	return (
		<div className="relative w-full" ref={wrapperRef}>
			<div
				className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 flex justify-between items-center ${
					disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-slate-400"
				}`}
				onClick={() => {
					if (!disabled) setIsOpen(!isOpen);
				}}
			>
				<span className={value ? "text-slate-800 font-semibold" : "text-slate-400"}>
					{value || placeholder}
				</span>
				<svg
					className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</div>

			{isOpen && (
				<div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-56 flex flex-col overflow-hidden">
					<div className="bg-slate-50 p-2 border-b border-slate-100">
						<input
							type="text"
							className="w-full rounded border border-slate-300 px-2.5 py-1 text-xs outline-none focus:border-blue-500"
							placeholder="Search site..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onClick={(e) => e.stopPropagation()}
							autoFocus
						/>
					</div>
					<div className="overflow-y-auto flex-1">
						{filteredOptions.length > 0 ? (
							<ul className="py-1 text-xs">
								{filteredOptions.map((opt, i) => (
									<li
										key={i}
										className={`px-3 py-1.5 cursor-pointer transition-colors ${
											opt === value
												? "bg-blue-50 text-blue-800 font-semibold"
												: "text-slate-700 hover:bg-slate-50"
										}`}
										onClick={() => {
											onChange(opt);
											setIsOpen(false);
											setSearch("");
										}}
									>
										{opt}
									</li>
								))}
							</ul>
						) : (
							<div className="px-3 py-4 text-xs text-slate-400 text-center">No matching sites found.</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

// Incident Reports View Helper
const IncidentReportsView = () => {
	const [siteName, setSiteName] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	const [reportData, setReportData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const [validSites, setValidSites] = useState([]);
	const [sitesLoading, setSitesLoading] = useState(true);

	useEffect(() => {
		const loadSites = async () => {
			try {
				const sites = await fetchSOICSites();
				setValidSites(sites || []);
			} catch (err) {
				console.error("Failed to fetch valid sites", err);
			} finally {
				setSitesLoading(false);
			}
		};
		loadSites();
	}, []);

	const handleSearch = async (e) => {
		e.preventDefault();
		if (!siteName.trim()) return;

		setLoading(true);
		setError("");
		setReportData(null);

		try {
			const res = await fetchSOICSiteHistory(siteName, startDate, endDate);
			setReportData(res);
		} catch (err) {
			setError(err.message || "Failed to load report");
		} finally {
			setLoading(false);
		}
	};

	const generateDownloadLink = (type) => {
		const params = new URLSearchParams({ siteName });
		if (startDate) params.append("startDate", startDate);
		if (endDate) params.append("endDate", endDate);
		return `${API_BASE_URL}/soic/alerts/history/report/${type}?${params.toString()}`;
	};

	return (
		<div className="space-y-5">
			<div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
				<form onSubmit={handleSearch} className="flex flex-col md:flex-row items-end gap-3 text-xs">
					<div className="flex-1 w-full">
						<label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">
							Select Monitored Site
						</label>
						<SearchableDropdown
							options={validSites}
							value={siteName}
							onChange={setSiteName}
							placeholder={sitesLoading ? "Loading fleet..." : "Search for a site..."}
							disabled={sitesLoading}
						/>
					</div>
					<div className="w-full md:w-auto">
						<label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">
							Start Date
						</label>
						<input
							type="date"
							className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 outline-none"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>
					<div className="w-full md:w-auto">
						<label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1">
							End Date
						</label>
						<input
							type="date"
							className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 outline-none"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>
					<button
						type="submit"
						disabled={loading || !siteName}
						className="w-full md:w-auto rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors disabled:opacity-50"
					>
						{loading ? "Searching..." : "Search History"}
					</button>
				</form>
				{error && (
					<div className="mt-3 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
						{error}
					</div>
				)}
			</div>

			{reportData && (
				<div className="space-y-4">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
						<div>
							<h2 className="text-base font-bold text-slate-900">{siteName}</h2>
							<p className="text-xs text-slate-500">
								Historical Incident Evaluation Log {startDate && endDate ? `(${startDate} to ${endDate})` : ""}
							</p>
						</div>

						<div className="flex items-center gap-2">
							<a
								href={generateDownloadLink("excel")}
								className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium inline-flex items-center gap-1.5"
								download
							>
								Download Excel
							</a>
							<a
								href={generateDownloadLink("pdf")}
								className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold inline-flex items-center gap-1.5"
								download
							>
								Download PDF
							</a>
						</div>
					</div>

					{/* Summary Grid */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
						<div className="bg-white border border-slate-200 rounded-md p-3">
							<span className="text-slate-400 font-medium">Total Logged</span>
							<div className="text-xl font-bold text-slate-900 mt-1">
								{reportData.metrics?.historical?.TotalAlerts ?? 0}
							</div>
						</div>
						<div className="bg-white border border-slate-200 rounded-md p-3">
							<span className="text-slate-400 font-medium">Resolved</span>
							<div className="text-xl font-bold text-emerald-600 mt-1">
								{reportData.metrics?.historical?.Resolved ?? 0}
							</div>
						</div>
						<div className="bg-white border border-slate-200 rounded-md p-3">
							<span className="text-slate-400 font-medium">Avg Resolution</span>
							<div className="text-xl font-bold text-slate-900 mt-1">
								{reportData.metrics?.historical?.AverageResolutionTime ?? 0}d
							</div>
						</div>
						<div className="bg-white border border-slate-200 rounded-md p-3">
							<span className="text-slate-400 font-medium">Longest Deficit</span>
							<div className="text-xl font-bold text-rose-600 mt-1">
								{reportData.metrics?.historical?.LongestIncident ?? 0}d
							</div>
						</div>
					</div>

					{/* History Incident Table */}
					<div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
						<div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 font-bold text-xs text-slate-800 uppercase tracking-wider">
							Incident Records
						</div>
						{reportData.history && reportData.history.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs border-collapse">
									<thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
										<tr>
											<th className="px-4 py-2.5">Site Name</th>
											<th className="px-4 py-2.5">Severity</th>
											<th className="px-4 py-2.5 text-right">Duration Active</th>
											<th className="px-4 py-2.5 text-right">Resolved Date</th>
											<th className="px-4 py-2.5 text-right">Resolver</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100 text-slate-700">
										{reportData.history.map((alert) => (
											<tr key={alert._id} className="hover:bg-slate-50/70">
												<td className="px-4 py-2.5 font-medium text-slate-900">{alert.site_name}</td>
												<td className="px-4 py-2.5">
													<StatusBadge severity={alert.highest_severity_reached || alert.severity} />
												</td>
												<td className="px-4 py-2.5 text-right font-mono font-medium">
													{alert.total_days_active || alert.consecutive_days || 0}d
												</td>
												<td className="px-4 py-2.5 text-right text-slate-500 font-mono">
													{alert.resolved_at ? new Date(alert.resolved_at).toISOString().split("T")[0] : "—"}
												</td>
												<td className="px-4 py-2.5 text-right text-slate-600">
													{alert.resolved_by || "System"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="p-8 text-center text-xs text-slate-400">No incident history logged for this timeframe.</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

// Main Monitoring Console Page
const MonitoringPage = () => {
	const { isAdmin } = useAuth();
	const [metrics, setMetrics] = useState(EMPTY_METRICS);
	const [activeAlerts, setActiveAlerts] = useState([]);
	const [criticalSites, setCriticalSites] = useState([]);
	const [offlineSites, setOfflineSites] = useState([]);
	const [activeSites, setActiveSites] = useState([]);
	const [resolvedAlerts, setResolvedAlerts] = useState([]);

	const [activeTab, setActiveTab] = useState("active_alerts");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [expandedRows, setExpandedRows] = useState({});

	const toggleRow = (id) => {
		setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const loadDashboard = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const res = await fetchSOICDashboard();
			if (res) {
				setMetrics(res.metrics || EMPTY_METRICS);
				setActiveAlerts(res.active_alerts || []);
				setCriticalSites(res.critical_sites || []);
				setOfflineSites(res.offline_sites || []);
				setActiveSites(res.active_sites || []);
			}
		} catch (err) {
			setError(err.message || "Failed to load monitoring status");
		} finally {
			setLoading(false);
		}
	}, []);

	const loadResolved = useCallback(async () => {
		try {
			const res = await fetchSOICResolvedAlerts();
			setResolvedAlerts(res || []);
		} catch (err) {
			console.error("Failed to fetch resolved alerts", err);
		}
	}, []);

	useEffect(() => {
		loadDashboard();
	}, [loadDashboard]);

	useEffect(() => {
		if (activeTab === "resolved_alerts" && resolvedAlerts.length === 0) {
			loadResolved();
		}
	}, [activeTab, resolvedAlerts.length, loadResolved]);

	const handleAcknowledge = async (id) => {
		try {
			await acknowledgeSOICAlert(id);
			await loadDashboard();
		} catch (err) {
			alert(err.message || "Failed to acknowledge incident");
		}
	};

	const handleResolve = async (id) => {
		try {
			const notes = window.prompt("Resolution Notes (Optional):");
			if (notes !== null) {
				await resolveSOICAlert(id, { notes });
				await loadDashboard();
				if (activeTab === "resolved_alerts") {
					await loadResolved();
				}
			}
		} catch (err) {
			alert(err.message || "Failed to resolve incident");
		}
	};

	const consoleKpis = [
		{
			label: "Monitored Fleet",
			value: metrics.total_sites,
			unit: "sites",
			subtext: "Total active installations"
		},
		{
			label: "Online Connected",
			value: metrics.connected_sites,
			unit: `of ${metrics.total_sites}`,
			valueColor: "text-emerald-700",
			subtext: "Transmitting telemetry"
		},
		{
			label: "Active Incidents",
			value: metrics.active_alerts,
			unit: "open",
			valueColor: metrics.active_alerts > 0 ? "text-amber-700" : "text-slate-900",
			subtext: "Model-detected anomalies"
		},
		{
			label: "Critical Attention",
			value: metrics.critical_sites,
			unit: "sites",
			valueColor: metrics.critical_sites > 0 ? "text-rose-700" : "text-slate-900",
			subtext: ">7 days sustained deficit"
		},
		{
			label: "Offline Systems",
			value: metrics.offline_sites,
			unit: "plants",
			subtext: "Telemetry communication lost"
		}
	];

	const TABS = [
		{ id: "active_alerts", label: "Active Incidents", count: activeAlerts.length },
		{ id: "critical_sites", label: "Critical Escalations", count: criticalSites.length },
		{ id: "offline_sites", label: "Offline Systems", count: offlineSites.length },
		{ id: "active_sites", label: "Operational Fleet", count: activeSites.length },
		{ id: "resolved_alerts", label: "Resolution Pipeline" },
		{ id: "alert_reports", label: "Incident Reports" }
	];

	const currentAlerts =
		activeTab === "active_alerts"
			? activeAlerts
			: activeTab === "critical_sites"
			? criticalSites
			: activeTab === "offline_sites"
			? offlineSites
			: resolvedAlerts;

	return (
		<Layout>
			<div className="space-y-6">
				{/* Header Strip */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-slate-200">
					<div>
						<h1 className="text-xl font-bold tracking-tight text-slate-900">Monitoring & Alert Console</h1>
						<p className="text-xs text-slate-500 mt-0.5">
							Continuous deficit escalation pipeline and verified telemetry anomaly detection.
						</p>
					</div>

					<button
						type="button"
						onClick={loadDashboard}
						disabled={loading}
						className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
					>
						<svg className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{loading ? "Refreshing..." : "Refresh Console"}
					</button>
				</div>

				{/* High-density KPI strip */}
				<MetricStrip metrics={consoleKpis} />

				{error && (
					<div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
						{error}
					</div>
				)}

				{/* Tab Selector */}
				<div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-px">
					{TABS.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
								activeTab === tab.id
									? "border-blue-600 text-blue-700 bg-white"
									: "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
							}`}
						>
							<span>{tab.label}</span>
							{tab.count !== undefined && (
								<span
									className={`ml-2 px-1.5 py-0.2 rounded-full text-[10px] ${
										activeTab === tab.id
											? "bg-blue-100 text-blue-800"
											: "bg-slate-100 text-slate-600"
									}`}
								>
									{tab.count}
								</span>
							)}
						</button>
					))}
				</div>

				{/* Tab View Contents */}
				{activeTab === "alert_reports" ? (
					<IncidentReportsView />
				) : activeTab === "active_sites" ? (
					<div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
						<div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
							<h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
								Operational Fleet ({activeSites.length})
							</h3>
							<span className="text-xs text-slate-500">Systems operating within nominal boundaries</span>
						</div>

						{activeSites.length === 0 ? (
							<div className="p-8 text-center text-xs text-slate-400">No operational sites listed.</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs border-collapse">
									<thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
										<tr>
											<th className="px-4 py-2.5">Site Name</th>
											<th className="px-4 py-2.5">Status</th>
											<th className="px-4 py-2.5">Last Evaluated</th>
											<th className="px-4 py-2.5 text-right">Performance Ratio</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100 text-slate-700">
										{activeSites.map((site) => (
											<tr key={site.site_id} className="hover:bg-slate-50/70">
												<td className="px-4 py-2.5 font-medium text-slate-900">{site.site_name}</td>
												<td className="px-4 py-2.5">
													<StatusBadge status={site.status} />
												</td>
												<td className="px-4 py-2.5 text-slate-500 font-mono">{site.last_evaluated_date}</td>
												<td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800">
													{site.performance_percent || "—"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				) : (
					/* Alert Tables (Active, Critical, Offline, Resolved) */
					<div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
						<div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
							<h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
								{TABS.find((t) => t.id === activeTab)?.label} ({currentAlerts.length})
							</h3>
							<span className="text-xs text-slate-500">
								Threshold: Yield deficit &gt; 10% sustained over evaluation window
							</span>
						</div>

						{currentAlerts.length === 0 ? (
							<div className="p-12 text-center text-xs text-slate-400">
								No incidents logged in this category.
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs border-collapse">
									<thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
										<tr>
											<th className="px-4 py-2.5">Site Name</th>
											<th className="px-4 py-2.5">Severity</th>
											<th className="px-4 py-2.5 text-right">Days Active</th>
											{activeTab !== "resolved_alerts" && <th className="px-4 py-2.5">Incident Status</th>}
											<th className="px-4 py-2.5 text-right">Yield Deficit</th>
											<th className="px-4 py-2.5 text-right">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100 text-slate-700">
										{currentAlerts.map((alert) => (
											<React.Fragment key={alert._id}>
												<tr className="hover:bg-slate-50/70">
													<td className="px-4 py-2.5 font-medium text-slate-900">{alert.site_name}</td>
													<td className="px-4 py-2.5">
														<StatusBadge severity={activeTab === "resolved_alerts" ? "RESOLVED" : alert.severity} />
													</td>
													<td className="px-4 py-2.5 text-right font-mono font-medium">
														{alert.consecutive_days || alert.total_days_active || 0}d
													</td>
													{activeTab !== "resolved_alerts" && (
														<td className="px-4 py-2.5 font-medium text-slate-600">{alert.status}</td>
													)}
													<td className="px-4 py-2.5 text-right font-mono text-rose-600 font-semibold">
														{alert.difference_kwh != null ? `${alert.difference_kwh} kWh` : "—"}
													</td>
													<td className="px-4 py-2.5 text-right space-x-1.5">
														<button
															type="button"
															onClick={() => toggleRow(alert._id)}
															className="px-2 py-1 text-[11px] font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
														>
															{expandedRows[alert._id] ? "Hide Evidence" : "Evidence Log"}
														</button>
														{isAdmin && activeTab !== "resolved_alerts" && alert.status === "OPEN" && (
															<button
																type="button"
																onClick={() => handleAcknowledge(alert._id)}
																className="px-2 py-1 text-[11px] font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
															>
																Ack
															</button>
														)}
														{isAdmin && activeTab !== "resolved_alerts" && (
															<button
																type="button"
																onClick={() => handleResolve(alert._id)}
																className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
															>
																Resolve
															</button>
														)}
													</td>
												</tr>

												{/* Expandable Evidence Log */}
												{expandedRows[alert._id] && (
													<tr className="bg-slate-50/70 border-b border-slate-200">
														<td colSpan={activeTab === "resolved_alerts" ? 5 : 6} className="p-3">
															<div className="bg-white border border-slate-200 rounded p-3 text-xs space-y-2">
																<div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
																	Performance Evidence Log ({alert.performance_window?.length || 0} Days)
																</div>
																{alert.performance_window && alert.performance_window.length > 0 ? (
																	<div className="overflow-x-auto">
																		<table className="w-full text-left text-[11px] font-mono">
																			<thead className="border-b border-slate-100 text-slate-400">
																				<tr>
																					<th className="pb-1">Date</th>
																					<th className="pb-1 text-right">Predicted</th>
																					<th className="pb-1 text-right">Actual</th>
																					<th className="pb-1 text-right">Deficit</th>
																					<th className="pb-1 text-right">Performance</th>
																				</tr>
																			</thead>
																			<tbody className="divide-y divide-slate-100">
																				{alert.performance_window.map((ev, idx) => (
																					<tr key={idx}>
																						<td className="py-1">{ev.date}</td>
																						<td className="py-1 text-right">{ev.predicted_kwh?.toFixed(2)} kWh</td>
																						<td className="py-1 text-right">{ev.actual_kwh?.toFixed(2)} kWh</td>
																						<td className="py-1 text-right text-rose-600 font-semibold">{ev.difference_kwh?.toFixed(2)} kWh</td>
																						<td className="py-1 text-right">{ev.performance_percent != null ? `${ev.performance_percent.toFixed(1)}%` : "—"}</td>
																					</tr>
																				))}
																			</tbody>
																		</table>
																	</div>
																) : (
																	<div className="text-slate-400 italic text-xs">No daily evidence records attached to this incident.</div>
																)}
															</div>
														</td>
													</tr>
												)}
											</React.Fragment>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				)}
			</div>
		</Layout>
	);
};

export default MonitoringPage;
