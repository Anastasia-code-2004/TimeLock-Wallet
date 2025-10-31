import React, { useEffect, useState } from "react";
import { useTimeWalletProgram } from "../hooks/useTimeWalletProgram";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

interface Deposit {
  pubkey: PublicKey;
  amount: number;
  mint: string;
  state: "Active" | "Withdrawn";
  lockCondition: {
    conditionType: "ByTime" | "ByAmount";
    unlockTimestamp?: number;
    unlockAmount?: number;
  };
  createdAt: number;
}

export const DepositList: React.FC = () => {
  const { program, wallet, connection } = useTimeWalletProgram();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeposits = async () => {
      if (!program || !wallet?.publicKey) {
        setDeposits([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log("🔍 Fetching deposits for:", wallet.publicKey.toBase58());

        // 🔥 ПРАВИЛЬНЫЙ способ получения депозитов
        const accounts = await connection.getProgramAccounts(program.programId, {
          filters: [
            {
              memcmp: {
                offset: 8, // discriminator
                bytes: wallet.publicKey.toBase58(), // owner поле
              },
            },
          ],
        });

        console.log(`✅ Found ${accounts.length} deposit accounts`);

        const coder = program.coder.accounts;
        const formatted: Deposit[] = [];

        for (const acc of accounts) {
          try {
            const decoded = coder.decode("timeLockDeposit", acc.account.data);
            
            if (!decoded) {
              console.warn("❌ Decoded is null for:", acc.pubkey.toBase58());
              continue;
            }

            // Определяем тип условия
            let conditionType: "ByTime" | "ByAmount" = "ByTime";
            if (decoded.lockCondition?.conditionType) {
              if (decoded.lockCondition.conditionType.byAmount !== undefined) {
                conditionType = "ByAmount";
              } else if (decoded.lockCondition.conditionType.byTime !== undefined) {
                conditionType = "ByTime";
              }
            }

            // Определяем состояние
            let state: "Active" | "Withdrawn" = "Active";
            if (decoded.state?.withdrawn !== undefined) {
              state = "Withdrawn";
            }

            // Преобразуем amount (может быть BN или number)
            let amountValue = 0;
            if (decoded.amount) {
              if (typeof decoded.amount === 'object' && 'toNumber' in decoded.amount) {
                amountValue = (decoded.amount as anchor.BN).toNumber();
              } else {
                amountValue = Number(decoded.amount);
              }
            }

            const deposit: Deposit = {
              pubkey: acc.pubkey,
              amount: amountValue,
              mint: decoded.mint.toBase58(),
              state,
              lockCondition: {
                conditionType,
                unlockTimestamp: decoded.lockCondition?.unlockTimestamp 
                  ? Number(decoded.lockCondition.unlockTimestamp) 
                  : undefined,
                unlockAmount: decoded.lockCondition?.unlockAmount 
                  ? Number(decoded.lockCondition.unlockAmount) 
                  : undefined,
              },
              createdAt: decoded.createdAt ? Number(decoded.createdAt) : 0,
            };

            console.log("📦 Processed deposit:", {
              pubkey: deposit.pubkey.toBase58().slice(0, 8) + "...",
              amount: deposit.amount,
              condition: deposit.lockCondition.conditionType,
              state: deposit.state
            });

            formatted.push(deposit);

          } catch (err) {
            console.warn("❌ Failed to decode deposit:", acc.pubkey.toBase58(), err);
          }
        }

        // Сортируем по дате создания (новые сверху)
        formatted.sort((a, b) => b.createdAt - a.createdAt);

        setDeposits(formatted);
        console.log(`🎯 Final: ${formatted.length} deposits`);

      } catch (err: any) {
        console.error("❌ Error fetching deposits:", err);
        setError(err.message || "Failed to fetch deposits");
      } finally {
        setLoading(false);
      }
    };

    fetchDeposits();
  }, [program, wallet, connection]);

  // Утилитные функции
  const formatAmount = (amount: number, decimals: number = 6): string => {
    return (amount / Math.pow(10, decimals)).toFixed(4);
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTokenSymbol = (mint: string): string => {
    if (mint === "So11111111111111111111111111111111111111112") return "SOL";
    if (mint === "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU") return "USDC";
    return `TOKEN${mint.slice(0, 4)}`;
  };

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

  if (!wallet?.publicKey) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Please connect your wallet to view deposits.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Loading deposits...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (deposits.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No deposits found.</p>
        <p className="text-sm text-gray-500 mt-2">
          Create your first deposit to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Deposits</h2>
      
      <div className="grid gap-4">
        {deposits.map((deposit) => (
          <div 
            key={deposit.pubkey.toBase58()} 
            className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
          >
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
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        Showing {deposits.length} deposit{deposits.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};