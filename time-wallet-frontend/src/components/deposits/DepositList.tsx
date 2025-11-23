import React from "react";
import { useDeposits } from "../../hooks/useDeposits";
import { useCreateDeposit } from "../../hooks/useCreateDeposit";
import { DepositCard } from "./DepositCard";
import { Deposit } from "../../types/deposit";
import { PublicKey } from "@solana/web3.js";

export const DepositList: React.FC = () => {
  const { deposits, loading, error, refetch } = useDeposits();
  const { topUpDeposit, userTokens, withdrawDeposit } = useCreateDeposit();

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

      const token = userTokens.find((t) => t.mint.equals(new PublicKey(deposit.mint)));
      if (!token) {
        console.error("[TopUp] Token not found in userTokens for mint:", deposit.mint);
        return alert("Token not found in user tokens. Cannot top-up.");
      }

      console.log("[TopUp] Found token:", token);
      const decimals = token.decimals || 0;

      const sig = await topUpDeposit(
        deposit.pubkey,
        new PublicKey(deposit.mint),
        new PublicKey(deposit.vault_token_account),
        amount,
        decimals
      );

      console.log("[TopUp] Transaction signature:", sig);
      await refetch();
    } catch (err) {
      console.error("[TopUp] Failed:", err);
      alert("Failed to top-up deposit");
    }
  };

  // Состояния загрузки и ошибки
  if (loading) return (
    <div className="deposits-loading">
      <div className="loading-spinner"></div>
      <p>Loading deposits...</p>
    </div>
  );
  
  if (error) return (
    <div className="deposits-error">
      <p className="error-text">Error: {error}</p>
      <button
        onClick={refetch}
        className="retry-button"
      >
        Retry
      </button>
    </div>
  );
  
  if (deposits.length === 0) return (
    <div className="deposits-empty">
      <p className="empty-text">No deposits found.</p>
      <p className="empty-subtext">Create your first deposit to get started!</p>
    </div>
  );

  return (
    <div className="deposits-container">
      <div className="deposits-header">
        <div className="deposits-count">
          {deposits.length} deposit{deposits.length !== 1 ? "s" : ""}
        </div>
      </div>
      
      <div className="deposits-grid">
        {deposits.map((deposit) => (
          <DepositCard
            key={deposit.pubkey.toBase58()}
            deposit={deposit}
            onWithdraw={handleWithdraw}
            onTopUp={handleTopUp}
          />
        ))}
      </div>
    </div>
  );
};