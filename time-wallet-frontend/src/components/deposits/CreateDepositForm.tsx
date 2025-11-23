import React, { useState, useMemo } from "react";
import { useCreateDeposit } from "../../hooks/useCreateDeposit";
import { FaTimes } from "react-icons/fa";

const TimesIcon = FaTimes as React.ComponentType<{}>;

interface CreateDepositFormProps {
  onClose: () => void;
}

export const CreateDepositForm: React.FC<CreateDepositFormProps> = ({ onClose }) => {
  const {
    createTimeDeposit,
    createAmountDeposit,
    loading,
    error,
    userTokens,
    toMinimalUnits,
    fromMinimalUnits,
    isValidTimeDeposit,
    isValidAmountDeposit,
  } = useCreateDeposit();

  const [depositType, setDepositType] = useState<"time" | "amount">("time");
  const [selectedToken, setSelectedToken] = useState("");
  const [amount, setAmount] = useState("");
  const [unlockValue, setUnlockValue] = useState("");

  const selectedTokenInfo = useMemo(
    () => userTokens.find((token) => token.mint.toBase58() === selectedToken),
    [userTokens, selectedToken]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTokenInfo) {
      alert("Please select a token");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const amountInMinimalUnits = toMinimalUnits(amountNum, selectedTokenInfo.decimals);

    try {
      if (depositType === "time") {
        const unlockTimestamp = Math.floor(new Date(unlockValue).getTime() / 1000);
        const now = Math.floor(Date.now() / 1000);

        if (!isValidTimeDeposit(selectedTokenInfo.mint, amountInMinimalUnits, unlockTimestamp)) {
          alert("Invalid parameters: check future date and balance");
          return;
        }

        await createTimeDeposit({
          mint: selectedTokenInfo.mint,
          amount: amountInMinimalUnits,
          unlockTimestamp,
        });
      } else {
        const unlockAmountNum = parseFloat(unlockValue);
        if (isNaN(unlockAmountNum) || unlockAmountNum <= 0) {
          alert("Please enter a valid target amount");
          return;
        }

        const unlockAmountInMinimalUnits = toMinimalUnits(
          unlockAmountNum,
          selectedTokenInfo.decimals
        );

        if (amountInMinimalUnits >= unlockAmountInMinimalUnits) {
        alert("❌ Initial deposit must be LESS than target amount for amount-based locks");
        return;
      }

        if (
          !isValidAmountDeposit(
            selectedTokenInfo.mint,
            amountInMinimalUnits,
            unlockAmountInMinimalUnits
          )
        ) {
          alert("Invalid parameters: check amount and balance");
          return;
        }

        await createAmountDeposit({
          mint: selectedTokenInfo.mint,
          amount: amountInMinimalUnits,
          unlockAmount: unlockAmountInMinimalUnits,
        });
      }

     
      setAmount("");
      setUnlockValue("");
      onClose();
    } catch (err) {
      console.error("Error creating deposit:", err);
    }
  };

  return (
    <div className="deposit-form-container-wide">
      <form onSubmit={handleSubmit} className="deposit-form">
        <div className="form-group">
          <label>Deposit Type</label>
          <select
            value={depositType}
            onChange={(e) => setDepositType(e.target.value as "time" | "amount")}
          >
            <option value="time">Time Lock</option>
            <option value="amount">Amount Lock</option>
          </select>
        </div>

        <div className="form-group">
          <label>Token</label>
          <select value={selectedToken} onChange={(e) => setSelectedToken(e.target.value)}>
  <option value="">Select Token</option>
  {userTokens
    .filter(token => 
      !token.isNative && 
      token.mint.toBase58() !== 'So11111111111111111111111111111111111111112'
    )
    .map((token) => (
      <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
        {token.symbol} — Balance: {fromMinimalUnits(token.balance, token.decimals)}
      </option>
    ))
  }
</select>
        </div>

        <div className="form-group">
          <label>Amount</label>
          <input
            type="number"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
          {selectedTokenInfo && (
            <div className="hint-text">
              Available:{" "}
              {fromMinimalUnits(selectedTokenInfo.balance, selectedTokenInfo.decimals)}{" "}
              {selectedTokenInfo.symbol}
            </div>
          )}
        </div>

        {depositType === "time" ? (
          <div className="form-group">
            <label>Unlock Date</label>
            <input
              type="datetime-local"
              value={unlockValue}
              onChange={(e) => setUnlockValue(e.target.value)}
            />
          </div>
        ) : (
          <div className="form-group">
            <label>Target Amount</label>
            <input
              type="number"
              step="0.000001"
              value={unlockValue}
              onChange={(e) => setUnlockValue(e.target.value)}
              placeholder="Enter target amount"
            />
          </div>
        )}

        <button type="submit" disabled={loading || !selectedTokenInfo} className="submit-button">
          {loading ? "Creating..." : "Create Deposit"}
        </button>

        {error && <div className="error-message">❌ {error}</div>}
      </form>
    </div>
  );
};
