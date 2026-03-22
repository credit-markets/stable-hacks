"use client";

import { API_URL } from "@/constants/api";
import { useRejectKyb, useRequestResubmission } from "@/hooks/kyb";
import { useSolanaTransaction } from "@/hooks/pools/useSolanaTransaction";
import type { KybSubmission } from "@/types/kyb";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Textarea } from "@nextui-org/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/modal";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface AttesterActionModalsProps {
  submission: KybSubmission;
  activeModal: string | null;
  onClose: () => void;
}

export default function AttesterActionModals({
  submission,
  activeModal,
  onClose,
}: AttesterActionModalsProps) {
  return (
    <>
      <ApproveModal
        submission={submission}
        isOpen={activeModal === "approve"}
        onClose={onClose}
      />
      <RejectModal
        submission={submission}
        isOpen={activeModal === "reject"}
        onClose={onClose}
      />
      <ResubmissionModal
        submission={submission}
        isOpen={activeModal === "resubmission"}
        onClose={onClose}
      />
      <RevokeModal
        submission={submission}
        isOpen={activeModal === "revoke"}
        onClose={onClose}
      />
    </>
  );
}

function ApproveModal({
  submission,
  isOpen,
  onClose,
}: {
  submission: KybSubmission;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { signAndSend, isLoading: isSigning } = useSolanaTransaction();

  const handleApprove = async () => {
    try {
      // Single call: approve in DB + build unsigned attestation tx + sign + send
      await signAndSend(
        `${API_URL}/kyb/${submission.id}/approve`,
        {},
        {
          successEvent: "kyb.attestation_created",
          successMessage: "KYB approved — on-chain attestation created.",
          invalidateKeys: [
            ["kyb", "queue"],
            ["kyb", "review", submission.id],
            ["kyb", "me"],
            ["userRoles"],
          ],
        },
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve KYB");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Approve KYB Submission</ModalHeader>
        <ModalBody>
          <p className="text-sm text-text-secondary">
            You are about to approve the KYB submission for{" "}
            <strong>{submission.legal_name || "this entity"}</strong>. This will
            create an on-chain attestation and grant the entity verified status.
          </p>
          <p className="text-sm text-text-muted mt-2">
            This action cannot be easily undone. Please ensure all due diligence
            has been completed.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button color="success" isLoading={isSigning} onPress={handleApprove}>
            Approve
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function RejectModal({
  submission,
  isOpen,
  onClose,
}: {
  submission: KybSubmission;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const rejectKyb = useRejectKyb();

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    try {
      await rejectKyb.mutateAsync({
        id: submission.id,
        data: { rejection_reason: reason.trim() },
      });
      toast.success("KYB submission rejected");
      setReason("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject KYB");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Reject KYB Submission</ModalHeader>
        <ModalBody>
          <p className="text-sm text-text-secondary">
            Rejecting the KYB submission for{" "}
            <strong>{submission.legal_name || "this entity"}</strong>. Please
            provide a reason.
          </p>
          <Textarea
            label="Rejection Reason"
            labelPlacement="outside"
            placeholder="Describe the reason for rejection..."
            variant="bordered"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minRows={3}
            isRequired
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="danger"
            isLoading={rejectKyb.isPending}
            isDisabled={!reason.trim()}
            onPress={handleReject}
          >
            Reject
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function ResubmissionModal({
  submission,
  isOpen,
  onClose,
}: {
  submission: KybSubmission;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<string[]>([]);
  const [currentItem, setCurrentItem] = useState("");
  const requestResub = useRequestResubmission();

  const addItem = () => {
    if (!currentItem.trim()) return;
    setItems((prev) => [...prev, currentItem.trim()]);
    setCurrentItem("");
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Add at least one resubmission item");
      return;
    }

    try {
      await requestResub.mutateAsync({
        id: submission.id,
        data: { resubmission_items: items },
      });
      toast.success("Resubmission requested");
      setItems([]);
      setCurrentItem("");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to request resubmission",
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>Request Resubmission</ModalHeader>
        <ModalBody>
          <p className="text-sm text-text-secondary">
            Specify items that need to be corrected or resubmitted by the
            applicant.
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="Enter resubmission item..."
              variant="bordered"
              size="sm"
              value={currentItem}
              onChange={(e) => setCurrentItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              classNames={{ inputWrapper: "flex-1" }}
            />
            <Button
              size="sm"
              variant="flat"
              startContent={<Plus className="w-4 h-4" />}
              onPress={addItem}
              isDisabled={!currentItem.trim()}
            >
              Add Item
            </Button>
          </div>

          {items.length > 0 && (
            <ul className="space-y-2 mt-2">
              {items.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="flex items-center justify-between bg-surface-hover rounded-md px-3 py-2 text-sm"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-text-muted hover:text-danger ml-2"
                    aria-label={`Remove item: ${item}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="warning"
            isLoading={requestResub.isPending}
            isDisabled={items.length === 0}
            onPress={handleSubmit}
          >
            Request Resubmission
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function RevokeModal({
  submission,
  isOpen,
  onClose,
}: {
  submission: KybSubmission;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { signAndSend, isLoading: isSigning } = useSolanaTransaction();

  const handleRevoke = async () => {
    try {
      await signAndSend(
        `${API_URL}/kyb/${submission.id}/revoke`,
        {},
        {
          successEvent: "kyb.attestation_revoked",
          successMessage: "KYB revoked — on-chain attestation invalidated.",
          invalidateKeys: [
            ["kyb", "queue"],
            ["kyb", "review", submission.id],
            ["kyb", "me"],
            ["userRoles"],
          ],
        },
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke KYB");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Revoke KYB Approval</ModalHeader>
        <ModalBody>
          <p className="text-sm text-text-secondary">
            You are about to <strong>revoke</strong> the KYB approval for{" "}
            <strong>{submission.legal_name || "this entity"}</strong>.
          </p>
          <p className="text-sm text-danger mt-2">
            This will invalidate the on-chain attestation. The entity will lose
            verified status and will need to reapply.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button color="danger" isLoading={isSigning} onPress={handleRevoke}>
            Revoke
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
