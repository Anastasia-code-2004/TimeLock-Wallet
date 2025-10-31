import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, Idl, web3 } from "@coral-xyz/anchor";
import idl from "../idl/timelock_wallet.json";

export function useTimeWalletProgram() {
  const wallet = useWallet();
  const rpcUrl = process.env.REACT_APP_SOLANA_RPC || "https://api.devnet.solana.com";
  const connection = new web3.Connection(rpcUrl, "confirmed");

  const provider = useMemo(() => {
    if (!wallet || !wallet.publicKey) return null;
    return new AnchorProvider(connection, wallet as any, {
      preflightCommitment: "processed",
      commitment: "confirmed",
    });
  }, [wallet, connection]);

  const program = useMemo(() => {
    if (!provider) return null;
    try {
      return new Program<Idl>(idl as Idl, provider);
    } catch (err) {
      console.error("Error creating program:", err);
      return null;
    }
  }, [provider]);

  return { program, provider, connection, wallet };
}
