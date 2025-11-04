import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { Deposit, LockCondition  } from "../types/deposit";

export const depositService = {
  async fetchUserDeposits(
    program: Program,
    userPublicKey: PublicKey,
    connection: Connection
  ): Promise<Deposit[]> {
    console.log("🔍 Fetching deposits for:", userPublicKey.toBase58());

    const accounts = await connection.getProgramAccounts(program.programId, {
      filters: [{ memcmp: { offset: 8, bytes: userPublicKey.toBase58() } }],
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

        console.log("💾 Decoded deposit account:", acc.pubkey.toBase58(), decoded);

        // ────────────────────────────────
        // ⚙️ Восстанавливаем vault_token_account при необходимости
        // ────────────────────────────────
        let vaultTokenAccountStr = "";
        try {
          const vaultPubkey: PublicKey = decoded.vault_token_account
            ? new PublicKey(decoded.vault_token_account)
            : PublicKey.default;

          if (!vaultPubkey.equals(PublicKey.default)) {
            vaultTokenAccountStr = vaultPubkey.toBase58();
          } else {
            console.warn(
              "⚠ Deposit missing vault_token_account, recomputing PDA:",
              acc.pubkey.toBase58()
            );
            const [vaultPda] = PublicKey.findProgramAddressSync(
              [Buffer.from("vault"), acc.pubkey.toBuffer()],
              program.programId
            );
            vaultTokenAccountStr = vaultPda.toBase58();
            console.log("🔁 Recomputed vault PDA:", vaultTokenAccountStr);
          }
        } catch (e) {
          console.error(
            "❌ Error handling vault_token_account for deposit:",
            acc.pubkey.toBase58(),
            e
          );
        }

        // ───── Lock condition ─────
        const raw = decoded.lockCondition?.conditionType;
        let conditionType: "ByTime" | "ByAmount" = "ByTime";

        if (raw) {
          if ("byTime" in raw) conditionType = "ByTime";
          else if ("byAmount" in raw) conditionType = "ByAmount";
          else console.warn("Unknown lockCondition type", raw);
        }


        let lockCondition: LockCondition;
        if (conditionType === "ByTime") {
          lockCondition = {
            conditionType: "ByTime",
            unlockTimestamp: decoded.lockCondition?.unlockTimestamp?.toNumber?.() || 0,
          };
        } else {
          lockCondition = {
            conditionType: "ByAmount",
            unlockAmount: decoded.lockCondition?.unlockAmount?.toNumber?.() || 0,
          };
        }
        console.log("🔹 Final lockCondition object:", lockCondition);


        // ───── State ─────
        let state: "Active" | "Withdrawn" =
          decoded.state === 1 || decoded.state?.Withdrawn ? "Withdrawn" : "Active";

        // ───── Amount ─────
        let amountValue = 0;
        try {
          if (decoded.amount !== undefined && decoded.amount !== null) {
            if (typeof decoded.amount === "object" && "toNumber" in decoded.amount)
              amountValue = decoded.amount.toNumber();
            else amountValue = Number(decoded.amount);
          }
        } catch (e) {
          console.warn("⚠ Error parsing amount:", decoded.amount, e);
        }

        const deposit: Deposit = {
        pubkey: acc.pubkey,
        amount: amountValue,
        mint: new PublicKey(decoded.mint).toBase58(),
        state,
        lockCondition,
        createdAt: decoded.createdAt,
        vault_token_account: vaultTokenAccountStr,
      };

        formatted.push(deposit);
      } catch (err) {
        console.warn("❌ Failed to decode deposit:", acc.pubkey.toBase58(), err);
      }
    }

    formatted.sort((a, b) => b.createdAt - a.createdAt);
    console.log("📊 Formatted deposits:", formatted);
    return formatted;
  },
};
