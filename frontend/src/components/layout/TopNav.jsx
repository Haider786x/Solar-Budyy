import { useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, formatLocationString } from "../../context/AuthContext";
import { useDemo } from "../../context/DemoContext";
import {
	ChevronDown,
	LogOut,
	Check,
	Sliders,
	Plus,
	Lock,
	X,
	ShieldAlert,
	Menu
} from "lucide-react";

const TopNav = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const {
		user,
		isAuthenticated,
		isAdmin,
		activeRole,
		switchRole,
		adminLogin,
		selectedSite,
		selectSite,
		fleetSites,
		logout
	} = useAuth();
	const { isDemoActive, demoSettings } = useDemo();

	const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const siteDropdownRef = useRef(null);

	// Close mobile menu on route change
	useEffect(() => {
		setMobileMenuOpen(false);
	}, [location.pathname]);

	// Admin authorization elevation modal
	const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
	const [adminPasswordInput, setAdminPasswordInput] = useState("");
	const [adminAuthError, setAdminAuthError] = useState("");
	const [adminAuthLoading, setAdminAuthLoading] = useState(false);

	// Close site dropdown on outside click
	useEffect(() => {
		const handleClickOutside = (e) => {
			if (siteDropdownRef.current && !siteDropdownRef.current.contains(e.target)) {
				setSiteDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleLogout = async () => {
		await logout();
		navigate("/login");
	};

	const handleRoleSwitch = (targetRole) => {
		if (targetRole === "admin") {
			if (isAdmin) return;
			// Require password verification to switch from site owner / customer to fleet admin
			setAdminPasswordInput("");
			setAdminAuthError("");
			setShowAdminAuthModal(true);
		} else {
			// Switch back to customer view directly
			switchRole("user");
		}
	};

	const handleAdminVerify = async (e) => {
		e.preventDefault();
		setAdminAuthLoading(true);
		setAdminAuthError("");
		try {
			await adminLogin("admin@solarbuddy.internal", adminPasswordInput);
			setShowAdminAuthModal(false);
		} catch (err) {
			setAdminAuthError(err.message || "Invalid administrator password. Access denied.");
		} finally {
			setAdminAuthLoading(false);
		}
	};

	// Navigation items by role matching reference screenshots
	const customerNav = [
		{ label: "Overview", to: "/" },
		{ label: "Energy", to: "/energy" },
		{ label: "Solar System", to: "/solar-system" },
		{ label: "Alerts", to: "/alerts" },
		{ label: "Savings", to: "/savings" },
		{ label: "Reports", to: "/reports" }
	];

	const adminNav = [
		{ label: "Overview", to: "/" },
		{ label: "Energy", to: "/energy" },
		{ label: "Solar System", to: "/solar-system" },
		{ label: "Installations", to: "/installations" },
		{ label: "Alerts", to: "/alerts" },
		{ label: "Analytics", to: "/analytics" },
		{ label: "Reports", to: "/reports" }
	];

	const navItems = isAdmin ? adminNav : customerNav;

	return (
		<header className="sticky top-0 z-50 bg-[#0B1528] border-b border-slate-800 text-white select-none backdrop-blur-md shadow-xs">
			<div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6">
				<div className="flex items-center justify-between h-14 gap-4">
					{/* Left: Brand Logo & Monitored Site Pill */}
					<div className="flex items-center gap-3 shrink-0">
						<Link to="/" className="flex items-center group py-0.5" title="SolarBuddy">
							<img
								src="/solarbuddy-logo-white-text.png"
								alt="SolarBuddy"
								className="h-8 w-auto object-contain transition-opacity group-hover:opacity-95"
							/>
						</Link>

						{/* Site Selector Dropdown */}
						{isAuthenticated && (
							<div className="relative" ref={siteDropdownRef}>
								<button
									type="button"
									onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
									className="flex items-center gap-2 bg-[#141E33] hover:bg-[#1C2A44] border border-slate-700/70 rounded-md px-2.5 py-1 text-xs text-slate-200 transition-all shadow-2xs"
									title="Monitored solar installation"
								>
									<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
									<span className="text-slate-400 font-normal">Site:</span>
									<span className="font-semibold text-slate-100 max-w-[150px] truncate">
										{selectedSite?.shortName || selectedSite?.name || "Haider Rooftop"}
									</span>
									<ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${siteDropdownOpen ? "rotate-180" : ""}`} />
								</button>

								{siteDropdownOpen && (
									<div className="absolute left-0 mt-1.5 w-72 bg-[#1E293B] border border-slate-700 rounded-md shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
										<div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/60">
											Monitored Installations ({fleetSites.length})
										</div>
										<div className="max-h-60 overflow-y-auto">
											{fleetSites.map((site) => (
												<button
													key={site.id}
													type="button"
													onClick={() => {
														selectSite(site.id);
														setSiteDropdownOpen(false);
													}}
													className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#2D3B52] transition-colors ${
														selectedSite?.id === site.id ? "bg-[#253248] text-blue-400 font-semibold" : "text-slate-200"
													}`}
												>
													<div className="flex flex-col truncate pr-2">
														<span className="truncate">{site.shortName || site.name}</span>
														<span className="text-[10px] text-slate-400">
															{typeof site.location === "string" ? site.location : formatLocationString(site.location, "Lucknow, India")} • {site.systemCapacity} kWp
														</span>
													</div>
													{selectedSite?.id === site.id && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
												</button>
											))}
										</div>

										<div className="border-t border-slate-700/60 p-2 bg-[#172233]">
											<Link
												to="/register"
												onClick={() => setSiteDropdownOpen(false)}
												className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-2xs"
											>
												<Plus className="w-3.5 h-3.5" />
												<span>Add Monitored Site</span>
											</Link>
										</div>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Center: Navigation Links - Perfectly justified, no line wrapping */}
					{isAuthenticated ? (
						<nav className="hidden lg:flex items-center justify-center space-x-1 xl:space-x-2 h-14 flex-1">
							{navItems.map((item) => {
								const isActive = location.pathname === item.to || (item.to === "/" && location.pathname === "/overview");
								return (
									<NavLink
										key={item.label}
										to={item.to}
										className={`px-3 h-14 flex items-center text-xs tracking-normal transition-colors relative whitespace-nowrap ${
											isActive
												? "text-white font-bold border-b-2 border-[#EF4444]"
												: "text-slate-300 hover:text-white font-medium"
										}`}
									>
										{item.label}
									</NavLink>
								);
							})}
						</nav>
					) : (
						<div className="flex-1" />
					)}

					{/* Right: Authenticated User Controls */}
					{isAuthenticated ? (
						<div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
							{/* Role Pill Switcher */}
							<div className="flex items-center bg-[#141E33] border border-slate-700/80 rounded-md p-0.5 text-xs">
								<button
									type="button"
									onClick={() => handleRoleSwitch("user")}
									className={`px-2.5 py-0.5 rounded text-xs transition-all font-medium ${
										!isAdmin ? "bg-blue-600 text-white font-semibold shadow-xs" : "text-slate-300 hover:text-white"
									}`}
									title="Switch to Customer view"
								>
									Customer
								</button>
								<button
									type="button"
									onClick={() => handleRoleSwitch("admin")}
									className={`px-2.5 py-0.5 rounded text-xs transition-all font-medium ${
										isAdmin ? "bg-blue-600 text-white font-semibold shadow-xs" : "text-slate-300 hover:text-white"
									}`}
									title={isAdmin ? "Fleet Administrator view" : "Switch to Admin (Password verification required)"}
								>
									Admin
								</button>
							</div>

							<div className="h-4 w-px bg-slate-800 hidden sm:block" />

							{/* User Identity Chip with Avatar */}
							<div className="flex items-center gap-2 bg-[#141E33]/70 border border-slate-800 rounded-md px-2 py-1">
								<div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
									{isAdmin ? "A" : (user?.name?.[0]?.toUpperCase() || "H")}
								</div>
								<div className="hidden xl:flex flex-col text-left leading-none">
									<span className="text-xs font-semibold text-slate-100 max-w-[125px] truncate">
										{isAdmin ? (user?.name || "Haider-admin") : (user?.name || "Haider (Home)")}
									</span>
									<span className="text-[10px] text-slate-400 mt-0.5">
										{isAdmin ? "Fleet Operations Admin" : "Site Owner"}
									</span>
								</div>
							</div>

							{/* Settings Shortcut */}
							<Link
								to="/settings"
								className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-[#1E293B] border border-transparent hover:border-slate-700/60 transition-colors"
								title="Inverter Telemetry & System Settings"
							>
								<Sliders className="w-3.5 h-3.5" />
							</Link>

							{/* Sign Out Button */}
							<button
								type="button"
								onClick={handleLogout}
								className="text-slate-400 hover:text-rose-400 p-1.5 rounded-md hover:bg-[#1E293B] border border-transparent hover:border-slate-700/60 transition-colors"
								title="Sign Out of SolarBuddy"
							>
								<LogOut className="w-3.5 h-3.5" />
							</button>

							{/* Mobile Menu Toggle Button */}
							<button
								type="button"
								onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
								className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-[#1E293B] border border-transparent hover:border-slate-700/60 transition-colors"
								title="Toggle navigation menu"
								aria-label="Toggle navigation menu"
							>
								{mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
							</button>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<Link
								to="/login"
								className="text-slate-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
							>
								Sign In
							</Link>
							<Link
								to="/register"
								className="bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
							>
								Sign Up
							</Link>
						</div>
					)}
				</div>

				{/* Mobile Collapsible Navigation Menu */}
				{isAuthenticated && mobileMenuOpen && (
					<nav className="lg:hidden border-t border-slate-800 py-2.5 px-1 space-y-1 animate-in slide-in-from-top-2 duration-150">
						{navItems.map((item) => {
							const isActive = location.pathname === item.to || (item.to === "/" && location.pathname === "/overview");
							return (
								<NavLink
									key={item.label}
									to={item.to}
									onClick={() => setMobileMenuOpen(false)}
									className={`block px-3 py-2 rounded-md text-xs tracking-normal transition-colors ${
										isActive
											? "bg-blue-600 text-white font-bold"
											: "text-slate-300 hover:bg-[#141E33] hover:text-white font-medium"
									}`}
								>
									{item.label}
								</NavLink>
							);
						})}
					</nav>
				)}
			</div>

			{/* Admin Elevation Password Modal */}
			{showAdminAuthModal && (
				<div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
					<div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full p-5 text-white space-y-4 animate-in fade-in zoom-in-95 duration-150">
						<div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
							<div className="flex items-center gap-2">
								<div className="w-7 h-7 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
									<Lock className="w-4 h-4" />
								</div>
								<h3 className="text-xs font-bold text-white">Administrator Authorization</h3>
							</div>
							<button
								type="button"
								onClick={() => setShowAdminAuthModal(false)}
								className="text-slate-400 hover:text-white p-1 rounded"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<p className="text-xs text-slate-300 leading-relaxed">
							Elevating to <strong>Fleet Operations Admin</strong> requires administrator password verification.
						</p>

						{adminAuthError && (
							<div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
								<ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
								<span>{adminAuthError}</span>
							</div>
						)}

						<form onSubmit={handleAdminVerify} className="space-y-3">
							<div>
								<label className="block text-[11px] font-medium text-slate-400 mb-1">
									Admin Identity
								</label>
								<input
									type="text"
									readOnly
									value="admin@solarbuddy.internal"
									className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 font-mono select-none"
								/>
							</div>

							<div>
								<div className="flex items-center justify-between mb-1">
									<label className="block text-[11px] font-medium text-slate-400">
										Administrator Password
									</label>
									<span className="text-[10px] text-slate-400">
										Default: <code className="bg-slate-800 text-blue-300 px-1 py-0.5 rounded font-bold">AdminSolarBuddy2026!</code>
									</span>
								</div>
								<input
									type="password"
									autoFocus
									required
									value={adminPasswordInput}
									onChange={(e) => setAdminPasswordInput(e.target.value)}
									placeholder="Enter administrator password"
									className="w-full bg-[#0F172A] border border-slate-600 focus:border-blue-500 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
								/>
							</div>

							<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/80">
								<button
									type="button"
									onClick={() => setShowAdminAuthModal(false)}
									className="px-3 py-1.5 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={adminAuthLoading}
									className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5"
								>
									{adminAuthLoading ? "Verifying..." : "Verify & Elevate"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</header>
	);
};

export default TopNav;
