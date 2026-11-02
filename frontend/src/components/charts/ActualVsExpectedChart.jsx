import { useMemo } from "react";
import {
	ResponsiveContainer,
	ComposedChart,
	Line,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
	if (!active || !payload || !payload.length) return null;

	return (
		<div className="bg-white border border-slate-200 rounded-md p-3 shadow-md text-xs space-y-1">
			<div className="font-bold text-slate-800 border-b border-slate-100 pb-1">{label}</div>
			{payload.map((entry, index) => (
				<div key={index} className="flex items-center justify-between gap-4">
					<span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
						<span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
						{entry.name}:
					</span>
					<span className="font-mono font-bold text-slate-900">
						{entry.value != null ? `${Number(entry.value).toFixed(2)} kWh` : "Unavailable"}
					</span>
				</div>
			))}
		</div>
	);
};

const ActualVsExpectedChart = ({ data = [] }) => {
	const chartData = useMemo(() => {
		if (!data || !data.length) return [];

		// Sort chronologically ascending
		const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

		return sorted.map((item) => {
			const pred = Number(item.predicted_kwh);
			const rawActual = item.inverter_real_time_kwh;
			const parsedActual = Number(rawActual);
			const hasActual =
				rawActual !== null &&
				rawActual !== undefined &&
				String(rawActual).trim() !== "" &&
				String(rawActual).trim().toUpperCase() !== "N/A" &&
				Number.isFinite(parsedActual);

			return {
				date: item.date,
				predicted: Number.isFinite(pred) ? pred : 0,
				actual: hasActual ? parsedActual : null,
				hasActual
			};
		});
	}, [data]);

	const actualDataAvailable = useMemo(() => {
		return chartData.some((d) => d.hasActual);
	}, [chartData]);

	if (!chartData.length) {
		return (
			<div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-500 shadow-2xs">
				No daily prediction history available for this installation.
			</div>
		);
	}

	return (
		<div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
				<div>
					<h3 className="text-sm font-bold text-slate-900">Actual vs Expected Daily Generation</h3>
					<p className="text-xs text-slate-500">
						Model predicted energy (kWh) compared with monitored inverter telemetry.
					</p>
				</div>
				<div className="text-[11px] text-slate-500">
					Window: <span className="font-semibold text-slate-700">{chartData.length} Days Recorded</span>
				</div>
			</div>

			<div className="h-64 sm:h-72 w-full pt-2">
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
						<XAxis
							dataKey="date"
							tick={{ fontSize: 11, fill: "#64748B" }}
							tickLine={false}
							axisLine={{ stroke: "#E2E8F0" }}
						/>
						<YAxis
							tick={{ fontSize: 11, fill: "#64748B" }}
							tickLine={false}
							axisLine={{ stroke: "#E2E8F0" }}
							unit=" kWh"
						/>
						<Tooltip content={<CustomTooltip />} />
						<Legend
							wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
							iconType="circle"
							iconSize={8}
						/>
						{/* Actual Generation as Bar or Line */}
						{actualDataAvailable && (
							<Bar
								dataKey="actual"
								name="Actual Telemetry"
								fill="#0D9488"
								radius={[3, 3, 0, 0]}
								maxBarSize={32}
							/>
						)}
						{/* Expected Generation as Line */}
						<Line
							type="monotone"
							dataKey="predicted"
							name="Context-Expected"
							stroke="#3574E3"
							strokeWidth={2.5}
							dot={{ r: 3, fill: "#3574E3" }}
							activeDot={{ r: 5 }}
						/>
					</ComposedChart>
				</ResponsiveContainer>
			</div>

			{!actualDataAvailable && (
				<div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded p-2.5 flex items-center justify-between">
					<span>
						<strong>Notice:</strong> Inverter generation telemetry is currently unavailable for this site (reported as N/A). Displaying context-predicted baseline only.
					</span>
					<span className="text-slate-400 font-mono text-[10px]">No fabricated data</span>
				</div>
			)}
		</div>
	);
};

export default ActualVsExpectedChart;
