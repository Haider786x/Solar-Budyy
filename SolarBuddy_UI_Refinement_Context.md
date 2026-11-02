# SolarBuddy & Solis — Master UI Refinement Context & Roadmap

> **Document Status:** Active & Maintained  
> **Repository Root:** `D:\webdev\project\minor project\Solar Budyy`  
> **Current Branch:** `main`  
> **Current HEAD:** `f2631a0` (*Harden auth and rebrand AI assistant to Solis*)  
> **Rollback Points:**  
> - Branch: `rollback-phase0-baseline` (`d8ddae7`) — pre-Solis / baseline recovery point  
> - Tag: `phase0-solis-initial` (`f2631a0`) — initial Solis & auth hardening commit  

---

## 1. Discrepancy Log

| # | Item / File | Previous Session Claim | Real Code Reality | Action / Resolution |
|---|---|---|---|---|
| **D-01** | `SolarBuddyAIChatWidget.jsx` syntax check | Failed with `The token '&&' is not a valid statement separator` | Caused by PowerShell `&&` syntax parser error in CLI, not JavaScript syntax error. JavaScript source is 100% valid (696 lines, clean syntax). | Verified using Node.js script. Passes all 8 assertions. |
| **D-02** | Git commit failure (`index.lock`) | Failed with `Unable to create '.../.git/index.lock': Permission denied` | Standard sandbox blocks write operations to hidden `.git/` folder on Windows to prevent tampering. Git commands that alter `.git/` require elevated permission (`BypassSandbox: true`). | Confirmed root cause; rollback branch created with `BypassSandbox: true`; user executed commit `f2631a0` directly. |
| **D-03** | Solis logo asset | Status uncertain in prior report | Asset exists at `frontend/public/solis-logo.png`, 457,927 bytes, 1024x1024 valid PNG, committed to git at `f2631a0`. | Verified with binary buffer inspection. Preserved and active. |
| **D-04** | `soicAlerts.controller.js` line 347 | Step 3 Authorization test failed: `[FAIL] User A can GET own incident history` | Line 347 calls `UserData.findOne(...)` but `UserData` model is never imported at the top of `soicAlerts.controller.js` (`ReferenceError`). | Documented as pre-existing bug. Minimal 1-line import proposed for approval. |
| **D-05** | Docs location | Docs existed only in sandbox artifact folder (`<appDataDir>/brain/...`) | Repo root did not contain `SOLARBUDDY_HANDOFF.md` or `SolarBuddy_UI_Refinement_Context.md`. | Both documents established directly in repo root to survive across all sessions. |

---

## 2. Decision Log

| Decision ID | Area | Decision Taken | Rationale |
|---|---|---|---|
| **DEC-01** | Version Control | Created `rollback-phase0-baseline` branch at `d8ddae7` and `phase0-solis-initial` tag at `f2631a0`. | Ensures immutable rollback points before and after initial recovery. |
| **DEC-02** | Git Commits | Commit only upon complete verification of each phase; never bundle phases; use `BypassSandbox: true` strictly for git write operations. | Meets Section 10 rules and works cleanly with the Windows sandbox environment. |
| **DEC-03** | Design Tokens | Keep `--sb-*` token prefix for SolarBuddy; define standard tokens in `frontend/src/index.css`; keep Inter font with tabular numerals for figures. | Preserves established brand and visual identity without risking redesign churn. |
| **DEC-04** | Unrouted Pages | Preserve all unrouted files (`SOICDashboard.jsx`, `UsersDashboardPage.jsx`, etc.) without editing or deleting them. | Avoids breaking legacy components, potential back-references, or future modules. |

---

## 3. Protected Systems (Zero Business-Logic Changes)

Visual and UX work must NOT alter the behavior of:
1. Authentication, authorization, JWT tokens, bcrypt password comparison
2. MongoDB schemas and database models
3. Real inverter hardware telemetry integrations
4. Demo Inverter Mode: toggle, settings persistence, deterministic simulated telemetry service
5. Time-dependent cumulative kWh and instantaneous kW formulas
6. Sunrise/sunset calculations and site-timezone (`Asia/Kolkata`) handling
7. pvlib/SAPM/PVWatts prediction engine and prediction schedulers
8. Expected-vs-actual variance formulas
9. SOIC alert rules, escalation states, alert history
10. Historical analytics, report and Excel export formulas
11. Existing AI tools (`fetchSolarTelemetry`, `fetchSolarPerformance`, `fetchSolarAlerts`, `fetchSolarWeatherContext`, `fetchSolarInstallation`, `fetchHistoricalGeneration`), customer/admin isolation, and RAG knowledge base
12. Backend API contracts

Protected frontend files:
- `frontend/src/services/api.js`
- `frontend/src/services/authService.js`
- `frontend/src/services/soicApi.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/context/DemoContext.jsx`

---

## 4. Codebase Navigation Map

### Active Routed Pages (in `frontend/src/App.jsx`):
1. `/login` & `/admin/login` &rarr; `LoginPage.jsx`
2. `/register` & `/onboarding` &rarr; `RegisterPage.jsx`
3. `/` & `/overview` &rarr; `OverviewPage.jsx`
4. `/energy` & `/predictions` &rarr; `EnergyPage.jsx`
5. `/solar-system` & `/sites/:siteId` &rarr; `SolarSystemPage.jsx`
6. `/installations` & `/sites` &rarr; `InstallationsPage.jsx`
7. `/alerts` & `/monitoring` & `/soic` &rarr; `AlertsPage.jsx`
8. `/savings` & `/analytics` &rarr; `SavingsPage.jsx`
9. `/reports` &rarr; `ReportsPage.jsx`
10. `/settings` & `/admin/settings` &rarr; `SettingsPage.jsx`

### Unrouted Pages (Preserved, Do Not Delete):
`AdminLoginPage.jsx`, `MonitoringPage.jsx`, `PredictionsPage.jsx`, `SOICDashboard.jsx`, `UsersDashboardPage.jsx`, `UserReportPage.jsx`, `AnalyticsPage.jsx`, `SiteDetailPage.jsx`, `SitesPage.jsx`.

---

## 5. Design System Tokens (`--sb-*`)

```css
:root {
  --sb-navy:       #0F172A;   /* Primary navigation background & header text */
  --sb-blue:       #2563EB;   /* Primary action buttons & active states */
  --sb-blue-light: #DBEAFE;   /* Tinted backgrounds & selection pills */
  --sb-amber:      #D97706;   /* Solar accent, warnings, solar bell curve secondary */
  --sb-green:      #16A34A;   /* Healthy telemetry status & positive variances */
  --sb-red:        #DC2626;   /* Critical alerts & system outages */
  --sb-bg:         #F4F7FB;   /* Workspace background */
  --sb-surface:    #FFFFFF;   /* Cards, panels, modal dialogs */
  --sb-border:     #E2E8F0;   /* Borders, hairline dividers */
  --sb-text:       #1E293B;   /* Primary body text */
  --sb-muted:      #64748B;   /* Secondary captions & labels */
}
```

---

## 6. Master Phased Roadmap & Status

- [x] **Phase 0: Baseline & Recovery**
  - [x] Recorded git status, branch (`main`), HEAD (`f2631a0`), and verified clean working tree
  - [x] Created rollback point `rollback-phase0-baseline` (`d8ddae7`)
  - [x] Created initial Solis tag `phase0-solis-initial` (`f2631a0`)
  - [x] Frontend production build verified (`npm run build`: built in 1.64s, zero errors)
  - [x] Demo inverter baseline test verified (`node backend/scripts/test_demo_inverter.js`: 9/9 passed, repeatable telemetry: 17.11 kWh)
  - [x] API integration suite verified (`node backend/scripts/verify_api_integration.js`: 100% operational)
  - [x] Authorization suite verified (`test_step3_authorization.js`: 34/35 passed; documented D-04)
  - [x] Confirmed active routes in `App.jsx`
  - [x] Identified root causes of prior session failures (PowerShell syntax + sandbox `.git` access)
  - [x] Created `SolarBuddy_UI_Refinement_Context.md` and `SOLARBUDDY_HANDOFF.md` in repository root

- [x] **Phase 1: Solis Recovery & Completion**
  - [x] Solis logo verified at `frontend/public/solis-logo.png` (1024x1024 PNG)
  - [x] Backend system prompt rewritten for Solis identity, response modes, and operational rules
  - [x] Local fallback engine updated in `modelProvider.js`
  - [x] Frontend widget rebranded to Solis with logo mark, context panel, and collapsible sources
  - [x] Complete Solis multi-role authorization verification (customer own site, customer cross-site, admin any site, unauthenticated)
  - [x] Verify all 3 response styles (Quick Answer, Performance Investigation, Technical Explanation)
  - [x] 12 of 12 tests passed in `test_solis_suite.js`
  - [x] Commit Phase 1

- [x] **Phase 2: Branding Consistency**
  - [x] Global audit & replacement of `SolarWizer` and `SolarWiser` &rarr; `SolarBuddy` (0 remaining)
  - [x] Audit & rename `--sw-*` &rarr; `--sb-*` across CSS and JSX callers (0 `--sw-` remaining)
  - [x] Clear prefilled registration credentials from form defaults (`RegisterPage.jsx`)
  - [x] Replace emoji icons with Lucide React icons (`Sun`, `BookOpen`, `AlertTriangle`)
  - [x] Verified frontend build passes in 1.09s
  - [x] Commit Phase 2

- [x] **Phase 3: Design System Components**
  - [x] Created `Button.jsx` (accessible variants, loading, disabled, focus rings)
  - [x] Created `Card.jsx` (unified surface, padding, CardHeader, CardContent, CardFooter)
  - [x] Created `Badge.jsx` (healthy, warning, critical, info, neutral, demo with dots/pulse)
  - [x] Created `StatBlock.jsx` (tabular numerals, unit, trend indicators)
  - [x] Created `Modal.jsx` (accessible dialog with focus trap, ESC closing, backdrop blur)
  - [x] Created `Toast.jsx` (in-app notification provider and hooks replacing raw alerts)
  - [x] Created `Skeleton.jsx` (shaped animated loading placeholders)
  - [x] Integrated `Card` and `Badge` into `OverviewPage.jsx` KPI blocks
  - [x] Verified production build passes with 0 errors (built in 989ms)
  - [x] Commit Phase 3

- [x] **Phase 4: Overview Page Refinement**
  - [x] Established hero today's generation KPI with tabular numbers and target comparison
  - [x] Refined production area chart (solid actual, dashed expected target line, subtle area gradient fill, light horizontal gridlines)
  - [x] Replaced dark slate chart tooltip with clean design-token surface
  - [x] Converted all panels (Live Power Flow, Environmental Impact, Chart, Panel Groups, Installation Details, Equipment) to unified `Card` components
  - [x] Verified Demo Inverter Mode vs Physical telemetry labeling
  - [x] Verified Demo Inverter Service determinism (17.11 kWh identical to Phase 0 baseline)
  - [x] Verified production build passes with 0 errors (built in 890ms)
  - [x] Commit Phase 4

- [ ] **Phase 5: Remaining Active Pages**
  - [ ] `EnergyPage.jsx`
  - [ ] `SolarSystemPage.jsx`
  - [ ] `AlertsPage.jsx`
  - [ ] `SavingsPage.jsx`
  - [ ] `ReportsPage.jsx`
  - [ ] `InstallationsPage.jsx`
  - [ ] `SettingsPage.jsx`
  - [ ] `LoginPage.jsx` & `RegisterPage.jsx`

- [ ] **Phase 6: Interactions & Responsiveness**
  - [ ] Verify 1280px, 1024px, 768px, and 390px widths
  - [ ] Accessibility pass (focus rings, keyboard navigation)

- [ ] **Phase 7: Solis Visual Integration**
  - [ ] Match Solis styling strictly to the new design system tokens

- [ ] **Phase 8: Final Regression & Documentation**
  - [ ] Full regression suite run and logged
  - [ ] Production build verification
