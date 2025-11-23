import React, { useState } from "react";
import { Deposit } from "../../types/deposit";
import { formatAmount, formatDate, getTokenSymbol } from "../../utils/formatters";

interface DepositCardProps {
  deposit: Deposit;
  onWithdraw: (deposit: Deposit) => Promise<void>;
  onTopUp: (deposit: Deposit, amount: number) => Promise<void>;
}

export const DepositCard: React.FC<DepositCardProps> = ({ deposit, onWithdraw, onTopUp }) => {
  const [loading, setLoading] = useState(false);
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");

  const canWithdraw = (): boolean => {
    if (deposit.state === "Withdrawn") return false;
    const now = Math.floor(Date.now() / 1000);
    if (deposit.lockCondition.conditionType === "ByTime") {
      return now >= (deposit.lockCondition.unlockTimestamp || 0);
    }
    return deposit.amount >= (deposit.lockCondition.unlockAmount || 0);
  };

  const statusText = deposit.state === "Withdrawn"
    ? "Withdrawn"
    : canWithdraw()
    ? "Ready to Withdraw"
    : "Active";

  const statusClass =
    deposit.state === "Withdrawn"
      ? "status-withdrawn"
      : canWithdraw()
      ? "status-ready"
      : "status-active";

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      await onWithdraw(deposit);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUpClick = () => {
    setShowTopUpForm(true);
    setTopUpAmount("");
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = Number(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      await onTopUp(deposit, amount);
      setShowTopUpForm(false);
      setTopUpAmount("");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTopUp = () => {
    setShowTopUpForm(false);
    setTopUpAmount("");
  };

  return (
    <div className="deposit-card">
      <div className="deposit-header">
        <div>
          <div className="deposit-title">
            {getTokenSymbol(deposit.mint)} Deposit
          </div>
          <div className="deposit-subkey">
            {deposit.pubkey.toBase58().slice(0, 8)}...
            {deposit.pubkey.toBase58().slice(-8)}
          </div>
        </div>
        <span className={`status-badge ${statusClass}`}>{statusText}</span>
      </div>

      <div className="deposit-info-grid">
        <div>
          <div className="deposit-info-label">Amount</div>
          <div className="deposit-info-value">
            {formatAmount(deposit.amount)} {getTokenSymbol(deposit.mint)}
          </div>
        </div>
        <div>
          <div className="deposit-info-label">Condition</div>
          <div className="deposit-info-value">
            {deposit.lockCondition.conditionType === "ByTime"
              ? "Time Lock"
              : "Amount Lock"}
          </div>
        </div>
        <div>
          <div className="deposit-info-label">
            {deposit.lockCondition.conditionType === "ByTime"
              ? "Unlocks At"
              : "Target Amount"}
          </div>
          <div className="deposit-info-value">
            {deposit.lockCondition.conditionType === "ByTime"
              ? formatDate(deposit.lockCondition.unlockTimestamp || 0)
              : formatAmount(deposit.lockCondition.unlockAmount || 0)}
          </div>
        </div>
        <div>
          <div className="deposit-info-label">Created</div>
          <div className="deposit-info-value">{formatDate(deposit.createdAt)}</div>
        </div>
      </div>

      <div className="deposit-actions">
        {canWithdraw() ? (
          <button
            disabled={loading}
            onClick={handleWithdraw}
            className="deposit-button green"
          >
            {loading ? "Processing..." : "Withdraw Funds"}
          </button>
        ) : (
          <>
            {!showTopUpForm ? (
              <button
                disabled={loading}
                onClick={handleTopUpClick}
                className="deposit-button blue"
              >
                {loading ? "Processing..." : "Top-up Deposit"}
              </button>
            ) : (
              <form onSubmit={handleTopUpSubmit} className="top-up-form">
                <div className="top-up-input-group">
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="top-up-input"
                    step="0.01"
                    min="0.01"
                    required
                    autoFocus
                  />
                  <span className="top-up-currency">{getTokenSymbol(deposit.mint)}</span>
                </div>
                <div className="top-up-buttons">
                  <button
                    type="submit"
                    disabled={loading}
                    className="top-up-button submit"
                  >
                    {loading ? "Adding..." : "Add Funds"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelTopUp}
                    disabled={loading}
                    className="top-up-button cancel"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};