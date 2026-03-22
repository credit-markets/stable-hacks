"use client";

import type { Pool } from "@/services/api";
import { useCallback, useState } from "react";

type ModalType = "details" | null;

interface ModalState {
  type: ModalType;
  pool: Pool | null;
}

export function usePoolModals() {
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    pool: null,
  });

  const closeModal = useCallback(() => {
    setModalState({ type: null, pool: null });
  }, []);

  const openDetailsModal = useCallback((pool: Pool) => {
    setModalState({ type: "details", pool });
  }, []);

  return {
    modalState,
    isOpen: modalState.type !== null,
    selectedPool: modalState.pool,
    modalType: modalState.type,
    openDetailsModal,
    closeModal,
  };
}
