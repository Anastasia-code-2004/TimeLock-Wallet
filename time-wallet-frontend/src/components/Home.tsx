import React, { useState } from "react"; // 👈 Добавь useState здесь
import { useNavigate } from "react-router-dom";
import { useTimeWalletProgram } from "../hooks/useTimeWalletProgram";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  FaLock,
  FaWallet,
  FaDatabase,
  FaHistory,
  FaChartLine,
  FaTimes,
} from "react-icons/fa";
import { CreateDepositForm } from "./CreateDepositForm";

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
            {React.createElement(FaLock, { size: 56, color: "#ff66b2" })}
          </div>
          <h1 className="home-title">Lock Wallet</h1>
          <p className="home-subtitle">Secure locked deposits on Solana</p>
        </div>

        {/* Wallet connect */}
        <div className="wallet-section">
          <WalletMultiButton />
          {wallet?.publicKey && (
            <p className="wallet-status">
              {React.createElement(FaWallet, {
                size: 14,
                style: { marginRight: "6px", verticalAlign: "middle" },
              })}
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
                {React.createElement(FaDatabase, { size: 28 })}
              </div>
              <h3>Create Deposit</h3>
              <p>Lock your tokens</p>
            </button>

            <button 
              className="action-card"
              onClick={() => navigate("/my-deposits")}
            >
              <div className="action-icon">
                {React.createElement(FaHistory, { size: 28 })}
              </div>
              <h3>My Deposits</h3>
              <p>View and manage your active deposits</p>
            </button>

            <button className="action-card">
              <div className="action-icon">
                {React.createElement(FaChartLine, { size: 28 })}
              </div>
              <h3>Analytics</h3>
              <p>Track your deposit performance and unlock history</p>
            </button>
          </div>
        )}

        {/* Create Deposit Form */}
        {showCreateDeposit && (
          <div className="form-container">
            <div className="form-header">
              <h2>Create Deposit</h2>
              <button
                className="close-button"
                onClick={() => setShowCreateDeposit(false)}
              >
                <FaTimes />
              </button>
            </div>
            <CreateDepositForm />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;