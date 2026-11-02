import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import OverviewPage from "./pages/OverviewPage";
import EnergyPage from "./pages/EnergyPage";
import SolarSystemPage from "./pages/SolarSystemPage";
import InstallationsPage from "./pages/InstallationsPage";
import AlertsPage from "./pages/AlertsPage";
import SavingsPage from "./pages/SavingsPage";
import ReportsPage from "./pages/ReportsPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";

const ProtectedRoute = ({ children, requireAdmin = false }) => {
	const { isAuthenticated, isAdmin, loading } = useAuth();

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#F4F7FB]">
				<div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	if (requireAdmin && !isAdmin) {
		return <Navigate to="/" replace />;
	}

	return children;
};

const PublicOnlyRoute = ({ children }) => {
	const { isAuthenticated, loading } = useAuth();
	if (loading) return null;
	if (isAuthenticated) return <Navigate to="/" replace />;
	return children;
};

const App = () => {
	return (
		<Routes>
			{/* Public Authentication & Registration Routes */}
			<Route
				path="/login"
				element={
					<PublicOnlyRoute>
						<LoginPage />
					</PublicOnlyRoute>
				}
			/>
			<Route
				path="/admin/login"
				element={
					<PublicOnlyRoute>
						<LoginPage />
					</PublicOnlyRoute>
				}
			/>
			<Route
				path="/register"
				element={<RegisterPage />}
			/>
			<Route
				path="/onboarding"
				element={<RegisterPage />}
			/>

			{/* Core Protected Application Pages Matching Reference Screenshots */}
			<Route
				path="/"
				element={
					<ProtectedRoute>
						<OverviewPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/overview"
				element={
					<ProtectedRoute>
						<OverviewPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/energy"
				element={
					<ProtectedRoute>
						<EnergyPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/solar-system"
				element={
					<ProtectedRoute>
						<SolarSystemPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/installations"
				element={
					<ProtectedRoute>
						<InstallationsPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/alerts"
				element={
					<ProtectedRoute>
						<AlertsPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/savings"
				element={
					<ProtectedRoute>
						<SavingsPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/reports"
				element={
					<ProtectedRoute>
						<ReportsPage />
					</ProtectedRoute>
				}
			/>

			{/* Telemetry & Inverter Synchronization Settings Route (Customer & Admin) */}
			<Route
				path="/settings"
				element={
					<ProtectedRoute>
						<SettingsPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/admin/settings"
				element={
					<ProtectedRoute>
						<SettingsPage />
					</ProtectedRoute>
				}
			/>

			{/* Backwards Compatibility Route Aliases */}
			<Route
				path="/predictions"
				element={
					<ProtectedRoute>
						<EnergyPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/sites/:siteId"
				element={
					<ProtectedRoute>
						<SolarSystemPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/sites"
				element={
					<ProtectedRoute>
						<InstallationsPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/monitoring"
				element={
					<ProtectedRoute>
						<AlertsPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/analytics"
				element={
					<ProtectedRoute>
						<SavingsPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/soic"
				element={
					<ProtectedRoute>
						<AlertsPage />
					</ProtectedRoute>
				}
			/>

			{/* Catch-all Fallback */}
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
};

export default App;
