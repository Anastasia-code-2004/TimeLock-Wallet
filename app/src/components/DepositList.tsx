import React from 'react';
import { useDeposits } from '../hooks/useDeposits';
import { BN } from '@coral-xyz/anchor';

export const DepositList: React.FC = () => {
  const { deposits, loading, hasDeposits } = useDeposits();

  const formatBN = (bn: BN): string => {
    return bn.toString();
  };

  const getConditionType = (conditionType: { byTime?: {}; byAmount?: {} }): string => {
    if (conditionType.byTime) return 'Time Lock';
    if (conditionType.byAmount) return 'Amount Lock';
    return 'Unknown';
  };

  const getState = (state: { active?: {}; withdrawn?: {} }): string => {
    if (state.active) return 'Active';
    if (state.withdrawn) return 'Withdrawn';
    return 'Unknown';
  };

  const formatTimestamp = (timestamp: BN): string => {
    const date = new Date(timestamp.toNumber() * 1000);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="deposit-list">
        <h2>My Deposits</h2>
        <div className="loading">Loading deposits...</div>
      </div>
    );
  }

  return (
    <div className="deposit-list">
      <h2>My Deposits</h2>
      
      {!hasDeposits ? (
        <div className="no-deposits">
          No deposits found. Create your first deposit above!
        </div>
      ) : (
        <div className="deposits-grid">
          {deposits.map((deposit, index) => (
            <div key={index} className="deposit-card">
              <div className="deposit-header">
                <h3>Deposit #{index + 1}</h3>
                <span className={`status ${getState(deposit.account.state).toLowerCase()}`}>
                  {getState(deposit.account.state)}
                </span>
              </div>
              
              <div className="deposit-info">
                <div className="info-row">
                  <span className="label">Amount:</span>
                  <span className="value">{formatBN(deposit.account.amount)} tokens</span>
                </div>
                
                <div className="info-row">
                  <span className="label">Type:</span>
                  <span className="value">{getConditionType(deposit.account.lock_condition.condition_type)}</span>
                </div>

                {deposit.account.lock_condition.condition_type.byTime && (
                  <div className="info-row">
                    <span className="label">Unlocks at:</span>
                    <span className="value">
                      {formatTimestamp(deposit.account.lock_condition.unlock_timestamp)}
                    </span>
                  </div>
                )}

                {deposit.account.lock_condition.condition_type.byAmount && (
                  <div className="info-row">
                    <span className="label">Target Amount:</span>
                    <span className="value">
                      {formatBN(deposit.account.lock_condition.unlock_amount)} tokens
                    </span>
                  </div>
                )}

                <div className="info-row">
                  <span className="label">Created:</span>
                  <span className="value">
                    {formatTimestamp(deposit.account.created_at)}
                  </span>
                </div>

                <div className="info-row">
                  <span className="label">Deposit Address:</span>
                  <span className="value address">
                    {deposit.publicKey.toString().slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};