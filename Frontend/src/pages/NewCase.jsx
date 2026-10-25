
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  FileImage,
  FileText,
  Info,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useApp } from "../context/useApp.js";
import { api } from "../services/api.js";
import "./NewCase.css";

const INITIAL_FORM = {
  retailer: "",
  order_id: "",
  item: "",
  amount: "",
  issue_type: "Damaged item",
  description: "",
  resolution: "Replacement",
};

const RETAILERS = [
  "Amazon",
  "Flipkart",
  "Myntra",
  "Meesho",
  "Other",
];

const ISSUE_TYPES = [
  "Damaged item",
  "Wrong item received",
  "Item not delivered",
  "Refund delayed",
  "Return rejected",
  "Other",
];

const RESOLUTIONS = [
  "Replacement",
  "Refund",
  "Return",
  "Repair",
  "Help me decide",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validateForm(form) {
  const errors = {};

  if (!form.retailer) {
    errors.retailer = "Select the retailer.";
  }

  if (!form.item.trim()) {
    errors.item = "Enter the product name.";
  }

  if (!form.description.trim()) {
    errors.description = "Describe what went wrong.";
  } else if (form.description.trim().length < 15) {
    errors.description = "Please provide at least 15 characters.";
  }

  if (
    form.amount.trim() &&
    (!Number.isFinite(Number(form.amount)) || Number(form.amount) < 0)
  ) {
    errors.amount = "Enter a valid non-negative amount.";
  }

  return errors;
}

export default function NewCase() {
  const navigate = useNavigate();
  const { addCase } = useApp();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  }

  function handleFiles(event) {
    const selectedFiles = Array.from(event.target.files || []);
    const acceptedFiles = [];
    let errorMessage = "";

    for (const file of selectedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errorMessage = "Upload JPG, PNG or WebP images only.";
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errorMessage = "Each image must be smaller than 5 MB.";
        continue;
      }

      const duplicate = files.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size
      );

      if (!duplicate) {
        acceptedFiles.push(file);
      }
    }

    const remainingSlots = Math.max(0, 5 - files.length);
    const filesToAdd = acceptedFiles.slice(0, remainingSlots);

    if (acceptedFiles.length > remainingSlots) {
      errorMessage = "You can attach a maximum of 5 images.";
    }

    setFiles((previous) => [...previous, ...filesToAdd]);
    setFileError(errorMessage);

    // Allows the same file to be selected again after removal.
    event.target.value = "";
  }

  function removeFile(index) {
    setFiles((previous) => previous.filter((_, i) => i !== index));
    setFileError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setFileError("");

    try {
      const createdCase = await api.investigate({
        retailer: form.retailer,
        order_id: form.order_id.trim(),
        item: form.item.trim(),
        amount: form.amount.trim(),
        issue_type: form.issue_type,
        requested_resolution: form.resolution,
        problem_description: form.description.trim(),
        evidence: files,
      });

      const localCase = {
        ...createdCase,
        amount: createdCase.amount || "",
        evidence: (createdCase.evidence || []).map((file) => ({
          name: file.filename,
          type: file.content_type,
        })),
        demo: false,
      };

      addCase(localCase);

      navigate(`/cases/${encodeURIComponent(createdCase.case_id)}`);
    } catch (error) {
      setFileError(
        error.message ||
          "We couldn't create the case. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="new-case-page">
      <Link to="/" className="new-case-back">
        <ArrowLeft size={16} />
        Back to overview
      </Link>

      <div className="new-case-heading">
        <div>
          <p className="page-eyebrow">NEW RESOLUTION CASE</p>
          <h1>Tell us what went wrong.</h1>
          <p className="page-description">
            Share your order details and we'll help you prepare the next
            steps. You stay in control of every proposed action.
          </p>
        </div>

        <div className="new-case-trust">
          <ShieldCheck size={19} />
          <span>Your case, your decision</span>
        </div>
      </div>

      <form className="new-case-form" onSubmit={handleSubmit} noValidate>
        <section className="content-card new-case-section">
          <div className="new-case-section-heading">
            <span className="new-case-section-number">01</span>
            <div>
              <h2>Order details</h2>
              <p>Help us identify the purchase.</p>
            </div>
          </div>

          <div className="new-case-fields">
            <div className="new-case-field">
              <label htmlFor="retailer">
                Retailer <span>*</span>
              </label>
              <select
                id="retailer"
                name="retailer"
                value={form.retailer}
                onChange={updateField}
                aria-invalid={Boolean(errors.retailer)}
              >
                <option value="">Choose a retailer</option>
                {RETAILERS.map((retailer) => (
                  <option key={retailer} value={retailer}>
                    {retailer}
                  </option>
                ))}
              </select>
              {errors.retailer && (
                <p className="new-case-error">{errors.retailer}</p>
              )}
            </div>

            <div className="new-case-field">
              <label htmlFor="order_id">Order ID</label>
              <input
                id="order_id"
                name="order_id"
                value={form.order_id}
                onChange={updateField}
                placeholder="e.g. 123-4567890-1234567"
              />
              <small>Optional, but helpful for support requests.</small>
            </div>

            <div className="new-case-field">
              <label htmlFor="item">
                Product name <span>*</span>
              </label>
              <input
                id="item"
                name="item"
                value={form.item}
                onChange={updateField}
                placeholder="e.g. Wireless headphones"
                aria-invalid={Boolean(errors.item)}
              />
              {errors.item && (
                <p className="new-case-error">{errors.item}</p>
              )}
            </div>

            <div className="new-case-field">
              <label htmlFor="amount">Order amount (INR)</label>
              <div className="new-case-amount">
                <span>₹</span>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={updateField}
                  placeholder="3000"
                  aria-invalid={Boolean(errors.amount)}
                />
              </div>
              {errors.amount && (
                <p className="new-case-error">{errors.amount}</p>
              )}
            </div>
          </div>
        </section>

        <section className="content-card new-case-section">
          <div className="new-case-section-heading">
            <span className="new-case-section-number">02</span>
            <div>
              <h2>Describe the issue</h2>
              <p>Explain what happened and what outcome you want.</p>
            </div>
          </div>

          <div className="new-case-fields">
            <div className="new-case-field">
              <label htmlFor="issue_type">Issue category</label>
              <select
                id="issue_type"
                name="issue_type"
                value={form.issue_type}
                onChange={updateField}
              >
                {ISSUE_TYPES.map((issue) => (
                  <option key={issue} value={issue}>
                    {issue}
                  </option>
                ))}
              </select>
            </div>

            <div className="new-case-field">
              <label htmlFor="resolution">Preferred outcome</label>
              <select
                id="resolution"
                name="resolution"
                value={form.resolution}
                onChange={updateField}
              >
                {RESOLUTIONS.map((resolution) => (
                  <option key={resolution} value={resolution}>
                    {resolution}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="new-case-field new-case-description">
            <label htmlFor="description">
              What happened? <span>*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              maxLength={2000}
              value={form.description}
              onChange={updateField}
              placeholder="For example: My ₹3,000 headphones arrived damaged. I ordered them last week, and the left earcup is cracked. I'd like to understand my return or replacement options."
              aria-invalid={Boolean(errors.description)}
            />
            <div className="new-case-field-footer">
              {errors.description ? (
                <p className="new-case-error">{errors.description}</p>
              ) : (
                <small>Include relevant dates and details if possible.</small>
              )}
              <small>{form.description.length}/2000</small>
            </div>
          </div>
        </section>

        <section className="content-card new-case-section">
          <div className="new-case-section-heading">
            <span className="new-case-section-number">03</span>
            <div>
              <h2>Supporting evidence</h2>
              <p>Attach photos that help explain the issue.</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            className="new-case-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFiles}
            aria-label="Upload evidence images"
          />

          <button
            className="new-case-upload"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="new-case-upload-icon">
              <Upload size={21} />
            </span>
            <strong>Upload evidence images</strong>
            <span>JPG, PNG or WebP · Up to 5 MB per image</span>
            <span className="new-case-browse">Browse files</span>
          </button>

          {fileError && (
            <p className="new-case-error" role="alert">
              {fileError}
            </p>
          )}

          {files.length > 0 && (
            <div className="new-case-file-list">
              {files.map((file, index) => (
                <div
                  className="new-case-file-item"
                  key={`${file.name}-${file.size}-${index}`}
                >
                  <FileImage size={19} />
                  <div>
                    <strong>{file.name}</strong>
                    <small>
                      {(file.size / 1024).toFixed(0)} KB · Selected locally
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="new-case-evidence-note">
            <Info size={17} />
            <p>
              Evidence filenames and content types are recorded by the backend.
              Image contents are not permanently stored yet.
            </p>
          </div>
        </section>

        <div className="new-case-submit-bar">
          <div>
            <FileText size={18} />
            <span>
              <strong>Next: Resolution Passport</strong>
              <small>Review your case details after saving.</small>
            </span>
          </div>

          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating case..." : "Create case"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </main>
  );
}
