import React from "react";
import { useDeposits } from "../../hooks/useDeposits";
import { DepositCard } from "./DepositCard";

export const DepositList: React.FC = () => {
  const { deposits, loading, error, refetch } = useDeposits();

  // Состояния загрузки и ошибок прямо в компоненте
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
          onClick={refetch}
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
          <DepositCard key={deposit.pubkey.toBase58()} deposit={deposit} />
        ))}
      </div>
      <div className="mt-6 text-center text-sm text-gray-500">
        Showing {deposits.length} deposit{deposits.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};