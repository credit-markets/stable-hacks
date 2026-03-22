import { FileAvatar } from "@/components/FileAvatar";
import { BaseModal, DetailSection } from "@/components/modals";
import { cx, styles } from "@/lib/styleClasses";
import type { Manager } from "@/services/api";
import { formatDate } from "@/utils/formatDate";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";
import { Building, Calendar, CheckCircle, FileText, Globe } from "lucide-react";
import React from "react";

interface ManagerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  manager: Manager | null;
  onStatusChange?: (id: string, isActive: boolean) => Promise<void>;
}

export default function ManagerDetailsModal({
  isOpen,
  onClose,
  manager,
  onStatusChange,
}: ManagerDetailsModalProps) {
  if (!manager) return null;

  const handleStatusChange = async (isActive: boolean) => {
    if (onStatusChange) {
      await onStatusChange(manager.id, isActive);
    }
  };

  const renderFooter = () => (
    <>
      <Button variant="flat" onPress={onClose}>
        Close
      </Button>
      {onStatusChange && (
        <Button
          color="success"
          variant="flat"
          onPress={() => handleStatusChange(true)}
          startContent={<CheckCircle className="w-4 h-4" />}
        >
          Activate/Deactivate
        </Button>
      )}
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Manager Profile"
      subtitle={`ID: ${manager.id}`}
      size="4xl"
      scrollBehavior="inside"
      footer={renderFooter()}
      showCloseButton={false}
    >
      <div className="space-y-6">
        {/* Main Profile Info */}
        <div className="flex flex-col md:flex-row gap-4 items-center md:items-start">
          <FileAvatar
            path={manager.logo_path}
            name={manager.company_name.charAt(0)}
            size="lg"
            className="w-20 h-20 text-large border-4 border-white bg-default-200"
          />
          <div className="flex flex-col gap-1 mt-2">
            <h2 className={styles.headingMd}>{manager.company_name}</h2>
          </div>
        </div>

        {/* Overview */}
        {manager.overview && (
          <DetailSection title="Overview" icon={FileText}>
            <p className={styles.bodyMd}>{manager.overview}</p>
          </DetailSection>
        )}

        {/* Contact Information */}
        <DetailSection title="Contact Information" icon={Building}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {manager.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-text-muted flex-shrink-0" />
                <Link
                  href={
                    manager.website.startsWith("http")
                      ? manager.website
                      : `https://${manager.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm"
                >
                  {manager.website}
                </Link>
              </div>
            )}
          </div>
        </DetailSection>

        {/* Timestamps */}
        <div className="flex justify-between items-center">
          <div>
            <p className={styles.labelSecondary}>Created</p>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-text-muted" />
              <span className={styles.bodySm}>
                {formatDate(manager.created_at)}
              </span>
            </div>
          </div>
          <div>
            <p className={styles.labelSecondary}>Last Updated</p>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-text-muted" />
              <span className={styles.bodySm}>
                {formatDate(manager.updated_at)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
