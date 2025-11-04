import { useState, useCallback } from "react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { useTimeWalletProgram } from "./useTimeWalletProgram";
import { useUserTokens } from "./useUserTokens";

export interface CreateTimeDepositParams {
  mint: PublicKey;
  amount: number; // уже в минимальных единицах
  unlockTimestamp: number;
}

export interface CreateAmountDepositParams {
  mint: PublicKey;
  amount: number; // уже в минимальных единицах
  unlockAmount: number; // тоже в минимальных единицах
}

export function useCreateDeposit() {
  const { program, wallet } = useTimeWalletProgram();
  const { tokens } = useUserTokens();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Проверка баланса */
  const hasSufficientBalance = useCallback(
    (mint: PublicKey, amount: number) => {
      const token = tokens.find((t) => t.mint.equals(mint));
      const result = !!token && token.balance >= amount;
      console.log("💰 Checking balance:", {
        mint: mint.toBase58(),
        amount,
        tokenBalance: token?.balance,
        hasEnough: result,
      });
      return result;
    },
    [tokens]
  );

  /** Конвертация */
  const toMinimalUnits = useCallback((amount: number, decimals: number) => {
    const minimal = Math.floor(amount * 10 ** decimals);
    console.log(`🔢 Converting to minimal units: ${amount} -> ${minimal}`);
    return minimal;
  }, []);

  const fromMinimalUnits = useCallback((amount: number, decimals: number) => {
    const human = amount / 10 ** decimals;
    console.log(`🔢 Converting from minimal units: ${amount} -> ${human}`);
    return human;
  }, []);

  /** Создание ATA */
  const ensureUserTokenAccount = useCallback(
    async (mint: PublicKey, owner: PublicKey) => {
      if (!program) throw new Error("Program not initialized");
      const provider = program.provider as anchor.AnchorProvider;
      const connection = provider.connection;

      const ata = await getAssociatedTokenAddress(mint, owner);
      const info = await connection.getAccountInfo(ata);
      if (!info) {
        console.log("➕ Creating ATA:", ata.toBase58());
        const createIx = createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          ata,
          owner,
          mint
        );
        await provider.sendAndConfirm(new Transaction().add(createIx), []);
      } else {
        console.log("✅ ATA exists:", ata.toBase58());
      }
      return ata;
    },
    [program]
  );

  /** Создание Time Deposit */
  const createTimeDeposit = useCallback(
    async ({ mint, amount, unlockTimestamp }: CreateTimeDepositParams) => {
      if (!program || !wallet?.publicKey) throw new Error("Wallet not connected");
      if (!hasSufficientBalance(mint, amount)) throw new Error("Insufficient balance");

      setLoading(true);
      setError(null);
      console.log("📝 Creating Time Deposit:", { mint: mint.toBase58(), amount, unlockTimestamp });

      try {
        const provider = program.provider as anchor.AnchorProvider;

        const [depositPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("deposit"), wallet.publicKey.toBuffer(), new anchor.BN(unlockTimestamp).toArrayLike(Buffer, "le", 8)],
          program.programId
        );
        const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault"), depositPda.toBuffer()], program.programId);

        console.log("📦 Deposit PDA:", depositPda.toBase58(), "Vault PDA:", vaultPda.toBase58());

        const ownerTokenAccount = await ensureUserTokenAccount(mint, wallet.publicKey);

        const tx = await program.methods
          .initializeDeposit(new anchor.BN(amount), new anchor.BN(unlockTimestamp))
          .accounts({
            owner: wallet.publicKey,
            deposit: depositPda,
            mint,
            ownerTokenAccount,
            vaultTokenAccount: vaultPda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .transaction();

        tx.feePayer = wallet.publicKey;
        const latest = await provider.connection.getLatestBlockhash();
        tx.recentBlockhash = latest.blockhash;

        console.log("✍ Signing transaction...");
        const signedTx = await provider.wallet.signTransaction(tx);
        const sig = await provider.connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
        console.log("🚀 Transaction sent, signature:", sig);
        await provider.connection.confirmTransaction(sig, "confirmed");
        console.log("✅ Time Deposit created successfully");

        return { signature: sig, depositPda, vaultPda };
      } catch (err: any) {
        console.error("❌ Error creating Time Deposit:", err);
        setError(err.message || "Failed to create time deposit");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, wallet, hasSufficientBalance, ensureUserTokenAccount]
  );

  /** Создание Amount Deposit */
  const createAmountDeposit = useCallback(
    async ({ mint, amount, unlockAmount }: CreateAmountDepositParams) => {
      if (!program || !wallet?.publicKey) throw new Error("Wallet not connected");
      if (!hasSufficientBalance(mint, amount)) throw new Error("Insufficient balance");

      setLoading(true);
      setError(null);
      console.log("📝 Creating Amount Deposit:", { mint: mint.toBase58(), amount, unlockAmount });

      try {
        const provider = program.provider as anchor.AnchorProvider;

        const [depositPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("deposit"), wallet.publicKey.toBuffer(), new anchor.BN(unlockAmount).toArrayLike(Buffer, "le", 8)],
          program.programId
        );
        const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault"), depositPda.toBuffer()], program.programId);

        console.log("📦 Deposit PDA:", depositPda.toBase58(), "Vault PDA:", vaultPda.toBase58());

        const ownerTokenAccount = await ensureUserTokenAccount(mint, wallet.publicKey);

        const tx = await program.methods
          .initializeDepositByAmount(new anchor.BN(amount), new anchor.BN(unlockAmount))
          .accounts({
            owner: wallet.publicKey,
            deposit: depositPda,
            mint,
            ownerTokenAccount,
            vaultTokenAccount: vaultPda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .transaction();

        tx.feePayer = wallet.publicKey;
        const latest = await provider.connection.getLatestBlockhash();
        tx.recentBlockhash = latest.blockhash;

        console.log("✍ Signing transaction...");
        const signedTx = await provider.wallet.signTransaction(tx);
        const sig = await provider.connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
        console.log("🚀 Transaction sent, signature:", sig);
        await provider.connection.confirmTransaction(sig, "confirmed");
        console.log("✅ Amount Deposit created successfully");

        return { signature: sig, depositPda, vaultPda };
      } catch (err: any) {
        console.error("❌ Error creating Amount Deposit:", err);
        setError(err.message || "Failed to create amount deposit");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, wallet, hasSufficientBalance, ensureUserTokenAccount]
  );

  /** Top-up депозита */
  const topUpDeposit = useCallback(
    async (
      depositPubkey: PublicKey,
      mint: PublicKey,
      vaultTokenAccount: PublicKey,
      additionalAmount: number,
      decimals: number // 🔹 добавляем decimals
    ) => {
      if (!program || !wallet?.publicKey) throw new Error("Wallet not connected");

      setLoading(true);
      setError(null);
      console.log("🔼 Top-up deposit:", {
        depositPubkey: depositPubkey.toBase58(),
        mint: mint.toBase58(),
        vaultTokenAccount: vaultTokenAccount.toBase58(),
        additionalAmount,
        decimals,
      });

      try {
        const provider = program.provider as anchor.AnchorProvider;
        const ownerTokenAccount = await ensureUserTokenAccount(mint, wallet.publicKey);

        const amountInMinimalUnits = toMinimalUnits(additionalAmount, decimals);

        console.log("💵 Converted top-up amount to minimal units:", amountInMinimalUnits);

        const tx = await program.methods
          .addFunds(new anchor.BN(amountInMinimalUnits))
          .accounts({
            owner: wallet.publicKey,
            deposit: depositPubkey,
            mint,
            ownerTokenAccount,
            vaultTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .transaction();

        tx.feePayer = wallet.publicKey;
        const latest = await provider.connection.getLatestBlockhash();
        tx.recentBlockhash = latest.blockhash;

        console.log("✍ Signing top-up transaction...");
        const signedTx = await provider.wallet.signTransaction(tx);
        const sig = await provider.connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
        console.log("🚀 Top-up transaction sent, signature:", sig);
        await provider.connection.confirmTransaction(sig, "confirmed");
        console.log("✅ Top-up completed");

        return sig;
      } catch (err: any) {
        console.error("❌ Error during top-up:", err);
        setError(err.message || "Failed to top up deposit");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, wallet, ensureUserTokenAccount, toMinimalUnits]
  );

  const withdrawDeposit = useCallback(
    async (depositPubkey: PublicKey, vaultTokenAccount: PublicKey, mint: PublicKey) => {
      if (!program || !wallet?.publicKey) throw new Error("Wallet not connected");

      setLoading(true);
      setError(null);
      console.log("💸 Withdrawing deposit:", depositPubkey.toBase58());

      try {
        const provider = program.provider as anchor.AnchorProvider;
        const ownerTokenAccount = await ensureUserTokenAccount(mint, wallet.publicKey);

        const tx = await program.methods
          .withdraw() // <-- метод из твоего smart contract
          .accounts({
            owner: wallet.publicKey,
            deposit: depositPubkey,
            vaultTokenAccount,
            ownerTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .transaction();

        tx.feePayer = wallet.publicKey;
        const latest = await provider.connection.getLatestBlockhash();
        tx.recentBlockhash = latest.blockhash;

        const signedTx = await provider.wallet.signTransaction(tx);
        const sig = await provider.connection.sendRawTransaction(signedTx.serialize());
        await provider.connection.confirmTransaction(sig, "confirmed");

        console.log("✅ Withdraw successful, signature:", sig);
        return sig;
      } catch (err: any) {
        console.error("❌ Error during withdraw:", err);
        setError(err.message || "Failed to withdraw deposit");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [program, wallet, ensureUserTokenAccount]
  );

  /** Валидация Time Deposit */
  const isValidTimeDeposit = useCallback(
    (mint: PublicKey, amount: number, unlockTimestamp: number) => {
      return hasSufficientBalance(mint, amount) && unlockTimestamp > Math.floor(Date.now() / 1000);
    },
    [hasSufficientBalance]
  );

  /** Валидация Amount Deposit */
  const isValidAmountDeposit = useCallback(
    (mint: PublicKey, amount: number, unlockAmount: number) => {
      return hasSufficientBalance(mint, amount) && unlockAmount > 0;
    },
    [hasSufficientBalance]
  );


  return {
    createTimeDeposit,
    createAmountDeposit,
    topUpDeposit,
    loading,
    error,
    userTokens: tokens,
    hasSufficientBalance,
    ensureUserTokenAccount,
    toMinimalUnits,
    fromMinimalUnits,
    isValidTimeDeposit,
    isValidAmountDeposit,
    withdrawDeposit
  };
}
