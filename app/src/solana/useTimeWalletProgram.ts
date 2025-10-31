import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, type Idl, web3 } from "@coral-xyz/anchor";
import idl from "../idl/timelock_wallet.json";

export function useTimeWalletProgram() {
  const wallet = useWallet();
  const rpcUrl =
    import.meta.env.VITE_SOLANA_RPC || "https://api.devnet.solana.com";
  const connection = useMemo(
    () => new web3.Connection(rpcUrl, "confirmed"),
    [rpcUrl]
  );

  const programId = useMemo(
    () =>
      new web3.PublicKey(
        import.meta.env.VITE_PROGRAM_ID ||
          "CPPQFeBovJRCeLQ1Kh7HAX9qQMszh42XMBMpHMrrXBkD"
      ),
    []
  );

  const provider = useMemo(() => {
    if (!wallet || !wallet.publicKey) return null;
    return new AnchorProvider(connection, wallet as any, {
      preflightCommitment: "processed",
    });
  }, [wallet, connection]);

  const program = useMemo(() => {
    if (!provider) return null;
    try {
      return new Program(idl as Idl, programId, provider);
    } catch (err) {
      console.error("Error creating program:", err);
      return null;
    }
  }, [provider, programId]);

  return { program, provider, connection, wallet };
}