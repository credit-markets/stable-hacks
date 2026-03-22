"use client";

import { ContentWrapper } from "@/components/HeroSection";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useManagerProfile } from "@/hooks/managers/useManagerProfile";
import { CompleteProfileGate } from "./CompleteProfileGate";
import { ManagerHome } from "./ManagerHome";

export function ManagerContent() {
  const { data: profile, isLoading } = useManagerProfile();

  if (isLoading) {
    return (
      <ContentWrapper className="py-6">
        <LoadingOverlay height="lg" />
      </ContentWrapper>
    );
  }

  if (!profile) {
    return <CompleteProfileGate />;
  }

  return <ManagerHome />;
}
