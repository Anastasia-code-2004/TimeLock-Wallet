import { useTimelockProgram } from './useTimelockWallet';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { BN } from '@coral-xyz/anchor';

export interface DepositAccount {
  publicKey: PublicKey;
  account: {
    owner: PublicKey;
    mint: PublicKey;
    vault_token_account: PublicKey; // ← snake_case
    amount: BN; // ← BN вместо number
    lock_condition: { // ← snake_case
      unlock_timestamp: BN; // ← BN
      unlock_amount: BN; // ← BN  
      condition_type: { byTime?: {}; byAmount?: {} }; // ← snake_case
    };
    lock_seed: number[]; // ← snake_case
    state: { active?: {}; withdrawn?: {} };
    created_at: BN; // ← BN
    bump: number;
  };
}

export const useDeposits = () => {
  const { program, walletPublicKey } = useTimelockProgram();
  const [deposits, setDeposits] = useState<DepositAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDeposits = async () => {
      if (!program || !walletPublicKey) {
        setDeposits([]);
        return;
      }

      setLoading(true);
      try {
        // Получаем все депозиты для текущего пользователя
        const allDeposits = await program.account.TimeLockDeposit.all(); // ← обрати внимание на имя аккаунта!
        const userDeposits = allDeposits.filter(
          deposit => deposit.account.owner.equals(walletPublicKey)
        );
        
        setDeposits(userDeposits as DepositAccount[]);
      } catch (error) {
        console.error('Error fetching deposits:', error);
        setDeposits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeposits();
  }, [program, walletPublicKey]);

  return {
    deposits,
    loading,
    hasDeposits: deposits.length > 0
  };
};