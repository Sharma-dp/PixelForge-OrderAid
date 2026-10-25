
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { api } from "../services/api.js";
import { useApp } from "../context/useApp.js";
import StatusBadge from "../components/StatusBadge.jsx";
import "./CaseDetail.css";

export default function CaseDetail() {
  const { caseId } = useParams();
  const { cases, updateCase } = useApp();

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("info");
  const submittingRef = useRef(false);
  const [serverCase, setServerCase] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  const localCase = cases.find((item) => item.case_id === caseId);
  const isDemoCase = Boolean(localCase?.demo);

  const loadCase = useCallback(async () => {
    if (isDemoCase) {
      setServerCase(null);
      setLoadError("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError("");

    try {
      const result = await api.getCase(caseId);
      setServerCase(result);
    } catch (error) {
      setLoadError(
        error.message || "Unable to load this case from the backend."
      );
    } finally {
      setIsLoading(false);
    }
  }, [caseId, isDemoCase]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  const currentCase = isDemoCase ? localCase : serverCase || localCase;

  async function handleReview() {
    setNotice("");
    setNoticeType("info");

    if (isDemoCase) {
      setNotice(
        "This is a demo case. A live resolution draft has not been verified."
      );
      return;
    }

    await loadCase();

    setNotice(
      "Case details refreshed. Review the investigation status before proceeding. Approval requires a verified resolution draft."
    );
  }

  async function handleApproval(approved) {
    if (!currentCase || currentCase.demo || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setNotice("");
    setNoticeType("info");
    setIsSubmitting(true);

    try {
      const result = await api.approve(
        currentCase.case_id,
        approved
      );

      if (result.case) {
        setServerCase(result.case);
        updateCase(result.case);
      }

      setNoticeType("success");
      setNotice(
        result.message ||
          (approved
            ? "Approval recorded by the backend."
            : "Approval declined by the backend.")
      );
    } catch (error) {
      setNoticeType("error");
      setNotice(
        error.message ||
          "The backend could not process this decision."
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleMarkResolved() {
    if (!currentCase?.demo) {
      setNotice(
        "Only demo cases can be marked resolved locally. No retailer action was performed."
      );
      return;
    }

    updateCase({
      ...currentCase,
      status: "Resolved",
      updated_at: "Just now",
      demo: true,
    });

    setNotice(
      "Demo status updated locally. No retailer action was performed."
    );
  }

  if (isLoading && !currentCase) {
    return (
      <section className="content-card">
        <p>Loading case details...</p>
      </section>
    );
  }

  if (!currentCase) {
    return (
      <section className="content-card">
        <h1>Case not available</h1>
        <p>
          {loadError ||
            "This case isn't available in the current workspace."}
        </p>
        <button
          type="button"
          className="secondary-button"
          onClick={loadCase}
          disabled={isLoading}
        >
          {isLoading ? "Retrying..." : "Retry"}
        </button>{" "}
        <Link to="/cases" className="primary-button">
          Back to My Cases
        </Link>
      </section>
    );
  }

  return (
    <section className="case-detail-page">
      <Link to="/cases" className="back-link">
        <ArrowLeft size={16} />
        Back to My Cases
      </Link>

      <div className="page-header">
        <div>
          <p className="page-eyebrow">RESOLUTION PASSPORT</p>
          <h1>{currentCase.retailer} order issue</h1>
          <p className="page-description">
            Case {currentCase.case_id} · Order{" "}
            {currentCase.order_id || "not provided"}
          </p>
        </div>

        <StatusBadge status={currentCase.status} />
      </div>

      {loadError && !isDemoCase && (
        <div className="notice-banner" role="alert">
          <ShieldCheck size={18} />
          <p>
            Could not refresh this case from the backend: {loadError}
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={loadCase}
            disabled={isLoading}
          >
            Retry
          </button>
        </div>
      )}

      <div className="notice-banner">
        <ShieldCheck size={18} />
        <p>
          {isDemoCase
            ? "Demo record. Policy research and retailer submission have not been verified."
            : "Backend case loaded. AI policy investigation and retailer submission are not connected yet."}
        </p>
      </div>

      {notice && (
        <div className={`notice-banner notice-banner--${noticeType}`} role={noticeType === "error" ? "alert" : "status"}>
          <CheckCircle2 size={18} />
          <p>{notice}</p>
        </div>
      )}

      <div className="passport-grid">
        <article className="content-card passport-main">
          <div className="passport-section-heading">
            <span className="section-icon">
              <FileText size={19} />
            </span>
            <div>
              <h2>Case summary</h2>
              <p>Details provided for this order issue</p>
            </div>
          </div>

          <div className="passport-data">
            <div>
              <span>Retailer</span>
              <strong>{currentCase.retailer}</strong>
            </div>
            <div>
              <span>Item</span>
              <strong>{currentCase.item || "Not provided"}</strong>
            </div>
            <div>
              <span>Order amount</span>
              <strong>{currentCase.amount || "Not provided"}</strong>
            </div>
            <div>
              <span>Last updated</span>
              <strong>{currentCase.updated_at || "Not available"}</strong>
            </div>
          </div>

          <div className="passport-divider" />

          <h3>Reported issue</h3>
          <p className="passport-issue">
            {currentCase.issue || "No issue description provided."}
          </p>

          {currentCase.issue_type && (
            <p>
              <strong>Issue category:</strong>{" "}
              {currentCase.issue_type}
            </p>
          )}

          {currentCase.requested_resolution && (
            <p>
              <strong>Preferred outcome:</strong>{" "}
              {currentCase.requested_resolution}
            </p>
          )}

          <div className="passport-divider" />

          <div className="passport-section-heading">
            <span className="section-icon">
              <ShieldCheck size={19} />
            </span>
            <div>
              <h2>Resolution request</h2>
              <p>Review before proceeding</p>
            </div>
          </div>

          <div className="draft-placeholder">
            <p>
              {currentCase.investigation?.message ||
                "A resolution request will appear here after the investigation backend returns a verified draft."}
            </p>
            <span>
              {currentCase.investigation?.status === "verified"
                ? "Verified draft available"
                : "Draft not available yet"}
            </span>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleReview}
            disabled={isLoading || isSubmitting}
          >
            {isLoading ? "Refreshing..." : "Review request"}
          </button>

          {!isDemoCase && (
            <div className="approval-actions">
              <h3>Decision</h3>
              <p>
                Your decision will be sent to the backend. Approval
                cannot proceed until a verified resolution draft exists.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => handleApproval(true)}
                disabled={
                  isSubmitting ||
                  currentCase.status === "Resolved"
                }
              >
                {isSubmitting ? "Submitting..." : "Approve request"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => handleApproval(false)}
                disabled={isSubmitting}
              >
                Decline request
              </button>
            </div>
          )}
        </article>

        <aside className="content-card passport-sidebar">
          <div className="passport-section-heading">
            <span className="section-icon">
              <Clock3 size={19} />
            </span>
            <div>
              <h2>Resolution progress</h2>
              <p>Current case state</p>
            </div>
          </div>

          <div className="progress-timeline">
            <div className="timeline-step complete">
              <span />
              <div>
                <strong>Case created</strong>
                <p>Issue recorded in workspace</p>
              </div>
            </div>

            <div
              className={`timeline-step ${
                currentCase.status !== "Investigating"
                  ? "complete"
                  : ""
              }`}
            >
              <span />
              <div>
                <strong>Investigation</strong>
                <p>
                  {currentCase.investigation?.message ||
                    "Policy research status not verified"}
                </p>
              </div>
            </div>

            <div
              className={`timeline-step ${
                currentCase.status === "Awaiting Approval" ||
                currentCase.status === "Resolved"
                  ? "complete"
                  : ""
              }`}
            >
              <span />
              <div>
                <strong>Approval</strong>
                <p>Requires review of a verified draft</p>
              </div>
            </div>

            <div
              className={`timeline-step ${
                currentCase.status === "Resolved" ? "complete" : ""
              }`}
            >
              <span />
              <div>
                <strong>Resolution</strong>
                <p>No retailer outcome has been verified</p>
              </div>
            </div>
          </div>

          <div className="passport-divider" />

          <h3>Policy references</h3>
          <p className="muted-copy">
            Official policy links will appear here when returned by
            the backend. No verified policy source is attached to
            this case yet.
          </p>

          {isDemoCase && currentCase.status !== "Resolved" && (
            <button
              type="button"
              className="secondary-button"
              onClick={handleMarkResolved}
            >
              Mark resolved (demo)
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}
