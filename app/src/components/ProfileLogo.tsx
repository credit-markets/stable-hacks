"use client";

import { AVATAR_SIZES, type AvatarSize } from "@/constants/sizes";
import { useImageUrl } from "@/hooks/useFileUrl";
import { Image } from "@nextui-org/image";
import { cn } from "@nextui-org/theme";
import type { HTMLAttributes } from "react";

interface ProfileLogoProps extends HTMLAttributes<HTMLDivElement> {
  imageUrl?: string;
  name: string;
  size?: AvatarSize;
  className?: string;
}

export function ProfileLogo({
  imageUrl,
  name,
  size = "xl",
  className,
  ...props
}: ProfileLogoProps) {
  const { url: signedImageUrl } = useImageUrl(imageUrl);

  // Get initials for profile picture fallback
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center overflow-hidden",
        imageUrl && signedImageUrl ? "bg-surface-hover" : "bg-text-primary",
        AVATAR_SIZES[size].class,
        className,
      )}
      {...props}
    >
      {imageUrl && signedImageUrl ? (
        <Image
          src={signedImageUrl}
          alt={name}
          className="object-cover w-full h-full"
        />
      ) : (
        <div className="text-white font-bold">{getInitials(name || "")}</div>
      )}
    </div>
  );
}
