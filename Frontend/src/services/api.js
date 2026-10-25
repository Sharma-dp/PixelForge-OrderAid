
const API_BASE = (
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000"
).replace(/\/$/, "");

async function request(path, options = {}) {
  const isMultipart = options.body instanceof FormData;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isMultipart ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.detail ||
        payload.message ||
        `Request failed (${response.status})`
    );
  }

  return payload;
}

export const api = {
  getCases() {
    return request("/api/cases");
  },

  investigate(formData) {
    const body = new FormData();

    body.append("problem_description", formData.problem_description);
    body.append("retailer", formData.retailer);
    body.append("item", formData.item || "");
    body.append("amount", formData.amount || "");
    body.append("issue_type", formData.issue_type || "Other");
    body.append(
      "requested_resolution",
      formData.requested_resolution || "Help me decide"
    );

    if (formData.order_id) {
      body.append("order_id", formData.order_id);
    }

    (formData.evidence || []).forEach((file) => {
      body.append("evidence", file);
    });

    return request("/api/investigate", {
      method: "POST",
      body,
    });
  },

  getCase(caseId) {
    return request(`/api/cases/${encodeURIComponent(caseId)}`);
  },

  approve(caseId, approved, otp) {
    return request("/api/approve", {
      method: "POST",
      body: JSON.stringify({
        case_id: caseId,
        approved,
        otp: otp || null,
      }),
    });
  },
};

export { API_BASE };
export const authApi = {
  signup(data) {
    return request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  login(data) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};