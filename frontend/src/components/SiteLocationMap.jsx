import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, ExternalLink, Layers, Compass, SunMedium } from "lucide-react";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: markerIcon2x,
	iconUrl: markerIcon,
	shadowUrl: markerShadow,
});

const SiteLocationMap = ({
	siteName = "Haider Rooftop Solar Array",
	capacity = "5.0",
	latitude = 26.8467,
	longitude = 80.9462,
	locationName = "Lucknow, Uttar Pradesh, India",
	tilt = 26,
	azimuth = 180,
	height = 280,
	compact = false
}) => {
	const containerRef = useRef(null);
	const mapRef = useRef(null);
	const markerRef = useRef(null);
	const [mapLayer, setMapLayer] = useState("streets"); // 'streets' | 'satellite'

	const latNum = Number(latitude) || 26.8467;
	const lngNum = Number(longitude) || 80.9462;

	// Initialise map
	useEffect(() => {
		if (mapRef.current || !containerRef.current) return;

		const map = L.map(containerRef.current, {
			center: [latNum, lngNum],
			zoom: 13,
			scrollWheelZoom: false,
		});

		const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "© OpenStreetMap contributors",
			maxZoom: 19,
		});

		streetLayer.addTo(map);

		const marker = L.marker([latNum, lngNum]).addTo(map);
		marker.bindPopup(
			`<div style="font-family: ui-sans-serif, system-ui, sans-serif; min-width: 170px;">
				<div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${siteName}</div>
				<div style="font-size: 11px; color: #475569; margin-bottom: 3px;">${locationName}</div>
				<div style="font-size: 11px; color: #2563eb; font-weight: 600;">Capacity: ${capacity} kWp Monocrystalline</div>
				<div style="font-size: 10px; color: #64748b; font-family: monospace; margin-top: 2px;">${latNum.toFixed(4)}°N, ${lngNum.toFixed(4)}°E</div>
			</div>`
		);
		marker.openPopup();

		markerRef.current = marker;
		mapRef.current = map;

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

	// Keep centered when coordinates change
	useEffect(() => {
		const map = mapRef.current;
		const marker = markerRef.current;
		if (!map || !marker) return;

		marker.setLatLng([latNum, lngNum]);
		map.setView([latNum, lngNum], 13, { animate: true });
	}, [latNum, lngNum]);

	const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`;

	return (
		<div className="w-full bg-white border border-slate-200/90 rounded-lg shadow-xs overflow-hidden">
			{/* Header bar */}
			<div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<div className="w-7 h-7 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
						<MapPin className="w-4 h-4" />
					</div>
					<div>
						<h3 className="text-xs font-bold text-slate-900 leading-tight">
							Installation Geographic Location &amp; Array Footprint
						</h3>
						<p className="text-[10px] text-slate-500 font-medium">
							{locationName} • Coordinates: <span className="font-mono text-slate-700">{latNum.toFixed(4)}°N, {lngNum.toFixed(4)}°E</span>
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 text-xs">
					<a
						href={googleMapsUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
					>
						<span>Open in Maps</span>
						<ExternalLink className="w-3 h-3 text-slate-400" />
					</a>
				</div>
			</div>

			{/* Map viewport */}
			<div className="relative w-full" style={{ isolation: "isolate" }}>
				<div
					ref={containerRef}
					style={{ height }}
					className="w-full z-0"
				/>

				{/* Floating Coordinates Badge */}
				<div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2.5 py-1 rounded shadow-md border border-white/20">
					GPS: {latNum.toFixed(4)}°N, {lngNum.toFixed(4)}°E
				</div>
			</div>

			{/* Technical Geodata Metrics Footer */}
			{!compact && (
				<div className="p-3 bg-white border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
					<div className="p-2 bg-slate-50 rounded border border-slate-100">
						<span className="text-[10px] text-slate-400 block font-medium">Solar Resource Zone</span>
						<strong className="text-slate-800 text-[11px] mt-0.5 block flex items-center gap-1">
							<SunMedium className="w-3 h-3 text-amber-500" />
							Zone III (~5.2 kWh/m²/day)
						</strong>
					</div>

					<div className="p-2 bg-slate-50 rounded border border-slate-100">
						<span className="text-[10px] text-slate-400 block font-medium">Array Alignment</span>
						<strong className="text-slate-800 text-[11px] mt-0.5 block flex items-center gap-1">
							<Compass className="w-3 h-3 text-blue-500" />
							{azimuth === 180 ? "True South (180°)" : `${azimuth}° Azimuth`}
						</strong>
					</div>

					<div className="p-2 bg-slate-50 rounded border border-slate-100">
						<span className="text-[10px] text-slate-400 block font-medium">Optimal Pitch Slope</span>
						<strong className="text-slate-800 text-[11px] mt-0.5 block">
							{tilt}° Angle to Horizon
						</strong>
					</div>

					<div className="p-2 bg-slate-50 rounded border border-slate-100">
						<span className="text-[10px] text-slate-400 block font-medium">AMSL Elevation</span>
						<strong className="text-slate-800 text-[11px] mt-0.5 block">
							~123 m (Gangetic Plain)
						</strong>
					</div>
				</div>
			)}
		</div>
	);
};

export default SiteLocationMap;
