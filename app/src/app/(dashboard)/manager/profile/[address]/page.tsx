"use client";

import { ManagerProfile } from "@/app/(dashboard)/manager/profile/components/ManagerProfile";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useManagerProfile } from "@/hooks/managers/useManagerProfile";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useParams } from "next/navigation";

export default function ManagerAddressProfilePage() {
  const params = useParams();
  const profileQuery = useManagerProfile(params.address as string);
  const profile = profileQuery?.data;
  const { data: userData } = useCurrentUser();

  // Loading state
  if (profileQuery.isLoading) {
    return <LoadingOverlay height="lg" />;
  }

  // Error state
  if (profileQuery.isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Failed to load profile</h2>
        <p className="mb-6 text-neutral-600">
          The profile information couldn't be loaded.
        </p>
      </div>
    );
  }

  // Compare account addresses
  const isSameUser = profile.owner_address === userData?.account;

  return <ManagerProfile profile={profile} isOwner={isSameUser} />;
}
