import React from "react";
import { useDeposits } from "../../hooks/useDeposits";
import { useCreateDeposit } from "../../hooks/useCreateDeposit";
import { DepositCard } from "./DepositCard";
import { Deposit } from "../../types/deposit";
import { PublicKey } from "@solana/web3.js";

export const DepositList: React.FC = () => {
  const { deposits, loading, error, refetch } = useDeposits();
  const { topUpDeposit, userTokens, withdrawDeposit } = useCreateDeposit(); // <- берем userTokens

  // ========================
  // Функции обработки
  // ========================
  const handleWithdraw = async (deposit: Deposit) => {
  try {
    console.log("[Withdraw] Starting withdraw for deposit:", deposit);
    if (!deposit.vault_token_account) {
      return alert("Vault token account is missing. Cannot withdraw.");
    }
    await withdrawDeposit(
      deposit.pubkey,
      new PublicKey(deposit.vault_token_account),
      new PublicKey(deposit.mint)
    );
    await refetch();
  } catch (err) {
    console.error("[Withdraw] Failed:", err);
    alert("Failed to withdraw deposit");
  }
};

  const handleTopUp = async (deposit: Deposit, amount: number) => {
    try {
      console.log("[TopUp] Starting top-up", { deposit, amount });

      if (!deposit.vault_token_account) {
        console.warn("[TopUp] Vault token account is missing", deposit);
        return alert("Vault token account is missing. Cannot top-up.");
      }

      if (!userTokens || userTokens.length === 0) {
        console.error("[TopUp] userTokens not loaded or empty");
        return alert("User tokens not loaded. Cannot determine decimals.");
      }

      // Найти токен по mint
      const token = userTokens.find((t) => t.mint.equals(new PublicKey(deposit.mint)));
      if (!token) {
        console.error("[TopUp] Token not found in userTokens for mint:", deposit.mint);
        return alert("Token not found in user tokens. Cannot top-up.");
      }

      console.log("[TopUp] Found token:", token);

      const decimals = token.decimals || 0;
      console.log("[TopUp] Using decimals:", decimals);

      // Вызываем метод topUpDeposit
      const sig = await topUpDeposit(
        deposit.pubkey,
        new PublicKey(deposit.mint),
        new PublicKey(deposit.vault_token_account),
        amount,
        decimals
      );

      console.log("[TopUp] Transaction signature:", sig);

      await refetch();
      console.log("[TopUp] Refetch complete");
    } catch (err) {
      console.error("[TopUp] Failed:", err);
      alert("Failed to top-up deposit");
    }
  };

  // ========================
  // Рендер
  // ========================
  if (loading) return <p className="p-6 text-center text-gray-600">Loading deposits...</p>;
  if (error)
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error: {error}</p>
        <button
          onClick={refetch}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  if (deposits.length === 0)
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No deposits found.</p>
        <p className="text-sm text-gray-500 mt-2">Create your first deposit to get started!</p>
      </div>
    );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Deposits</h2>
      <div className="grid gap-4">
        {deposits.map((deposit) => (
          <DepositCard
            key={deposit.pubkey.toBase58()}
            deposit={deposit}
            onWithdraw={handleWithdraw}
            onTopUp={handleTopUp}
          />
        ))}
      </div>
      <div className="mt-6 text-center text-sm text-gray-500">
        Showing {deposits.length} deposit{deposits.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
};