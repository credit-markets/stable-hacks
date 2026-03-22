import type { Pool } from "@/services/api";
import type { PaginationInfo } from "./pagination";

export interface PoolsResponse {
  data: Pool[];
  pagination: PaginationInfo;
}
