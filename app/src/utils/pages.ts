/**
 * Application routes mapping
 * Centralized definition of all application routes for consistent usage in href attributes
 */

const PAGES = {
  // Root routes
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  ACCOUNT: "/account",
  PORTFOLIO: "/portfolio",
  MANAGER: {
    ROOT: "/manager",
    PROFILE: {
      OWN: "/manager/profile",
      BY_ID: (id: string) => `/manager/profile/${id}`,
      BY_ADDRESS: (address: string) => `/manager/profile/${address}`,
      EDIT: "/manager/profile/edit",
    },
    POOLS: {
      DETAIL: (poolId: string) => `/manager/pools/${poolId}`,
    },
  },

  // Pool routes
  POOL: {
    ROOT: "/pool",
    DETAILS: (address: string) => `/pool/${address}`,
  },
} as const;

export type Pages = typeof PAGES;

export default PAGES;
