import TopNav from "./TopNav";
import Footer from "./Footer";
import { Outlet } from "react-router-dom";

const Layout = ({ children, fullBleed = false, darkFooter = false }) => {
	return (
		<div className="min-h-screen flex flex-col bg-[#F4F7FB] text-slate-800 antialiased font-sans">
			<TopNav />
			{fullBleed ? (
				<main className="flex-1 w-full flex flex-col">
					{children || <Outlet />}
				</main>
			) : (
				<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
					{children || <Outlet />}
				</main>
			)}
			<Footer dark={darkFooter} />
		</div>
	);
};

export default Layout;
