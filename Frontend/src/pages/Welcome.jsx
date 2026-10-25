
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useApp } from "../context/useApp.js";
import "./Welcome.css";

export default function Welcome() {
  const navigate = useNavigate();
  const { signInDemo } = useApp();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateForm() {
    const nextErrors = {};
    const trimmedName = name.trim();
    const digits = phone.replace(/\D/g, "");

    if (trimmedName.length < 2) {
      nextErrors.name = "Please enter your full name.";
    }

    if (digits.length < 7 || digits.length > 15) {
      nextErrors.phone = "Enter a valid phone number.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    const profile = {
      name: name.trim(),
      phone: `${countryCode} ${phone.trim()}`,
      identityMode: "demo",
    };

    // This is a demo identity flow, not secure authentication.
    signInDemo(profile);
    navigate("/", { replace: true });
  }

  return (
    <main className="welcome-page">
      <header className="welcome-header">
        <a className="welcome-brand" href="/welcome">
          <span className="welcome-brand-mark">
            <ShieldCheck size={23} />
          </span>
          <span>OrderAid</span>
        </a>

        <span className="welcome-header-note">
          Your order. Your options. Your resolution.
        </span>
      </header>

      <section className="welcome-content">
        <div className="welcome-intro">
          <span className="welcome-eyebrow">
            <Sparkles size={15} />
            YOUR PERSONAL RESOLUTION ASSISTANT
          </span>

          <h1>
            Shopping problems?
            <br />
            <span>Let's sort them out.</span>
          </h1>

          <p className="welcome-description">
            OrderAid helps you understand retailer policies, organize your
            evidence and prepare a resolution request — with you in control
            at every step.
          </p>

          <div className="welcome-benefits">
            <div>
              <span className="benefit-icon">
                <ShieldCheck size={18} />
              </span>
              <span>
                <strong>You're in control</strong>
                <small>Review every request before action.</small>
              </span>
            </div>

            <div>
              <span className="benefit-icon">
                <Sparkles size={18} />
              </span>
              <span>
                <strong>Evidence-backed requests</strong>
                <small>Bring policies and order details together.</small>
              </span>
            </div>
          </div>
        </div>

        <section className="welcome-form-card">
          <div className="welcome-form-heading">
            <span className="welcome-form-icon">
              <ShieldCheck size={23} />
            </span>
            <p className="welcome-form-label">GET STARTED</p>
            <h2>Welcome to OrderAid</h2>
            <p>Tell us a little about yourself to continue.</p>
          </div>

          <form className="welcome-form" onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label htmlFor="full-name">Full name</label>
              <input
                id="full-name"
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((previous) => ({
                    ...previous,
                    name: "",
                  }));
                }}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p className="field-error" id="name-error">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="phone-number">Phone number</label>
              <div className="phone-input">
                <select
                  aria-label="Country calling code"
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+61">🇦🇺 +61</option>
                </select>

                <input
                  id="phone-number"
                  type="tel"
                  autoComplete="tel-national"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setErrors((previous) => ({
                      ...previous,
                      phone: "",
                    }));
                  }}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
              </div>

              {errors.phone && (
                <p className="field-error" id="phone-error">
                  {errors.phone}
                </p>
              )}
            </div>

            <button
              className="welcome-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Opening your workspace..." : "Continue"}
              {!isSubmitting && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="welcome-privacy">
            <ShieldCheck size={16} />
            <p>
              Your case details are intended to be handled securely. This
              demo uses local browser storage and does not verify your
              identity.
            </p>
          </div>

          <p className="welcome-demo-note">
            DEMO MODE · NO PHONE VERIFICATION
          </p>
        </section>
      </section>

      <footer className="welcome-footer">
        <span>© 2026 OrderAid</span>
        <span>Built for fairer order resolutions.</span>
      </footer>
    </main>
  );
}
