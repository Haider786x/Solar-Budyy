import { useState, useEffect } from "react";
import Layout from "../components/layout/Layout";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useDemo } from "../context/DemoContext";
import {
	Sliders,
	ShieldCheck,
	Cpu,
	CheckCircle2,
	Save,
	Info,
	Lock
} from "lucide-react";

const SettingsPage = () => {
	const { isAdmin, selectedSite, switchRole } = useAuth();
	const { demoSettings, setDemoEnabled, setTolerance, refreshDemoTelemetry } = useDemo();

	const [enabled, setEnabled] = useState(demoSettings.enabled);
	const [tolerance, setToleranceVal] = useState(demoSettings.toleranceKwh);
	const [saving, setSaving] = useState(false);
	const [saveMessage, setSaveMessage] = useState("");

	useEffect(() => {
		setEnabled(demoSettings.enabled);
		setToleranceVal(demoSettings.toleranceKwh);
	}, [demoSettings.enabled, demoSettings.toleranceKwh]);

	const handleToggle = async (e) => {
		if (!isAdmin) return;
		const nextVal = e.target.checked;
		setEnabled(nextVal);
		setSaving(true);
		setSaveMessage("");

		try {
			const res = await setDemoEnabled(nextVal);
			if (res?.success === false) {
				throw new Error(res.error || "Update failed");
			}
			await refreshDemoTelemetry();
			setSaveMessage(`Inverter Telemetry Stream ${nextVal ? "ENABLED" : "DISABLED"} successfully!`);
		} catch (err) {
			setSaveMessage(`Failed to update: ${err.message}`);
		} finally {
			setSaving(false);
			setTimeout(() => setSaveMessage(""), 4000);
		}
	};

	const handleSave = async (e) => {
		e.preventDefault();
		if (!isAdmin) return;
		setSaving(true);
		setSaveMessage("");

		try {
			await setDemoEnabled(enabled);
			await setTolerance(Number(tolerance));
			await refreshDemoTelemetry();
			setSaveMessage("Settings saved successfully! Telemetry stream configuration updated.");
		} catch (err) {
			setSaveMessage(`Failed to save: ${err.message}`);
		} finally {
			setSaving(false);
			setTimeout(() => setSaveMessage(""), 4000);
		}
	};

	const effectiveInverterId = selectedSite?.inverterSerialNumber || "SOL-INV-5000H-780609";

	return (
		<Layout>
			<div className="space-y-4 max-w-4xl mx-auto">
				{/* Breadcrumb & Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
					<div>
						<div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
							<span>System Administration</span>
							<span className="text-slate-400">/</span>
							<span>Telemetry &amp; Hardware Configuration</span>
						</div>
						<h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
							Inverter Telemetry &amp; System Settings
						</h1>
					</div>

					<div className="flex items-center gap-2">
						{isAdmin ? (
							<Badge variant="emerald" size="sm">
								<ShieldCheck className="w-3.5 h-3.5 mr-1 inline" />
								Admin Access
							</Badge>
						) : (
							<Badge variant="slate" size="sm">
								<Lock className="w-3.5 h-3.5 mr-1 text-slate-400 inline" />
								Read-Only View
							</Badge>
						)}
					</div>
				</div>

				{/* Non-admin notice */}
				{!isAdmin && (
					<div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<Lock className="w-4 h-4 text-amber-600 shrink-0" />
							<span>
								Administrative privileges required to modify hardware telemetry parameters. Switch to <strong>Admin</strong> in the top navigation bar to adjust configuration.
							</span>
						</div>
						<Button
							variant="secondary"
							size="xs"
							onClick={() => switchRole("admin")}
						>
							Switch to Admin
						</Button>
					</div>
				)}

				{saveMessage && (
					<div
						className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 border ${
							saveMessage.includes("Failed")
								? "bg-rose-50 border-rose-200 text-rose-800"
								: "bg-emerald-50 border-emerald-200 text-emerald-800"
						}`}
					>
						<CheckCircle2 className="w-4 h-4 shrink-0" />
						<span>{saveMessage}</span>
					</div>
				)}

				<form onSubmit={handleSave} className="space-y-4">
					{/* Primary Settings Card: Real-Time Inverter Telemetry Stream */}
					<Card className="p-5">
						<div className="flex items-center justify-between pb-3 border-b border-slate-100">
							<div className="flex items-center gap-2.5">
								<div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
									<Cpu className="w-4 h-4 stroke-[2.5]" />
								</div>
								<div>
									<h2 className="text-sm font-bold text-slate-900">Inverter Telemetry Stream</h2>
									<p className="text-[11px] text-slate-400 mt-0.5">
										Stream real-time solar inverter data synchronized with atmospheric irradiance models.
									</p>
								</div>
							</div>

							{/* Toggle Switch */}
							<label className={`relative inline-flex items-center select-none ${isAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
								<input
									type="checkbox"
									checked={enabled}
									onChange={handleToggle}
									disabled={!isAdmin || saving}
									className="sr-only peer"
								/>
								<div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
								<span className="ml-2 text-xs font-bold text-slate-700">
									{enabled ? (
										<span className="text-blue-600">ACTIVE</span>
									) : (
										<span className="text-slate-400">STANDBY</span>
									)}
								</span>
							</label>
						</div>

						{/* Configuration Details */}
						<div className="pt-4 space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs">
									<label className="text-[11px] font-bold text-slate-700 block mb-1">
										Inverter Hardware Serial
									</label>
									<div className="flex items-center gap-2 mt-1">
										<input
											type="text"
											readOnly
											value={effectiveInverterId}
											className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900 text-xs w-full"
										/>
										<Badge variant="emerald" size="sm">
											Bound
										</Badge>
									</div>
									<p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
										Inverter identifier synchronized across telemetry sections.
									</p>
								</div>

								<div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs">
									<label className="text-[11px] font-bold text-slate-700 block mb-1">
										Irradiance Variance Tolerance
									</label>
									<div className="flex items-center gap-2 mt-1">
										<input
											type="number"
											step="0.1"
											min="0.1"
											max="10.0"
											value={tolerance}
											disabled={!isAdmin || saving}
											onChange={(e) => setToleranceVal(parseFloat(e.target.value) || 2.0)}
											className={`bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900 text-xs w-28 font-tabular ${!isAdmin ? "cursor-not-allowed bg-slate-100" : ""}`}
										/>
										<span className="text-xs font-semibold text-slate-600">± kWh</span>
									</div>
									<p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
										Permitted variation around today's predicted daily yield.
									</p>
								</div>
							</div>

							{/* Time-Awareness Notice */}
							<div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2.5">
								<Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
								<div className="space-y-1">
									<span className="font-bold block">Time-based accumulation</span>
									<p className="text-[11px] text-blue-800 leading-relaxed">
										Current generation reflects energy accumulated strictly up to the current minute in{" "}
										<strong className="font-semibold">Asia/Kolkata</strong> timezone.
									</p>
								</div>
							</div>

							{/* Real Hardware Priority Notice */}
							<div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 flex items-start gap-2.5">
								<ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
								<div>
									<span className="font-bold block text-slate-900">Inverter Telemetry Status</span>
									<p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
										Current site:{" "}
										<span className="text-emerald-700 font-bold">
											Inverter Bound ({effectiveInverterId}) — Real-time telemetry transmitting.
										</span>
									</p>
								</div>
							</div>
						</div>

						{/* Action Save Button */}
						{isAdmin && (
							<div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
								<span className="text-[11px] text-slate-400">
									Configuration persists in database across sessions.
								</span>
								<Button
									type="submit"
									variant="primary"
									size="sm"
									loading={saving}
									icon={Save}
								>
									Save Settings
								</Button>
							</div>
						)}
					</Card>
				</form>
			</div>
		</Layout>
	);
};

export default SettingsPage;
