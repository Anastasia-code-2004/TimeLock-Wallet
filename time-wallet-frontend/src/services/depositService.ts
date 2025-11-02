import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { Deposit } from "../types/deposit";

export const depositService = {
  async fetchUserDeposits(
    program: Program, 
    userPublicKey: PublicKey,
    connection: Connection
  ): Promise<Deposit[]> {
    console.log("🔍 Fetching deposits for:", userPublicKey.toBase58());

    const accounts = await connection.getProgramAccounts(program.programId, {
      filters: [
        {
          memcmp: {
            offset: 8,
            bytes: userPublicKey.toBase58(),
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

        // Преобразуем amount
        let amountValue = 0;
        if (decoded.amount) {
          if (typeof decoded.amount === 'object' && 'toNumber' in decoded.amount) {
            amountValue = decoded.amount.toNumber();
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

        formatted.push(deposit);

      } catch (err) {
        console.warn("❌ Failed to decode deposit:", acc.pubkey.toBase58(), err);
      }
    }

    // Сортируем по дате создания (новые сверху)
    formatted.sort((a, b) => b.createdAt - a.createdAt);
    return formatted;
  },
};