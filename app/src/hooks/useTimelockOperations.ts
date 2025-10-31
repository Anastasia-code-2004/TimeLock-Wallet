import { useTimelockProgram } from './useTimelockWallet';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { useCallback } from 'react';

export const useTimelockOperations = () => {
  const { program, walletPublicKey } = useTimelockProgram();

  // Создание депозита по времени
  const initializeDeposit = useCallback(async (
    amount: number,
    unlockTimestamp: number,
    mint: PublicKey,
    ownerTokenAccount: PublicKey
  ) => {
    if (!program || !walletPublicKey) {
      throw new Error('Wallet not connected');
    }

    const amountBN = new BN(amount);
    const unlockTimestampBN = new BN(unlockTimestamp);

    // Находим PDA для депозита
    const [depositPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('deposit'),
        walletPublicKey.toBuffer(),
        unlockTimestampBN.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    // Находим PDA для vault
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        depositPda.toBuffer()
      ],
      program.programId
    );

    return await (program as any).methods
      .initialize_deposit(amountBN, unlockTimestampBN)
      .accounts({
        owner: walletPublicKey,
        deposit: depositPda,
        mint,
        owner_token_account: ownerTokenAccount,
        vault_token_account: vaultPda,
        system_program: SystemProgram.programId,
        token_program: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  }, [program, walletPublicKey]);

  // Создание депозита по сумме
  const initializeDepositByAmount = useCallback(async (
    amount: number,
    unlockAmount: number,
    mint: PublicKey,
    ownerTokenAccount: PublicKey
  ) => {
    if (!program || !walletPublicKey) {
      throw new Error('Wallet not connected');
    }

    const amountBN = new BN(amount);
    const unlockAmountBN = new BN(unlockAmount);

    const [depositPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('deposit'),
        walletPublicKey.toBuffer(),
        unlockAmountBN.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        depositPda.toBuffer()
      ],
      program.programId
    );

    return await (program as any).methods
      .initialize_deposit_by_amount(amountBN, unlockAmountBN)
      .accounts({
        owner: walletPublicKey,
        deposit: depositPda,
        mint,
        owner_token_account: ownerTokenAccount, // 👈 snake_case
        vault_token_account: vaultPda,          // 👈 snake_case
        system_program: SystemProgram.programId, // 👈 snake_case
        token_program: TOKEN_PROGRAM_ID,         // 👈 snake_case
        rent: SYSVAR_RENT_PUBKEY,                // 👈 snake_case
      })
      .rpc();

  }, [program, walletPublicKey]);

  // Добавление средств
  const addFunds = useCallback(async (
    deposit: PublicKey,
    additionalAmount: number,
    mint: PublicKey,
    ownerTokenAccount: PublicKey,
    vaultTokenAccount: PublicKey
  ) => {
    if (!program || !walletPublicKey) {
      throw new Error('Program not initialized');
    }

    const additionalAmountBN = new BN(additionalAmount);

    return await (program as any).methods
      .add_funds(additionalAmountBN)
      .accounts({
        owner: walletPublicKey,
        deposit,
        mint,
        owner_token_account: ownerTokenAccount,
        vault_token_account: vaultTokenAccount,
        token_program: TOKEN_PROGRAM_ID, // 👈 snake_case обязательно
      })
      .rpc();

  }, [program, walletPublicKey]);

  // Вывод средств
  const withdraw = useCallback(async (
    deposit: PublicKey,
    vaultTokenAccount: PublicKey,
    ownerTokenAccount: PublicKey
  ) => {
    if (!program || !walletPublicKey) {
      throw new Error('Program not initialized');
    }

    return await program.methods
      .withdraw()
      .accounts({
        owner: walletPublicKey,
        deposit,
        vault_token_account: vaultTokenAccount,
        owner_token_account: ownerTokenAccount,
        //token_program: TOKEN_PROGRAM_ID,
      })
      .rpc();

  }, [program, walletPublicKey]);

  return {
    initializeDeposit,
    initializeDepositByAmount,
    addFunds,
    withdraw,
    isConnected: !!walletPublicKey,
    walletPublicKey
  };
};