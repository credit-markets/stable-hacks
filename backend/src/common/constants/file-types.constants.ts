// File type constants for upload system
export const FILE_TYPES = {
  IMAGE: 'image',
  DOCUMENT: 'document',
} as const;

// SubType constants for file organization
export const FILE_SUB_TYPES = {
  PROFILE_LOGO: 'profile-logo',
  PROFILE_COVER: 'profile-cover',
  TEAM_MEMBER: 'team-member',
  POOL_LOGO: 'pool-logo',
  POOL_PROSPECTUS: 'pool-prospectus',
  POOL_DOCUMENT: 'pool-document',
  PRODUCT_DOCUMENT: 'product-document',
} as const;

// Arrays for validation
export const VALID_FILE_TYPES = Object.values(FILE_TYPES);
export const VALID_SUB_TYPES = Object.values(FILE_SUB_TYPES);

// Type definitions
export type FileType = (typeof FILE_TYPES)[keyof typeof FILE_TYPES];
export type FileSubType = (typeof FILE_SUB_TYPES)[keyof typeof FILE_SUB_TYPES];
