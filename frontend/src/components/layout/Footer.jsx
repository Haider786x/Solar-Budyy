const Footer = ({ dark = false }) => {
	return (
		<footer className={`mt-auto border-t text-[11px] py-3.5 transition-colors ${
			dark
				? "border-slate-800 bg-[#0B1528] text-slate-400"
				: "border-slate-200/80 bg-white text-slate-500"
		}`}>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
				<div className={`font-medium ${dark ? "text-slate-300" : "text-slate-600"}`}>
					SolarBuddy <span className="text-slate-500 mx-1">•</span> Context-Aware Energy Telemetry &amp; SCADA Platform
				</div>
				<div className={dark ? "text-slate-400" : "text-slate-500"}>
					4th-Year B.Tech CSE Minor Project (ETMN100) - Amity University Uttar Pradesh, Lucknow
				</div>
			</div>
		</footer>
	);
};

export default Footer;
