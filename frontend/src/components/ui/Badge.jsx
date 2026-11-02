import React from "react";

/**
 * SolarBuddy Status Badge Component
 * Variants: healthy | warning | critical | info | neutral | demo
 */
export default function Badge({
	children,
	variant = "neutral",
	size = "sm",
	dot = false,
	pulse = false,
	className = ""
}) {
	const variantStyles = {
		healthy:
			"bg-emerald-50 text-emerald-800 border-emerald-200/80",
		warning:
			"bg-amber-50 text-amber-800 border-amber-200/80",
		critical:
			"bg-rose-50 text-rose-800 border-rose-200/80",
		info:
			"bg-blue-50 text-blue-800 border-blue-200/80",
		neutral:
			"bg-slate-100 text-slate-700 border-slate-200",
		demo:
			"bg-amber-500/10 text-amber-700 border-amber-400/60 font-semibold"
	};

	const dotStyles = {
		healthy: "bg-emerald-500",
		warning: "bg-amber-500",
		critical: "bg-rose-500",
		info: "bg-blue-500",
		neutral: "bg-slate-400",
		demo: "bg-amber-500"
	};

	const sizeStyles = {
		xs: "text-[10px] px-1.5 py-0.5",
		sm: "text-[11px] px-2 py-0.5",
		md: "text-xs px-2.5 py-1"
	};

	const resolvedVariant = variantStyles[variant] || variantStyles.neutral;
	const resolvedDot = dotStyles[variant] || dotStyles.neutral;
	const resolvedSize = sizeStyles[size] || sizeStyles.sm;

	return (
		<span
			className={`inline-flex items-center gap-1.5 font-medium rounded-md border select-none ${resolvedSize} ${resolvedVariant} ${className}`}
		>
			{dot && (
				<span
					className={`w-1.5 h-1.5 rounded-full ${resolvedDot} ${
						pulse ? "animate-pulse" : ""
					}`}
				/>
			)}
			<span>{children}</span>
		</span>
	);
}
