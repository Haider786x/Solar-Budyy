import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import RegionalMap from "../components/RegionalMap";
import { useAuth, formatLocationString } from "../context/AuthContext";
import {
	Plus,
	Search,
	Filter,
	CheckCircle2,
	AlertTriangle,
	ExternalLink,
	MapPin
} from "lucide-react";

const InstallationsPage = () => {
	const navigate = useNavigate();
	const { fleetSites, selectSite, refreshFleetSites } = useAuth();

	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");

	useEffect(() => {
		if (refreshFleetSites) {
			refreshFleetSites();
		}
	}, [refreshFleetSites]);

	// Dynamic fleet summary statistics
	const totalCapacity = useMemo(() => {
		return fleetSites.reduce((sum, s) => sum + (Number(s.systemCapacity) || 0), 0).toFixed(1);
	}, [fleetSites]);

	const normalCount = useMemo(() => {
		return fleetSites.filter((s) => s.status === "Normal").length;
	}, [fleetSites]);

	const alertCount = useMemo(() => {
		return fleetSites.filter((s) => s.status === "Degraded" || s.status === "Warning").length;
	}, [fleetSites]);

	const outageCount = useMemo(() => {
		return fleetSites.filter((s) => s.status === "System Outage" || s.status === "Offline").length;
	}, [fleetSites]);

	// Filter sites by search and status
	const filteredSites = useMemo(() => {
		return fleetSites.filter((site) => {
			const matchesSearch =
				(site.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
				(site.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
				(site.ownerEmail || site.email || "").toLowerCase().includes(searchTerm.toLowerCase());

			if (statusFilter === "all") return matchesSearch;
			if (statusFilter === "normal") return matchesSearch && site.status === "Normal";
			if (statusFilter === "outage") return matchesSearch && (site.status === "System Outage" || site.status === "Offline");
			return matchesSearch;
		});
	}, [fleetSites, searchTerm, statusFilter]);

	const handleOpenSite = (siteId) => {
		selectSite(siteId);
		navigate("/");
	};

	return (
		<Layout>
			<div className="space-y-4">
				{/* Top Breadcrumb & Header with Add Installation Button */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
					<div>
						<div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
							<span>Fleet Administration</span>
							<span className="text-slate-400">/</span>
							<span>Managed Sites</span>
						</div>
						<h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
							All Solar Installations ({fleetSites.length})
						</h1>
					</div>

					<button
						type="button"
						onClick={() => navigate("/register")}
						className="bg-[#2563EB] hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-md text-xs flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
					>
						<Plus className="w-4 h-4" />
						Add New Installation
					</button>
				</div>

				{/* 4 Summary Strip Cards matching Screenshot 15 */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<span className="text-[11px] text-slate-400 font-medium block">Total Fleet Capacity</span>
						<div className="flex items-baseline gap-1 mt-1">
							<span className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalCapacity}</span>
							<span className="text-sm font-semibold text-slate-500">kWp</span>
						</div>
					</div>

					<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<span className="text-[11px] text-slate-400 font-medium block">Normal Operation</span>
						<div className="flex items-baseline gap-1 mt-1">
							<span className="text-3xl font-extrabold text-emerald-600 tracking-tight">{normalCount}</span>
							<span className="text-sm font-semibold text-slate-500">sites</span>
						</div>
					</div>

					<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<span className="text-[11px] text-slate-400 font-medium block">Performance Alerts</span>
						<div className="flex items-baseline gap-1 mt-1">
							<span className="text-3xl font-extrabold text-amber-500 tracking-tight">{alertCount}</span>
							<span className="text-sm font-semibold text-slate-500">sites</span>
						</div>
					</div>

					<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
						<span className="text-[11px] text-slate-400 font-medium block">System Outages</span>
						<div className="flex items-baseline gap-1 mt-1">
							<span className="text-3xl font-extrabold text-rose-600 tracking-tight">{outageCount}</span>
							<span className="text-sm font-semibold text-slate-500">sites</span>
						</div>
					</div>
				</div>

				{/* Regional Fleet Installation Map */}
				<div className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-xs">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
						<div className="flex items-center gap-2">
							<div className="w-7 h-7 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
								<MapPin className="w-4 h-4" />
							</div>
							<div>
								<h2 className="text-xs font-bold text-slate-900">
									Regional Installation Distribution Map
								</h2>
								<p className="text-[11px] text-slate-500">
									Geospatial view of registered solar installations, array capacity, and live telemetry.
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
								<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
								{fleetSites.length} Active Sites Mapped
							</span>
						</div>
					</div>
					<div className="h-72 w-full overflow-hidden rounded-lg mt-3 border border-slate-200 shadow-inner">
						<RegionalMap users={fleetSites} onSelectSite={handleOpenSite} />
					</div>
				</div>

				{/* Search & Filter Bar */}
				<div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
					<div className="sm:col-span-8 relative">
						<Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Search by city, installation name, or owner..."
							className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>

					<div className="sm:col-span-4 relative">
						<Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="w-full bg-white border border-slate-300 rounded-md pl-8 pr-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
						>
							<option value="all">Filter by Status: All Installations</option>
							<option value="normal">Normal Operation Only</option>
							<option value="outage">System Outages Only</option>
						</select>
					</div>
				</div>

				{/* Fleet Installations Table */}
				<div className="bg-white border border-slate-200/90 rounded-lg shadow-xs overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs">
							<thead>
								<tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-semibold">
									<th className="py-2.5 px-4">Installation Name</th>
									<th className="py-2.5 px-4">Location</th>
									<th className="py-2.5 px-4">System Rating</th>
									<th className="py-2.5 px-4">Current Output</th>
									<th className="py-2.5 px-4">Health Status</th>
									<th className="py-2.5 px-4">Telemetry Connection</th>
									<th className="py-2.5 px-4 text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 text-[11px]">
								{filteredSites.map((site) => (
									<tr key={site.id} className="hover:bg-slate-50/70 transition-colors">
										<td className="py-3 px-4">
											<div className="font-bold text-slate-900">{site.name}</div>
											<div className="text-[10px] text-slate-400 font-mono mt-0.5">{site.ownerEmail}</div>
										</td>
										<td className="py-3 px-4 text-slate-700 font-medium">
											{typeof site.location === "string" ? site.location : formatLocationString(site.location, "Lucknow, India")}
										</td>
										<td className="py-3 px-4 font-mono font-semibold text-slate-800">{site.systemCapacity} kWp</td>
										<td className="py-3 px-4 font-mono font-bold">
											{site.currentOutputKw > 0 ? (
												<span className="text-emerald-600">{site.currentOutputKw} kW</span>
											) : (
												<span className="text-slate-400 font-normal">0 kW</span>
											)}
										</td>
										<td className="py-3 px-4">
											{site.status === "Normal" ? (
												<span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[11px]">
													<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
													Normal
												</span>
											) : (
												<span className="inline-flex items-center gap-1 font-bold text-rose-700 text-[11px]">
													<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
													System Outage
												</span>
											)}
										</td>
										<td className="py-3 px-4">
											{site.telemetryStatus === "Transmitting" ? (
												<span className="inline-flex items-center gap-1.5 text-slate-700 font-medium text-[11px]">
													<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
													Transmitting
												</span>
											) : (
												<span className="inline-flex items-center gap-1.5 text-rose-600 font-medium text-[11px]">
													<span className="w-2 h-2 rounded-full bg-rose-500"></span>
													No Comm.
												</span>
											)}
										</td>
										<td className="py-3 px-4 text-right">
											<button
												type="button"
												onClick={() => handleOpenSite(site.id)}
												className="bg-[#2563EB] hover:bg-blue-600 text-white font-semibold px-3 py-1 rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition-colors"
											>
												Open Site
												<ExternalLink className="w-3 h-3 ml-0.5" />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</Layout>
	);
};

export default InstallationsPage;
