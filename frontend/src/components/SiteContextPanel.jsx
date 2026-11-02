const SiteContextPanel = ({ user, prediction }) => {
	if (!user) return null;

	const hasStoredPrediction = Boolean(prediction);
	const temp = prediction?.avg_temperature != null ? `${prediction.avg_temperature}°C` : "—";
	const cloud = prediction?.avg_cloud_cover != null ? `${prediction.avg_cloud_cover}%` : "—";

	return (
		<div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
				<div>
					<span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
						Context-Aware Engine Inputs
					</span>
					<h3 className="text-sm font-bold text-slate-900 mt-1">Environmental & Plant Context</h3>
				</div>
				<span className="text-[11px] text-slate-500">
					Model: <span className="font-semibold text-slate-700">Open-Meteo + pvlib SAPM</span>
				</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Atmospheric & Weather Context */}
				<div className="rounded-md border border-slate-100 bg-slate-50/50 p-3.5 space-y-2.5">
					<div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
						<span>Atmospheric Conditions</span>
						<span className="text-[10px] text-slate-400 font-normal">Weather Context</span>
					</div>

					<div className="space-y-2 text-xs">
						<div className="flex items-center justify-between py-1 border-b border-slate-200/50">
							<span className="text-slate-600">Peak Ambient Temperature</span>
							<div className="flex items-center gap-2">
								<span className="font-semibold text-slate-900 font-mono">{temp}</span>
								<span className="inline-flex items-center text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60" title="Persisted in DailyPrediction database record">
									● Stored
								</span>
							</div>
						</div>

						<div className="flex items-center justify-between py-1 border-b border-slate-200/50">
							<span className="text-slate-600">Average Cloud Cover</span>
							<div className="flex items-center gap-2">
								<span className="font-semibold text-slate-900 font-mono">{cloud}</span>
								<span className="inline-flex items-center text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60" title="Persisted in DailyPrediction database record">
									● Stored
								</span>
							</div>
						</div>

						<div className="flex items-center justify-between py-1 border-b border-slate-200/50">
							<span className="text-slate-600">Global Tilted Irradiance (GTI)</span>
							<div className="flex items-center gap-2">
								<span className="text-slate-500 italic text-[11px]">Applied in pvlib</span>
								<span className="inline-flex items-center text-[10px] text-blue-700 font-medium bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60" title="Fetched dynamically from Open-Meteo for hourly yield modeling">
									○ In model
								</span>
							</div>
						</div>

						<div className="flex items-center justify-between py-1">
							<span className="text-slate-600">Wind Speed (10m)</span>
							<div className="flex items-center gap-2">
								<span className="text-slate-500 italic text-[11px]">Cell cooling factor</span>
								<span className="inline-flex items-center text-[10px] text-blue-700 font-medium bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60" title="Used in Sandia Array Performance Model (SAPM) cell temperature equations">
									○ In model
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Physical Plant & Geometric Context */}
				<div className="rounded-md border border-slate-100 bg-slate-50/50 p-3.5 space-y-2.5">
					<div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
						<span>Physical Plant & Geometry</span>
						<span className="text-[10px] text-slate-400 font-normal">Site Context</span>
					</div>

					<div className="space-y-2 text-xs">
						<div className="flex items-center justify-between py-1 border-b border-slate-200/50">
							<span className="text-slate-600">Nameplate Capacity</span>
							<span className="font-semibold text-slate-900 font-mono">{user.systemCapacity} kW</span>
						</div>

						<div className="flex items-center justify-between py-1 border-b border-slate-200/50">
							<span className="text-slate-600">Tilt & Azimuth Angles</span>
							<span className="font-semibold text-slate-900 font-mono">{user.tiltDeg}° tilt / {user.azimuthDeg}° az</span>
						</div>

						<div className="flex items-center justify-between py-1 border-b border-slate-200/50">
							<span className="text-slate-600">Inverter Efficiency & Ratio</span>
							<span className="font-semibold text-slate-900 font-mono">{user.inv_efficiency ?? 98}% (DC/AC: {user.dc_ac_ratio ?? 1.2})</span>
						</div>

						<div className="flex items-center justify-between py-1">
							<span className="text-slate-600">Coordinates (Lat, Lon)</span>
							<span className="font-mono text-[11px] text-slate-700">
								{Number(user.location?.latitude).toFixed(4)}, {Number(user.location?.longitude).toFixed(4)}
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-3">
					<span className="flex items-center gap-1">
						<span className="text-emerald-600">●</span> <strong>Stored:</strong> Persisted in database for this business date
					</span>
					<span className="flex items-center gap-1">
						<span className="text-blue-600">○</span> <strong>In model:</strong> Fetched hourly from Open-Meteo for pvlib physical yield modeling
					</span>
				</div>
				{!hasStoredPrediction && (
					<span className="text-amber-700 font-medium">Daily prediction not yet generated for today.</span>
				)}
			</div>
		</div>
	);
};

export default SiteContextPanel;
