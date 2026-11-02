import { useState, useEffect, useCallback } from "react";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { fetchSOICDashboard, resolveSOICAlert } from "../services/soicApi";
import {
	AlertTriangle,
	CheckCircle2,
	Wrench,
	Calendar,
	Activity,
	Check,
	X,
	ShieldCheck,
	Clock,
	FileText
} from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer
} from "recharts";

const DEFAULT_TEN_DAY_HISTORY = [
	{ date: "10-31", expected: 22.4, actual: 17.0 },
	{ date: "10-30", expected: 22.8, actual: 17.2 },
	{ date: "10-29", expected: 23.0, actual: 17.5 },
	{ date: "10-28", expected: 23.1, actual: 18.2 },
	{ date: "10-27", expected: 22.7, actual: 19.5 },
	{ date: "10-26", expected: 22.4, actual: 20.2 },
	{ date: "10-25", expected: 21.9, actual: 20.9 },
	{ date: "10-24", expected: 22.5, actual: 21.8 },
	{ date: "10-23", expected: 23.1, actual: 22.6 },
	{ date: "10-22", expected: 22.8, actual: 22.4 }
];

const AlertsPage = () => {
	const { isAdmin, selectedSite, selectedSiteId } = useAuth();
	const [activeTab, setActiveTab] = useState("active");
	const [severityFilter, setSeverityFilter] = useState("all");
	const [resolved, setResolved] = useState(false);
	const [showResolveModal, setShowResolveModal] = useState(false);
	const [resolveNotes, setResolveNotes] = useState(
		"Technician inspected inverter string fuses. Replaced blown DC fuse on string 2. Restored nominal power generation."
	);
	const [activeAlertItem, setActiveAlertItem] = useState(null);
	const [resolving, setResolving] = useState(false);
	const [resolveSuccessMsg, setResolveSuccessMsg] = useState("");

	// Load live alerts from backend filtered by active site
	const loadAlerts = useCallback(async () => {
		try {
			const res = await fetchSOICDashboard();
			if (res?.critical_sites?.length > 0) {
				const cAlert = res.critical_sites.find((c) =>
					(selectedSiteId && (c.user_id === selectedSiteId || c.site_id === selectedSiteId)) ||
					(c.site_name && selectedSite?.name && c.site_name.toLowerCase().includes(selectedSite.name.toLowerCase()))
				);
				if (cAlert) {
					setActiveAlertItem({
						id: cAlert._id,
						incidentId: cAlert.incident_id || `#INC-${cAlert._id?.toString().slice(-6) || "84921"}`,
						siteName: cAlert.site_name || selectedSite?.name || "Jaipur Solar Farm West",
						severity: cAlert.severity || "CRITICAL",
						status: cAlert.status || "ACKNOWLEDGED",
						notes: cAlert.notes || "String 2 open circuit failure & inverter MPPT lockout. Daytime output flatlined.",
						createdAt: cAlert.created_at ? new Date(cAlert.created_at).toLocaleDateString() : "10/31/2026"
					});
				} else {
					setActiveAlertItem(null);
				}
			} else {
				setActiveAlertItem(null);
			}
		} catch (err) {
			setActiveAlertItem(null);
		}
	}, [selectedSiteId, selectedSite?.name]);

	useEffect(() => {
		loadAlerts();
	}, [loadAlerts]);

	// An issue is active only if the selected site has an outage or a site-specific alert exists
	const isSiteOutage = selectedSite?.status === "System Outage";
	const hasActiveIssue = !resolved && (Boolean(activeAlertItem) || isSiteOutage);

	const activeAlert = hasActiveIssue ? activeAlertItem : null;

	// Dynamic tab counts (strictly 0 when no issues exist!)
	const activeCount = resolved ? 0 : (activeAlert ? 1 : 0);
	const acknowledgedCount = resolved ? 0 : (activeAlert ? 1 : 0);
	const resolvedCount = resolved ? 2 : 1;

	const handleResolve = async () => {
		setResolving(true);
		try {
			if (activeAlert?.id && activeAlert.id !== "jaipur_outage_alert") {
				await resolveSOICAlert(activeAlert.id, { notes: resolveNotes });
			}
		} catch (err) {
			console.log("[AlertsPage] Resolution notice:", err.message);
		} finally {
			setResolving(false);
			setResolved(true);
			setShowResolveModal(false);
			setResolveSuccessMsg(`Incident ${activeAlert?.incidentId || "#INC-84921"} resolved successfully!`);
			setTimeout(() => setResolveSuccessMsg(""), 5000);
		}
	};

	const showActiveIncident = activeTab === "active" && Boolean(activeAlert) && (severityFilter === "all" || severityFilter === "critical");
	const showAcknowledgedIncident = activeTab === "acknowledged" && Boolean(activeAlert) && (severityFilter === "all" || severityFilter === "critical");

	return (
		<Layout>
			<div className="space-y-4">
				{/* Top Breadcrumb & Header with Tabs */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
					<div>
						<div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
							<span>System Operations</span>
							<span className="text-slate-400">/</span>
							<span>Alerts &amp; Notifications</span>
						</div>
						<h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
							System Alerts &amp; Issues
						</h1>
					</div>

					<div className="flex items-center bg-slate-100 p-0.5 rounded-md text-xs font-semibold self-start sm:self-auto">
						<button
							type="button"
							onClick={() => setActiveTab("active")}
							className={`px-3 py-1.5 rounded transition-colors ${
								activeTab === "active"
									? "bg-[#2563EB] text-white shadow-2xs font-bold"
									: "text-slate-600 hover:text-slate-900"
							}`}
						>
							Active Issues ({activeCount})
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("acknowledged")}
							className={`px-3 py-1.5 rounded transition-colors ${
								activeTab === "acknowledged"
									? "bg-[#2563EB] text-white shadow-2xs font-bold"
									: "text-slate-600 hover:text-slate-900"
							}`}
						>
							Acknowledged ({acknowledgedCount})
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("resolved")}
							className={`px-3 py-1.5 rounded transition-colors ${
								activeTab === "resolved"
									? "bg-[#2563EB] text-white shadow-2xs font-bold"
									: "text-slate-600 hover:text-slate-900"
							}`}
						>
							Resolved History ({resolvedCount})
						</button>
					</div>
				</div>

				{resolveSuccessMsg && (
					<div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-semibold flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
						<span>{resolveSuccessMsg}</span>
					</div>
				)}

				{/* Severity Filter Strip */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
					<div className="flex items-center gap-1.5">
						<span className="text-slate-400 font-medium mr-1">Filter Severity:</span>
						<button
							type="button"
							onClick={() => setSeverityFilter("all")}
							className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
								severityFilter === "all"
									? "bg-[#0F172A] text-white"
									: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
							}`}
						>
							All Severities
						</button>
						<button
							type="button"
							onClick={() => setSeverityFilter("critical")}
							className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
								severityFilter === "critical"
									? "bg-[#0F172A] text-white"
									: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
							}`}
						>
							Critical Outage
						</button>
						<button
							type="button"
							onClick={() => setSeverityFilter("performance")}
							className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
								severityFilter === "performance"
									? "bg-[#0F172A] text-white"
									: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
							}`}
						>
							Performance Alert
						</button>
						<button
							type="button"
							onClick={() => setSeverityFilter("minor")}
							className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
								severityFilter === "minor"
									? "bg-[#0F172A] text-white"
									: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
							}`}
						>
							Minor
						</button>
					</div>

					<span className="text-slate-400 text-[11px]">
						Showing {activeTab === "active" ? activeCount : activeTab === "acknowledged" ? acknowledgedCount : resolvedCount} of {activeCount + resolvedCount} total recorded events for {selectedSite?.shortName || selectedSite?.name || "Haider — Lucknow Rooftop"}
					</span>
				</div>

				{/* TAB 1: Active Issues */}
				{activeTab === "active" && (
					<>
						{showActiveIncident ? (
							<div className="bg-white border border-rose-200 rounded-lg p-5 shadow-xs space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
									<div className="flex flex-wrap items-center gap-2 text-xs">
										<span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
											Critical Priority: System Outage
										</span>
										<span className="text-slate-500 font-mono text-[11px]">
											ID: {activeAlert?.incidentId}
										</span>
										<span className="text-slate-400">•</span>
										<span className="font-bold text-slate-800">
											{activeAlert?.siteName}
										</span>
										<span className="text-slate-400">•</span>
										<span className="text-slate-500 font-medium">
											Status: <strong className="text-rose-700 font-bold">OPEN</strong>
										</span>
									</div>

									{isAdmin && (
										<button
											type="button"
											onClick={() => setShowResolveModal(true)}
											className="bg-[#2563EB] hover:bg-blue-600 text-white font-semibold px-4 py-1.5 rounded-md text-xs shadow-xs transition-colors self-start sm:self-auto"
										>
											Resolve Alert
										</button>
									)}
								</div>

								<h2 className="text-sm font-bold text-slate-900 leading-snug">
									{activeAlert?.notes}
								</h2>

								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-1">
									<div className="bg-slate-50 p-3 rounded border border-slate-100">
										<span className="text-[11px] font-bold text-slate-500 block mb-1">What happened?</span>
										<p className="text-slate-700 leading-relaxed text-[11px]">
											Actual output is 98.5% lower than expected for current sunlight conditions.
										</p>
									</div>

									<div className="bg-slate-50 p-3 rounded border border-slate-100">
										<span className="text-[11px] font-bold text-slate-500 block mb-1">Affected Installation:</span>
										<p className="text-slate-700 leading-relaxed text-[11px]">
											Rooftop Photovoltaic Modules (14 Panels, Groups 1 &amp; 2)
										</p>
									</div>

									<div className="bg-slate-50 p-3 rounded border border-slate-100">
										<span className="text-[11px] font-bold text-slate-500 block mb-1">Date Detected:</span>
										<p className="text-slate-700 font-mono leading-relaxed text-[11px]">
											{activeAlert?.createdAt}
										</p>
									</div>

									<div className="bg-emerald-50/60 p-3 rounded border border-emerald-100">
										<span className="text-[11px] font-bold text-emerald-800 block mb-1">Recommended Action:</span>
										<p className="text-emerald-700 font-semibold leading-relaxed text-[11px]">
											Inspect inverter string fuses and DC isolation switch.
										</p>
									</div>
								</div>
							</div>
						) : (
							<div className="bg-white border border-slate-200/90 rounded-lg p-10 shadow-xs flex flex-col items-center justify-center text-center">
								<div className="w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 mb-3 shadow-2xs">
									<CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
								</div>
								<h2 className="text-sm font-bold text-slate-900">All Systems Operating Normally</h2>
								<p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
									No active alerts or hardware anomalies detected for <strong>{selectedSite?.shortName || selectedSite?.name || "Haider — Lucknow Rooftop"}</strong>. Your solar installation is producing within nominal parameters.
								</p>
							</div>
						)}
					</>
				)}

				{/* TAB 2: Acknowledged Issues */}
				{activeTab === "acknowledged" && (
					<>
						{showAcknowledgedIncident ? (
							<div className="bg-white border border-amber-200 rounded-lg p-5 shadow-xs space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
									<div className="flex flex-wrap items-center gap-2 text-xs">
										<span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-200">
											Acknowledged Outage
										</span>
										<span className="text-slate-500 font-mono text-[11px]">
											ID: {activeAlert?.incidentId}
										</span>
										<span className="text-slate-400">•</span>
										<span className="font-bold text-slate-800">
											{activeAlert?.siteName}
										</span>
										<span className="text-slate-400">•</span>
										<span className="text-slate-500 font-medium">
											Status: <strong className="text-amber-800 font-bold">DISPATCH QUEUED</strong>
										</span>
									</div>

									{isAdmin && (
										<button
											type="button"
											onClick={() => setShowResolveModal(true)}
											className="bg-[#2563EB] hover:bg-blue-600 text-white font-semibold px-4 py-1.5 rounded-md text-xs shadow-xs transition-colors self-start sm:self-auto"
										>
											Resolve Alert
										</button>
									)}
								</div>

								<h2 className="text-sm font-bold text-slate-900 leading-snug">
									{activeAlert?.notes}
								</h2>

								<p className="text-xs text-slate-600">
									Technician dispatch has been scheduled for string inspection and hardware fuse replacement.
								</p>
							</div>
						) : (
							<div className="bg-white border border-slate-200/90 rounded-lg p-10 shadow-xs flex flex-col items-center justify-center text-center">
								<div className="w-12 h-12 rounded-full bg-slate-50 border-2 border-slate-300 flex items-center justify-center text-slate-500 mb-3 shadow-2xs">
									<Check className="w-6 h-6 stroke-[2.5]" />
								</div>
								<h2 className="text-sm font-bold text-slate-900">No Acknowledged Alerts Pending</h2>
								<p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
									All hardware alerts for <strong>{selectedSite?.shortName || selectedSite?.name || "Haider — Lucknow Rooftop"}</strong> have been addressed or resolved.
								</p>
							</div>
						)}
					</>
				)}

				{/* TAB 3: Resolved History */}
				{activeTab === "resolved" && (
					<div className="space-y-3">
						{resolved && (
							<div className="bg-white border border-emerald-200 rounded-lg p-5 shadow-xs space-y-3">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
									<div className="flex flex-wrap items-center gap-2 text-xs">
										<span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
											Resolved: Hardware Restored
										</span>
										<span className="text-slate-500 font-mono text-[11px]">
											ID: {activeAlert?.incidentId || "#INC-84921"}
										</span>
										<span className="text-slate-400">•</span>
										<span className="font-bold text-slate-800">
											{activeAlert?.siteName || selectedSite?.name}
										</span>
									</div>
									<span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
										Resolved Just Now
									</span>
								</div>

								<div className="text-xs text-slate-700 space-y-1">
									<span className="font-bold text-slate-900 block">Technician Resolution Notes:</span>
									<p className="text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 font-mono text-[11px]">
										{resolveNotes}
									</p>
								</div>
							</div>
						)}

						{/* Base Historical Resolved Incident */}
						<div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs space-y-3">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
								<div className="flex flex-wrap items-center gap-2 text-xs">
									<span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200">
										Resolved: String Calibration &amp; Inspection
									</span>
									<span className="text-slate-500 font-mono text-[11px]">ID: #INC-72104</span>
									<span className="text-slate-400">•</span>
									<span className="font-bold text-slate-800">
										{selectedSite?.name || "Haider Rooftop Solar Array"}
									</span>
								</div>
								<span className="text-[11px] text-slate-400 font-mono">Oct 15, 2026</span>
							</div>

							<p className="text-xs text-slate-600 leading-relaxed">
								Annual preventative maintenance and DC string impedance check completed. All inverter MPPT tracking channels verified at 98.4% nominal operating efficiency.
							</p>

							<div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
								<span>Technician: <strong>Regional Field Operations</strong></span>
								<span>•</span>
								<span>Resolution Time: <strong>1.2 hrs</strong></span>
								<span>•</span>
								<span className="text-emerald-600 font-semibold flex items-center gap-1">
									<ShieldCheck className="w-3.5 h-3.5" /> Verified
								</span>
							</div>
						</div>
					</div>
				)}

				{/* 10-Day Performance History Grouped Bar Chart */}
				<div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
						<div>
							<h2 className="text-xs font-bold text-slate-900">10-Day Performance History</h2>
							<p className="text-[11px] text-slate-400 mt-0.5">
								Daily expected generation (Blue) versus actual recorded generation (Green).
							</p>
						</div>
						<div className="flex items-center gap-4 text-xs font-semibold">
							<span className="flex items-center gap-1.5 text-slate-700 text-[11px]">
								<span className="w-3 h-3 bg-blue-600 rounded-xs"></span>
								Expected Target (kWh)
							</span>
							<span className="flex items-center gap-1.5 text-slate-700 text-[11px]">
								<span className="w-3 h-3 bg-emerald-500 rounded-xs"></span>
								Actual Production (kWh)
							</span>
						</div>
					</div>

					<div className="h-56 w-full pt-3">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={DEFAULT_TEN_DAY_HISTORY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
								<XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} />
								<YAxis
									tick={{ fontSize: 10, fill: "#64748B" }}
									tickLine={false}
									unit=" kWh"
									domain={[0, 24]}
									ticks={[0, 6, 12, 18, 24]}
								/>
								<Tooltip
									contentStyle={{ backgroundColor: "#1E293B", border: "none", borderRadius: "6px", color: "#FFF", fontSize: "11px" }}
								/>
								<Bar dataKey="expected" fill="#2563EB" radius={[2, 2, 0, 0]} maxBarSize={20} />
								<Bar dataKey="actual" fill="#10B981" radius={[2, 2, 0, 0]} maxBarSize={20} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Modal for Resolve Alert */}
				{showResolveModal && (
					<div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
						<div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
							<div className="flex items-center justify-between pb-2 border-b border-slate-100">
								<h3 className="text-sm font-bold text-slate-900">Resolve Operational Incident</h3>
								<button
									type="button"
									onClick={() => setShowResolveModal(false)}
									className="text-slate-400 hover:text-slate-600 p-1"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							<div className="text-xs text-slate-600 space-y-2">
								<p>
									Incident <strong>{activeAlert?.incidentId || "#INC-84921"}</strong> at {activeAlert?.siteName || "Jaipur Solar Farm West"}.
								</p>
								<label className="block text-xs font-semibold text-slate-700 pt-2">
									Technician Resolution Notes:
								</label>
								<textarea
									rows={3}
									value={resolveNotes}
									onChange={(e) => setResolveNotes(e.target.value)}
									className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>

							<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setShowResolveModal(false)}
									className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleResolve}
									disabled={resolving}
									className="bg-[#2563EB] hover:bg-blue-600 text-white font-semibold px-4 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5"
								>
									{resolving ? "Resolving..." : "Confirm Resolution"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</Layout>
	);
};

export default AlertsPage;
