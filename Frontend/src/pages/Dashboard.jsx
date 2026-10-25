
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../context/useApp.js";
import StatusBadge from "../components/StatusBadge.jsx";
import "./Dashboard.css";

function SummaryCard({ title, value, description, icon: Icon, tone }) {
  return (
    <article className="summary-card">
      <div className={`summary-icon ${tone}`}>
        <Icon size={20} strokeWidth={1.8} />
      </div>

      <p className="summary-title">{title}</p>
      <strong className="summary-value">{value}</strong>

      <div className="summary-footer">
        <span>{description}</span>
      </div>
    </article>
  );
}

function StatusDistribution({ cases }) {
  const statuses = [
    { label: "Investigating", color: "#537b60" },
    { label: "Awaiting Approval", color: "#d99b35" },
    { label: "Resolved", color: "#2d8a68" },
  ];

  const total = cases.length;
  const counts = statuses.map((status) => ({
    ...status,
    count: cases.filter((item) => item.status === status.label).length,
  }));

  const resolved = counts.find((item) => item.label === "Resolved")?.count || 0;
  const resolvedPercent = total ? Math.round((resolved / total) * 100) : 0;

  return (
    <article className="content-card dashboard-panel">
      <div className="panel-heading">
        <div>
          <h2>Case distribution</h2>
          <p>Current status of your cases</p>
        </div>
        <ShieldCheck size={19} />
      </div>

      <div className="distribution-content">
        <div
          className="distribution-chart"
          role="img"
          aria-label={`${resolvedPercent}% of cases resolved`}
          style={{
            "--resolved-percent": `${resolvedPercent}%`,
          }}
        >
          <div className="distribution-chart-center">
            <strong>{total}</strong>
            <span>Total cases</span>
          </div>
        </div>

        <div className="distribution-legend">
          {counts.map((status) => (
            <div className="legend-item" key={status.label}>
              <span
                className="legend-dot"
                style={{ backgroundColor: status.color }}
              />
              <span>{status.label}</span>
              <strong>{status.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function ResolutionProgress({ cases }) {
  const total = cases.length;
  const resolved = cases.filter(
    (item) => item.status === "Resolved"
  ).length;
  const awaiting = cases.filter(
    (item) => item.status === "Awaiting Approval"
  ).length;

  const percentage = total ? Math.round((resolved / total) * 100) : 0;

  return (
    <article className="content-card dashboard-panel progress-panel">
      <div className="panel-heading">
        <div>
          <h2>Resolution progress</h2>
          <p>Your cases at a glance</p>
        </div>
        <ArrowUpRight size={19} />
      </div>

      <div className="progress-main">
        <div className="progress-number">
          <strong>{percentage}%</strong>
          <span>resolved</span>
        </div>

        <div
          className="progress-track"
          role="progressbar"
          aria-label="Resolved cases"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <div style={{ width: `${percentage}%` }} />
        </div>
      </div>

      <div className="progress-stat-row">
        <span>Awaiting your attention</span>
        <strong>{awaiting}</strong>
      </div>

      <div className="progress-stat-row">
        <span>Resolved cases</span>
        <strong>{resolved}</strong>
      </div>

      <Link to="/cases" className="panel-text-link">
        View all cases <ArrowRight size={14} />
      </Link>
    </article>
  );
}

function NextStepPanel({ cases }) {
  const nextCase = cases.find(
    (item) => item.status === "Awaiting Approval"
  );

  return (
    <article className="content-card dashboard-panel next-step-panel">
      <div className="panel-heading">
        <div>
          <h2>Next step</h2>
          <p>Keep your resolution moving</p>
        </div>
        <Clock3 size={19} />
      </div>

      {nextCase ? (
        <>
          <span className="next-step-label">AWAITING YOUR REVIEW</span>
          <h3>{nextCase.retailer}</h3>
          <p className="next-step-description">
            {nextCase.issue || nextCase.item}
          </p>

          <Link
            className="next-step-link"
            to={`/cases/${encodeURIComponent(nextCase.case_id)}`}
          >
            Review case <ArrowRight size={15} />
          </Link>
        </>
      ) : (
        <div className="next-step-empty">
          <CheckCircle2 size={27} />
          <strong>You're all caught up</strong>
          <p>No cases are currently awaiting your review.</p>
          <Link to="/new-case">Start a new case</Link>
        </div>
      )}
    </article>
  );
}

export default function Dashboard() {
  const { user, cases } = useApp();

  const totalCases = cases.length;
  const investigating = cases.filter(
    (item) => item.status === "Investigating"
  ).length;
  const awaitingApproval = cases.filter(
    (item) => item.status === "Awaiting Approval"
  ).length;
  const resolved = cases.filter(
    (item) => item.status === "Resolved"
  ).length;

  return (
    <main className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="page-eyebrow">YOUR WORKSPACE</p>
          <h1>
            {user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Overview"}
          </h1>
          <p className="page-description">
            Keep track of your orders and move towards a fair resolution.
          </p>
        </div>

        <Link to="/new-case" className="primary-button">
          <Plus size={17} />
          Start a new case
        </Link>
      </div>

      <div className="dashboard-summary-grid">
        <SummaryCard
          title="Total cases"
          value={totalCases}
          description="Cases in your workspace"
          icon={FileSearch}
          tone="summary-green"
        />

        <SummaryCard
          title="Investigating"
          value={investigating}
          description="Research in progress"
          icon={Clock3}
          tone="summary-blue"
        />

        <SummaryCard
          title="Awaiting approval"
          value={awaitingApproval}
          description="Your review is needed"
          icon={ShieldCheck}
          tone="summary-amber"
        />

        <SummaryCard
          title="Resolved"
          value={resolved}
          description="Marked resolved in workspace"
          icon={CheckCircle2}
          tone="summary-mint"
        />
      </div>

      <div className="dashboard-panels-grid">
        <StatusDistribution cases={cases} />
        <ResolutionProgress cases={cases} />
        <NextStepPanel cases={cases} />
      </div>

      <section className="content-card dashboard-recent">
        <div className="recent-heading">
          <div>
            <h2>Recent cases</h2>
            <p>Your latest order resolution activity</p>
          </div>

          <Link to="/cases" className="panel-text-link">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {cases.length === 0 ? (
          <div className="dashboard-empty">
            <FileSearch size={30} />
            <h3>No cases yet</h3>
            <p>Create your first case to get started.</p>
            <Link to="/new-case" className="primary-button">
              Start a new case
            </Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="cases-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Retailer</th>
                  <th>Order issue</th>
                  <th>Order ID</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {cases.slice(0, 5).map((item) => (
                  <tr key={item.case_id}>
                    <td className="case-id-cell">{item.case_id}</td>
                    <td>{item.retailer}</td>
                    <td>{item.issue || item.item}</td>
                    <td>{item.order_id || "—"}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>{item.updated_at || "—"}</td>
                    <td>
                      <Link
                        className="table-action"
                        to={`/cases/${encodeURIComponent(item.case_id)}`}
                        aria-label={`Open case ${item.case_id}`}
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="dashboard-data-note">
        <ArrowDownRight size={14} />
        Sample records are labelled as demo data until connected to the live API.
      </p>
    </main>
  );
}
