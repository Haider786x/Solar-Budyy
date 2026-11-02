import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix for default marker icons in webpack/vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: markerIcon2x,
	iconUrl: markerIcon,
	shadowUrl: markerShadow,
});

const RegionalMap = ({ users = [], onSelectSite }) => {
	const containerRef = useRef(null);
	const mapRef = useRef(null);
	const markersGroupRef = useRef(null);

	// Initialise map once
	useEffect(() => {
		if (mapRef.current || !containerRef.current) return;

		const map = L.map(containerRef.current, {
			center: [22.5, 78.9], // Geographic center of India
			zoom: 5,
			scrollWheelZoom: true,
		});

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "© OpenStreetMap contributors",
			maxZoom: 19,
		}).addTo(map);

		markersGroupRef.current = L.featureGroup().addTo(map);
		mapRef.current = map;

		const timer = setTimeout(() => {
			map.invalidateSize();
		}, 200);

		return () => {
			clearTimeout(timer);
			map.remove();
			mapRef.current = null;
			markersGroupRef.current = null;
		};
	}, []);

	// Sync markers whenever the users list changes
	useEffect(() => {
		const map = mapRef.current;
		const group = markersGroupRef.current;
		if (!map || !group) return;

		group.clearLayers();

		const validUsers = users.filter((u) => {
			const lat = Number(u.location?.latitude ?? u.coordinates?.lat ?? u.latitude);
			const lng = Number(u.location?.longitude ?? u.coordinates?.lng ?? u.longitude);
			return !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);
		});

		validUsers.forEach((site) => {
			const lat = Number(site.location?.latitude ?? site.coordinates?.lat ?? site.latitude);
			const lng = Number(site.location?.longitude ?? site.coordinates?.lng ?? site.longitude);
			const cap = site.systemCapacity || site.ratedKwp || "5.0";
			const name = site.name || site.shortName || "Solar Installation";
			const locationStr = typeof site.location === "string" ? site.location : `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;

			const marker = L.marker([lat, lng]);
			marker.bindPopup(
				`<div style="min-width:180px; font-family: ui-sans-serif, system-ui, sans-serif;">
					<div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:3px">${name}</div>
					<div style="font-size:11px;color:#475569;margin-bottom:2px">📍 ${locationStr}</div>
					<div style="font-size:11px;color:#2563eb;font-weight:600;margin-bottom:4px">⚡ Rated: <strong>${cap} kWp</strong></div>
					<div style="font-size:10px;color:#64748b;font-family:monospace">${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</div>
				</div>`,
				{ maxWidth: 240 }
			);
			group.addLayer(marker);
		});

		if (validUsers.length > 0) {
			try {
				map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 10 });
			} catch {
				// getBounds can throw if group is empty
			}
		}
	}, [users]);

	return (
		<div
			ref={containerRef}
			style={{ height: "100%", minHeight: 280, position: "relative", zIndex: 0 }}
			className="w-full"
		/>
	);
};

export default RegionalMap;
