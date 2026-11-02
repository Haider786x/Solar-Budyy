import { getAuthHeaders } from "./authService";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const parseResponse = async (response, fallbackMessage) => {
	let payload = null;

	try {
		payload = await response.json();
	} catch {
		payload = null;
	}

	if (!response.ok) {
		throw new Error(payload?.message || fallbackMessage);
	}

	return payload?.data !== undefined ? payload.data : payload;
};

export const fetchUsers = async () => {
	const response = await fetch(`${API_BASE_URL}/users`, {
		headers: {
			...getAuthHeaders()
		}
	});
	return parseResponse(response, "Failed to fetch users");
};

export const fetchUserById = async (userId) => {
	const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
		headers: {
			...getAuthHeaders()
		}
	});
	return parseResponse(response, "Failed to fetch user");
};

export const fetchSolarReportByUserId = async (userId) => {
	const response = await fetch(`${API_BASE_URL}/users/${userId}/solar-report`, {
		headers: {
			...getAuthHeaders()
		}
	});
	return parseResponse(response, "Failed to fetch solar report");
};

export const refreshSolarReportByUserId = async (userId) => {
	const response = await fetch(`${API_BASE_URL}/users/${userId}/solar-report/refresh`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...getAuthHeaders()
		}
	});
	return parseResponse(response, "Failed to refresh solar report");
};

export const fetchDailyPredictionsByUserId = async (userId) => {
	const response = await fetch(`${API_BASE_URL}/users/${userId}/daily-predictions`, {
		headers: {
			...getAuthHeaders()
		}
	});
	return parseResponse(response, "Failed to fetch daily predictions");
};

export const fetch7DayForecast = async (userId) => {
	const response = await fetch(`${API_BASE_URL}/users/${userId}/forecast-7days`, {
		headers: {
			...getAuthHeaders()
		}
	});
	return parseResponse(response, "Failed to fetch 7-day forecast");
};

export const fetchMonthlyProductionByUserId = async (userId) => {
	const response = await fetch(`${API_BASE_URL}/users/${userId}/monthly-production`, {
		headers: {
			...getAuthHeaders()
		}
	});
	return parseResponse(response, "Failed to fetch monthly production data");
};

export const triggerDailyPredictionByUserId = async (userId) => {
	const response = await fetch(`${API_BASE_URL}/users/${userId}/daily-predictions/trigger`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...getAuthHeaders()
		}
	});

	return parseResponse(response, "Failed to fetch daily prediction now");
};

export const createUser = async (payload) => {
	const response = await fetch(`${API_BASE_URL}/enter`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...getAuthHeaders()
		},
		body: JSON.stringify(payload)
	});

	return parseResponse(response, "Failed to create user");
};

export const deleteUser = async (userId) => {
	const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json",
			...getAuthHeaders()
		}
	});

	return parseResponse(response, "Failed to delete user");
};

export const updateUser = async (userId, payload) => {
	const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...getAuthHeaders()
		},
		body: JSON.stringify(payload)
	});

	return parseResponse(response, "Failed to update user");
};

// SOIC Alerts endpoints
export const fetchSOICDashboard = async () => {
	const response = await fetch(`${API_BASE_URL}/soic/dashboard`, {
		headers: {
			...getAuthHeaders()
		}
	});
	return parseResponse(response, "Failed to fetch SOIC alerts dashboard");
};

export const resolveSOICAlert = async (alertId, payload) => {
	const response = await fetch(`${API_BASE_URL}/soic/alerts/${alertId}/resolve`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...getAuthHeaders()
		},
		body: JSON.stringify(payload)
	});
	return parseResponse(response, "Failed to resolve alert");
};

// Inverter Real-Time Telemetry Endpoints
export const fetchDemoSettings = async () => {
	const response = await fetch(`${API_BASE_URL}/api/demo/settings`, {
		headers: {
			...getAuthHeaders()
		}
	});
	return parseResponse(response, "Failed to fetch telemetry settings");
};

export const updateDemoSettings = async (payload) => {
	const response = await fetch(`${API_BASE_URL}/api/demo/settings`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			...getAuthHeaders()
		},
		body: JSON.stringify(payload)
	});
	return parseResponse(response, "Failed to update telemetry settings");
};

export const fetchDemoTelemetry = async (siteId, date = null) => {
	const url = date
		? `${API_BASE_URL}/api/demo/telemetry/${siteId}?date=${encodeURIComponent(date)}`
		: `${API_BASE_URL}/api/demo/telemetry/${siteId}`;
	const response = await fetch(url, {
		headers: {
			...getAuthHeaders()
		}
	});
	return parseResponse(response, "Failed to fetch real-time telemetry");
};
