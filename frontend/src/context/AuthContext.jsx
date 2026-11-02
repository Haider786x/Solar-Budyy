import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
	getUser,
	getToken,
	login as apiLogin,
	adminLogin as apiAdminLogin,
	register as apiRegister,
	logout as apiLogout,
	getMe
} from "../services/authService";
import { fetchUsers, fetchUserById } from "../services/api";

const AuthContext = createContext(null);

export const DEFAULT_FLEET_SITES = [
	{
		_id: "6aafed432204dd7a11df589d",
		id: "6aafed432204dd7a11df589d",
		name: "Haider Rooftop Solar Array",
		shortName: "Haider — Lucknow Rooftop",
		ownerName: "Haider",
		ownerEmail: "lordxgrimx786@gmail.com",
		location: "Lucknow, India",
		city: "Lucknow",
		coordinates: { lat: 26.8467, lng: 80.9462 },
		systemCapacity: 5.0,
		ratedKwp: 5.0,
		numberOfPanels: 14,
		moduleRatingWatts: 360,
		moduleType: "Monocrystalline",
		tiltDeg: 26.0,
		azimuthDeg: 180.0,
		shadingFactor: 0.95,
		soilingLossPercent: 2.0,
		inverterLossPercent: 2.0,
		wiringLossPercent: 2.0,
		miscLossPercent: 1.5,
		inv_efficiency: 98.0,
		inverterSerialNumber: "SOL-INV-5000H-780609",
		currentOutputKw: 3.8,
		status: "Normal",
		telemetryStatus: "Transmitting",
		installationDate: "Nov 12, 2023",
		todayGeneratedKwh: 0.0,
		todayTargetKwh: 24.6,
		ytdGeneratedKwh: 0,
		ytdTargetKwh: 7250,
		ytdSavingsInr: 0,
		co2AvoidedTons: 0,
		treesPlanted: 0,
		coalSavedKg: 0
	}
];

export const sanitizeSiteId = (id) => {
	if (id && typeof id === "string" && id.length === 24 && !["6ae5e1d2de40faaf8193a10a", "6ae5e1d2de40faaf8193a10c", "6ae5e1d2de40faaf8193a10e"].includes(id)) {
		return id;
	}
	return "6aafed432204dd7a11df589d";
};

export const formatLocationString = (loc, fallbackStr) => {
	if (typeof loc === "string" && loc.trim()) return loc;
	if (loc && typeof loc === "object" && loc.latitude && loc.longitude) {
		const lat = Number(loc.latitude);
		const lng = Number(loc.longitude);
		if (Math.abs(lat - 26.8467) < 0.5) return "Lucknow, India";
		if (Math.abs(lat - 28.6139) < 0.5) return "New Delhi, India";
		if (Math.abs(lat - 12.9716) < 0.5) return "Bengaluru, India";
		if (Math.abs(lat - 26.9124) < 0.5) return "Jaipur, India";
		return `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`;
	}
	return fallbackStr || "Lucknow, India";
};

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(getUser());
	const [token, setToken] = useState(getToken());
	const [loading, setLoading] = useState(true);
	const [fleetSites, setFleetSites] = useState(DEFAULT_FLEET_SITES);

	// Role toggle
	const [activeRole, setActiveRole] = useState(() => {
		const storedRole = localStorage.getItem("solarbuddy_active_role");
		if (storedRole === "admin" || storedRole === "user") return storedRole;
		return getUser()?.role === "admin" ? "admin" : "user";
	});

	// Selected Site ID (defaults to Mohammad Haider's real MongoDB ID)
	const [selectedSiteId, setSelectedSiteId] = useState(() => {
		const stored = localStorage.getItem("solarbuddy_selected_site");
		return sanitizeSiteId(stored);
	});

	// Refresh fleet sites from live backend
	const refreshFleetSites = useCallback(async () => {
		try {
			const res = await fetchUsers();
			if (Array.isArray(res) && res.length > 0) {
				const merged = res.map((backendSite) => {
					const fallback = DEFAULT_FLEET_SITES.find(
						(d) => d._id === backendSite._id || d.ownerEmail === backendSite.email
					) || {};

					return {
						...fallback,
						...backendSite,
						id: backendSite._id,
						_id: backendSite._id,
						shortName: fallback.shortName || backendSite.name,
						location: formatLocationString(backendSite.location, fallback.location),
						coordinates: backendSite.location?.latitude ? { lat: backendSite.location.latitude, lng: backendSite.location.longitude } : fallback.coordinates,
						currentOutputKw: fallback.currentOutputKw || +(backendSite.systemCapacity * 0.75).toFixed(1),
						status: fallback.status || "Normal",
						telemetryStatus: fallback.telemetryStatus || "Transmitting"
					};
				});
				setFleetSites(merged);
			}
		} catch (err) {
			console.log("[AuthContext] Live fleet fetch fallback to seeded template:", err.message);
		}
	}, []);

	useEffect(() => {
		const initAuth = async () => {
			let existingToken = getToken();
			if (existingToken) {
				try {
					const freshUser = await getMe();
					if (freshUser) {
						setUser(freshUser);
						if (!localStorage.getItem("solarbuddy_active_role")) {
							setActiveRole(freshUser.role || "user");
						}
						if (freshUser.siteId) {
							setSelectedSiteId(sanitizeSiteId(freshUser.siteId));
						}
					}
				} catch {}
			}
			await refreshFleetSites();
			setLoading(false);
		};

		initAuth();
	}, [refreshFleetSites]);

	const switchRole = (newRole) => {
		setActiveRole(newRole);
		localStorage.setItem("solarbuddy_active_role", newRole);

		if (newRole === "admin") {
			const adminUser = {
				id: "admin_user",
				name: "Haider",
				email: "admin@solarbuddy.internal",
				role: "admin"
			};
			setUser(adminUser);
			localStorage.setItem("solarbuddy_user", JSON.stringify(adminUser));
		} else {
			const primarySite = fleetSites[0] || DEFAULT_FLEET_SITES[0];
			const customerUser = {
				id: primarySite._id,
				name: primarySite.ownerName || "Haider",
				email: primarySite.ownerEmail || "lordxgrimx786@gmail.com",
				role: "user",
				siteId: primarySite._id
			};
			setUser(customerUser);
			setSelectedSiteId(sanitizeSiteId(primarySite._id));
			localStorage.setItem("solarbuddy_user", JSON.stringify(customerUser));
		}
	};

	const selectSite = (siteId) => {
		const cleanId = sanitizeSiteId(siteId);
		setSelectedSiteId(cleanId);
		localStorage.setItem("solarbuddy_selected_site", cleanId);
	};

	const login = async (email, password) => {
		const res = await apiLogin(email, password);
		setUser(res.user);
		setToken(res.token);
		setActiveRole(res.user?.role || "user");
		if (res.user?.siteId) {
			setSelectedSiteId(res.user.siteId);
		}
		await refreshFleetSites();
		return res;
	};

	const adminLogin = async (email, password) => {
		const res = await apiAdminLogin(email, password);
		setUser(res.user);
		setToken(res.token);
		setActiveRole("admin");
		await refreshFleetSites();
		return res;
	};

	const register = async (payload) => {
		const res = await apiRegister(payload);
		setUser(res.user);
		setToken(res.token);
		await refreshFleetSites();
		return res;
	};

	const logout = async () => {
		try {
			await apiLogout();
		} catch {}
		setUser(null);
		setToken(null);
		localStorage.removeItem("solarbuddy_user");
		localStorage.removeItem("solarbuddy_token");
		localStorage.removeItem("solarbuddy_active_role");
		localStorage.removeItem("solarbuddy_selected_site");
		window.dispatchEvent(new Event("solarbuddy_auth_change"));
	};

	const activeSite = fleetSites.find((s) => s.id === selectedSiteId || s._id === selectedSiteId) || fleetSites[0];

	const value = {
		user,
		token,
		loading,
		isAuthenticated: !!token && !!user,
		isAdmin: activeRole === "admin",
		activeRole,
		switchRole,
		selectedSiteId,
		selectedSite: activeSite,
		selectSite,
		fleetSites,
		refreshFleetSites,
		login,
		adminLogin,
		register,
		logout
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
