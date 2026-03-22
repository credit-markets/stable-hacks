import { logger } from "@/lib/logger";
import { type User, api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function getReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("ref");
}

export function useUserCreation() {
  const { user, handleLogOut } = useDynamicContext();
  const queryClient = useQueryClient();

  const createUser = useMutation({
    mutationKey: ["create-user"],
    mutationFn: (address: string) => {
      const email = user?.email;
      const userId = user?.userId;

      const referralCode = getReferralCode();

      const data = {
        ...(referralCode && { referred_by: referralCode }),
        authorized: [
          {
            address,
            email,
            id: userId,
            default: true,
          },
        ],
      };

      return api.post<User>("/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["userRoles"] });
    },
    onError: async (error: unknown) => {
      logger.error("User creation failed", error);
      const status = (error as any)?.response?.status;
      if (status === 401) {
        await handleLogOut();
      }
    },
  });

  return { createUser, isCreating: createUser.isPending };
}
