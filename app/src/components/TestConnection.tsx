import React from "react";
import { useTimeWalletProgram } from "../solana/useTimeWalletProgram";

export const TestConnection: React.FC = () => {
  const { program, wallet } = useTimeWalletProgram();

  return (
    <div className="p-4 border rounded-lg">
      <h3>🔗 Проверка подключения</h3>
      {wallet.publicKey ? (
        <>
          <p>Wallet: {wallet.publicKey.toBase58()}</p>
          {program ? (
            <p>✅ Программа загружена: {program.programId.toBase58()}</p>
          ) : (
            <p>⏳ Загружается программа...</p>
          )}
        </>
      ) : (
        <p>💡 Подключи кошелёк</p>
      )}
    </div>
  );
};