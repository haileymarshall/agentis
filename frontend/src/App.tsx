import { BriefcaseBusiness, Gavel, Home, Plus, Settings, UserRound } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import { NetworkSelector } from "./components/NetworkSelector";
import { WalletConnect } from "./components/WalletConnect";
import { NetworkNotice } from "./components/NetworkNotice";
import { HomePage } from "./pages/Home";
import { JobsPage } from "./pages/Jobs";
import { CreateJobPage } from "./pages/CreateJob";
import { JobDetailPage } from "./pages/JobDetail";
import { SubmitDeliveryPage } from "./pages/SubmitDelivery";
import { OpenDisputePage } from "./pages/OpenDispute";
import { VerdictPage } from "./pages/Verdict";
import { MyJobsPage } from "./pages/MyJobs";
import { NetworkSettingsPage } from "./pages/NetworkSettings";
import { ClaimPayoutPage } from "./pages/ClaimPayout";

export function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">A</span>
          <span>
            <strong>Agentis</strong>
            <small>Agentic commerce settlement</small>
          </span>
        </NavLink>
        <nav className="nav-links">
          <NavLink to="/">
            <Home size={16} /> Home
          </NavLink>
          <NavLink to="/jobs">
            <BriefcaseBusiness size={16} /> Jobs
          </NavLink>
          <NavLink to="/create">
            <Plus size={16} /> Create
          </NavLink>
          <NavLink to="/my-jobs">
            <UserRound size={16} /> My Jobs
          </NavLink>
          <NavLink to="/network">
            <Settings size={16} /> Network
          </NavLink>
        </nav>
        <div className="topbar-actions">
          <NetworkSelector />
          <WalletConnect />
        </div>
      </header>

      <NetworkNotice />

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/create" element={<CreateJobPage />} />
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />
          <Route path="/jobs/:jobId/deliver" element={<SubmitDeliveryPage />} />
          <Route path="/jobs/:jobId/dispute" element={<OpenDisputePage />} />
          <Route path="/jobs/:jobId/verdict" element={<VerdictPage />} />
          <Route path="/jobs/:jobId/claim" element={<ClaimPayoutPage />} />
          <Route path="/my-jobs" element={<MyJobsPage />} />
          <Route path="/network" element={<NetworkSettingsPage />} />
          <Route
            path="*"
            element={
              <section className="empty-state">
                <Gavel size={28} />
                <h1>Route not found</h1>
                <NavLink className="button primary" to="/jobs">
                  Open jobs
                </NavLink>
              </section>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
