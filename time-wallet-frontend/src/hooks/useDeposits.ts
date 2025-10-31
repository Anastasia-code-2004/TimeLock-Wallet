import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { useTimeWalletProgram } from "./useTimeWalletProgram";

export interface Deposit {
  pubkey: PublicKey;
  owner: PublicKey;
  mint: PublicKey;
  vaultTokenAccount: PublicKey;
  amount: number;
  lockCondition: {
    unlockTimestamp: number;
    unlockAmount: number;
    conditionType: "ByTime" | "ByAmount";
  };
  state: "Active" | "Withdrawn";
  createdAt: number;
  bump: number;
}

export function useDeposits(autoRefresh: boolean = true) {
  const { program, connection, wallet } = useTimeWalletProgram();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const formatAmount = useCallback((amount: number, decimals = 9) => {
    return (amount / Math.pow(10, decimals)).toFixed(4);
  }, []);

  const formatDate = useCallback((ts: number) => {
    if (!ts) return "-";
    const d = new Date(ts * 1000);
    return d.toLocaleString();
  }, []);

  const fetchDeposits = useCallback(async () => {
    if (!program || !wallet?.publicKey) {
      setDeposits([]);
      return;
    }

    setLoading(true);
    try {
      const accounts = await connection.getProgramAccounts(program.programId, {
        filters: [
          {
            memcmp: {
              offset: 8, // пропускаем discriminator
              bytes: wallet.publicKey.toBase58(),
            },
          },
        ],
      });

      const coder = program.coder.accounts;
      const parsed: Deposit[] = [];

      for (const acc of accounts) {
        try {
          const decoded = coder.decode("timeLockDeposit", acc.account.data);
          parsed.push({
            pubkey: acc.pubkey,
            owner: decoded.owner,
            mint: decoded.mint,
            vaultTokenAccount: decoded.vaultTokenAccount,
            amount: Number(decoded.amount),
            lockCondition: {
              unlockTimestamp: Number(decoded.lockCondition.unlockTimestamp),
              unlockAmount: Number(decoded.lockCondition.unlockAmount),
              conditionType:
                decoded.lockCondition.conditionType?.ByTime === undefined
                  ? "ByAmount"
                  : "ByTime",
            },
            state: decoded.state?.Active ? "Active" : "Withdrawn",
            createdAt: Number(decoded.createdAt),
            bump: decoded.bump,
          });
        } catch (err) {
          console.warn("Failed to decode deposit:", err);
        }
      }

      // Сортировка: активные сверху, потом по дате создания
      parsed.sort((a, b) => {
        if (a.state === "Active" && b.state !== "Active") return -1;
        if (b.state === "Active" && a.state !== "Active") return 1;
        return b.createdAt - a.createdAt;
      });

      setDeposits(parsed);
      setLastUpdated(new Date());
      console.log("✅ Deposits fetched:", parsed);
    } catch (err) {
      console.error("Error fetching deposits:", err);
    } finally {
      setLoading(false);
    }
  }, [program, connection, wallet]);

  // Автообновление каждые 15 сек
  useEffect(() => {
    fetchDeposits();
    if (!autoRefresh) return;

    const interval = setInterval(fetchDeposits, 15000);
    return () => clearInterval(interval);
  }, [fetchDeposits, autoRefresh]);

  const activeDeposits = deposits.filter((d) => d.state === "Active");
  const withdrawnDeposits = deposits.filter((d) => d.state === "Withdrawn");

  return {
    deposits,
    activeDeposits,
    withdrawnDeposits,
    loading,
    refetch: fetchDeposits,
    lastUpdated,
    formatAmount,
    formatDate,
  };
}