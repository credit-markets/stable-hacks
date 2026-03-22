"use client";

import { cx, styles } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import { type ReactElement, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityFormData {
  email: string;
  entity_name: string;
  placeOfIncorporation: string;
}

export interface EntityFormProps {
  initialEmail?: string;
  onBack: () => void;
  onSubmit: (data: EntityFormData) => void;
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

export function EntityForm({
  initialEmail,
  onBack,
  onSubmit,
}: EntityFormProps): ReactElement {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [entity_name, setEntityName] = useState("");
  const [placeOfIncorporation, setPlaceOfIncorporation] = useState("");
  const [touched, setTouched] = useState({
    email: false,
    entity_name: false,
    placeOfIncorporation: false,
  });

  // Validation
  const errors = {
    email: !email.trim() || !isValidEmail(email),
    entity_name: !entity_name.trim(),
    placeOfIncorporation: !placeOfIncorporation.trim(),
  };

  const isFormValid =
    !errors.email && !errors.entity_name && !errors.placeOfIncorporation;

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onSubmit({
        email: email.trim(),
        entity_name: entity_name.trim(),
        placeOfIncorporation: placeOfIncorporation.trim(),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Section Title */}
      <h3 className="text-lg font-medium text-text-primary mb-4">
        Legal Entity Information
      </h3>

      {/* Email Field */}
      <div>
        <label
          htmlFor="entity-email"
          className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1.5 block"
        >
          Email *
        </label>
        <input
          id="entity-email"
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

      {/* Entity Fields - 2 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Entity Name */}
        <div>
          <label
            htmlFor="entity-name"
            className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1.5 block"
          >
            Entity Name *
          </label>
          <input
            id="entity-name"
            type="text"
            value={entity_name}
            onChange={(e) => setEntityName(e.target.value)}
            onBlur={() => handleBlur("entity_name")}
            placeholder="Enter entity name"
            className={cx(
              styles.input,
              touched.entity_name && errors.entity_name && "border-red-500",
            )}
          />
        </div>

        {/* Place of Incorporation */}
        <div>
          <label
            htmlFor="entity-incorporation"
            className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1.5 block"
          >
            Place of Incorporation *
          </label>
          <input
            id="entity-incorporation"
            type="text"
            value={placeOfIncorporation}
            onChange={(e) => setPlaceOfIncorporation(e.target.value)}
            onBlur={() => handleBlur("placeOfIncorporation")}
            placeholder="Enter place of incorporation"
            className={cx(
              styles.input,
              touched.placeOfIncorporation &&
                errors.placeOfIncorporation &&
                "border-red-500",
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
