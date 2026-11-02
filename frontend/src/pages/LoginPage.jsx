import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/layout/Layout";
import { Sun, Mail, Lock, User, ShieldCheck, ArrowRight } from "lucide-react";

const LoginPage = () => {
	const navigate = useNavigate();
	const { login, adminLogin, switchRole } = useAuth();

	// Role tab state: 'customer' vs 'admin'
	const [activeTab, setActiveTab] = useState("customer");

	// Form inputs
	const [email, setEmail] = useState("lordxgrimx786@gmail.com");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleTabChange = (tab) => {
		setActiveTab(tab);
		setError("");
		if (tab === "admin") {
			setEmail("admin@solarbuddy.internal");
			setPassword("");
		} else {
			setEmail("lordxgrimx786@gmail.com");
			setPassword("");
		}
	};

	const handleSubmit = async (e) => {
		e?.preventDefault();
		if (!email || !password) {
			setError("Please enter both email and password.");
			return;
		}
		setLoading(true);
		setError("");

		try {
			if (activeTab === "admin") {
				await adminLogin(email, password);
				switchRole("admin");
			} else {
				await login(email, password);
				switchRole("user");
			}
			navigate("/");
		} catch (err) {
			setError(err.message || "Failed to sign in. Please verify credentials.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Layout fullBleed darkFooter>
			<div
				className="flex-1 w-full min-h-[calc(100vh-3.5rem-3.5rem)] flex items-center justify-center py-12 px-4 sm:px-6 bg-cover bg-center bg-no-repeat relative"
				style={{
					backgroundImage: `linear-gradient(rgba(11, 21, 40, 0.62), rgba(11, 21, 40, 0.78)), url('/login-bg.jpg')`
				}}
			>
				<div className="w-full max-w-md flex flex-col items-center">
					{/* Brand Logo Header */}
					<img
						src="/solarbuddy-logo-white-text.png"
						alt="SolarBuddy"
						className="h-12 w-auto object-contain mb-3 drop-shadow-md"
					/>

					<h1 className="text-xl font-bold text-white tracking-tight text-center drop-shadow-sm">
						Sign In to SolarBuddy
					</h1>
					<p className="text-xs text-slate-200 mt-1 mb-5 text-center max-w-sm drop-shadow-xs">
						Enterprise solar energy monitoring and performance analytics portal
					</p>

					{/* Main Auth Card */}
					<div className="w-full bg-white border border-slate-200/90 rounded-xl shadow-2xl p-6 space-y-4">
					{/* Top Segmented Control: Sign In vs Create Account */}
					<div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
						<button
							type="button"
							className="py-1.5 rounded-md bg-white text-slate-900 shadow-xs text-center font-bold"
						>
							Sign In
						</button>
						<Link
							to="/register"
							className="py-1.5 rounded-md text-slate-600 hover:text-slate-900 text-center flex items-center justify-center gap-1 font-medium"
						>
							<User className="w-3.5 h-3.5 text-slate-500" />
							Create Account
						</Link>
					</div>

					{/* Role Selector Tabs: Customer Access vs Fleet Administrator */}
					<div className="grid grid-cols-2 gap-2 text-xs font-medium">
						<button
							type="button"
							onClick={() => handleTabChange("customer")}
							className={`py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all ${
								activeTab === "customer"
									? "bg-[#2563EB] text-white font-semibold shadow-xs"
									: "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
							}`}
						>
							<User className="w-3.5 h-3.5" />
							Customer Access
						</button>
						<button
							type="button"
							onClick={() => handleTabChange("admin")}
							className={`py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all ${
								activeTab === "admin"
									? "bg-[#2563EB] text-white font-semibold shadow-xs"
									: "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
							}`}
						>
							<ShieldCheck className="w-3.5 h-3.5" />
							Fleet Administrator
						</button>
					</div>

					{error && (
						<div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded text-xs">
							{error}
						</div>
					)}

					{/* Login Form */}
					<form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">
								Authorized Account Email
							</label>
							<div className="relative">
								<Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
								<input
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
									placeholder="email@domain.com"
								/>
							</div>
						</div>

						<div>
							<div className="flex items-center justify-between mb-1">
								<label className="block text-xs font-medium text-slate-700">
									Security Password
								</label>
								<span className="text-[10px] text-slate-400">
									Default: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold">{activeTab === "admin" ? "AdminSolarBuddy2026!" : "UserSolarBuddy2026!"}</code>
								</span>
							</div>
							<div className="relative">
								<Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
								<input
									type="password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
									placeholder={activeTab === "admin" ? "Enter password (e.g. AdminSolarBuddy2026!)" : "Enter password (e.g. UserSolarBuddy2026!)"}
								/>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-[#2563EB] hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors mt-2"
						>
							{loading ? (
								"Authenticating..."
							) : activeTab === "admin" ? (
								<>
									Sign In to Fleet Console
									<ArrowRight className="w-3.5 h-3.5 ml-1" />
								</>
							) : (
								<>
									Sign In to Site Portal
									<ArrowRight className="w-3.5 h-3.5 ml-1" />
								</>
							)}
						</button>
					</form>

					{/* Register Link */}
					<div className="text-center pt-1 pb-1">
						<span className="text-[11px] text-slate-500">Don't have a solar account? </span>
						<Link
							to="/register"
							className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
						>
							Sign Up &amp; Register Installation
						</Link>
					</div>
				</div>
				</div>
			</div>
		</Layout>
	);
};

export default LoginPage;
