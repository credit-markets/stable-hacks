import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { PROJECT_INFO } from "@/utils/projectInfo";
import { Suspense } from "react";
import { DashboardView } from "../components/DashboardView";

export const metadata = {
  title: `Home | ${PROJECT_INFO.name}`,
  description:
    "Institutional access to asset-backed private credit in emerging markets",
};

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingOverlay height="lg" />}>
      <DashboardView />
    </Suspense>
  );
}
