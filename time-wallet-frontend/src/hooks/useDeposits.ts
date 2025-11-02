import { useState, useEffect, useCallback } from "react";
import { useTimeWalletProgram } from "./useTimeWalletProgram";
import { Deposit } from "../types/deposit";

export function useDeposits() {
  const { program, connection, wallet } = useTimeWalletProgram();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log("🔍 Fetching deposits for wallet:", wallet.publicKey.toBase58());
      
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

      console.log(`📊 Found ${accounts.length} program accounts`);

      const coder = program.coder.accounts;
      const parsed: Deposit[] = [];

      for (const acc of accounts) {
        try {
          // Пробуем декодировать как депозит
          const decoded = coder.decode("timeLockDeposit", acc.account.data);
          
          console.log("✅ Successfully decoded deposit:", {
            pubkey: acc.pubkey.toBase58(),
            amount: decoded.amount.toString(),
            mint: decoded.mint.toBase58(),
            state: decoded.state,
            conditionType: decoded.lockCondition.conditionType
          });

          // Определяем тип условия на основе структуры Rust
          let conditionType: "ByTime" | "ByAmount" = "ByTime";
          if (decoded.lockCondition.conditionType && 
              typeof decoded.lockCondition.conditionType === 'object') {
            if ('byAmount' in decoded.lockCondition.conditionType) {
              conditionType = "ByAmount";
            } else if ('byTime' in decoded.lockCondition.conditionType) {
              conditionType = "ByTime";
            }
          }

          // Определяем состояние
          let state: "Active" | "Withdrawn" = "Active";
          if (decoded.state && typeof decoded.state === 'object') {
            if ('withdrawn' in decoded.state) {
              state = "Withdrawn";
            } else if ('active' in decoded.state) {
              state = "Active";
            }
          }

          const deposit: Deposit = {
            pubkey: acc.pubkey,
            amount: Number(decoded.amount),
            mint: decoded.mint.toBase58(),
            state,
            lockCondition: {
              conditionType,
              unlockTimestamp: Number(decoded.lockCondition.unlockTimestamp),
              unlockAmount: Number(decoded.lockCondition.unlockAmount),
            },
            createdAt: Number(decoded.createdAt),
          };

          parsed.push(deposit);
        } catch (err) {
          // Игнорируем аккаунты, которые не являются депозитами
          console.log("❌ Skipping non-deposit account:", acc.pubkey.toBase58());
          continue;
        }
      }

      console.log(`🎯 Successfully parsed ${parsed.length} deposits`);

      // Сортировка: активные сверху, потом по дате создания
      parsed.sort((a, b) => {
        if (a.state === "Active" && b.state !== "Active") return -1;
        if (b.state === "Active" && a.state !== "Active") return 1;
        return b.createdAt - a.createdAt;
      });

      setDeposits(parsed);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error("❌ Error fetching deposits:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch deposits");
    } finally {
      setLoading(false);
    }
  }, [program, connection, wallet]);

  // Только при монтировании и при изменении зависимостей
  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  const activeDeposits = deposits.filter((d) => d.state === "Active");
  const withdrawnDeposits = deposits.filter((d) => d.state === "Withdrawn");

  return {
    deposits,
    activeDeposits,
    withdrawnDeposits,
    loading,
    error,
    refetch: fetchDeposits,
    lastUpdated,
    formatAmount,
    formatDate,
  };
}