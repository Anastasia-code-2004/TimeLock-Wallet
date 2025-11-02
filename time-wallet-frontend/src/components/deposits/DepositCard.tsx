import React from "react";
import { Deposit } from "../../types/deposit";
import { formatAmount, formatDate, getTokenSymbol } from "../../utils/formatters";

interface DepositCardProps {
  deposit: Deposit;
}

export const DepositCard: React.FC<DepositCardProps> = ({ deposit }) => {
  const canWithdraw = (deposit: Deposit): boolean => {
    if (deposit.state === "Withdrawn") return false;
    const now = Math.floor(Date.now() / 1000);
    
    if (deposit.lockCondition.conditionType === "ByTime") {
      return now >= (deposit.lockCondition.unlockTimestamp || 0);
    } else {
      return deposit.amount >= (deposit.lockCondition.unlockAmount || 0);
    }
  };

  const getStatusColor = (deposit: Deposit): string => {
    if (deposit.state === "Withdrawn") return "text-gray-500";
    if (canWithdraw(deposit)) return "text-green-500";
    return "text-yellow-500";
  };

  const getStatusText = (deposit: Deposit): string => {
    if (deposit.state === "Withdrawn") return "Withdrawn";
    if (canWithdraw(deposit)) return "Ready to Withdraw";
    return "Active";
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">
            {getTokenSymbol(deposit.mint)} Deposit
          </h3>
          <p className="text-sm text-gray-500">
            {deposit.pubkey.toBase58().slice(0, 8)}...{deposit.pubkey.toBase58().slice(-8)}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(deposit)}`}>
          {getStatusText(deposit)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Amount</p>
          <p className="font-semibold">{formatAmount(deposit.amount)} {getTokenSymbol(deposit.mint)}</p>
        </div>
        
        <div>
          <p className="text-gray-600">Condition</p>
          <p className="font-semibold">
            {deposit.lockCondition.conditionType === "ByTime" ? "Time Lock" : "Amount Lock"}
          </p>
        </div>

        <div>
          <p className="text-gray-600">
            {deposit.lockCondition.conditionType === "ByTime" ? "Unlocks At" : "Target Amount"}
          </p>
          <p className="font-semibold">
            {deposit.lockCondition.conditionType === "ByTime" 
              ? formatDate(deposit.lockCondition.unlockTimestamp || 0)
              : formatAmount(deposit.lockCondition.unlockAmount || 0)
            }
          </p>
        </div>

        <div>
          <p className="text-gray-600">Created</p>
          <p className="font-semibold">{formatDate(deposit.createdAt)}</p>
        </div>
      </div>

      {canWithdraw(deposit) && (
        <div className="mt-4">
          <button className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors">
            Withdraw Funds
          </button>
        </div>
      )}
    </div>
  );
};