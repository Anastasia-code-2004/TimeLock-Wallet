import React from "react";
import { useNavigate } from "react-router-dom";
import { CreateDepositForm } from "../components/deposits/CreateDepositForm";
import { ArrowLeft } from "lucide-react";

export const CreateDeposit: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container create-deposit-wrapper">
      {/* Header с правильным выравниванием */}
      <div className="create-deposit-header-centered">
        <button 
          className="back-btn" 
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="header-content-centered">
          <h1 className="page-title">Create New Deposit</h1>
          <p className="page-subtitle">Secure your tokens with time or amount based locks</p>
        </div>
      </div>
      
      {/* Форма по центру - теперь она больше */}
      <div className="create-deposit-content">
        <CreateDepositForm onClose={() => navigate("/my-deposits")} />
      </div>
    </div>
  );
};