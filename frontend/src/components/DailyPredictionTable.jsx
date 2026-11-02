const dateFormatter = new Intl.DateTimeFormat("en-IN", {
	day: "2-digit",
	month: "short",
	year: "numeric"
});

const formatDate = (date) => {
	if (!date) return "N/A";

	const parsedDate = new Date(`${date}T00:00:00`);

	if (Number.isNaN(parsedDate.getTime())) {
		return date;
	}

	return dateFormatter.format(parsedDate);
};

const formatNumber = (value, suffix = "") => {
	if (value === null || value === undefined || value === "N/A") {
		return "—";
	}

	const numberValue = Number(value);

	if (!Number.isFinite(numberValue)) {
		return "—";
	}

	return `${numberValue.toFixed(2)}${suffix}`;
};

const getComparisonBadgeClasses = (comparison) => {
	if (comparison === "greater") {
		return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
	}

	if (comparison === "lesser") {
		return "bg-rose-50 text-rose-700 border border-rose-200/60";
	}

	if (comparison === "equal") {
		return "bg-blue-50 text-blue-700 border border-blue-200/60";
	}

	return "bg-slate-100 text-slate-600 border border-slate-200";
};

const toComparableNumber = (value) => {
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : null;
};

const DailyPredictionTable = ({
	predictions = [],
	loading = false,
	error = "",
	fetching = false,
	onFetchNow,
	onPreviewAlert,
	previewing = false
}) => {
	const latestPrediction = predictions[0];
	const totalPredicted = predictions.reduce((sum, prediction) => sum + Number(prediction.predicted_kwh ?? 0), 0);
	const latestActual = toComparableNumber(latestPrediction?.inverter_real_time_kwh);
	const latestPredicted = toComparableNumber(latestPrediction?.predicted_kwh);
	const latestDifference = latestActual !== null && latestPredicted !== null
		? latestActual - latestPredicted
		: null;
	const latestComparison = latestPrediction?.comparison ?? "N/A";

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
				<div>
					<h3 className="text-sm font-bold text-slate-900">Daily Prediction Records</h3>
					<p className="text-xs text-slate-500 mt-0.5">
						Chronological history of evaluated daily solar generation, captured at scheduled cutoff.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{onPreviewAlert && (
						<button
							type="button"
							onClick={onPreviewAlert}
							disabled={previewing || loading}
							className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
						>
							{previewing ? "Evaluating..." : "Preview Alert"}
						</button>
					)}
					{onFetchNow && (
						<button
							type="button"
							onClick={onFetchNow}
							disabled={fetching || loading}
							className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs disabled:opacity-50"
						>
							{fetching ? "Fetching..." : "Fetch Now"}
						</button>
					)}
					<span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
						{predictions.length} Records
					</span>
				</div>
			</div>

			{loading && <p className="text-xs font-semibold text-blue-700 py-2">Loading daily predictions...</p>}
			{error && <p className="text-xs font-semibold text-rose-700 py-2">{error}</p>}

			{!loading && !error && predictions.length > 0 && (
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-2 border-y border-slate-100 text-xs">
					<div className="p-2 rounded bg-slate-50/70 border border-slate-100">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Latest Date</p>
						<p className="mt-1 font-bold text-slate-900 font-mono">{formatDate(latestPrediction?.date)}</p>
					</div>
					<div className="p-2 rounded bg-slate-50/70 border border-slate-100">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Latest Expected</p>
						<p className="mt-1 font-bold text-blue-600 font-mono">{formatNumber(latestPrediction?.predicted_kwh, " kWh")}</p>
					</div>
					<div className="p-2 rounded bg-slate-50/70 border border-slate-100">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">History Sum</p>
						<p className="mt-1 font-bold text-slate-800 font-mono">{formatNumber(totalPredicted, " kWh")}</p>
					</div>
					<div className="p-2 rounded bg-slate-50/70 border border-slate-100">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Inverter Actual</p>
						<p className="mt-1 font-bold text-slate-900 font-mono">{formatNumber(latestPrediction?.inverter_real_time_kwh, " kWh")}</p>
					</div>
					<div className="p-2 rounded bg-slate-50/70 border border-slate-100">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Yield Diff</p>
						<p className={`mt-1 font-bold font-mono ${latestDifference === null ? "text-slate-500" : latestDifference >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
							{latestDifference === null ? "—" : `${latestDifference > 0 ? "+" : ""}${latestDifference.toFixed(2)} kWh`}
						</p>
					</div>
					<div className="p-2 rounded bg-slate-50/70 border border-slate-100">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Comparison</p>
						<div className="mt-1">
							<span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getComparisonBadgeClasses(latestComparison)}`}>
								{latestComparison}
							</span>
						</div>
					</div>
				</div>
			)}

			{!loading && !error && predictions.length === 0 && (
				<div className="py-8 text-center text-xs text-slate-500">
					No daily prediction records available yet. Click "Fetch Now" to execute the model for today.
				</div>
			)}

			{!loading && !error && predictions.length > 0 && (
				<div className="overflow-x-auto rounded border border-slate-200">
					<table className="w-full text-left text-xs border-collapse">
						<thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
							<tr>
								<th className="px-3 py-2.5">Date</th>
								<th className="px-3 py-2.5">Predicted</th>
								<th className="px-3 py-2.5">Inverter Actual</th>
								<th className="px-3 py-2.5">Difference</th>
								<th className="px-3 py-2.5">Comparison</th>
								<th className="px-3 py-2.5">Peak Power</th>
								<th className="px-3 py-2.5">Ambient Temp</th>
								<th className="px-3 py-2.5">Cloud Cover</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
							{predictions.map((prediction) => (
								<tr key={prediction.date} className="hover:bg-slate-50/70 transition-colors">
									<td className="px-3 py-2 font-sans font-medium text-slate-900 whitespace-nowrap">
										{formatDate(prediction.date)}
									</td>
									<td className="px-3 py-2 whitespace-nowrap text-blue-700 font-semibold">
										{formatNumber(prediction.predicted_kwh, " kWh")}
									</td>
									<td className="px-3 py-2 whitespace-nowrap text-slate-800">
										{formatNumber(prediction.inverter_real_time_kwh, " kWh")}
									</td>
									<td className={`px-3 py-2 whitespace-nowrap font-semibold ${
										prediction.difference_kwh != null && Number(prediction.difference_kwh) < 0
											? "text-rose-600"
											: "text-emerald-700"
									}`}>
										{prediction.difference_kwh != null
											? `${Number(prediction.difference_kwh) > 0 ? "+" : ""}${formatNumber(prediction.difference_kwh, " kWh")}`
											: "—"}
									</td>
									<td className="px-3 py-2 whitespace-nowrap">
										<span className={`inline-flex rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase ${getComparisonBadgeClasses(prediction.comparison)}`}>
											{prediction.comparison ?? "N/A"}
										</span>
									</td>
									<td className="px-3 py-2 whitespace-nowrap text-slate-600">
										{formatNumber(prediction.peak_power_kw, " kW")}
									</td>
									<td className="px-3 py-2 whitespace-nowrap text-slate-600">
										{prediction.avg_temperature != null ? `${prediction.avg_temperature}°C` : "—"}
									</td>
									<td className="px-3 py-2 whitespace-nowrap text-slate-600">
										{prediction.avg_cloud_cover != null ? `${prediction.avg_cloud_cover}%` : "—"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default DailyPredictionTable;
