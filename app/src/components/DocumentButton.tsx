"use client";

import { useDocumentUrl } from "@/hooks/useFileUrl";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";
import type { ButtonProps } from "@nextui-org/react";

interface DocumentButtonProps extends Omit<ButtonProps, "href" | "as"> {
  document: { title: string; path: string };
  children: React.ReactNode;
}

export function DocumentButton({
  document,
  children,
  ...buttonProps
}: DocumentButtonProps) {
  const {
    url,
    isLoadingUrl,
    urlError,
    isNotFound,
    isForbidden,
    isUnauthorized,
    isInvalidPath,
  } = useDocumentUrl(document.path);

  if (isLoadingUrl) {
    return (
      <Button
        {...buttonProps}
        isLoading
        aria-label={`Loading ${document.title}`}
      >
        Loading…
      </Button>
    );
  }

  if (urlError || !url) {
    let errorMessage = "Document Unavailable";
    let ariaLabel = `${document.title} is currently unavailable`;

    if (isNotFound) {
      errorMessage = "Document Not Found";
      ariaLabel = `${document.title} was not found`;
    } else if (isForbidden) {
      errorMessage = "Access Expired";
      ariaLabel = `Access to ${document.title} has expired`;
    } else if (isUnauthorized) {
      errorMessage = "Access Denied";
      ariaLabel = `You don't have permission to access ${document.title}`;
    } else if (isInvalidPath) {
      errorMessage = "Invalid Document";
      ariaLabel = `${document.title} has an invalid file path`;
    }

    return (
      <Button {...buttonProps} isDisabled aria-label={ariaLabel}>
        {errorMessage}
      </Button>
    );
  }

  return (
    <Button as={Link} href={url} isExternal {...buttonProps}>
      {children}
    </Button>
  );
}
