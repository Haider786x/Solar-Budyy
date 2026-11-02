const MetricStrip = ({ metrics = [], className = "" }) => {
	if (!metrics || metrics.length === 0) return null;

	return (
		<div className={`bg-white border border-slate-200 rounded-lg shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-slate-100 grid grid-cols-2 sm:grid-cols-${Math.min(metrics.length, 6)} ${className}`}>
			{metrics.map((item, idx) => (
				<div key={idx} className="p-4 flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs font-medium text-slate-500 uppercase tracking-wider">
						<span>{item.label}</span>
						{item.icon && <span className="text-slate-400">{item.icon}</span>}
					</div>
					<div className="mt-2 flex items-baseline gap-1.5">
						<span className={`text-2xl font-bold tracking-tight ${item.valueColor || "text-slate-900"}`}>
							{item.value ?? "—"}
						</span>
						{item.unit && (
							<span className="text-xs font-medium text-slate-500">{item.unit}</span>
						)}
					</div>
					{item.subtext && (
						<div className="mt-1 text-[11px] text-slate-500 font-normal">
							{item.subtext}
						</div>
					)}
				</div>
			))}
		</div>
	);
};

export default MetricStrip;
