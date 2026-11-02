import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const ProtectedRoute = ({ children }) => {
	const { isAuthenticated, loading, user } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50">
				<div className="flex flex-col items-center gap-3">
					<div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
					<p className="text-xs font-semibold text-slate-500">Checking authorization...</p>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	// Normal user without a site is guided to onboarding
	if (user?.role === "user" && !user?.siteId && location.pathname !== "/onboarding" && location.pathname !== "/register") {
		return <Navigate to="/onboarding" replace />;
	}

	return children;
};

export const AdminRoute = ({ children }) => {
	const { isAuthenticated, isAdmin, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50">
				<div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/admin/login" replace state={{ from: location }} />;
	}

	if (!isAdmin) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
				<div className="max-w-md w-full bg-white p-8 rounded-2xl border border-red-200 shadow-sm text-center">
					<div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
						<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>
					<h3 className="text-lg font-bold text-slate-900">Administrator Access Restricted</h3>
					<p className="text-sm text-slate-600 mt-2">
						This module is strictly reserved for SolarBuddy system administrators. Customer accounts do not have permission to view fleet-wide management settings.
					</p>
					<div className="mt-6">
						<button
							onClick={() => window.location.href = "/overview"}
							className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
						>
							Return to My Dashboard
						</button>
					</div>
				</div>
			</div>
		);
	}

	return children;
};

export const PublicOnlyRoute = ({ children }) => {
	const { isAuthenticated, isAdmin, user, loading } = useAuth();

	if (loading) {
		return null;
	}

	if (isAuthenticated) {
		if (isAdmin) {
			return <Navigate to="/" replace />;
		}
		if (user?.siteId) {
			return <Navigate to={`/sites/${user.siteId}`} replace />;
		}
		return <Navigate to="/onboarding" replace />;
	}

	return children;
};
