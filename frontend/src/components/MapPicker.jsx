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

const DEFAULT_CENTER = [26.8467, 80.9462]; // Default: Lucknow, India
const DEFAULT_ZOOM = 9;

const MapPicker = ({ latitude, longitude, onLocationSelect }) => {
	const containerRef = useRef(null);
	const mapRef = useRef(null);
	const markerRef = useRef(null);
	const onLocationSelectRef = useRef(onLocationSelect);

	useEffect(() => {
		onLocationSelectRef.current = onLocationSelect;
	}, [onLocationSelect]);

	// Initialise map once
	useEffect(() => {
		if (mapRef.current || !containerRef.current) return;

		const lat = parseFloat(latitude) || DEFAULT_CENTER[0];
		const lng = parseFloat(longitude) || DEFAULT_CENTER[1];
		const initialZoom = !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude)) ? 10 : DEFAULT_ZOOM;

		const map = L.map(containerRef.current, {
			center: [lat, lng],
			zoom: initialZoom,
			scrollWheelZoom: true,
		});

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "© OpenStreetMap contributors",
			maxZoom: 19,
		}).addTo(map);

		// Place initial marker if coords exist
		if (!isNaN(lat) && !isNaN(lng)) {
			markerRef.current = L.marker([lat, lng]).addTo(map);
		}

		map.on("click", (e) => {
			const { lat: clickLat, lng: clickLng } = e.latlng;
			const cleanLat = parseFloat(clickLat.toFixed(4));
			const cleanLng = parseFloat(clickLng.toFixed(4));

			if (markerRef.current) {
				markerRef.current.setLatLng([cleanLat, cleanLng]);
			} else {
				markerRef.current = L.marker([cleanLat, cleanLng]).addTo(map);
			}

			if (onLocationSelectRef.current) {
				onLocationSelectRef.current(cleanLat, cleanLng);
			}
		});

		mapRef.current = map;

		// Force map layout recalculation to prevent gray tiles
		const timer = setTimeout(() => {
			map.invalidateSize();
		}, 200);

		return () => {
			clearTimeout(timer);
			map.remove();
			mapRef.current = null;
			markerRef.current = null;
		};
	}, []);

	// Keep marker and view in sync with lat/lon props
	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;

		const lat = parseFloat(latitude);
		const lng = parseFloat(longitude);

		if (!isNaN(lat) && !isNaN(lng)) {
			if (markerRef.current) {
				markerRef.current.setLatLng([lat, lng]);
			} else {
				markerRef.current = L.marker([lat, lng]).addTo(map);
			}
			map.panTo([lat, lng], { animate: true });
		} else if (markerRef.current) {
			markerRef.current.remove();
			markerRef.current = null;
		}
	}, [latitude, longitude]);

	return (
		<div className="w-full space-y-1.5" style={{ isolation: "isolate" }}>
			<div className="flex items-center justify-between text-xs">
				<span className="font-semibold text-slate-700">
					Interactive Geographic Placement Map:
				</span>
				<span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
					{latitude && longitude ? `${latitude}° N, ${longitude}° E` : "Click map to pin location"}
				</span>
			</div>
			<div
				ref={containerRef}
				style={{ height: 260 }}
				className="w-full overflow-hidden rounded-lg border border-slate-300 shadow-inner z-0"
			/>
			<p className="text-[10px] text-slate-500 italic">
				Tip: Click or tap anywhere on the map to drop the solar installation pin, or pick a city preset above.
			</p>
		</div>
	);
};

export default MapPicker;
