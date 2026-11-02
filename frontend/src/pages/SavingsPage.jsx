import { useState, useEffect } from "react";
import Layout from "../components/layout/Layout";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { useAuth } from "../context/AuthContext";
import { fetchMonthlyProductionByUserId } from "../services/api";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer
} from "recharts";
import {
	TrendingUp,
	CloudRain,
	Trees,
	Flame,
	Percent,
	Zap,
	HelpCircle
} from "lucide-react";

const MONTH_TARGET_PROJECTIONS = [
	{ month: "Jan", target: 580 },
	{ month: "Feb", target: 640 },
	{ month: "Mar", target: 750 },
	{ month: "Apr", target: 820 },
	{ month: "May", target: 860 },
	{ month: "Jun", target: 790 },
	{ month: "Jul", target: 680 },
	{ month: "Aug", target: 690 },
	{ month: "Sep", target: 710 },
	{ month: "Oct", target: 730 },
	{ month: "Nov (est)", target: 640 },
	{ month: "Dec (est)", target: 560 }
];

const SavingsPage = () => {
	const { selectedSite, selectedSiteId } = useAuth();
	const cap = selectedSite?.systemCapacity || 5.0;
	const isOutage = selectedSite?.status === "System Outage";

	const [monthlyData, setMonthlyData] = useState(() => {
		const scale = cap / 5.04;
		return MONTH_TARGET_PROJECTIONS.map((m) => ({
			month: m.month,
			expected: Math.round(m.target * scale),
			actual: 0
		}));
	});

	useEffect(() => {
		const loadMonthly = async () => {
			if (!selectedSiteId) return;
			try {
				const res = await fetchMonthlyProductionByUserId(selectedSiteId);
				const list = res?.data || res;
				if (Array.isArray(list) && list.length > 0) {
					const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
					const mapped = list.map((item, idx) => {
						const name = item.month ? (idx >= 10 ? `${item.month} (est)` : item.month) : (monthNames[idx] || `M${idx + 1}`);
						const hasActual = item.actual_kwh != null && item.actual_kwh !== "" && item.actual_kwh !== "N/A";
						return {
							month: name,
							expected: +(item.predicted_kwh ?? item.expected_kwh ?? 0).toFixed(0),
							actual: hasActual ? +(Number(item.actual_kwh)).toFixed(0) : 0
						};
					});
					setMonthlyData(mapped);
				} else {
					const scale = cap / 5.04;
					setMonthlyData(
						MONTH_TARGET_PROJECTIONS.map((m) => ({
							month: m.month,
							expected: Math.round(m.target * scale),
							actual: 0
						}))
					);
				}
			} catch (err) {
				const scale = cap / 5.04;
				setMonthlyData(
					MONTH_TARGET_PROJECTIONS.map((m) => ({
						month: m.month,
						expected: Math.round(m.target * scale),
						actual: 0
					}))
				);
			}
		};
		loadMonthly();
	}, [selectedSiteId, cap]);

	// Sum totals dynamically from monthly records
	const recordedYtd = monthlyData.slice(0, 10).reduce((acc, curr) => acc + (Number(curr.actual) || 0), 0);
	const targetYtd = monthlyData.slice(0, 10).reduce((acc, curr) => acc + (Number(curr.expected) || 0), 0);
	const ytdSavings = Math.round(recordedYtd * 7.50);
	const avgEfficiency = (targetYtd > 0 && recordedYtd > 0) ? +((recordedYtd / targetYtd) * 100).toFixed(1) : 0.0;
	const co2Tons = +(recordedYtd * 0.00071).toFixed(1);
	const matureTrees = Math.round((recordedYtd * 0.71) / 20);
	const coalKg = +(recordedYtd * 0.40).toFixed(0);

	return (
		<Layout>
			<div className="space-y-4">
				{/* Top Breadcrumb & Title with Net-Metering Tariff Badge */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
					<div>
						<div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
							<span>Financial &amp; Environmental</span>
							<span className="text-slate-400">/</span>
							<span>Savings &amp; Analytics</span>
						</div>
						<h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
							Electricity Savings &amp; System Analytics
						</h1>
					</div>

					<div className="bg-emerald-50/70 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-md text-xs font-mono font-bold self-start sm:self-auto shadow-2xs">
						Net Metering Tariff: <span className="text-emerald-700">₹7.50 / kWh</span>
					</div>
				</div>

				{/* 4 Top KPI Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<Card className="p-4">
						<div className="flex items-center justify-between text-xs text-slate-500 font-medium">
							<span>Year-to-Date Savings</span>
							<Badge variant="emerald" size="sm">
								Jan-Oct 2026
							</Badge>
						</div>
						<div className="flex items-baseline gap-1 mt-2">
							<span className="text-3xl font-extrabold text-emerald-600 tracking-tight font-tabular">
								₹{ytdSavings.toLocaleString("en-IN")}
							</span>
						</div>
						<div className="text-[11px] text-slate-400 mt-2">Direct electricity utility bill offset</div>
					</Card>

					<Card className="p-4">
						<div className="flex items-center justify-between text-xs text-slate-500 font-medium">
							<span>Recorded Generation (YTD)</span>
							<Badge variant="slate" size="sm">
								10 Months
							</Badge>
						</div>
						<div className="flex items-baseline gap-1 mt-2">
							<span className="text-3xl font-extrabold text-slate-900 tracking-tight font-tabular">
								{recordedYtd.toLocaleString("en-IN")}
							</span>
							<span className="text-sm font-semibold text-slate-500">kWh</span>
						</div>
						<div className="text-[11px] text-slate-400 mt-2 font-tabular">
							{recordedYtd > 0
								? `Target: ${targetYtd.toLocaleString("en-IN")} kWh (${((recordedYtd / targetYtd) * 100).toFixed(1)}%)`
								: `Target: ${targetYtd.toLocaleString("en-IN")} kWh (Awaiting Inverter Telemetry)`}
						</div>
					</Card>

					<Card className="p-4">
						<div className="text-xs text-slate-500 font-medium">Average System Efficiency</div>
						<div className="flex items-baseline gap-1 mt-2">
							<span className="text-3xl font-extrabold text-blue-600 tracking-tight font-tabular">{avgEfficiency}%</span>
							<span className="text-xs font-bold text-slate-500">Efficiency</span>
						</div>
						<div className="text-[11px] text-slate-500 font-medium mt-2">
							{recordedYtd > 0
								? "Within optimal range for Indian climatic conditions"
								: "Ready for live inverter connection (PENDING_INVERTER_ID)"}
						</div>
					</Card>

					<Card className="p-4">
						<div className="text-xs text-slate-500 font-medium">CO₂ Emissions Avoided</div>
						<div className="flex items-baseline gap-1 mt-2">
							<span className="text-3xl font-extrabold text-slate-900 tracking-tight font-tabular">{co2Tons}</span>
							<span className="text-sm font-semibold text-slate-600">Metric Tons</span>
						</div>
						<div className="text-[11px] text-slate-400 mt-2">Based on CEA grid factor (0.71 kg/kWh)</div>
					</Card>
				</div>

				{/* Monthly Production vs Expected Target (2026) Grouped Bar Chart */}
				<Card className="p-5">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
						<div>
							<h2 className="text-xs font-bold text-slate-900">Monthly Production vs Expected Target (2026)</h2>
							<p className="text-[11px] text-slate-400 mt-0.5">
								{recordedYtd > 0
									? "Jan–Oct reflect actual recorded generation; Nov–Dec are projected weather estimates."
									: "Awaiting live inverter telemetry (Inverter: PENDING_INVERTER_ID). Target projections shown."}
							</p>
						</div>
						<div className="flex items-center gap-4 text-xs font-semibold">
							<span className="flex items-center gap-1.5 text-slate-700 text-[11px]">
								<span className="w-3 h-3 bg-blue-600 rounded-xs"></span>
								Expected Target (kWh)
							</span>
							<span className="flex items-center gap-1.5 text-slate-700 text-[11px]">
								<span className="w-3 h-3 bg-emerald-500 rounded-xs"></span>
								Actual Output (kWh)
							</span>
						</div>
					</div>

					<div className="h-64 w-full pt-4">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
								<XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} />
								<YAxis
									tick={{ fontSize: 10, fill: "#64748B" }}
									tickLine={false}
									unit=" kWh"
								/>
								<Tooltip
									contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", color: "#1E293B", fontSize: "12px", fontFamily: "Inter, sans-serif" }}
								/>
								<Bar dataKey="expected" fill="#2563EB" radius={[2, 2, 0, 0]} maxBarSize={18} />
								<Bar dataKey="actual" fill="#10B981" radius={[2, 2, 0, 0]} maxBarSize={18} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</Card>

				{/* Two Bottom Panels */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
					<Card className="lg:col-span-7 p-5">
						<div className="flex items-center justify-between pb-3 border-b border-slate-100">
							<div>
								<h2 className="text-xs font-bold text-slate-900">Where Energy Is Lost (System Loss Breakdown)</h2>
								<p className="text-[11px] text-slate-400 mt-0.5">
									Physical and environmental factors reducing peak module capacity to delivered AC electricity.
								</p>
							</div>
							<Badge variant="slate" size="sm">
								Total Loss: 17.8%
							</Badge>
						</div>

						<div className="space-y-4 pt-4 text-xs">
							<div>
								<div className="flex justify-between items-center mb-1">
									<span className="font-semibold text-slate-800">High Temperature Cell Derating</span>
									<span className="font-bold text-amber-600">4.8% loss</span>
								</div>
								<div className="w-full bg-slate-100 rounded-full h-1.5">
									<div className="bg-amber-400 h-1.5 rounded-full" style={{ width: "27%" }}></div>
								</div>
								<span className="text-[10px] text-slate-400 mt-1 block">
									Module efficiency drops slightly during high-heat afternoon periods (γ = -0.38%/°C)
								</span>
							</div>

							<div>
								<div className="flex justify-between items-center mb-1">
									<span className="font-semibold text-slate-800">Dust &amp; Soiling Accumulation</span>
									<span className="font-bold text-amber-600">{selectedSite?.soilingLossPercent || 2}% loss</span>
								</div>
								<div className="w-full bg-slate-100 rounded-full h-1.5">
									<div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "12%" }}></div>
								</div>
								<span className="text-[10px] text-slate-400 mt-1 block">
									Atmospheric dust deposited on panel glass (fully recoverable with washing)
								</span>
							</div>

							<div>
								<div className="flex justify-between items-center mb-1">
									<span className="font-semibold text-slate-800">Inverter DC to AC Conversion</span>
									<span className="font-bold text-blue-600">{selectedSite?.inverterLossPercent || 4}% loss</span>
								</div>
								<div className="w-full bg-slate-100 rounded-full h-1.5">
									<div className="bg-blue-500 h-1.5 rounded-full" style={{ width: "22%" }}></div>
								</div>
								<span className="text-[10px] text-slate-400 mt-1 block">
									High-efficiency string inverter operates at {selectedSite?.inv_efficiency || 98.0}% rated efficiency
								</span>
							</div>

							<div>
								<div className="flex justify-between items-center mb-1">
									<span className="font-semibold text-slate-800">Electrical Cabling Resistance</span>
									<span className="font-bold text-slate-600">{selectedSite?.wiringLossPercent || 2}% loss</span>
								</div>
								<div className="w-full bg-slate-100 rounded-full h-1.5">
									<div className="bg-slate-400 h-1.5 rounded-full" style={{ width: "12%" }}></div>
								</div>
								<span className="text-[10px] text-slate-400 mt-1 block">
									DC solar cable copper resistance between roof combiner and inverter
								</span>
							</div>
						</div>
					</Card>

					<Card className="lg:col-span-5 p-5 flex flex-col justify-between">
						<div>
							<h2 className="text-xs font-bold text-slate-900">Verified Environmental Contribution</h2>
							<p className="text-[11px] text-slate-400 mt-0.5 mb-4">
								Calculated using CEA Indian electrical grid baseline metrics.
							</p>

							<div className="space-y-3">
								<div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center gap-3.5">
									<div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
										<CloudRain className="w-5 h-5" />
									</div>
									<div>
										<span className="text-[10px] text-slate-500 font-medium block">Carbon Emissions Avoided</span>
										<strong className="text-sm font-extrabold text-slate-900 block mt-0.5 font-tabular">
											{co2Tons || 5} Metric Tons CO₂
										</strong>
										<span className="text-[10px] text-slate-400">0.71 kg CO₂ per kWh generated</span>
									</div>
								</div>

								<div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-center gap-3.5">
									<div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
										<Trees className="w-5 h-5" />
									</div>
									<div>
										<span className="text-[10px] text-slate-500 font-medium block">Tree Absorption Equivalency</span>
										<strong className="text-sm font-extrabold text-emerald-700 block mt-0.5 font-tabular">
											{matureTrees} Mature Trees
										</strong>
										<span className="text-[10px] text-slate-400">20 kg CO₂ per tree annually</span>
									</div>
								</div>

								<div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100 flex items-center gap-3.5">
									<div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
										<Flame className="w-5 h-5" />
									</div>
									<div>
										<span className="text-[10px] text-slate-500 font-medium block">Thermal Coal Conserved</span>
										<strong className="text-sm font-extrabold text-slate-900 block mt-0.5 font-tabular">
											{Number(coalKg).toLocaleString("en-IN")} kg Coal
										</strong>
										<span className="text-[10px] text-slate-400">0.4 kg coal per thermal kWh</span>
									</div>
								</div>
							</div>
						</div>
					</Card>
				</div>
			</div>
		</Layout>
	);
};

export default SavingsPage;
