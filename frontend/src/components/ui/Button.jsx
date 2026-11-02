import React from "react";
import { Loader2 } from "lucide-react";

/**
 * SolarBuddy Accessible Button Component
 * Variants: primary | secondary | outline | ghost | danger
 * Sizes: sm (12px) | md (13px) | lg (14px)
 */
export default function Button({
	children,
	variant = "primary",
	size = "md",
	loading = false,
	disabled = false,
	className = "",
	type = "button",
	icon: Icon,
	...props
}) {
	const baseStyles =
		"inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-600 active:scale-[0.98]";

	const sizeStyles = {
		sm: "text-xs px-2.5 py-1.5 gap-1.5",
		md: "text-xs px-3.5 py-2 gap-2",
		lg: "text-sm px-4 py-2.5 gap-2"
	};

	const variantStyles = {
		primary:
			"bg-[#2563EB] hover:bg-blue-700 text-white shadow-xs border border-transparent",
		secondary:
			"bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80",
		outline:
			"bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 shadow-xs",
		ghost:
			"bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900",
		danger:
			"bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-transparent"
	};

	const resolvedVariant = variantStyles[variant] || variantStyles.primary;
	const resolvedSize = sizeStyles[size] || sizeStyles.md;

	return (
		<button
			type={type}
			disabled={disabled || loading}
			className={`${baseStyles} ${resolvedSize} ${resolvedVariant} ${className}`}
			{...props}
		>
			{loading ? (
				<Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
			) : Icon ? (
				<Icon className="w-3.5 h-3.5 shrink-0" />
			) : null}
			<span>{children}</span>
		</button>
	);
}
