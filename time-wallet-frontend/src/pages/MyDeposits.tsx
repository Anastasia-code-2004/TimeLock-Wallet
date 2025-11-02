import React from "react";
import { DepositList } from "../components/deposits/DepositList";


export const MyDeposits: React.FC = () => {

  return (
    <div className="page-container">
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