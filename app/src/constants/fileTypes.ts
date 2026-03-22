// File type constants for upload system
export const FILE_TYPES = {
  IMAGE: "image",
  DOCUMENT: "document",
} as const;

// SubType constants for file organization
export const FILE_SUB_TYPES = {
  PROFILE_LOGO: "profile-logo",
  PROFILE_COVER: "profile-cover",
  TEAM_MEMBER: "team-member",
  POOL_LOGO: "pool-logo",
  POOL_PROSPECTUS: "pool-prospectus",
  POOL_DOCUMENT: "pool-document",
  PRODUCT_DOCUMENT: "product-document",
} as const;

// Type definitions derived from constants
export type FileType = (typeof FILE_TYPES)[keyof typeof FILE_TYPES];
export type FileSubType = (typeof FILE_SUB_TYPES)[keyof typeof FILE_SUB_TYPES];

// Valid combinations for validation
export const VALID_COMBINATIONS = {
  [FILE_TYPES.IMAGE]: [
    FILE_SUB_TYPES.PROFILE_LOGO,
    FILE_SUB_TYPES.PROFILE_COVER,
    FILE_SUB_TYPES.TEAM_MEMBER,
    FILE_SUB_TYPES.POOL_LOGO,
  ],
  [FILE_TYPES.DOCUMENT]: [
    FILE_SUB_TYPES.POOL_PROSPECTUS,
    FILE_SUB_TYPES.POOL_DOCUMENT,
    FILE_SUB_TYPES.PRODUCT_DOCUMENT,
  ],
} as const;
