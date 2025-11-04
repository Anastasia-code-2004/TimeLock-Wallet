import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Pages
import { Home } from "./pages/Home";
import { MyDeposits } from "./pages/MyDeposits";
import { Analytics } from "./pages/Analytics";
// import { CreateDeposit } from "./pages/CreateDeposit";
// import { Analytics } from "./pages/Analytics";

// Styles
import "./App.css";
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = process.env.REACT_APP_SOLANA_RPC || clusterApiUrl(network);
  const wallets = [new PhantomWalletAdapter()];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/my-deposits" element={<MyDeposits />} />
                <Route path="/analytics" element={<Analytics />} />
                {/* <Route path="/create-deposit" element={<CreateDeposit />} /> */}
                {/* <Route path="/analytics" element={<Analytics />} /> */}
              </Routes>
            </div>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;