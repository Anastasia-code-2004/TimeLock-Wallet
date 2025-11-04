import React from "react";
import { DepositList } from "../components/deposits/DepositList";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const MyDeposits: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate("/")}>
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="header-section">
        <h1 className="page-title">My Deposits</h1>
        <p className="page-subtitle">View and manage your locked deposits</p>
      </div>

      <div className="content-section">
        <DepositList />
      </div>
    </div>
  );
};
