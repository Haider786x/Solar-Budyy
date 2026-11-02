const StatusBadge = ({ status, severity, className = "" }) => {
	const raw = (status || severity || "Unknown").toUpperCase();

	let badgeClass = "bg-slate-50 text-slate-700 border-slate-200";
	let dotClass = "bg-slate-400";
	let label = status || severity || "Unknown";

	if (raw === "HEALTHY" || raw === "RESOLVED" || raw === "NORMAL") {
		badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
		dotClass = "bg-emerald-500";
		label = status || "Healthy";
	} else if (raw === "WARNING" || raw === "YELLOW" || raw === "ELEVATED" || raw === "ORANGE") {
		badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
		dotClass = "bg-amber-500";
		label = status || (raw === "YELLOW" ? "Warning" : "Elevated");
	} else if (raw === "CRITICAL" || raw === "RED") {
		badgeClass = "bg-rose-50 text-rose-700 border-rose-200 font-semibold";
		dotClass = "bg-rose-500";
		label = status || "Critical";
	} else if (raw === "OFFLINE" || raw === "NOT CONNECTED") {
		badgeClass = "bg-slate-100 text-slate-600 border-slate-300";
		dotClass = "bg-slate-500";
		label = status || "Offline";
	}

	return (
		<span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass} ${className}`}>
			<span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
			{label}
		</span>
	);
};

export default StatusBadge;
