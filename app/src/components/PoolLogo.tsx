"use client";

import { Logo } from "@/components/icons/ina";
import { IMAGE_SIZES, type ImageSize } from "@/constants/sizes";
import { useImageUrl } from "@/hooks/useFileUrl";
import { Image } from "@nextui-org/image";
import { cn } from "@nextui-org/theme";

interface PoolLogoProps {
  src?: string | null;
  name?: string;
  size?: ImageSize;
  className?: string;
  showFallback?: boolean;
}

export function PoolLogo({
  src,
  name,
  size = "md",
  className,
  showFallback = true,
}: PoolLogoProps) {
  const { url: imageUrl } = useImageUrl(src || undefined);

  const renderContent = () => {
    if (src && imageUrl) {
      return (
        <Image
          src={imageUrl}
          alt={name ? `${name} logo` : "Pool logo"}
          className={cn(
            "object-contain rounded-lg",
            IMAGE_SIZES[size].class,
            className,
          )}
          classNames={{
            img: "object-contain",
            wrapper: cn(
              IMAGE_SIZES[size].class,
              "rounded-lg overflow-hidden bg-transparent",
            ),
          }}
        />
      );
    }

    if (showFallback) {
      return (
        <div
          className={cn(
            "flex items-center justify-center rounded-lg",
            IMAGE_SIZES[size].class,
            className,
          )}
        >
          <Logo size={IMAGE_SIZES[size].px} color="#393939" />
        </div>
      );
    }

    return null;
  };

  return renderContent();
}
