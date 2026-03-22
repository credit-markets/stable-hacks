"use client";

import { useImageUrl } from "@/hooks/useFileUrl";
import { Avatar } from "@nextui-org/avatar";
import type { AvatarProps } from "@nextui-org/react";

interface FileAvatarProps extends Omit<AvatarProps, "src"> {
  path?: string;
}

export function FileAvatar({
  path,
  name,
  className,
  ...props
}: FileAvatarProps) {
  const { url, urlError, isNotFound, isForbidden, isUnauthorized } =
    useImageUrl(path);

  // Concise aria label for errors
  let ariaLabel = name ? `${name}'s photo` : "Profile photo";

  if (urlError) {
    if (isNotFound) ariaLabel = `${name || "User"} photo not found`;
    else if (isForbidden) ariaLabel = `${name || "User"} photo expired`;
    else if (isUnauthorized)
      ariaLabel = `${name || "User"} photo access denied`;
    else ariaLabel = `${name || "User"} photo unavailable`;
  }

  return (
    <Avatar
      src={url || undefined}
      name={name}
      className={className}
      aria-label={ariaLabel}
      {...props}
    />
  );
}
