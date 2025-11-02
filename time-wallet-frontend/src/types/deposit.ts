import { PublicKey } from "@solana/web3.js";

export interface Deposit {
  pubkey: PublicKey;
  amount: number;
  mint: string;
  state: "Active" | "Withdrawn";
  lockCondition: LockCondition;
  createdAt: number;
}

export interface LockCondition {
  conditionType: "ByTime" | "ByAmount";
  unlockTimestamp?: number;
  unlockAmount?: number;
}

export interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  balance: number;
  decimals: number;
}