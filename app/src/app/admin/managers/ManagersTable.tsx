"use client";

import ManagerDetailsModal from "@/components/ManagerDetailsModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import {
  useAdminManagers,
  useRegisterManager,
} from "@/hooks/admin/useAdminManagers";
import { cx, styles } from "@/lib/styleClasses";
import type { Manager } from "@/services/api";
import { formatAddress } from "@/utils/formatAddress";
import { formatDate } from "@/utils/formatDate";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/table";
import { AlertCircle, Eye, Plus, UserCog } from "lucide-react";
import { useState } from "react";
import type { Key } from "react";
import toast from "react-hot-toast";

export default function ManagerProfiles() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newManagerWallet, setNewManagerWallet] = useState("");

  const {
    data: profilesData,
    isLoading,
    isError,
    error,
  } = useAdminManagers(page, pageSize);
  const { user } = useDynamicContext();

  const registerMutation = useRegisterManager();

  const profiles = profilesData?.data || [];
  const totalPages = profilesData?.pagination?.totalPages || 1;
  const totalItems = profilesData?.pagination?.total || 0;

  const handleViewDetails = (manager: Manager) => {
    setSelectedManager(manager);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedManager(null);
  };

  const handleAddManager = async () => {
    const address = newManagerWallet.trim();
    if (!address) return;
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      toast.error("Invalid Solana wallet address");
      return;
    }
    await toast.promise(registerMutation.mutateAsync(address), {
      loading: "Registering manager...",
      success: "Manager registered successfully",
      error: (err: any) =>
        err?.response?.data?.message || "Failed to register manager",
    });
    setNewManagerWallet("");
    setIsAddModalOpen(false);
  };

  const renderCell = (manager: Manager, columnKey: string) => {
    switch (columnKey) {
      case "company":
        return manager.company_name === manager.owner_address ? (
          <span className={styles.tableCellMuted}>Profile incomplete</span>
        ) : (
          <span className={styles.tableCell}>
            {manager.company_name || "N/A"}
          </span>
        );
      case "wallet":
        return (
          <span className="font-mono text-xs">
            {formatAddress(manager.owner_address)}
          </span>
        );
      case "created_at":
        return (
          <span className={styles.tableCellMuted}>
            {formatDate(manager.created_at)}
          </span>
        );
      case "actions":
        return (
          <div className="flex justify-end items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              startContent={<Eye className="w-4 h-4" />}
              onPress={() => handleViewDetails(manager)}
            >
              View
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  // Pagination helpers
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="space-y-6">
      {!user ? (
        <div className="flex justify-center h-[400px] items-center">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-warning" />
            <h2 className={styles.headingSm}>Authentication Required</h2>
            <p className={styles.bodyMd}>
              Please login to view and manage profiles
            </p>
          </div>
        </div>
      ) : isError ? (
        <div className="flex justify-center h-[400px] items-center">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-danger" />
            <h2 className={styles.headingSm}>Error Loading Profiles</h2>
            <p className={cx(styles.bodyMd, "text-danger")}>
              {error instanceof Error
                ? error.message
                : "Please try again later"}
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <LoadingOverlay height="lg" />
      ) : (
        <>
          {/* Header row: title + Add Manager button */}
          <div className="flex items-center justify-between">
            <h1 className={styles.headingLg}>Managers</h1>
            <Button
              color="primary"
              startContent={<Plus className="w-4 h-4" />}
              onPress={() => setIsAddModalOpen(true)}
            >
              Add Manager
            </Button>
          </div>

          {/* Table wrapped in card */}
          <div className={cx(styles.card, "overflow-hidden")}>
            <Table
              aria-label="Manager profiles table"
              classNames={{ table: "min-w-[600px]" }}
            >
              <TableHeader>
                <TableColumn key="company">COMPANY</TableColumn>
                <TableColumn key="wallet">WALLET</TableColumn>
                <TableColumn key="created_at">CREATED</TableColumn>
                <TableColumn key="actions" align="end">
                  ACTIONS
                </TableColumn>
              </TableHeader>
              <TableBody
                items={profiles}
                emptyContent={
                  <EmptyState
                    icon={<UserCog />}
                    title="No manager profiles found"
                    message="Manager profiles will appear here once they are created"
                    size="md"
                  />
                }
              >
                {(manager) => (
                  <TableRow key={manager.id}>
                    {(columnKey: Key) => (
                      <TableCell>
                        {renderCell(manager, String(columnKey))}
                      </TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination: Previous/Next with count */}
          <div className="flex items-center justify-between">
            <p className={styles.bodySm}>
              Showing {startItem} to {endItem} of {totalItems}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="flat"
                isDisabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="flat"
                isDisabled={page >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>

          {/* View Details Modal */}
          <ManagerDetailsModal
            isOpen={isModalOpen}
            onClose={closeModal}
            manager={selectedManager}
          />

          {/* Add Manager Modal */}
          <Modal
            isOpen={isAddModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setNewManagerWallet("");
            }}
          >
            <ModalContent>
              <ModalHeader>
                <span className={styles.headingMd}>Add Manager</span>
              </ModalHeader>
              <ModalBody>
                <Input
                  label="Wallet Address"
                  labelPlacement="outside"
                  placeholder="Enter Solana wallet address"
                  variant="bordered"
                  value={newManagerWallet}
                  onChange={(e) => setNewManagerWallet(e.target.value)}
                  classNames={{
                    inputWrapper: "border-1 rounded-lg",
                    input: "font-mono text-sm",
                  }}
                />
                <p className={styles.bodySm}>
                  This will register the wallet address as a manager, allowing
                  them to create a profile and manage pools.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  onPress={() => {
                    setIsAddModalOpen(false);
                    setNewManagerWallet("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  isDisabled={
                    !newManagerWallet.trim() || registerMutation.isPending
                  }
                  isLoading={registerMutation.isPending}
                  onPress={handleAddManager}
                >
                  Register Manager
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </>
      )}
    </div>
  );
}
