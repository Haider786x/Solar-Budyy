const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const TOKEN_KEY = "solarbuddy_token";
const USER_KEY = "solarbuddy_user";

export const getToken = () => {
	try {
		return localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
};

export const getUser = () => {
	try {
		const raw = localStorage.getItem(USER_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
};

export const setSession = (token, user) => {
	try {
		if (token) localStorage.setItem(TOKEN_KEY, token);
		if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
		window.dispatchEvent(new Event("solarbuddy_auth_change"));
	} catch (e) {
		console.error("Failed to save auth session to localStorage", e);
	}
};

export const clearSession = () => {
	try {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
		window.dispatchEvent(new Event("solarbuddy_auth_change"));
	} catch (e) {
		console.error("Failed to clear auth session", e);
	}
};

export const updateUserSite = (siteId) => {
	try {
		const user = getUser();
		if (user) {
			user.siteId = siteId;
			localStorage.setItem(USER_KEY, JSON.stringify(user));
			window.dispatchEvent(new Event("solarbuddy_auth_change"));
		}
	} catch (e) {
		console.error("Failed to update user siteId", e);
	}
};

export const getAuthHeaders = () => {
	const token = getToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleAuthResponse = async (response, fallbackMessage) => {
	let payload = null;
	try {
		payload = await response.json();
	} catch {
		payload = null;
	}

	if (!response.ok) {
		throw new Error(payload?.message || fallbackMessage);
	}

	if (payload?.token && payload?.user) {
		setSession(payload.token, payload.user);
	}

	return payload;
};

export const register = async ({ name, email, password, confirmPassword }) => {
	const response = await fetch(`${API_BASE_URL}/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, email, password, confirmPassword })
	});

	return handleAuthResponse(response, "Registration failed");
};

export const login = async (email, password) => {
	const response = await fetch(`${API_BASE_URL}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password })
	});

	return handleAuthResponse(response, "Login failed");
};

export const adminLogin = async (email, password) => {
	const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password })
	});

	return handleAuthResponse(response, "Admin login failed");
};

export const getMe = async () => {
	const token = getToken();
	if (!token) return null;

	try {
		const response = await fetch(`${API_BASE_URL}/auth/me`, {
			headers: { ...getAuthHeaders() }
		});

		if (!response.ok) {
			if (response.status === 401) {
				clearSession();
			}
			return null;
		}

		const payload = await response.json();
		if (payload?.user) {
			const currentUser = getUser() || {};
			setSession(token, { ...currentUser, ...payload.user });
			return payload.user;
		}
		return null;
	} catch {
		return null;
	}
};

export const logout = async () => {
	try {
		await fetch(`${API_BASE_URL}/auth/logout`, {
			method: "POST",
			headers: { ...getAuthHeaders() }
		});
	} catch {
		// Ignore network failure on logout
	} finally {
		clearSession();
	}
};
