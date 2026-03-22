"use client";

import { BaseModal, DetailSection } from "@/components/modals";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useEnrichedUserQuery } from "@/hooks/admin/useEnrichedUserQuery";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { cx, styles } from "@/lib/styleClasses";
import type { EnrichedUser } from "@/services/api";
import { formatAddress } from "@/utils/formatAddress";
import { formatDate } from "@/utils/formatDate";
import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import { Input } from "@nextui-org/input";
import type { SortDescriptor } from "@nextui-org/react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/table";
import {
  Building2,
  Calendar,
  Copy,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [pageSize, setPageSize] = useState(
    Number(searchParams.get("pageSize") || 10),
  );
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: searchParams.get("sortBy") || "created_at",
    direction:
      (searchParams.get("sortOrder") as "ascending" | "descending") ||
      "descending",
  });
  const [filterValue, setFilterValue] = useState(
    searchParams.get("filter") || "",
  );
  // Add client-side only state to prevent hydration errors
  const [isClient, setIsClient] = useState(false);
  const [selectedUser, setSelectedUser] = useState<EnrichedUser | null>(null);

  // Set isClient to true after component mounts to ensure consistent rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Use our custom hook to fetch and manage users
  const { users, pagination, isLoading, refetch } = useAdminUsers({
    page,
    pageSize,
    sortBy: sortDescriptor.column?.toString(),
    sortOrder: sortDescriptor.direction as "ascending" | "descending",
    filter: filterValue,
  });

  // Fetch fresh enriched data when a user is selected
  const { data: enrichedUser } = useEnrichedUserQuery(selectedUser?.id);

  const updateSearchParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("sortBy", String(sortDescriptor.column));
    params.set("sortOrder", String(sortDescriptor.direction));

    if (filterValue) {
      params.set("filter", filterValue);
    } else {
      params.delete("filter");
    }

    router.push(`?${params.toString()}`);
  }, [page, pageSize, sortDescriptor, filterValue, router, searchParams]);

  useEffect(() => {
    updateSearchParams();
  }, [updateSearchParams]);

  const columns: {
    name: string;
    uid: string;
    sortable: boolean;
    align?: "start" | "center" | "end";
  }[] = [
    { name: "ACCOUNT", uid: "account", sortable: true },
    { name: "VERIFIED", uid: "verified", sortable: false },
    { name: "ENTITY", uid: "entity", sortable: false },
    { name: "JOINED", uid: "joined", sortable: true },
    { name: "ACTIONS", uid: "actions", sortable: false, align: "end" },
  ];

  const renderCell = (user: EnrichedUser, columnKey: string) => {
    switch (columnKey) {
      case "account":
        return (
          <button
            type="button"
            onClick={() => handleCopyAddress(user.account)}
            className="flex items-center gap-1.5 font-mono text-xs hover:text-primary hover:underline transition-colors cursor-pointer group/copy"
            title="Click to copy address"
          >
            {user.account ? formatAddress(user.account) : "-"}
            <Copy className="w-3 h-3 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
          </button>
        );
      case "verified":
        return (
          <Chip
            size="sm"
            variant="flat"
            color={user.kyc_attestation ? "success" : "default"}
          >
            {user.kyc_attestation ? "Yes" : "No"}
          </Chip>
        );
      case "entity":
        return (
          <span className={styles.tableCell}>
            {user.kyb?.legal_name || "\u2014"}
          </span>
        );
      case "joined":
        return (
          <span className={styles.tableCellMuted}>
            {formatDate(user.created_at)}
          </span>
        );
      case "actions":
        return (
          <div className="flex justify-end items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              startContent={<Eye className="w-4 h-4" />}
              onPress={() => setSelectedUser(user)}
            >
              View
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address).then(
      () => toast.success("Address copied"),
      () => toast.error("Failed to copy address"),
    );
  };

  // Use enriched data when available, fall back to selected user
  const displayUser = enrichedUser || selectedUser;

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1;

  // Show spinner during SSR hydration to prevent blank flash
  if (!isClient) {
    return <LoadingOverlay height="lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={styles.headingLg}>Users</h1>
        <Button
          color="primary"
          size="sm"
          isIconOnly
          aria-label="Refresh"
          onPress={() => refetch()}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <Input
        classNames={{
          base: "w-full sm:max-w-[44%]",
          inputWrapper: "border-1",
        }}
        placeholder="Search users..."
        startContent={<Search className="w-4 h-4 text-default-300" />}
        value={filterValue}
        onValueChange={setFilterValue}
      />

      {isLoading ? (
        <LoadingOverlay height="lg" />
      ) : (
        <>
          <div className={cx(styles.card, "overflow-hidden")}>
            <Table
              aria-label="Users table"
              sortDescriptor={sortDescriptor}
              onSortChange={(descriptor) =>
                setSortDescriptor(descriptor as SortDescriptor)
              }
              classNames={{
                table: "min-w-[600px]",
              }}
            >
              <TableHeader columns={columns}>
                {(column) => (
                  <TableColumn
                    key={column.uid}
                    allowsSorting={column.sortable}
                    align={column.align}
                  >
                    {column.name}
                  </TableColumn>
                )}
              </TableHeader>
              <TableBody
                items={users}
                emptyContent={
                  <EmptyState
                    icon={<Users />}
                    title="No users found"
                    message="Try adjusting your search or filters"
                    size="md"
                  />
                }
              >
                {(user: EnrichedUser) => (
                  <TableRow key={user.id}>
                    {(columnKey: React.Key) => (
                      <TableCell>
                        {renderCell(user, String(columnKey))}
                      </TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className={styles.bodySm}>
              Showing {pagination ? (page - 1) * pageSize + 1 : 0} to{" "}
              {pagination ? Math.min(page * pageSize, pagination.total) : 0} of{" "}
              {pagination?.total ?? 0} users
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
                onPress={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* User Detail Modal */}
      <BaseModal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="User Profile"
        subtitle={displayUser?.account ? `ID: ${displayUser.id}` : undefined}
        size="xl"
        footer={
          <Button variant="flat" onPress={() => setSelectedUser(null)}>
            Close
          </Button>
        }
        showCloseButton={false}
      >
        {displayUser && (
          <div className="space-y-6">
            {/* Wallet */}
            <DetailSection title="Wallet" icon={Wallet}>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm break-all">
                  {displayUser.account}
                </code>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  aria-label="Copy wallet address"
                  onPress={() => handleCopyAddress(displayUser.account)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </DetailSection>

            {/* Verification */}
            <DetailSection title="Verification" icon={ShieldCheck}>
              <Chip
                size="sm"
                variant="flat"
                color={displayUser.kyc_attestation ? "success" : "default"}
              >
                {displayUser.kyc_attestation ? "Verified" : "Not Verified"}
              </Chip>
            </DetailSection>

            {/* KYB Information */}
            {displayUser.kyb && (
              <DetailSection title="KYB Information" icon={Building2}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className={styles.labelSecondary}>Legal Name</p>
                    <p className={styles.bodyMd}>
                      {displayUser.kyb.legal_name}
                    </p>
                  </div>
                  <div>
                    <p className={styles.labelSecondary}>Status</p>
                    <Chip size="sm" variant="flat" className="mt-0.5">
                      {displayUser.kyb.status}
                    </Chip>
                  </div>
                  {displayUser.kyb.risk_score != null && (
                    <div>
                      <p className={styles.labelSecondary}>Risk Score</p>
                      <p className={styles.bodyMd}>
                        {displayUser.kyb.risk_score}
                      </p>
                    </div>
                  )}
                  {displayUser.kyb.risk_band && (
                    <div>
                      <p className={styles.labelSecondary}>Risk Band</p>
                      <Chip
                        size="sm"
                        variant="flat"
                        className="mt-0.5"
                        color={
                          displayUser.kyb.risk_band === "low"
                            ? "success"
                            : displayUser.kyb.risk_band === "medium"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {displayUser.kyb.risk_band}
                      </Chip>
                    </div>
                  )}
                </div>
              </DetailSection>
            )}

            {/* Timestamps */}
            <div className="flex justify-between items-center">
              <div>
                <p className={styles.labelSecondary}>Joined</p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-text-muted" />
                  <span className={styles.bodySm}>
                    {formatDate(displayUser.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
