import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

/**
 * Toast Provider for application-wide alerts
 */
export function ToastProvider({ children }) {
	const [toasts, setToasts] = useState([]);

	const showToast = useCallback((message, type = "info", duration = 4000) => {
		const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
		const newToast = { id, message, type, duration };

		setToasts((prev) => [...prev, newToast]);

		if (duration > 0) {
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, duration);
		}

		return id;
	}, []);

	const removeToast = useCallback((id) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	return (
		<ToastContext.Provider value={{ showToast, removeToast }}>
			{children}
			<div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
				{toasts.map((toast) => (
					<ToastItem
						key={toast.id}
						toast={toast}
						onClose={() => removeToast(toast.id)}
					/>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		// Graceful fallback if used outside Provider
		return {
			showToast: (msg) => console.log("[Toast fallback]:", msg),
			removeToast: () => {}
		};
	}
	return context;
}

function ToastItem({ toast, onClose }) {
	const iconMap = {
		success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
		error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
		warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
		info: <Info className="w-4 h-4 text-blue-600 shrink-0" />
	};

	const bgMap = {
		success: "bg-white border-emerald-200 text-slate-800 shadow-lg",
		error: "bg-white border-rose-200 text-slate-800 shadow-lg",
		warning: "bg-white border-amber-200 text-slate-800 shadow-lg",
		info: "bg-white border-blue-200 text-slate-800 shadow-lg"
	};

	return (
		<div
			className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl border text-xs animate-in slide-in-from-bottom-2 duration-150 ${
				bgMap[toast.type] || bgMap.info
			}`}
			role="alert"
		>
			{iconMap[toast.type] || iconMap.info}
			<div className="flex-1 min-w-0 pr-1">
				<p className="font-medium text-slate-800 leading-snug break-words">
					{toast.message}
				</p>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
			>
				<X className="w-3.5 h-3.5" />
			</button>
		</div>
	);
}
