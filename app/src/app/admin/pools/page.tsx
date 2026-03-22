"use client";

import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useAdminPoolsQuery } from "@/hooks/admin/useAdminPoolsQuery";
import { useTogglePoolVisibility } from "@/hooks/admin/useTogglePoolVisibility";
import { cx, styles } from "@/lib/styleClasses";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Plus, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import CreatePoolModal from "./components/CreatePoolModal";
import PoolDetailModal from "./components/PoolDetailModal";
import PoolsTable from "./components/PoolsTable";
import { usePoolModals } from "./hooks/usePoolModals";

export default function AdminPoolsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isCreatePoolOpen, setIsCreatePoolOpen] = useState(false);
  const [filterValue, setFilterValue] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    data: pools = [],
    isLoading,
    isError,
    refetch,
  } = useAdminPoolsQuery({});

  const toggleVisibility = useTogglePoolVisibility();

  const { modalState, openDetailsModal, closeModal } = usePoolModals();

  const handleToggleVisibility = (poolId: string, isVisible: boolean) => {
    toggleVisibility.mutate({ poolId, isVisible });
  };

  const filteredPools = useMemo(() => {
    if (!filterValue) return pools;
    const lower = filterValue.toLowerCase();
    return pools.filter(
      (p) =>
        p.title?.toLowerCase().includes(lower) ||
        p.pipeline_key?.toLowerCase().includes(lower) ||
        p.manager_name?.toLowerCase().includes(lower),
    );
  }, [pools, filterValue]);

  if (!isMounted) {
    return <LoadingOverlay height="lg" />;
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className={styles.headingLg}>Manage Pools</h1>
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
        <p className={cx(styles.bodyMd, "text-danger")}>
          Error loading pools. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className={styles.headingLg}>Manage Pools</h1>
        <div className="flex items-center gap-2">
          <Button
            color="primary"
            size="sm"
            isIconOnly
            aria-label="Refresh"
            onPress={() => refetch()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            color="primary"
            onPress={() => setIsCreatePoolOpen(true)}
            startContent={<Plus className="w-4 h-4" />}
          >
            Create Pool
          </Button>
        </div>
      </div>

      <Input
        classNames={{
          base: "w-full sm:max-w-[44%]",
          inputWrapper: "border-1",
        }}
        placeholder="Search pools..."
        startContent={<Search className="w-4 h-4 text-default-300" />}
        value={filterValue}
        onValueChange={setFilterValue}
      />

      <PoolsTable
        pools={filteredPools}
        loadingState={isLoading ? "loading" : "idle"}
        onViewDetails={openDetailsModal}
        onToggleVisibility={handleToggleVisibility}
      />

      <CreatePoolModal
        isOpen={isCreatePoolOpen}
        onClose={() => setIsCreatePoolOpen(false)}
      />

      {modalState.type === "details" && modalState.pool && (
        <PoolDetailModal
          pool={modalState.pool}
          isOpen={true}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
