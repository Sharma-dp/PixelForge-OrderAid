
import "./StatusBadge.css";

function getStatusClass(status) {
  const normalized = (status || "").toLowerCase();

  if (normalized.includes("resolved")) {
    return "status-resolved";
  }

  if (
    normalized.includes("approval") ||
    normalized.includes("awaiting")
  ) {
    return "status-awaiting-approval";
  }

  if (normalized.includes("investigating")) {
    return "status-investigating";
  }

  if (normalized.includes("progress")) {
    return "status-in-progress";
  }

  return "status-default";
}

export default function StatusBadge({ status = "Unknown" }) {
  return (
    <span className={`status-badge ${getStatusClass(status)}`}>
      <i aria-hidden="true" />
      {status}
    </span>
  );
}
