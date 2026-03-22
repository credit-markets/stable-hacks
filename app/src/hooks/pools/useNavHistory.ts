import { getNavHistory } from "@/services/poolService";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";

interface UseNavHistoryOptions {
  from?: string;
  to?: string;
}

export function useNavHistory(poolId: string, options?: UseNavHistoryOptions) {
  const { user } = useDynamicContext();

  return useQuery({
    queryKey: ["navHistory", poolId, options?.from, options?.to],
    queryFn: () => getNavHistory(poolId, options),
    enabled: !!poolId && !!user,
  });
}
