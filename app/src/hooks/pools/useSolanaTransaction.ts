import { SOLANA_RPC_URL } from "@/config/solana";
import { logger } from "@/lib/logger";
import {
  isUserRejection,
  parseSolanaError,
} from "@/lib/utils/solana-transactions";
import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana-core";
import type { ISolana } from "@dynamic-labs/solana-core";
import { Connection, Transaction } from "@solana/web3.js";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

type TxStatus =
  | "idle"
  | "building_tx"
  | "awaiting_signature"
  | "confirming"
  | "success"
  | "error";

const CONFIRMATION_TIMEOUT_MS = 60_000;

/**
 * Shared hook for building, signing, and sending Solana transactions.
 *
 * 1. Calls backend to build unsigned tx
 * 2. Signs via Dynamic Labs Solana connector
 * 3. Sends raw tx to Solana
 * 4. Subscribes to Supabase Realtime for chain confirmation
 *    (does NOT poll chain — spec says UI reads derived models only)
 */
export function useSolanaTransaction() {
  const { primaryWallet } = useDynamicContext();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TxStatus>("idle");
  const subscriptionRef = useRef<ReturnType<SupabaseClient["channel"]> | null>(
    null,
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const lastTokenRef = useRef<string | null>(null);

  const getSupabase = useCallback(
    (authToken?: string): SupabaseClient | null => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) return null;

      if (supabaseRef.current && lastTokenRef.current === (authToken ?? null)) {
        return supabaseRef.current;
      }

      supabaseRef.current = createClient(url, key, {
        global: {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        },
      });
      lastTokenRef.current = authToken ?? null;
      return supabaseRef.current;
    },
    [],
  );

  // Cleanup subscription AND timeout on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        supabaseRef.current?.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const signAndSend = useCallback(
    async (
      buildUrl: string,
      body: Record<string, unknown>,
      options: {
        successEvent: string; // e.g. 'investment.settled'
        successMessage: string;
        invalidateKeys: string[][];
      },
    ): Promise<string | undefined> => {
      if (!primaryWallet?.address) {
        toast.error("Please connect your wallet");
        return;
      }

      try {
        setStatus("building_tx");

        const { data: buildResult } = await api.post<{
          transaction: string;
          correlationId: string;
        }>(buildUrl, body);
        const { transaction: txBase64, correlationId } = buildResult;

        setStatus("awaiting_signature");

        if (!isSolanaWallet(primaryWallet)) {
          throw new Error("Connected wallet is not a Solana wallet");
        }

        const signer: ISolana = await primaryWallet.getSigner();
        const tx = Transaction.from(Buffer.from(txBase64, "base64"));
        const signedTx = await signer.signTransaction(tx);

        setStatus("confirming");

        const connection = new Connection(SOLANA_RPC_URL, "confirmed");
        let signature: string;
        try {
          signature = await connection.sendRawTransaction(signedTx.serialize());
          await connection.confirmTransaction(signature, "confirmed");
        } catch (sendErr: any) {
          logger.error("[SolanaTx] Send failed", sendErr, {
            logs: sendErr?.logs,
          });
          // Blockhash expired (user took >2min to sign) — rebuild + re-sign once
          if (sendErr?.message?.includes("Blockhash not found")) {
            toast("Transaction expired — rebuilding...");
            setStatus("building_tx");
            const { data: retryResult } = await api.post<{
              transaction: string;
            }>(buildUrl, body);
            const { transaction: retryTxBase64 } = retryResult;
            const retryTx = Transaction.from(
              Buffer.from(retryTxBase64, "base64"),
            );
            setStatus("awaiting_signature");
            const retrySigner: ISolana = await primaryWallet.getSigner();
            const retrySigned = await retrySigner.signTransaction(retryTx);
            setStatus("confirming");
            signature = await connection.sendRawTransaction(
              retrySigned.serialize(),
            );
            await connection.confirmTransaction(signature, "confirmed");
          } else {
            throw sendErr;
          }
        }

        // Extract auth token for authenticated Supabase Realtime subscription
        const token =
          typeof document !== "undefined"
            ? document.cookie
                .split("; ")
                .find((row) => row.startsWith("DYNAMIC_JWT_TOKEN="))
                ?.split("=")
                .slice(1)
                .join("=")
            : undefined;

        // Subscribe to Supabase Realtime for chain confirmation
        const sb = getSupabase(token);
        if (correlationId && sb) {
          const invalidateAll = () => {
            for (const key of options.invalidateKeys) {
              queryClient.invalidateQueries({ queryKey: key });
            }
            queryClient.invalidateQueries({
              predicate: (query) => {
                const k = query.queryKey;
                return (
                  Array.isArray(k) &&
                  typeof k[0] === "string" &&
                  k[0].startsWith("portfolio-")
                );
              },
            });
            queryClient.invalidateQueries({ queryKey: ["tvl"] });
          };

          // Use a ref so the Realtime callback can clear the timeout
          const timeoutIdRef = {
            current: null as ReturnType<typeof setTimeout> | null,
          };

          const channel = sb
            .channel(`tx-${signature}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "execution_events",
                filter: `correlation_id=eq.${correlationId}`,
              },
              (payload: { new: { event_type: string } }) => {
                if (payload.new.event_type === options.successEvent) {
                  if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
                  timeoutRef.current = null;
                  setStatus("success");
                  toast.success(options.successMessage);
                  invalidateAll();
                  sb.removeChannel(channel);
                  subscriptionRef.current = null;
                }
              },
            )
            .subscribe();

          subscriptionRef.current = channel;

          // Timeout fallback: if no confirmation arrives within 60s,
          // fall back to querying execution_events table once
          timeoutIdRef.current = setTimeout(async () => {
            timeoutRef.current = null;
            sb.removeChannel(channel);
            subscriptionRef.current = null;

            // One-shot query as fallback
            const { data } = await sb
              .from("execution_events")
              .select("event_type")
              .eq("correlation_id", correlationId)
              .eq("event_type", options.successEvent)
              .limit(1);

            if (data && data.length > 0) {
              setStatus("success");
              toast.success(options.successMessage);
              invalidateAll();
            } else {
              setStatus("error");
              toast.error(
                "Transaction sent but confirmation is taking longer than expected. " +
                  "Check your portfolio — the transaction may still settle.",
              );
            }
          }, CONFIRMATION_TIMEOUT_MS);

          timeoutRef.current = timeoutIdRef.current;
        }

        return signature;
        // biome-ignore lint/suspicious/noExplicitAny: Solana SDK errors are untyped
      } catch (err: any) {
        if (isUserRejection(err)) {
          setStatus("idle");
          toast(parseSolanaError(err));
          return;
        }
        setStatus("error");
        toast.error(parseSolanaError(err));
        throw err;
      }
    },
    [primaryWallet, queryClient, getSupabase],
  );

  return {
    signAndSend,
    status,
    isLoading: !["idle", "success", "error"].includes(status),
  };
}
