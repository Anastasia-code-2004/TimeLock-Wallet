import { useState, useEffect, useCallback, useRef } from "react";
import { useTimeWalletProgram } from "./useTimeWalletProgram";
import { Deposit } from "../types/deposit";
import { depositService } from "../services/depositService";

export function useDeposits() {
  const { program, connection, wallet } = useTimeWalletProgram();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const hasFetched = useRef(false);

  const fetchDeposits = useCallback(async () => {
    if (!program || !wallet?.publicKey) {
      setDeposits([]);
      setError(null);
      return;
    }

    if (hasFetched.current) return;

    setLoading(true);
    setError(null);

    const maxRetries = 5;
    let attempt = 0;
    let delay = 500;

    while (attempt < maxRetries) {
      try {
        console.log("🔍 Fetching deposits for wallet:", wallet.publicKey.toBase58());

        const parsed: Deposit[] = await depositService.fetchUserDeposits(
          program,
          wallet.publicKey,
          connection
        );

        setDeposits(parsed);
        setLastUpdated(new Date());
        setLoading(false);
        setError(null);

        hasFetched.current = true;
        return;
      } catch (err: any) {
        console.warn(`Server responded with ${err?.status || err?.message}. Retrying after ${delay}ms...`);
        attempt++;
        if (attempt >= maxRetries) {
          setError("Failed to fetch deposits after multiple attempts. Try again later.");
          setLoading(false);
          return;
        }
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  }, [program, connection, wallet]);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  const activeDeposits = deposits.filter(d => d.state === "Active");
  const withdrawnDeposits = deposits.filter(d => d.state === "Withdrawn");

  return {
    deposits,
    activeDeposits,
    withdrawnDeposits,
    loading,
    error,
    refetch: async () => { hasFetched.current = false; await fetchDeposits(); },
    lastUpdated,
  };
}