"use client";

import { cx, styles } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import { type ReactElement, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IndividualFormData {
  email: string;
  firstName: string;
  lastName: string;
}

export interface IndividualFormProps {
  initialEmail?: string;
  onBack: () => void;
  onSubmit: (data: IndividualFormData) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function IndividualForm({
  initialEmail,
  onBack,
  onSubmit,
}: IndividualFormProps): ReactElement {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [touched, setTouched] = useState({
    email: false,
    firstName: false,
    lastName: false,
  });

  // Validation
  const errors = {
    email: !email.trim() || !isValidEmail(email),
    firstName: !firstName.trim(),
    lastName: !lastName.trim(),
  };

  const isFormValid = !errors.email && !errors.firstName && !errors.lastName;

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onSubmit({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Section Title */}
      <h3 className="text-lg font-medium text-text-primary mb-4">
        Individual Information
      </h3>

      {/* Email Field */}
      <div>
        <label
          htmlFor="individual-email"
          className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1.5 block"
        >
          Email *
        </label>
        <input
          id="individual-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => handleBlur("email")}
          placeholder="Enter your email"
          className={cx(
            styles.input,
            touched.email && errors.email && "border-red-500",
          )}
        />
      </div>

      {/* Name Fields - 2 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First Name */}
        <div>
          <label
            htmlFor="individual-firstName"
            className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1.5 block"
          >
            Legal First Name *
          </label>
          <input
            id="individual-firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onBlur={() => handleBlur("firstName")}
            placeholder="Enter your first name"
            className={cx(
              styles.input,
              touched.firstName && errors.firstName && "border-red-500",
            )}
          />
        </div>

        {/* Last Name */}
        <div>
          <label
            htmlFor="individual-lastName"
            className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1.5 block"
          >
            Legal Last Name *
          </label>
          <input
            id="individual-lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onBlur={() => handleBlur("lastName")}
            placeholder="Enter your last name"
            className={cx(
              styles.input,
              touched.lastName && errors.lastName && "border-red-500",
            )}
          />
        </div>
      </div>

      {/* Button Row */}
      <div className="flex justify-between items-center mt-6">
        <Button
          type="button"
          onClick={onBack}
          className={cx(styles.btnBase, styles.btnSecondary, styles.btnMd)}
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={!isFormValid}
          className={cx(
            styles.btnBase,
            styles.btnPrimary,
            styles.btnMd,
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          Continue
        </Button>
      </div>
    </form>
  );
}
