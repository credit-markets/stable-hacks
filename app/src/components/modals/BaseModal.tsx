import { ModalCloseButton } from "@/components/ui/buttons";
import { styles } from "@/lib/styleClasses";
import { Chip } from "@nextui-org/chip";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/modal";
import { ScrollShadow } from "@nextui-org/scroll-shadow";
import type React from "react";
import type { ReactNode } from "react";

interface StatusConfig {
  label: string;
  color: "success" | "warning" | "danger" | "default" | "primary" | "secondary";
}

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  status?: StatusConfig;
  children: ReactNode;
  size?: "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  scrollBehavior?: "inside" | "outside";
  footer?: ReactNode;
  showCloseButton?: boolean;
}

export function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  status,
  children,
  size = "4xl",
  scrollBehavior = "inside",
  footer,
  showCloseButton = true,
}: BaseModalProps): React.ReactElement {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      scrollBehavior={scrollBehavior}
      classNames={{
        base: `bg-surface-card border border-subtle shadow-modal
          max-sm:rounded-none max-sm:m-0 max-sm:w-full max-sm:h-full max-sm:max-h-full
          sm:rounded-lg
          ${scrollBehavior === "inside" ? "sm:max-h-[90vh]" : ""}`,
        body: scrollBehavior === "inside" ? "p-0" : "",
        closeButton:
          "bg-surface-hover hover:bg-border-subtle rounded-md p-1 transition-colors",
      }}
    >
      <ModalContent>
        <>
          <ModalHeader className="flex flex-col gap-1 px-4 sm:px-6 py-3 sm:py-4 border-b border-subtle">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <h3 className={styles.headingLg}>{title}</h3>
                  {subtitle && <p className={styles.bodySm}>{subtitle}</p>}
                </div>
                {status && (
                  <Chip color={status.color} variant="flat" size="sm">
                    {status.label}
                  </Chip>
                )}
              </div>
            </div>
          </ModalHeader>

          <ModalBody className={scrollBehavior === "inside" ? "px-0" : ""}>
            {scrollBehavior === "inside" ? (
              <ScrollShadow className="px-4 sm:px-6 py-4 sm:py-6 max-h-[calc(100vh-120px)] sm:max-h-[calc(90vh-200px)]">
                {children}
              </ScrollShadow>
            ) : (
              <div className="p-4 sm:p-6">{children}</div>
            )}
          </ModalBody>

          {(footer || showCloseButton) && (
            <ModalFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t border-subtle">
              {footer || <ModalCloseButton onClose={onClose} />}
            </ModalFooter>
          )}
        </>
      </ModalContent>
    </Modal>
  );
}
