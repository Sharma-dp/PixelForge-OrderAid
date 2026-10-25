
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  FileCheck2,
  HelpCircle,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../context/useApp.js";
import "./UtilityPages.css";

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <p className="page-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>

      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon size={25} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function CasesPage() {
  const { cases } = useApp();

  return (
    <section>
      <PageHeader
        eyebrow="YOUR WORKSPACE"
        title="My Cases"
        description="Track your order issues and review their current status."
        action={
          <Link className="primary-button" to="/new-case">
            + New case
          </Link>
        }
      />

      <div className="content-card">
        {cases.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="No cases yet"
            description="Start your first case to organize your order issue and evidence."
            action={
              <Link className="primary-button" to="/new-case">
                Start a case
              </Link>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="cases-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Retailer</th>
                  <th>Order issue</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.case_id}>
                    <td>{item.case_id}</td>
                    <td>{item.retailer}</td>
                    <td>{item.issue || item.item}</td>
                    <td>{item.amount || "—"}</td>
                    <td>
                      <span className="table-status">
                        {item.status}
                      </span>
                    </td>
                    <td>{item.updated_at || "—"}</td>
                    <td>
                      <Link
                        to={`/cases/${encodeURIComponent(item.case_id)}`}
                        aria-label={`View case ${item.case_id}`}
                      >
                        View <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export function EvidencePage() {
  const { cases } = useApp();

  return (
    <section>
      <PageHeader
        eyebrow="DOCUMENT CENTER"
        title="Evidence"
        description="Keep track of the evidence associated with your order cases."
      />

      <div className="content-card">
        <EmptyState
          icon={FileCheck2}
          title="Your evidence workspace"
          description={
            cases.length
              ? "Open a case to review its evidence and supporting policy references."
              : "Create a case and upload photos, receipts or other supporting documents."
          }
          action={
            <Link className="primary-button" to="/new-case">
              Create a case
            </Link>
          }
        />
      </div>
    </section>
  );
}

export function ActivityPage() {
  const { cases } = useApp();

  return (
    <section>
      <PageHeader
        eyebrow="CASE HISTORY"
        title="Activity"
        description="Review the current state of your order resolution cases."
      />

      <div className="content-card activity-list">
        {cases.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Your case updates will appear here."
          />
        ) : (
          cases.map((item) => (
            <div className="activity-item" key={item.case_id}>
              <span className="activity-icon">
                <Activity size={17} />
              </span>
              <div>
                <strong>
                  {item.case_id} · {item.retailer}
                </strong>
                <p>
                  {item.issue || item.item} — {item.status}
                </p>
                <small>{item.updated_at || "Update time unavailable"}</small>
              </div>
              <Link to={`/cases/${encodeURIComponent(item.case_id)}`}>
                View case
              </Link>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function SettingsPage() {
  const { user, signOut } = useApp();

  return (
    <section>
      <PageHeader
        eyebrow="PREFERENCES"
        title="Settings"
        description="Review your demo profile and workspace information."
      />

      <div className="content-card settings-card">
        <div className="settings-heading">
          <ShieldCheck size={22} />
          <div>
            <h2>Demo profile</h2>
            <p>This profile is stored in your browser for this demo.</p>
          </div>
        </div>

        <div className="settings-row">
          <span>Display name</span>
          <strong>{user?.name || "Demo user"}</strong>
        </div>

        <div className="settings-row">
          <span>Phone number</span>
          <strong>{user?.phone || "Not provided"}</strong>
        </div>

        <div className="settings-row">
          <span>Identity status</span>
          <strong>Demo identity — not verified</strong>
        </div>

        <button className="secondary-button" onClick={signOut} type="button">
          Sign out
        </button>
      </div>
    </section>
  );
}

export function HelpPage() {
  return (
    <section>
      <PageHeader
        eyebrow="SUPPORT"
        title="Help center"
        description="Learn how OrderAid helps you prepare and track order resolutions."
      />

      <div className="content-card help-content">
        <div>
          <HelpCircle size={21} />
          <h2>How does OrderAid work?</h2>
          <p>
            Describe your order issue, provide relevant evidence and let
            OrderAid investigate the retailer's published policy.
          </p>
        </div>

        <div>
          <ShieldCheck size={21} />
          <h2>Do I control the final action?</h2>
          <p>
            Yes. Review the proposed request before approving supported
            actions. The application must not claim a retailer submission
            succeeded without a confirmed result.
          </p>
        </div>

        <div>
          <Settings size={21} />
          <h2>Is this a live connection?</h2>
          <p>
            Demo records are sample data. Live policy research and retailer
            actions require a working backend connection.
          </p>
        </div>
      </div>
    </section>
  );
}
