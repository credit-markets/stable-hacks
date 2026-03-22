/**
 * Standardized size definitions for images, avatars, and icons.
 * Ensures consistency across PoolLogo, ProfileLogo, and other components.
 */

export const IMAGE_SIZES = {
  xs: { class: "w-8 h-8", px: 32 },
  sm: { class: "w-10 h-10", px: 40 },
  md: { class: "w-12 h-12", px: 48 },
  lg: { class: "w-16 h-16", px: 64 },
  xl: { class: "w-24 h-24", px: 96 },
} as const;

export const AVATAR_SIZES = {
  sm: { class: "h-16 w-16 text-2xl" },
  md: { class: "h-20 w-20 text-3xl" },
  lg: { class: "h-24 w-24 text-4xl" },
  xl: { class: "h-24 w-24 text-4xl" }, // Unified with lg per audit
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;
export type AvatarSize = keyof typeof AVATAR_SIZES;
