import { SOLANA_NETWORK, SOLANA_RPC_URL } from "@/config/solana";

export const APP_NETWORK = {
  name: SOLANA_NETWORK === "mainnet-beta" ? "Solana Mainnet" : "Solana Devnet",
  id: SOLANA_NETWORK,
};

export type AppNetworkIds = typeof SOLANA_NETWORK;

export const EXPLORER_URL =
  SOLANA_NETWORK === "mainnet-beta"
    ? "https://explorer.solana.com"
    : "https://explorer.solana.com?cluster=devnet";
