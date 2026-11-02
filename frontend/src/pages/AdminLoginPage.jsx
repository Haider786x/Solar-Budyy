import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminLoginPage = () => {
	const navigate = useNavigate();
	const { adminLogin } = useAuth();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (!email.trim() || !password) {
			setError("Please provide administrator credentials.");
			return;
		}

		try {
			setLoading(true);
			await adminLogin(email.trim(), password);
			navigate("/", { replace: true });
		} catch (err) {
			setError(err.message || "Administrator authentication failed.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
			<div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
				<div className="inline-flex items-center gap-2.5 mb-3">
					<div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
						<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
						</svg>
					</div>
					<span className="text-2xl font-black tracking-tight text-white">SolarBuddy</span>
				</div>
				<h2 className="text-xl font-bold text-white tracking-tight">
					Administrator Portal
				</h2>
				<p className="mt-1 text-sm text-slate-400">
					Fleet-wide solar infrastructure management & incident response
				</p>
			</div>

			<div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
				<div className="bg-slate-800 py-8 px-6 shadow-xl border border-slate-700 rounded-2xl sm:px-10">
					{error && (
						<div className="mb-6 p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-sm flex items-start gap-3">
							<svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div className="flex-1">
								{error}
								{error.includes("Access restricted") && (
									<div className="mt-2">
										<Link
											to="/login"
											className="font-bold underline text-red-200 hover:text-white"
										>
											Go to Customer Sign In →
										</Link>
									</div>
								)}
							</div>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
								Admin Email
							</label>
							<input
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="admin@solarbuddy.internal"
								className="w-full px-3.5 py-2.5 rounded-xl border border-slate-600 bg-slate-900 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
							/>
						</div>

						<div>
							<label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
								Master Password
							</label>
							<input
								type="password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								className="w-full px-3.5 py-2.5 rounded-xl border border-slate-600 bg-slate-900 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
							/>
						</div>

						<div className="pt-2">
							<button
								type="submit"
								disabled={loading}
								className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all shadow-md shadow-indigo-600/30 disabled:opacity-60"
							>
								{loading ? "Authenticating Session..." : "Authorize System Access"}
							</button>
						</div>

						<div className="pt-4 border-t border-slate-700 text-center">
							<Link to="/login" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
								← Return to Customer Sign In
							</Link>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default AdminLoginPage;
