import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchDemoSettings, updateDemoSettings as apiUpdateDemoSettings, fetchDemoTelemetry } from "../services/api";
import { useAuth } from "./AuthContext";

const DemoContext = createContext(null);

export const DemoProvider = ({ children }) => {
	const { selectedSiteId, selectedSite, isAuthenticated, isAdmin } = useAuth();

	const [demoSettings, setDemoSettings] = useState({
		enabled: false,
		toleranceKwh: 2.0,
		demoInverterId: "SOL-INV-5000H-780609"
	});
	const [demoTelemetry, setDemoTelemetry] = useState(null);
	const [loadingDemo, setLoadingDemo] = useState(false);

	// Load persistent settings on mount or auth change
	const loadSettings = useCallback(async () => {
		if (!isAuthenticated) return;
		try {
			const res = await fetchDemoSettings();
			if (res) {
				setDemoSettings({
					enabled: Boolean(res.enabled),
					toleranceKwh: Number(res.toleranceKwh) || 2.0,
					demoInverterId: res.demoInverterId || "SOL-INV-5000H-780609"
				});
			}
		} catch (err) {
			console.log("[DemoContext] Settings fetch notice:", err.message);
		}
	}, [isAuthenticated]);

	useEffect(() => {
		loadSettings();
	}, [loadSettings]);

	// Fetch time-aware simulated telemetry for selected site
	const loadTelemetry = useCallback(async () => {
		if (!demoSettings.enabled || !selectedSiteId) {
			setDemoTelemetry(null);
			return;
		}

		try {
			setLoadingDemo(true);
			const res = await fetchDemoTelemetry(selectedSiteId);
			if (res && (res.isSimulated || res.enabled)) {
				setDemoTelemetry(res);
			} else {
				setDemoTelemetry(null);
			}
		} catch (err) {
			console.log("[DemoContext] Telemetry fetch notice:", err.message);
			setDemoTelemetry(null);
		} finally {
			setLoadingDemo(false);
		}
	}, [demoSettings.enabled, selectedSiteId, selectedSite]);

	useEffect(() => {
		loadTelemetry();
		// Poll simulated progression every 30 seconds to reflect natural time flow
		const timer = setInterval(() => {
			loadTelemetry();
		}, 30000);
		return () => clearInterval(timer);
	}, [loadTelemetry]);

	// Toggle demo mode (Admin only)
	const setDemoEnabled = async (enabled) => {
		try {
			const res = await apiUpdateDemoSettings({ enabled });
			if (res) {
				setDemoSettings((prev) => ({
					...prev,
					enabled: Boolean(res.enabled),
					toleranceKwh: res.toleranceKwh,
					demoInverterId: res.demoInverterId
				}));

				if (res.enabled && selectedSiteId) {
					try {
						const telem = await fetchDemoTelemetry(selectedSiteId);
						if (telem) {
							setDemoTelemetry(telem);
						}
					} catch (e) {
						console.log("[DemoContext] Immediate telemetry fetch notice:", e.message);
					}
				} else {
					setDemoTelemetry(null);
				}
			}
			return { success: true };
		} catch (err) {
			console.error("[DemoContext] Toggle error:", err);
			return { success: false, error: err.message };
		}
	};

	// Update tolerance (Admin only)
	const setTolerance = async (toleranceKwh) => {
		try {
			const res = await apiUpdateDemoSettings({ toleranceKwh });
			if (res) {
				setDemoSettings((prev) => ({
					...prev,
					toleranceKwh: res.toleranceKwh
				}));
			}
			return { success: true };
		} catch (err) {
			console.error("[DemoContext] Tolerance update error:", err);
			return { success: false, error: err.message };
		}
	};

	const isDemoActive = Boolean(
		demoSettings.enabled &&
		(!selectedSite?.inverterSerialNumber || selectedSite.inverterSerialNumber === "PENDING_INVERTER_ID")
	);

	return (
		<DemoContext.Provider
			value={{
				demoSettings,
				isDemoMode: demoSettings.enabled,
				isDemoActive,
				demoTelemetry,
				loadingDemo,
				setDemoEnabled,
				setTolerance,
				refreshDemoTelemetry: loadTelemetry
			}}
		>
			{children}
		</DemoContext.Provider>
	);
};

export const useDemo = () => {
	const context = useContext(DemoContext);
	if (!context) {
		throw new Error("useDemo must be used within a DemoProvider");
	}
	return context;
};
