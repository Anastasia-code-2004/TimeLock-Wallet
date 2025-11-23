import React from "react";
import { DepositList } from "../components/deposits/DepositList";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const MyDeposits: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container my-deposits-wrapper">
      {/* Header с таким же выравниванием как на Create Deposit */}
      <div className="create-deposit-header-centered">
        <button 
          className="back-btn" 
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="header-content-centered">
          <h1 className="page-title">My Deposits</h1>
          <p className="page-subtitle">View and manage your locked deposits</p>
        </div>
      </div>

      {/* Контент с депозитами */}
      <div className="my-deposits-content">
        <DepositList />
      </div>
    </div>
  );
};