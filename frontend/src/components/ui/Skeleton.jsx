import React from "react";

/**
 * SolarBuddy Content Placeholder Skeleton Component
 * Provides clean, shaped animated placeholders during loading states.
 */
export default function Skeleton({
	className = "",
	variant = "text", // 'text' | 'rect' | 'circle' | 'stat'
	height,
	width,
	...props
}) {
	const baseStyles = "animate-pulse bg-slate-200/80 rounded";

	const variantStyles = {
		text: "h-3.5 w-full rounded",
		rect: "rounded-xl",
		circle: "rounded-full",
		stat: "h-9 w-24 rounded-lg"
	};

	const inlineStyles = {};
	if (height) inlineStyles.height = height;
	if (width) inlineStyles.width = width;

	return (
		<div
			className={`${baseStyles} ${variantStyles[variant] || ""} ${className}`}
			style={inlineStyles}
			{...props}
		/>
	);
}

export function SkeletonCard({ className = "" }) {
	return (
		<div className={`p-4 rounded-xl border border-slate-200 bg-white space-y-3 ${className}`}>
			<div className="flex items-center justify-between">
				<Skeleton width="40%" height="16px" />
				<Skeleton width="20%" height="16px" />
			</div>
			<Skeleton height="36px" width="60%" />
			<Skeleton height="14px" width="75%" />
		</div>
	);
}
