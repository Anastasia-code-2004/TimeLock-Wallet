// pages/MyDeposits.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { DepositList } from "../components/DepositsList";
import { FaArrowLeft } from "react-icons/fa";

export const MyDeposits: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="header-section">
        <button 
          className="back-button"
          onClick={() => navigate("/")}
        >
          <FaArrowLeft size={20} />
          Back to Home
        </button>
        <h1 className="page-title">My Deposits</h1>
        <p className="page-subtitle">View and manage your locked deposits</p>
      </div>

      <div className="content-section">
        <DepositList />
      </div>
    </div>
  );
};