const fs = require("fs");
const path = require("path");

const frontendDir = path.join(__dirname, "../../frontend/src");

// 1. OverviewPage.jsx
const overviewPath = path.join(frontendDir, "pages/OverviewPage.jsx");
let overview = fs.readFileSync(overviewPath, "utf-8");

if (!overview.includes("useDemo")) {
	overview = overview.replace(
		'import { useAuth, formatLocationString } from "../context/AuthContext";',
		'import { useAuth, formatLocationString } from "../context/AuthContext";\nimport { useDemo } from "../context/DemoContext";'
	);

	overview = overview.replace(
		'const { selectedSite, selectedSiteId } = useAuth();',
		'const { selectedSite, selectedSiteId } = useAuth();\n\tconst { isDemoActive, demoTelemetry } = useDemo();'
	);

	overview = overview.replace(
		'const isPendingHardware = site?.inverterSerialNumber === "PENDING_INVERTER_ID" || !site?.inverterSerialNumber;',
		'const isPendingHardware = !isDemoActive && (site?.inverterSerialNumber === "PENDING_INVERTER_ID" || !site?.inverterSerialNumber);\n\tconst effectiveInverterId = isDemoActive ? demoTelemetry.demoInverterId : (site?.inverterSerialNumber || "PENDING_INVERTER_ID");'
	);

	overview = overview.replace(
		'const energyToday = isOutage ? 0 : (isPendingHardware ? (site?.todayGeneratedKwh || 0.0) : +(cap * 4.76).toFixed(1));',
		'const energyToday = isOutage ? 0 : isDemoActive ? demoTelemetry.cumulativeEnergyKwh : (isPendingHardware ? (site?.todayGeneratedKwh || 0.0) : +(cap * 4.76).toFixed(1));'
	);

	overview = overview.replace(
		'const targetToday = +(cap * 4.88).toFixed(1);',
		'const targetToday = isDemoActive ? demoTelemetry.predictedDailyKwh : +(cap * 4.88).toFixed(1);'
	);

	fs.writeFileSync(overviewPath, overview, "utf-8");
	console.log("Patched OverviewPage.jsx successfully!");
}

// 2. EnergyPage.jsx
const energyPath = path.join(frontendDir, "pages/EnergyPage.jsx");
let energy = fs.readFileSync(energyPath, "utf-8");

if (!energy.includes("useDemo")) {
	energy = energy.replace(
		'import { useAuth } from "../context/AuthContext";',
		'import { useAuth } from "../context/AuthContext";\nimport { useDemo } from "../context/DemoContext";'
	);

	energy = energy.replace(
		'const { selectedSite, selectedSiteId } = useAuth();',
		'const { selectedSite, selectedSiteId } = useAuth();\n\tconst { isDemoActive, demoTelemetry } = useDemo();'
	);

	energy = energy.replace(
		'const isPendingHardware = selectedSite?.inverterSerialNumber === "PENDING_INVERTER_ID" || !selectedSite?.inverterSerialNumber;',
		'const isPendingHardware = !isDemoActive && (selectedSite?.inverterSerialNumber === "PENDING_INVERTER_ID" || !selectedSite?.inverterSerialNumber);'
	);

	energy = energy.replace(
		'const actualKwh = isOutage ? 0 : (isPendingHardware ? (selectedSite?.todayGeneratedKwh || 0.0) : +(cap * 4.76).toFixed(1));',
		'const actualKwh = isOutage ? 0 : isDemoActive ? demoTelemetry.cumulativeEnergyKwh : (isPendingHardware ? (selectedSite?.todayGeneratedKwh || 0.0) : +(cap * 4.76).toFixed(1));'
	);

	energy = energy.replace(
		'const expectedKwh = +(cap * 4.88).toFixed(1);',
		'const expectedKwh = isDemoActive ? demoTelemetry.predictedDailyKwh : +(cap * 4.88).toFixed(1);'
	);

	fs.writeFileSync(energyPath, energy, "utf-8");
	console.log("Patched EnergyPage.jsx successfully!");
}

// 3. SolarSystemPage.jsx
const solarSysPath = path.join(frontendDir, "pages/SolarSystemPage.jsx");
let solarSys = fs.readFileSync(solarSysPath, "utf-8");

if (!solarSys.includes("useDemo")) {
	solarSys = solarSys.replace(
		'import { useAuth } from "../context/AuthContext";',
		'import { useAuth } from "../context/AuthContext";\nimport { useDemo } from "../context/DemoContext";'
	);

	solarSys = solarSys.replace(
		'const { selectedSite, selectedSiteId } = useAuth();',
		'const { selectedSite, selectedSiteId } = useAuth();\n\tconst { isDemoActive, demoTelemetry } = useDemo();'
	);

	fs.writeFileSync(solarSysPath, solarSys, "utf-8");
	console.log("Patched SolarSystemPage.jsx successfully!");
}

console.log("Frontend patching complete!");
