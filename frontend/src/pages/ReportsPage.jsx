import { useState, useEffect, useMemo } from "react";
import Layout from "../components/layout/Layout";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useAuth, formatLocationString } from "../context/AuthContext";
import { fetchMonthlyProductionByUserId } from "../services/api";
import { Download, Printer, CheckCircle2, Clock } from "lucide-react";

const MONTH_TARGET_WEIGHTS = [
	{ name: "Jan", weight: 580 },
	{ name: "Feb", weight: 640 },
	{ name: "Mar", weight: 750 },
	{ name: "Apr", weight: 820 },
	{ name: "May", weight: 860 },
	{ name: "Jun", weight: 790 },
	{ name: "Jul", weight: 680 },
	{ name: "Aug", weight: 690 },
	{ name: "Sep", weight: 710 },
	{ name: "Oct", weight: 730 },
	{ name: "Nov", weight: 640 },
	{ name: "Dec", weight: 560 }
];

const ReportsPage = () => {
	const { selectedSite, selectedSiteId } = useAuth();
	const cap = selectedSite?.systemCapacity || 5.0;
	const isPendingHardware = selectedSite?.inverterSerialNumber === "PENDING_INVERTER_ID" || !selectedSite?.inverterSerialNumber;

	const [ledgerRows, setLedgerRows] = useState(() => {
		const scale = cap / 5.04;
		return MONTH_TARGET_WEIGHTS.map((m, idx) => {
			const exp = Math.round(m.weight * scale);
			const isForecast = idx >= 10;
			return {
				month: isForecast ? `${m.name} 2026 (Projected)` : `${m.name} 2026`,
				expected: exp,
				actual: 0,
				diff: 0,
				efficiency: "0.0%",
				bill: 0,
				status: isForecast ? "Forecast" : "Awaiting Telemetry"
			};
		});
	});

	useEffect(() => {
		const loadReport = async () => {
			if (!selectedSiteId) return;
			try {
				const res = await fetchMonthlyProductionByUserId(selectedSiteId);
				const list = res?.data || res;
				if (Array.isArray(list) && list.length > 0) {
					const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
					const mapped = list.map((item, idx) => {
						const name = item.month || (item.monthIndex ? monthNames[item.monthIndex - 1] : `M${idx + 1}`);
						const isForecast = idx >= 10;
						const expected = +(item.predicted_kwh ?? item.expected_kwh ?? 0).toFixed(0);
						const hasActual = item.actual_kwh != null && item.actual_kwh !== "" && item.actual_kwh !== "N/A";
						const actual = hasActual ? +(Number(item.actual_kwh)).toFixed(0) : 0;
						const diff = hasActual ? +(actual - expected).toFixed(0) : 0;
						const eff = (hasActual && expected > 0) ? `${+((actual / expected) * 100).toFixed(1)}%` : "0.0%";
						const bill = Math.round(actual * 7.50);

						return {
							month: isForecast ? `${name} 2026 (Projected)` : `${name} 2026`,
							expected,
							actual,
							diff,
							efficiency: eff,
							bill,
							status: hasActual ? "Verified" : (isForecast ? "Forecast" : "Awaiting Telemetry")
						};
					});
					setLedgerRows(mapped);
				} else {
					const scale = cap / 5.04;
					setLedgerRows(
						MONTH_TARGET_WEIGHTS.map((m, idx) => {
							const exp = Math.round(m.weight * scale);
							const isForecast = idx >= 10;
							return {
								month: isForecast ? `${m.name} 2026 (Projected)` : `${m.name} 2026`,
								expected: exp,
								actual: 0,
								diff: 0,
								efficiency: "0.0%",
								bill: 0,
								status: isForecast ? "Forecast" : "Awaiting Telemetry"
							};
						})
					);
				}
			} catch (err) {
				const scale = cap / 5.04;
				setLedgerRows(
					MONTH_TARGET_WEIGHTS.map((m, idx) => {
						const exp = Math.round(m.weight * scale);
						const isForecast = idx >= 10;
						return {
							month: isForecast ? `${m.name} 2026 (Projected)` : `${m.name} 2026`,
							expected: exp,
							actual: 0,
							diff: 0,
							efficiency: "0.0%",
							bill: 0,
							status: isForecast ? "Forecast" : "Awaiting Telemetry"
						};
					})
				);
			}
		};
		loadReport();
	}, [selectedSiteId, cap]);

	// Calculate YTD totals (Jan-Oct) and Full Year totals
	const ytdExpected = useMemo(() => ledgerRows.slice(0, 10).reduce((a, b) => a + b.expected, 0), [ledgerRows]);
	const ytdActual = useMemo(() => ledgerRows.slice(0, 10).reduce((a, b) => a + b.actual, 0), [ledgerRows]);
	const ytdDiff = useMemo(() => ytdActual - ytdExpected, [ytdActual, ytdExpected]);
	const ytdBill = useMemo(() => ledgerRows.slice(0, 10).reduce((a, b) => a + b.bill, 0), [ledgerRows]);
	const ytdEfficiency = useMemo(() => ytdExpected > 0 ? `${+((ytdActual / ytdExpected) * 100).toFixed(1)}%` : "0.0%", [ytdActual, ytdExpected]);

	const fullExpected = useMemo(() => ledgerRows.reduce((a, b) => a + b.expected, 0), [ledgerRows]);
	const fullActual = useMemo(() => ledgerRows.reduce((a, b) => a + b.actual, 0), [ledgerRows]);
	const fullDiff = useMemo(() => fullActual - fullExpected, [fullActual, fullExpected]);
	const fullBill = useMemo(() => ledgerRows.reduce((a, b) => a + b.bill, 0), [ledgerRows]);
	const fullEfficiency = useMemo(() => fullExpected > 0 ? `${+((fullActual / fullExpected) * 100).toFixed(1)}%` : "0.0%", [fullActual, fullExpected]);

	const handleExportCSV = () => {
		const headers = ["Billing Month", "Expected Target (kWh)", "Actual Output (kWh)", "Difference (kWh)", "System Efficiency", "Bill Value (INR)", "Audit Status"];
		const rows = ledgerRows.map((r) => [
			r.month,
			r.expected,
			r.actual,
			r.diff,
			r.efficiency,
			r.bill,
			r.status
		]);
		rows.push(["YTD Actual Total (Jan-Oct)", ytdExpected, ytdActual, ytdDiff, ytdEfficiency, ytdBill, "Audited YTD"]);
		rows.push(["Full Year 2026 Projected", fullExpected, fullActual, fullDiff, fullEfficiency, fullBill, "Estimated Year"]);

		const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `SolarBuddy_${(selectedSite?.name || "System").replace(/\\s+/g, "_")}_Energy_Statement_2026.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handlePrint = () => {
		window.print();
	};

	return (
		<Layout>
			<div className="space-y-4 print:space-y-2">
				{/* Top Breadcrumb & Action Buttons */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200 print:hidden">
					<div>
						<div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
							<span>Energy Audit</span>
							<span className="text-slate-400">/</span>
							<span>Generation Statements &amp; Reconciliation</span>
						</div>
						<h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
							Energy Production &amp; Savings Statement
						</h1>
					</div>

					<div className="flex items-center gap-2 self-start sm:self-auto">
						<Button
							variant="secondary"
							size="sm"
							onClick={handleExportCSV}
							icon={Download}
						>
							Export CSV
						</Button>
						<Button
							variant="primary"
							size="sm"
							onClick={handlePrint}
							icon={Printer}
						>
							Print Statement (PDF)
						</Button>
					</div>
				</div>

				{/* System Summary Banner */}
				<Card className="p-5">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
						<div>
							<span className="text-[10px] text-slate-400 font-medium block">Installation</span>
							<strong className="text-slate-900 font-bold block mt-0.5">
								{selectedSite?.name || "Mohammad Haider"} - {typeof selectedSite?.location === "string" ? selectedSite.location : formatLocationString(selectedSite?.location, "Lucknow Rooftop Array")}
							</strong>
							<span className="text-slate-500 text-[11px]">
								{typeof selectedSite?.location === "string" ? selectedSite.location : formatLocationString(selectedSite?.location, "Lucknow, India")}
							</span>
						</div>

						<div>
							<span className="text-[10px] text-slate-400 font-medium block">Audit Period</span>
							<strong className="text-slate-900 font-bold block mt-0.5">
								Jan 1 – Oct 31, 2026 (YTD)
							</strong>
							<span className="text-emerald-600 font-semibold text-[11px]">
								10 Months Recorded Data
							</span>
						</div>

						<div>
							<span className="text-[10px] text-slate-400 font-medium block">Installed Capacity</span>
							<strong className="text-slate-900 font-bold block mt-0.5 font-tabular">
								{selectedSite?.systemCapacity ? `${selectedSite.systemCapacity} kWp Rated` : "5 kWp Rated"}
							</strong>
							<span className="text-slate-500 text-[11px]">
								{selectedSite?.numberOfPanels || 14} Modules • Direction South ({selectedSite?.azimuthDeg || 180}°)
							</span>
						</div>

						<div>
							<span className="text-[10px] text-slate-400 font-medium block">YTD Electricity Savings</span>
							<strong className="text-emerald-600 font-extrabold text-sm block mt-0.5 font-tabular">
								₹{ytdBill.toLocaleString("en-IN")}
							</strong>
							<span className="text-slate-500 text-[11px]">Tariff: ₹7.50 / kWh net meter rate</span>
						</div>
					</div>
				</Card>

				{/* Monthly Production Reconciliation Ledger (2026) Table */}
				<Card className="overflow-hidden">
					<div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
						<div>
							<h2 className="text-xs font-bold text-slate-900">Monthly Production Reconciliation Ledger (2026)</h2>
							<p className="text-[11px] text-slate-400 mt-0.5">
								{ytdActual > 0
									? "Verified recorded figures for Jan–Oct 2026; Nov–Dec are projected estimates."
									: "Awaiting live inverter telemetry (Inverter ID: PENDING_INVERTER_ID). Target projections shown."}
							</p>
						</div>
						<Badge variant="emerald" size="sm">
							Feed-In Grid Rate: ₹7.50 / kWh
						</Badge>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs">
							<thead>
								<tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] text-slate-500 font-semibold">
									<th className="py-2.5 px-5">Billing Month</th>
									<th className="py-2.5 px-4 text-right">Expected Target</th>
									<th className="py-2.5 px-4 text-right">Actual Output</th>
									<th className="py-2.5 px-4 text-right">Difference</th>
									<th className="py-2.5 px-4 text-right">System Efficiency</th>
									<th className="py-2.5 px-4 text-right">Bill Value (INR)</th>
									<th className="py-2.5 px-5 text-right">Audit Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 font-mono text-[11px]">
								{ledgerRows.map((row) => (
									<tr key={row.month} className="hover:bg-slate-50/60 transition-colors">
										<td className="py-2 px-5 font-sans font-medium text-slate-800">{row.month}</td>
										<td className="py-2 px-4 text-right text-slate-600">{row.expected.toLocaleString("en-IN")} kWh</td>
										<td className="py-2 px-4 text-right font-bold text-slate-900">
											{row.actual > 0 ? `${row.actual.toLocaleString("en-IN")} kWh` : "—"}
										</td>
										<td className={`py-2 px-4 text-right font-semibold ${row.diff < 0 ? "text-rose-600" : row.diff > 0 ? "text-emerald-600" : "text-slate-400"}`}>
											{row.actual > 0 ? (row.diff > 0 ? `+${row.diff} kWh` : `${row.diff} kWh`) : "—"}
										</td>
										<td className="py-2 px-4 text-right text-slate-700">{row.efficiency}</td>
										<td className="py-2 px-4 text-right text-slate-900 font-semibold">
											{row.actual > 0 ? `₹${row.bill.toLocaleString("en-IN")}` : "₹0"}
										</td>
										<td className="py-2 px-5 text-right font-sans">
											{row.status === "Verified" ? (
												<span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
													<CheckCircle2 className="w-3 h-3 text-emerald-600" />
													Verified
												</span>
											) : row.status === "Awaiting Telemetry" ? (
												<span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
													<Clock className="w-3 h-3 text-amber-500" />
													Pending
												</span>
											) : (
												<span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
													<Clock className="w-3 h-3 text-slate-400" />
													Forecast
												</span>
											)}
										</td>
									</tr>
								))}

								{/* YTD Total Row */}
								<tr className="bg-slate-50/90 font-bold border-t-2 border-slate-200 text-slate-900">
									<td className="py-2.5 px-5 font-sans">YTD Actual Total (Jan–Oct)</td>
									<td className="py-2.5 px-4 text-right">{ytdExpected.toLocaleString("en-IN")} kWh</td>
									<td className="py-2.5 px-4 text-right text-emerald-700 font-extrabold">
										{ytdActual > 0 ? `${ytdActual.toLocaleString("en-IN")} kWh` : "0 kWh"}
									</td>
									<td className={`py-2.5 px-4 text-right ${ytdDiff < 0 ? "text-rose-600" : ytdDiff > 0 ? "text-emerald-600" : "text-slate-400"}`}>
										{ytdActual > 0 ? (ytdDiff > 0 ? `+${ytdDiff} kWh` : `${ytdDiff} kWh`) : "—"}
									</td>
									<td className="py-2.5 px-4 text-right">{ytdEfficiency}</td>
									<td className="py-2.5 px-4 text-right text-emerald-700 font-extrabold">₹{ytdBill.toLocaleString("en-IN")}</td>
									<td className="py-2.5 px-5 text-right font-sans text-slate-600 font-bold text-[11px]">
										{ytdActual > 0 ? "Audited YTD" : "Awaiting Telemetry"}
									</td>
								</tr>

								{/* Full Year Projected Row */}
								<tr className="bg-slate-50/40 text-slate-600 text-[10px]">
									<td className="py-2 px-5 font-sans font-medium">Full Year 2026 Projected</td>
									<td className="py-2 px-4 text-right">{fullExpected.toLocaleString("en-IN")} kWh</td>
									<td className="py-2 px-4 text-right text-blue-600 font-bold">{fullActual.toLocaleString("en-IN")} kWh</td>
									<td className={`py-2 px-4 text-right ${fullDiff < 0 ? "text-rose-600" : "text-emerald-600"}`}>
										{fullDiff > 0 ? `+${fullDiff}` : fullDiff} kWh
									</td>
									<td className="py-2 px-4 text-right">{fullEfficiency}</td>
									<td className="py-2 px-4 text-right font-bold">₹{fullBill.toLocaleString("en-IN")}</td>
									<td className="py-2 px-5 text-right font-sans text-slate-500 font-medium">
										Estimated Year
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</Card>
			</div>
		</Layout>
	);
};

export default ReportsPage;
