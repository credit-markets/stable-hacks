"use client";

import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import useUserRole from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";

export default function ManagerLayout({
  children,
}: { children: React.ReactNode }) {
  const { data: roles, isLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && roles && !roles.isManager) {
      toast.error("You don't have manager access");
      router.replace("/");
    }
  }, [isLoading, roles, router]);

  if (isLoading) {
    return <LoadingOverlay height="lg" />;
  }

  if (!roles?.isManager) {
    return null;
  }

  return <>{children}</>;
}
