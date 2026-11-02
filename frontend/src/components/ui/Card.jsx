import React from "react";

/**
 * SolarBuddy Unified Surface Card Component
 * Provides clean containment with consistent border, background, and padding tokens.
 */
export default function Card({
	children,
	className = "",
	padding = "default", // 'none' | 'sm' | 'default' | 'lg'
	border = true,
	hoverable = false,
	as: Component = "div",
	...props
}) {
	const paddingMap = {
		none: "",
		sm: "p-3 sm:p-4",
		default: "p-4 sm:p-5",
		lg: "p-5 sm:p-6"
	};

	const baseStyles = "bg-white rounded-xl transition-all duration-150";
	const borderStyle = border ? "border border-slate-200/90 shadow-2xs" : "";
	const hoverStyle = hoverable ? "hover:border-slate-300 hover:shadow-xs" : "";

	return (
		<Component
			className={`${baseStyles} ${borderStyle} ${hoverStyle} ${paddingMap[padding] || paddingMap.default} ${className}`}
			{...props}
		>
			{children}
		</Component>
	);
}

export function CardHeader({
	title,
	subtitle,
	action,
	badge,
	icon: Icon,
	className = "",
	children
}) {
	return (
		<div className={`flex items-start justify-between gap-3 mb-3 pb-2.5 border-b border-slate-100 ${className}`}>
			<div className="flex items-center gap-2.5 min-w-0">
				{Icon && (
					<div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
						<Icon className="w-4 h-4" />
					</div>
				)}
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						{title && (
							<h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
								{title}
							</h3>
						)}
						{badge}
					</div>
					{subtitle && (
						<p className="text-[11px] text-slate-500 mt-0.5 truncate">
							{subtitle}
						</p>
					)}
				</div>
			</div>
			{(action || children) && (
				<div className="shrink-0 flex items-center gap-2">
					{action}
					{children}
				</div>
			)}
		</div>
	);
}

export function CardContent({ children, className = "" }) {
	return <div className={`space-y-3 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }) {
	return (
		<div className={`mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 ${className}`}>
			{children}
		</div>
	);
}
