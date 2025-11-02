import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTimeWalletProgram } from "../hooks/useTimeWalletProgram";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { CreateDepositForm } from "../components/deposits/CreateDepositForm";
import { FaLock, FaWallet, FaDatabase, FaHistory, FaChartLine } from "react-icons/fa";

// Временные решения для иконок
const LockIcon = FaLock as React.ComponentType<{ size?: number; color?: string }>;
const WalletIcon = FaWallet as React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
const DatabaseIcon = FaDatabase as React.ComponentType<{ size?: number }>;
const HistoryIcon = FaHistory as React.ComponentType<{ size?: number }>;
const ChartLineIcon = FaChartLine as React.ComponentType<{ size?: number }>;

export const Home: React.FC = () => {
  const { program, wallet } = useTimeWalletProgram();
  const [showCreateDeposit, setShowCreateDeposit] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="home-card">
        {/* Header */}
        <div className="home-header">
          <div className="home-icon">
            <LockIcon size={56} color="#ff66b2" />
          </div>
          <h1 className="home-title">Lock Wallet</h1>
          <p className="home-subtitle">Secure locked deposits on Solana</p>
        </div>

        {/* Wallet connect */}
        <div className="wallet-section">
          <WalletMultiButton />
          {wallet?.publicKey && (
            <p className="wallet-status">
              <WalletIcon 
                size={14} 
                style={{ marginRight: "6px", verticalAlign: "middle" }} 
              />
              Connected: {wallet.publicKey.toBase58().slice(0, 4)}...
              {wallet.publicKey.toBase58().slice(-4)}
            </p>
          )}
        </div>

        {/* Actions grid */}
        {wallet?.publicKey && program && !showCreateDeposit && (
          <div className="actions-grid">
            <button
              className="action-card"
              onClick={() => setShowCreateDeposit(true)}
            >
              <div className="action-icon">
                <DatabaseIcon size={28} />
              </div>
              <h3>Create Deposit</h3>
              <p>Lock your tokens</p>
            </button>

            <button 
              className="action-card"
              onClick={() => navigate("/my-deposits")}
            >
              <div className="action-icon">
                <HistoryIcon size={28} />
              </div>
              <h3>My Deposits</h3>
              <p>View and manage your active deposits</p>
            </button>

            <button className="action-card">
              <div className="action-icon">
                <ChartLineIcon size={28} />
              </div>
              <h3>Analytics</h3>
              <p>Track your deposit performance and unlock history</p>
            </button>
          </div>
        )}

        {/* Create Deposit Form */}
        {showCreateDeposit && (
            <CreateDepositForm onClose={() => setShowCreateDeposit(false)} />
        )}
      </div>
    </div>
  );
};

export default Home;