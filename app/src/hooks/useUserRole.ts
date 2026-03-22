import { type UserRoles, getUserRoles } from "@/services/userService";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

export function useUserRole() {
  const { user } = useDynamicContext();
  return useQuery<UserRoles>({
    queryKey: ["userRoles"],
    queryFn: getUserRoles,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export default useUserRole;
