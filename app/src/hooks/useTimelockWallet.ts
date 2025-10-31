import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { useMemo } from "react";
import { IDL, type TimelockWallet } from "../types/timelock-wallet";

const PROGRAM_PUBKEY = new PublicKey(IDL.address ?? "CPPQFeBovJRCeLQ1Kh7HAX9qQMszh42XMBMpHMrrXBkD");

export function useTimelockProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet || !connection) return null;

    // Anchor provider
    const provider = new AnchorProvider(connection as Connection, wallet as any, {
      commitment: "confirmed",
    });

    // Приводим конструктор Program к any, чтобы обойти несовместимости типов
    const ProgramAny: any = Program as unknown as any;

    // Попробуем две возможные сигнатуры: (idl, provider, programId) и (idl, programId, provider)
    // Используем try/catch: runtime выберет корректную
    try {
      // попытка для некоторых версий (например 0.32.1) — (idl, provider, programId)
      return (new ProgramAny(IDL as Idl, provider, PROGRAM_PUBKEY) as Program<TimelockWallet>);
    } catch {
      // fallback: (idl, programId, provider) — встречается в других версиях
      return (new ProgramAny(IDL as Idl, PROGRAM_PUBKEY, provider) as Program<TimelockWallet>);
    }
  }, [wallet, connection]);

  return {
    program,
    isConnected: !!wallet,
    walletPublicKey: wallet?.publicKey ?? null,
  };
}
