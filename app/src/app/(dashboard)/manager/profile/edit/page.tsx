"use client";

import { FileUpload } from "@/components/FileUpload";
import { ContentWrapper } from "@/components/HeroSection";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { FILE_SUB_TYPES, FILE_TYPES } from "@/constants/fileTypes";
import {
  ACCEPTED_IMAGE_TYPES_WITH_GIF,
  DIMENSION_PRESETS,
  FILE_SIZE_LIMITS,
} from "@/constants/fileUpload";
import { useCreateManagerProfile } from "@/hooks/managers/useCreateManagerProfile";
import { useManagerProfile } from "@/hooks/managers/useManagerProfile";
import { useUpdateManagerProfile } from "@/hooks/managers/useUpdateManagerProfile";
import { logger } from "@/lib/logger";
import { cx, styles } from "@/lib/styleClasses";
import type { ManagerProfileFormValues } from "@/lib/validations/managerProfileSchema";
import { Button } from "@nextui-org/button";
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function EditProfilePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: profile, isLoading: isProfileLoading } = useManagerProfile();
  const createProfile = useCreateManagerProfile();
  const updateProfile = useUpdateManagerProfile();

  const isCreateMode = !isProfileLoading && !profile;
  const [logoPath, setLogoPath] = useState(profile?.logo_path || "");

  const form = useForm<ManagerProfileFormValues>({
    defaultValues: {
      company_name: profile?.company_name || "",
      overview: profile?.overview || "",
      logo_path: profile?.logo_path || "",
      website: profile?.website || "",
    },
    onSubmit: async ({ value }) => {
      try {
        setIsSubmitting(true);
        if (isCreateMode) {
          await createProfile.mutateAsync(value);
          toast.success("Profile created successfully!");
        } else {
          await updateProfile.mutateAsync({
            managerId: profile?.id ?? "",
            data: value,
          });
          toast.success("Profile updated successfully!");
        }
        router.push("/manager/profile");
      } catch (error) {
        logger.error("Failed to save profile", error, {
          component: "EditProfilePage",
        });
        toast.error("Failed to save profile. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (profile) {
      form.update({
        defaultValues: {
          company_name: profile.company_name || "",
          overview: profile.overview || "",
          logo_path: profile.logo_path || "",
          website: profile.website || "",
        },
      });
      setLogoPath(profile.logo_path || "");
    }
  }, [profile, form]);

  if (isProfileLoading) {
    return <LoadingOverlay height="lg" />;
  }

  const backHref = isCreateMode ? "/manager" : "/manager/profile";
  const pageTitle = isCreateMode ? "Create Profile" : "Edit Profile";
  const submitLabel = isSubmitting
    ? "Saving..."
    : isCreateMode
      ? "Create Profile"
      : "Save Changes";

  return (
    <ContentWrapper className="py-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Navigation */}
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Manager", href: "/manager" },
            { label: isCreateMode ? "Create Profile" : "Edit Profile" },
          ]}
        />

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className={cx(styles.card, styles.cardPadding, "space-y-6")}>
            <h2 className={styles.headingMd}>{pageTitle}</h2>

            {/* Company Name */}
            <form.Field name="company_name">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor={field.name} className={styles.labelPrimary}>
                    Company Name *
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-dimensional-gray"
                    placeholder="Your company name"
                  />
                  {field.state.meta.errors?.length > 0 && (
                    <p className="text-xs text-red-500">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Logo Upload */}
            <form.Field name="logo_path">
              {(field) => (
                <FileUpload
                  label="Company Logo"
                  value={logoPath}
                  onChange={(path) => {
                    field.handleChange(path);
                    setLogoPath(path);
                  }}
                  fileType={FILE_TYPES.IMAGE}
                  subType={FILE_SUB_TYPES.PROFILE_LOGO}
                  validation={{
                    maxSizeMB: FILE_SIZE_LIMITS.IMAGE_MB,
                    requireSquare: false,
                    minDimensions: DIMENSION_PRESETS.PROFILE_LOGO,
                    allowedTypes: ACCEPTED_IMAGE_TYPES_WITH_GIF,
                  }}
                  size="md"
                />
              )}
            </form.Field>

            {/* Overview */}
            <form.Field name="overview">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor={field.name} className={styles.labelPrimary}>
                    Overview
                  </label>
                  <textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value ?? ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    rows={5}
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-dimensional-gray"
                    placeholder="Describe your company..."
                  />
                </div>
              )}
            </form.Field>

            {/* Website */}
            <form.Field name="website">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor={field.name} className={styles.labelPrimary}>
                    Website
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    value={field.state.value ?? ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full rounded-md border border-subtle bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-dimensional-gray"
                    placeholder="https://yourcompany.com"
                  />
                  {field.state.meta.errors?.length > 0 && (
                    <p className="text-xs text-red-500">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Link href={backHref}>
                <button
                  type="button"
                  className={cx(
                    styles.btnBase,
                    styles.btnSecondary,
                    styles.btnMd,
                  )}
                >
                  Cancel
                </button>
              </Link>
              <Button
                type="submit"
                isLoading={isSubmitting}
                className={cx(styles.btnBase, styles.btnPrimary, styles.btnMd)}
              >
                {submitLabel}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </ContentWrapper>
  );
}
