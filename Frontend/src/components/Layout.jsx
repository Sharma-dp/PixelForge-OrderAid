
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  CircleHelp,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { useApp } from "../context/useApp.js";
import "../App.css";

const NAV_ITEMS = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "My Cases", path: "/cases", icon: ClipboardList },
  { label: "Evidence", path: "/evidence", icon: FileCheck2 },
  { label: "Activity", path: "/activity", icon: Activity },
];

function Sidebar({ onNavigate }) {
  const { user, signOut } = useApp();
  const navigate = useNavigate();

  function handleLogout() {
    signOut();
    navigate("/welcome");
  }

  return (
    <aside className="sidebar">
      <NavLink
        to="/"
        className="brand"
        onClick={onNavigate}
        aria-label="OrderAid overview"
      >
        <span className="brand-mark">
          <ShieldCheck size={23} />
        </span>
        <span className="brand-copy">
          <strong>OrderAid</strong>
          <small>ORDER RESOLUTION</small>
        </span>
      </NavLink>

      <div className="sidebar-section">
        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={onNavigate}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-help">
          <span className="sidebar-help-icon">
            <CircleHelp size={18} />
          </span>
          <strong>Need a hand?</strong>
          <p>We're here to help you navigate your order issue.</p>
          <button
            type="button"
            className="sidebar-help-link"
            onClick={() => {
              navigate("/help");
              onNavigate?.();
            }}
          >
            Visit help center
          </button>
        </div>

        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          <Settings size={18} strokeWidth={1.8} />
          <span>Settings</span>
        </NavLink>

        <div className="sidebar-profile">
          <div className="profile-avatar">
            {(user?.name || "OrderAid").slice(0, 1).toUpperCase()}
          </div>

          <div className="profile-details">
            <strong>{user?.name || "Demo user"}</strong>
            <small>Personal workspace</small>
          </div>

          <button
            type="button"
            className="profile-logout"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  function openNewCase() {
    setMobileMenuOpen(false);
    navigate("/new-case");
  }

  return (
    <div className="app-shell">
      <button
        type="button"
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen((open) => !open)}
        aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
      >
        {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>

      {mobileMenuOpen && (
        <button
          className="mobile-sidebar-overlay"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={`sidebar-container ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
      </div>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>OrderAid</strong>
          </div>

          <div className="topbar-actions">
            <label className="global-search">
              <span className="search-symbol">⌕</span>
              <input
                type="search"
                aria-label="Search workspace"
                placeholder="Search your workspace"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    navigate(`/cases?q=${encodeURIComponent(searchTerm)}`);
                  }
                }}
              />
            </label>

            <button
              type="button"
              className="topbar-new-case"
              onClick={openNewCase}
            >
              + <span>New case</span>
            </button>
          </div>
        </header>

        <div className="route-content">
          <Outlet
            context={{
              searchTerm,
              clearSearch: () => setSearchTerm(""),
            }}
          />
        </div>

        <footer className="app-footer">
          <span>OrderAid · Your order. Your options. Your resolution.</span>
          <span className="footer-privacy">
            <ShieldCheck size={14} /> Your approval, your control
          </span>
        </footer>
      </div>
    </div>
  );
}
