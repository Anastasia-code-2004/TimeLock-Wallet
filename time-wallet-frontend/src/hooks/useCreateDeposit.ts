// hooks/useCreateDeposit.ts
import { useState, useCallback } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { useTimeWalletProgram } from './useTimeWalletProgram';
import { useUserTokens } from './useUserTokens';

export interface CreateTimeDepositParams {
  mint: PublicKey;
  amount: number; // в минимальных единицах (lamports для SOL, decimals для токенов)
  unlockTimestamp: number; // UNIX timestamp в секундах
}

export interface CreateAmountDepositParams {
  mint: PublicKey;
  amount: number; // в минимальных единицах
  unlockAmount: number; // в минимальных единицах
}

export function useCreateDeposit() {
  const { program, wallet } = useTimeWalletProgram();
  const { tokens } = useUserTokens();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Проверяем, есть ли у пользователя достаточно токенов
  const hasSufficientBalance = useCallback((mint: PublicKey, amount: number): boolean => {
    const userToken = tokens.find(token => token.mint.equals(mint));
    if (!userToken) return false;
    return userToken.balance >= amount;
  }, [tokens]);

  // Получаем информацию о токене пользователя
  const getUserTokenInfo = useCallback((mint: PublicKey) => {
    return tokens.find(token => token.mint.equals(mint));
  }, [tokens]);

  // Создание депозита по времени
  const createTimeDeposit = useCallback(async (
    params: CreateTimeDepositParams
  ) => {
    if (!program || !wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    if (!hasSufficientBalance(params.mint, params.amount)) {
      throw new Error('Insufficient balance');
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Находим PDA для депозита (используем timestamp как seed)
      const [depositPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('deposit'),
          wallet.publicKey.toBuffer(),
          new anchor.BN(params.unlockTimestamp).toArrayLike(Buffer, 'le', 8),
        ],
        program.programId
      );

      // 2. Получаем токен-аккаунт владельца
      const ownerTokenAccount = await getAssociatedTokenAddress(
        params.mint,
        wallet.publicKey
      );

      // 3. Находим PDA для vault токен-аккаунта
      const [vaultTokenAccountPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('vault'),
          depositPda.toBuffer(),
        ],
        program.programId
      );

      console.log('Creating time deposit with:', {
        depositPda: depositPda.toBase58(),
        ownerTokenAccount: ownerTokenAccount.toBase58(),
        vaultTokenAccount: vaultTokenAccountPda.toBase58(),
        amount: params.amount,
        unlockTimestamp: params.unlockTimestamp,
      });

      // 4. Вызываем инструкцию
      const tx = await program.methods
        .initializeDeposit(
          new anchor.BN(params.amount),
          new anchor.BN(params.unlockTimestamp)
        )
        .accounts({
          owner: wallet.publicKey,
          deposit: depositPda,
          mint: params.mint,
          ownerTokenAccount: ownerTokenAccount,
          vaultTokenAccount: vaultTokenAccountPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log('Deposit created successfully:', tx);
      return tx;

    } catch (err: any) {
      console.error('Error creating time deposit:', err);
      const errorMsg = err.message || 'Failed to create time deposit';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [program, wallet, hasSufficientBalance]);

  // Создание депозита по сумме
  const createAmountDeposit = useCallback(async (
    params: CreateAmountDepositParams
  ) => {
    if (!program || !wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    if (!hasSufficientBalance(params.mint, params.amount)) {
      throw new Error('Insufficient balance');
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Находим PDA для депозита (используем unlockAmount как seed)
      const [depositPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('deposit'),
          wallet.publicKey.toBuffer(),
          new anchor.BN(params.unlockAmount).toArrayLike(Buffer, 'le', 8),
        ],
        program.programId
      );

      // 2. Получаем токен-аккаунт владельца
      const ownerTokenAccount = await getAssociatedTokenAddress(
        params.mint,
        wallet.publicKey
      );

      // 3. Находим PDA для vault токен-аккаунта
      const [vaultTokenAccountPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('vault'),
          depositPda.toBuffer(),
        ],
        program.programId
      );

      console.log('Creating amount deposit with:', {
        depositPda: depositPda.toBase58(),
        ownerTokenAccount: ownerTokenAccount.toBase58(),
        vaultTokenAccount: vaultTokenAccountPda.toBase58(),
        amount: params.amount,
        unlockAmount: params.unlockAmount,
      });

      // 4. Вызываем инструкцию
      const tx = await program.methods
        .initializeDepositByAmount(
          new anchor.BN(params.amount),
          new anchor.BN(params.unlockAmount)
        )
        .accounts({
          owner: wallet.publicKey,
          deposit: depositPda,
          mint: params.mint,
          ownerTokenAccount: ownerTokenAccount,
          vaultTokenAccount: vaultTokenAccountPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log('Amount deposit created successfully:', tx);
      return tx;

    } catch (err: any) {
      console.error('Error creating amount deposit:', err);
      const errorMsg = err.message || 'Failed to create amount deposit';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [program, wallet, hasSufficientBalance]);

  // Утилита для конвертации human-readable amount в минимальные единицы
  const toMinimalUnits = useCallback((amount: number, decimals: number): number => {
    return Math.floor(amount * Math.pow(10, decimals));
  }, []);

  // Утилита для конвертации минимальных единиц в human-readable amount
  const fromMinimalUnits = useCallback((amount: number, decimals: number): number => {
    return amount / Math.pow(10, decimals);
  }, []);

  return {
    // Основные функции
    createTimeDeposit,
    createAmountDeposit,
    
    // Состояние
    loading,
    error,
    
    // Утилиты для работы с токенами
    userTokens: tokens,
    hasSufficientBalance,
    getUserTokenInfo,
    toMinimalUnits,
    fromMinimalUnits,
    
    // Валидация
    isValidTimeDeposit: (mint: PublicKey, amount: number, unlockTimestamp: number) => {
      if (!hasSufficientBalance(mint, amount)) return false;
      const now = Math.floor(Date.now() / 1000);
      return unlockTimestamp > now;
    },
    
    isValidAmountDeposit: (mint: PublicKey, amount: number, unlockAmount: number) => {
      if (!hasSufficientBalance(mint, amount)) return false;
      return unlockAmount > 0;
    }
  };
}