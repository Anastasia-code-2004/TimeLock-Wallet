import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { TestConnection } from "./components/TestConnection";

function App() {
  // создаём адаптеры кошельков
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const endpoint = import.meta.env.VITE_SOLANA_RPC || "https://api.devnet.solana.com";

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">💰 Time Wallet</h1>
            <WalletMultiButton />
            <TestConnection />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
