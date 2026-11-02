import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import MetricStrip from "../components/ui/MetricStrip";
import StatusBadge from "../components/ui/StatusBadge";
import MapPicker from "../components/MapPicker";
import RegionalMap from "../components/RegionalMap";
import { useAuth } from "../context/AuthContext";
import { createUser, fetchUsers, deleteUser, updateUser } from "../services/api";

const DEFAULT_FORM = {
	name: "",
	email: "",
	phoneNumber: "",
	siteId: "",
	inverterSerialNumber: "",
	latitude: "",
	longitude: "",
	systemCapacity: "",
	numberOfPanels: "",
	tiltDeg: "",
	azimuthDeg: "",
	soilingLossPercent: "2",
	inverterLossPercent: "3",
	wiringLossPercent: "2",
	miscLossPercent: "1",
	dc_ac_ratio: "1.2",
	inv_efficiency: "98",
	bifaciality: "0"
};

const SitesPage = () => {
	const navigate = useNavigate();
	const { user, isAdmin } = useAuth();

	// Normal customers manage only their own site - redirect them directly
	if (!isAdmin && user?.siteId) {
		return <Navigate to={`/sites/${user.siteId}`} replace />;
	}

	const [sites, setSites] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [searchText, setSearchText] = useState("");
	const [showMap, setShowMap] = useState(false);

	// CRUD modal states
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState("");
	const [formData, setFormData] = useState(DEFAULT_FORM);
	const [editingSiteId, setEditingSiteId] = useState(null);
	const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, siteId: null, siteName: "" });
	const [isDeleting, setIsDeleting] = useState(false);

	const loadSites = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const res = await fetchUsers();
			setSites(Array.isArray(res) ? res : []);
		} catch (err) {
			setError(err.message || "Failed to load sites fleet");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadSites();
	}, [loadSites]);

	const filteredSites = useMemo(() => {
		const query = searchText.trim().toLowerCase();
		if (!query) return sites;

		return sites.filter((site) => {
			const loc = `${site.location?.latitude ?? ""}, ${site.location?.longitude ?? ""}`;
			return [site.name, site.email, site.phoneNumber, site.siteId, site.inverterSerialNumber, String(site.systemCapacity), loc]
				.some((val) => String(val ?? "").toLowerCase().includes(query));
		});
	}, [searchText, sites]);

	const totalFleetCapacity = useMemo(() => {
		return sites.reduce((acc, curr) => acc + Number(curr.systemCapacity || 0), 0);
	}, [sites]);

	const fleetKpis = [
		{
			label: "Registered Sites",
			value: sites.length,
			unit: "plants",
			subtext: "Monitored solar assets"
		},
		{
			label: "Total Fleet Capacity",
			value: totalFleetCapacity.toFixed(1),
			unit: "kWp",
			valueColor: "text-blue-600",
			subtext: "Aggregated peak rating"
		},
		{
			label: "Telemetry Links",
			value: sites.filter(s => s.siteId || s.inverterSerialNumber).length,
			unit: `of ${sites.length}`,
			valueColor: "text-emerald-700",
			subtext: "Inverter hardware mapped"
		},
		{
			label: "Average Array Size",
			value: sites.length ? (totalFleetCapacity / sites.length).toFixed(1) : "0",
			unit: "kW",
			subtext: "Mean generator capacity"
		}
	];

	// Form actions
	const handleFormFieldChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleOpenAddForm = () => {
		setEditingSiteId(null);
		setFormData(DEFAULT_FORM);
		setSubmitError("");
		setIsFormOpen(true);
	};

	const handleOpenEditForm = (site, e) => {
		e.stopPropagation();
		setEditingSiteId(site._id);
		setFormData({
			name: site.name,
			email: site.email,
			phoneNumber: site.phoneNumber,
			siteId: site.siteId ?? "",
			inverterSerialNumber: site.inverterSerialNumber ?? "",
			latitude: String(site.location?.latitude ?? ""),
			longitude: String(site.location?.longitude ?? ""),
			systemCapacity: String(site.systemCapacity),
			numberOfPanels: String(site.numberOfPanels ?? ""),
			tiltDeg: String(site.tiltDeg),
			azimuthDeg: String(site.azimuthDeg),
			soilingLossPercent: String(site.soilingLossPercent),
			inverterLossPercent: String(site.inverterLossPercent),
			wiringLossPercent: String(site.wiringLossPercent),
			miscLossPercent: String(site.miscLossPercent),
			dc_ac_ratio: String(site.dc_ac_ratio ?? 1.2),
			inv_efficiency: String(site.inv_efficiency ?? 98),
			bifaciality: String(site.bifaciality ?? 0)
		});
		setSubmitError("");
		setIsFormOpen(true);
	};

	const handleSubmitForm = async (e) => {
		e.preventDefault();
		setSubmitError("");
		setIsSubmitting(true);

		try {
			const payload = {
				name: formData.name.trim(),
				email: formData.email.trim(),
				phoneNumber: formData.phoneNumber.trim(),
				siteId: formData.siteId.trim(),
				inverterSerialNumber: formData.inverterSerialNumber.trim(),
				location: {
					latitude: Number(formData.latitude),
					longitude: Number(formData.longitude)
				},
				systemCapacity: Number(formData.systemCapacity),
				numberOfPanels: Number(formData.numberOfPanels),
				tiltDeg: Number(formData.tiltDeg),
				azimuthDeg: Number(formData.azimuthDeg),
				shadingFactor: 0.95,
				soilingLossPercent: Number(formData.soilingLossPercent),
				inverterLossPercent: Number(formData.inverterLossPercent),
				wiringLossPercent: Number(formData.wiringLossPercent),
				miscLossPercent: Number(formData.miscLossPercent),
				dc_ac_ratio: Number(formData.dc_ac_ratio),
				inv_efficiency: Number(formData.inv_efficiency),
				bifaciality: Number(formData.bifaciality)
			};

			if (editingSiteId) {
				await updateUser(editingSiteId, payload);
			} else {
				await createUser(payload);
			}

			setIsFormOpen(false);
			await loadSites();
		} catch (err) {
			setSubmitError(err.message || "Failed to save site configuration");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteClick = (site, e) => {
		e.stopPropagation();
		setDeleteConfirm({ isOpen: true, siteId: site._id, siteName: site.name });
	};

	const handleConfirmDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteUser(deleteConfirm.siteId);
			setDeleteConfirm({ isOpen: false, siteId: null, siteName: "" });
			await loadSites();
		} catch (err) {
			console.error("Delete failed:", err);
			setDeleteConfirm({ isOpen: false, siteId: null, siteName: "" });
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Layout>
			<div className="space-y-6">
				{/* Header Strip */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-slate-200">
					<div>
						<h1 className="text-xl font-bold tracking-tight text-slate-900">Solar Sites Directory</h1>
						<p className="text-xs text-slate-500 mt-0.5">
							Continuous monitoring registry of physical solar PV assets and their spatial configurations.
						</p>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setShowMap(!showMap)}
							className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
								showMap
									? "bg-blue-50 border-blue-300 text-blue-700"
									: "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
							}`}
						>
							<svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
							</svg>
							{showMap ? "Hide Map" : "Geographic Map"}
						</button>

						<button
							type="button"
							onClick={handleOpenAddForm}
							className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
						>
							<svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							Register Site
						</button>
					</div>
				</div>

				{/* High-density KPI strip */}
				<MetricStrip metrics={fleetKpis} />

				{/* Optional Geographic Map Section */}
				{showMap && (
					<div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-2">
						<div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
							<span className="font-semibold text-slate-800">Geographic Asset Distribution</span>
							<span className="text-slate-500">{sites.length} Active Coordinates</span>
						</div>
						<div className="h-64 w-full rounded-md overflow-hidden border border-slate-100">
							<RegionalMap users={sites} />
						</div>
					</div>
				)}

				{/* Main Sites Table Section */}
				<div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
					{/* Search & Filter Toolbar */}
					<div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div className="relative flex-1 max-w-md">
							<input
								type="text"
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								placeholder="Search sites by name, location, site ID..."
								className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
							/>
							<svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<div className="text-xs text-slate-500 font-medium">
							Showing {filteredSites.length} of {sites.length} sites
						</div>
					</div>

					{/* Sites Table */}
					{loading ? (
						<div className="p-12 text-center text-xs text-slate-500">Loading solar installations...</div>
					) : error ? (
						<div className="p-6 text-center text-xs text-rose-700 font-medium">{error}</div>
					) : filteredSites.length === 0 ? (
						<div className="p-12 text-center text-xs text-slate-500">
							{searchText ? "No matching sites found for search query." : "No registered solar sites found."}
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs border-collapse">
								<thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
									<tr>
										<th className="px-4 py-3">Site Information</th>
										<th className="px-4 py-3">Capacity</th>
										<th className="px-4 py-3">Tilt / Azimuth</th>
										<th className="px-4 py-3">Location Coordinates</th>
										<th className="px-4 py-3">Inverter Mapping</th>
										<th className="px-4 py-3">Status</th>
										<th className="px-4 py-3 text-right">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 text-slate-700">
									{filteredSites.map((site) => (
										<tr
											key={site._id}
											onClick={() => navigate(`/sites/${site._id}`)}
											className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
										>
											<td className="px-4 py-3">
												<div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
													{site.name}
												</div>
												<div className="text-[11px] text-slate-400 font-mono">
													{site.email}
												</div>
											</td>
											<td className="px-4 py-3">
												<span className="font-mono font-semibold text-slate-900">
													{site.systemCapacity} kW
												</span>
												<div className="text-[10px] text-slate-400 font-mono">
													{site.numberOfPanels ? `${site.numberOfPanels} panels` : "—"}
												</div>
											</td>
											<td className="px-4 py-3 font-mono text-slate-700">
												{site.tiltDeg}° / {site.azimuthDeg}°
											</td>
											<td className="px-4 py-3 font-mono text-slate-600">
												{Number(site.location?.latitude).toFixed(3)}, {Number(site.location?.longitude).toFixed(3)}
											</td>
											<td className="px-4 py-3 font-mono text-[11px] text-slate-600">
												{site.siteId ? (
													<span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
														ID: {site.siteId}
													</span>
												) : (
													<span className="text-slate-400 italic">Unmapped</span>
												)}
											</td>
											<td className="px-4 py-3">
												<StatusBadge status="Healthy" />
											</td>
											<td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
												<div className="inline-flex items-center gap-1.5">
													<button
														type="button"
														onClick={() => navigate(`/sites/${site._id}`)}
														className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
													>
														Analytics →
													</button>
													<button
														type="button"
														onClick={(e) => handleOpenEditForm(site, e)}
														className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
														title="Edit configuration"
													>
														<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
														</svg>
													</button>
													<button
														type="button"
														onClick={(e) => handleDeleteClick(site, e)}
														className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
														title="Delete site"
													>
														<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
														</svg>
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>

			{/* Register / Edit Site Modal */}
			{isFormOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
					<div className="bg-white border border-slate-300 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
						<div className="flex items-center justify-between pb-3 border-b border-slate-200">
							<div>
								<h3 className="text-base font-bold text-slate-900">
									{editingSiteId ? "Update Site Configuration" : "Register New Solar Installation"}
								</h3>
								<p className="text-xs text-slate-500 mt-0.5">
									Specify geographical coordinates and physical plant losses for the adaptive model.
								</p>
							</div>
							<button
								type="button"
								onClick={() => setIsFormOpen(false)}
								className="text-slate-400 hover:text-slate-600 p-1"
							>
								✕
							</button>
						</div>

						<form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<label className="block text-slate-600 font-medium mb-1">Site / Owner Name *</label>
									<input
										type="text"
										name="name"
										value={formData.name}
										onChange={handleFormFieldChange}
										className="w-full border border-slate-300 rounded p-2 text-xs"
										required
									/>
								</div>
								<div>
									<label className="block text-slate-600 font-medium mb-1">Notification Email *</label>
									<input
										type="email"
										name="email"
										value={formData.email}
										onChange={handleFormFieldChange}
										className="w-full border border-slate-300 rounded p-2 text-xs"
										required
									/>
								</div>
								<div>
									<label className="block text-slate-600 font-medium mb-1">Contact Phone *</label>
									<input
										type="text"
										name="phoneNumber"
										value={formData.phoneNumber}
										onChange={handleFormFieldChange}
										className="w-full border border-slate-300 rounded p-2 text-xs"
										required
									/>
								</div>
								<div>
									<label className="block text-slate-600 font-medium mb-1">System Capacity (kW) *</label>
									<input
										type="number"
										step="0.01"
										name="systemCapacity"
										value={formData.systemCapacity}
										onChange={handleFormFieldChange}
										className="w-full border border-slate-300 rounded p-2 text-xs"
										required
									/>
								</div>
								<div>
									<label className="block text-slate-600 font-medium mb-1">Latitude Coordinate *</label>
									<input
										type="number"
										step="0.0001"
										name="latitude"
										value={formData.latitude}
										onChange={handleFormFieldChange}
										className="w-full border border-slate-300 rounded p-2 text-xs"
										required
									/>
								</div>
								<div>
									<label className="block text-slate-600 font-medium mb-1">Longitude Coordinate *</label>
									<input
										type="number"
										step="0.0001"
										name="longitude"
										value={formData.longitude}
										onChange={handleFormFieldChange}
										className="w-full border border-slate-300 rounded p-2 text-xs"
										required
									/>
								</div>
							</div>

							<div className="pt-2 border-t border-slate-100">
								<MapPicker
									latitude={formData.latitude}
									longitude={formData.longitude}
									onLocationSelect={(lat, lng) =>
										setFormData((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng) }))
									}
								/>
							</div>

							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
								<div>
									<label className="block text-slate-600 font-medium mb-1">Tilt Angle (°)</label>
									<input
										type="number"
										step="0.1"
										name="tiltDeg"
										value={formData.tiltDeg}
										onChange={handleFormFieldChange}
										className="w-full border border-slate-300 rounded p-2 text-xs"
										required
									/>
								</div>
								<div>
									<label className="block text-slate-600 font-medium mb-1">Azimuth (°)</label>
									<input
										type="number"
										step="0.1"
										name="azimuthDeg"
										value={formData.azimuthDeg}
										onChange={handleFormFieldChange}
										className="w-full border border-slate-300 rounded p-2 text-xs"
										required
									/>
								</div>
								<div>
									<label className="block text-slate-600 font-medium mb-1">Inverter Serial</label>
									<input
										type="text"
										name="inverterSerialNumber"
										value={formData.inverterSerialNumber}
										onChange={handleFormFieldChange}
										placeholder="e.g. 7100XXXX"
										className="w-full border border-slate-300 rounded p-2 text-xs"
									/>
								</div>
								<div>
									<label className="block text-slate-600 font-medium mb-1">SolarEdge Site ID</label>
									<input
										type="text"
										name="siteId"
										value={formData.siteId}
										onChange={handleFormFieldChange}
										placeholder="e.g. 123456"
										className="w-full border border-slate-300 rounded p-2 text-xs"
									/>
								</div>
							</div>

							{submitError && (
								<div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
									{submitError}
								</div>
							)}

							<div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
								<button
									type="button"
									onClick={() => setIsFormOpen(false)}
									className="px-3.5 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold disabled:opacity-50"
								>
									{isSubmitting ? "Saving..." : editingSiteId ? "Update Site" : "Save Site"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm.isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
					<div className="bg-white border border-slate-200 rounded-lg p-5 max-w-sm w-full space-y-3 shadow-lg">
						<h3 className="text-sm font-bold text-slate-900">Confirm Site Deletion</h3>
						<p className="text-xs text-slate-600">
							Are you sure you want to remove <strong className="text-slate-900">{deleteConfirm.siteName}</strong>? All historical performance evaluations and monitoring logs will be detached.
						</p>
						<div className="flex items-center justify-end gap-2 pt-2">
							<button
								type="button"
								onClick={() => setDeleteConfirm({ isOpen: false, siteId: null, siteName: "" })}
								className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 text-xs font-medium"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleConfirmDelete}
								disabled={isDeleting}
								className="px-3 py-1.5 rounded bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold disabled:opacity-50"
							>
								{isDeleting ? "Deleting..." : "Delete Site"}
							</button>
						</div>
					</div>
				</div>
			)}
		</Layout>
	);
};

export default SitesPage;
