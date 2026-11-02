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

// SolarBuddy AI Operations Assistant Endpoints
export const sendAIChatMessage = async ({ messages, siteId }) => {
	const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...getAuthHeaders()
		},
		body: JSON.stringify({ messages, siteId })
	});
	return parseResponse(response, "Failed to communicate with SolarBuddy AI");
};

export const streamAIChatMessage = async ({ messages, siteId, onDelta, onToolCall, onDone, onError }) => {
	try {
		const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...getAuthHeaders()
			},
			body: JSON.stringify({ messages, siteId, stream: true })
		});

		if (!response.ok) {
			let errMsg = `AI service returned error (${response.status})`;
			try {
				const errJson = await response.json();
				if (errJson?.message) errMsg = errJson.message;
			} catch {}
			throw new Error(errMsg);
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder("utf-8");
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed.startsWith("data: ")) {
					try {
						const eventData = JSON.parse(trimmed.slice(6));
						if (eventData.type === "tool_call") {
							onToolCall?.(eventData.tool);
						} else if (eventData.type === "delta") {
							onDelta?.(eventData.content);
						} else if (eventData.type === "done") {
							onDone?.(eventData.metadata);
						} else if (eventData.type === "error") {
							onError?.(new Error(eventData.message));
						}
					} catch (e) {
						// continue
					}
				}
			}
		}
	} catch (err) {
		onError?.(err);
	}
};

