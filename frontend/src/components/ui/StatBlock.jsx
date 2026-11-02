import React from "react";

/**
 * SolarBuddy Unified Stat Block Component
 * Displays prominent numeric values with tabular alignment, units, and supporting metadata.
 */
export default function StatBlock({
	label,
	value,
	unit = "",
	subtext = "",
	trend = null, // { value: '+1.2 kWh', direction: 'up' | 'down' | 'neutral', positive: true | false }
	icon: Icon,
	iconColor = "text-blue-600 bg-blue-50 border-blue-100",
	size = "default", // 'sm' | 'default' | 'hero'
	className = ""
}) {
	const valueSizes = {
		sm: "text-lg font-bold",
		default: "text-2xl font-black",
		hero: "text-3xl sm:text-4xl font-black"
	};

	return (
		<div className={`flex flex-col justify-between ${className}`}>
			<div className="flex items-center justify-between gap-2 mb-1">
				<span className="text-xs font-medium text-slate-500 uppercase tracking-wider select-none truncate">
					{label}
				</span>
				{Icon && (
					<div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${iconColor}`}>
						<Icon className="w-3.5 h-3.5" />
					</div>
				)}
			</div>

			<div className="flex items-baseline gap-1.5 my-0.5">
				<span
					className={`tracking-tight text-slate-900 font-tabular font-sans ${
						valueSizes[size] || valueSizes.default
					}`}
				>
					{value}
				</span>
				{unit && (
					<span className="text-xs font-semibold text-slate-500 select-none">
						{unit}
					</span>
				)}
			</div>

			{(trend || subtext) && (
				<div className="flex items-center gap-2 mt-1 text-xs">
					{trend && (
						<span
							className={`inline-flex items-center gap-0.5 font-bold font-tabular px-1.5 py-0.2 rounded ${
								trend.positive
									? "text-emerald-700 bg-emerald-50"
									: trend.direction === "down"
									? "text-rose-700 bg-rose-50"
									: "text-slate-600 bg-slate-100"
							}`}
						>
							{trend.direction === "up" && "▲ "}
							{trend.direction === "down" && "▼ "}
							{trend.value}
						</span>
					)}
					{subtext && (
						<span className="text-slate-500 truncate text-[11px]">
							{subtext}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
