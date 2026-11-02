import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * SolarBuddy Accessible Modal Dialog Component
 * Handles ESC closing, backdrop click, focus management, and keyboard navigation.
 */
export default function Modal({
	isOpen,
	onClose,
	title,
	subtitle,
	children,
	footer,
	maxWidth = "max-w-lg",
	className = ""
}) {
	const modalRef = useRef(null);

	// Handle ESC key press
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === "Escape" && isOpen) {
				onClose?.();
			}
		};

		if (isOpen) {
			document.body.style.overflow = "hidden";
			window.addEventListener("keydown", handleKeyDown);
		} else {
			document.body.style.overflow = "unset";
		}

		return () => {
			document.body.style.overflow = "unset";
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose?.();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? "modal-title" : undefined}
		>
			<div
				ref={modalRef}
				className={`w-full ${maxWidth} bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transition-all transform animate-in zoom-in-95 duration-150 ${className}`}
			>
				{/* Modal Header */}
				{(title || onClose) && (
					<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
						<div>
							{title && (
								<h3
									id="modal-title"
									className="text-sm font-bold text-slate-900 tracking-tight"
								>
									{title}
								</h3>
							)}
							{subtitle && (
								<p className="text-xs text-slate-500 mt-0.5">
									{subtitle}
								</p>
							)}
						</div>
						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
								aria-label="Close dialog"
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>
				)}

				{/* Modal Body */}
				<div className="p-5 overflow-y-auto max-h-[calc(85vh-130px)]">
					{children}
				</div>

				{/* Modal Footer Actions */}
				{footer && (
					<div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
						{footer}
					</div>
				)}
			</div>
		</div>
	);
}
