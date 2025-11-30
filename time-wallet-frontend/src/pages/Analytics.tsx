import React from "react";
import { useNavigate } from "react-router-dom";
import { useDeposits } from "../hooks/useDeposits";
import { Deposit } from "../types/deposit";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowLeft } from "lucide-react";
import { analyticsService } from "../services/analyticsService";

const COLORS = ["#c471ed", "#f64f59", "#ba68c8", "#10b981", "#FFBB28", "#00C49F"];

function formatDuration(seconds: number) {
  if (seconds <= 0) return "0 min";
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  return `${days ? `${days} day${days > 1 ? "s" : ""}, ` : ""}${
    hours ? `${hours} hour${hours > 1 ? "s" : ""}, ` : ""
  }${minutes} min`;
}

type AnalyticsStats = {
  totalDeposits: number;
  depositsReadyToWithdraw: number;
  depositsByType: { byTime: number; byAmount: number };
  totalByToken: Record<string, number>;
  
  byTimeStats: {
    totalByToken: Record<string, number>;
    depositsCountByToken: Record<string, number>;
    earliestUnlock: number | null;
    latestUnlock: number | null;
  };
  
  byAmountStats: {
    totalByToken: Record<string, number>;
    remainingByToken: Record<string, number>;
    depositsCountByToken: Record<string, number>;
    targetByToken: Record<string, number>;
  };
  
  depositsCountByToken: Record<string, number>;
};

function computeAnalytics(deposits: Deposit[]): AnalyticsStats {
  const now = Math.floor(Date.now() / 1000);
  const stats: AnalyticsStats = {
    totalDeposits: deposits.length,
    depositsReadyToWithdraw: 0,
    depositsByType: { byTime: 0, byAmount: 0 },
    totalByToken: {},
    
    byTimeStats: {
      totalByToken: {},
      depositsCountByToken: {},
      earliestUnlock: null,
      latestUnlock: null,
    },
    
    byAmountStats: {
      totalByToken: {},
      remainingByToken: {},
      depositsCountByToken: {},
      targetByToken: {},
    },
    
    depositsCountByToken: {},
  };

  deposits.forEach((d) => {
    const mint = d.mint;

    stats.depositsCountByToken[mint] = (stats.depositsCountByToken[mint] || 0) + 1;
    stats.totalByToken[mint] = (stats.totalByToken[mint] || 0) + d.amount;

    if (d.lockCondition.conditionType === "ByTime") {
      stats.depositsByType.byTime++;
      
      stats.byTimeStats.totalByToken[mint] = (stats.byTimeStats.totalByToken[mint] || 0) + d.amount;
      stats.byTimeStats.depositsCountByToken[mint] = (stats.byTimeStats.depositsCountByToken[mint] || 0) + 1;

      const unlock = d.lockCondition.unlockTimestamp || 0;
      if (unlock <= now) stats.depositsReadyToWithdraw++;

      if (stats.byTimeStats.earliestUnlock === null || unlock < stats.byTimeStats.earliestUnlock)
        stats.byTimeStats.earliestUnlock = unlock;
      if (stats.byTimeStats.latestUnlock === null || unlock > stats.byTimeStats.latestUnlock)
        stats.byTimeStats.latestUnlock = unlock;
    } else {
      stats.depositsByType.byAmount++;
      
      stats.byAmountStats.totalByToken[mint] = (stats.byAmountStats.totalByToken[mint] || 0) + d.amount;
      stats.byAmountStats.depositsCountByToken[mint] = (stats.byAmountStats.depositsCountByToken[mint] || 0) + 1;

      const targetAmount = d.lockCondition.unlockAmount || 0;
      const remaining = Math.max(targetAmount - d.amount, 0);
      
      stats.byAmountStats.remainingByToken[mint] = (stats.byAmountStats.remainingByToken[mint] || 0) + remaining;
      stats.byAmountStats.targetByToken[mint] = (stats.byAmountStats.targetByToken[mint] || 0) + targetAmount;

      if (remaining <= 0) stats.depositsReadyToWithdraw++;
    }
  });

  return stats;
}

function shortenTokenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

// Компонент карточки депозита по времени
const DepositTimeCard: React.FC<{ deposit: Deposit; index: number }> = ({ deposit, index }) => {
  const now = Math.floor(Date.now() / 1000);
  const unlockTime = deposit.lockCondition.unlockTimestamp || 0;
  const remainingTime = Math.max(unlockTime - now, 0);
  const isReady = remainingTime <= 0;

  return (
    <div className="deposit-card-compact">
      <div className="deposit-card-header">
        <span className="deposit-card-title">Deposit {index + 1}</span>
        <span className="deposit-badge badge-time">By Time</span>
      </div>
      
      <div className="deposit-amount">{formatAmount(deposit.amount)} TKN</div>
      
      <div className="time-info-compact">
        {isReady ? (
          <div className="ready-badge">✅ Ready to withdraw</div>
        ) : (
          <>
            <span className="time-label-compact">Unlocks in:</span>
            <span className="time-value-compact">{formatDuration(remainingTime)}</span>
          </>
        )}
      </div>
      
      <div className="unlock-date">
        {new Date(unlockTime * 1000).toLocaleDateString()}
      </div>
    </div>
  );
};

// Компонент карточки депозита по сумме
const DepositAmountCard: React.FC<{ deposit: Deposit; index: number }> = ({ deposit, index }) => {
  const target = deposit.lockCondition.unlockAmount || 0;
  const remaining = Math.max(target - deposit.amount, 0);
  const progress = target > 0 ? (deposit.amount / target) * 100 : 0;
  const isReady = remaining <= 0;

  return (
    <div className="deposit-card-compact">
      <div className="deposit-card-header">
        <span className="deposit-card-title">Deposit {index + 1}</span>
        <span className="deposit-badge badge-amount">By Amount</span>
      </div>
      
      <div className="deposit-amount">{formatAmount(deposit.amount)} TKN</div>
      
      {!isReady && (
        <>
          <div className="progress-info-compact">
            <span className="progress-percent-compact">{progress.toFixed(1)}%</span>
            <span className="progress-text-compact">
              {formatAmount(deposit.amount)} / {formatAmount(target)} TKN
            </span>
          </div>
          
          <div className="progress-bar-compact">
            <div 
              className="progress-fill-compact"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="remaining-info">
            <span className="remaining-text">
              {formatAmount(remaining)} TKN remaining to unlock
            </span>
          </div>
        </>
      )}
      
      {isReady && (
        <div className="ready-badge">✅ Ready to withdraw</div>
      )}
    </div>
  );
};

// Компонент общей сводки
const TotalSummary: React.FC<{
  byAmountTotal: number;
  byAmountRemaining: number;
  byAmountTarget: number;
  byAmountCount: number;
}> = ({ byAmountTotal, byAmountRemaining, byAmountTarget, byAmountCount }) => {
  const totalProgress = byAmountTarget > 0 ? (byAmountTotal / byAmountTarget) * 100 : 0;

  return (
    <div className="total-summary-enhanced">
      <div className="summary-header-enhanced">
        <span>Total Progress ({byAmountCount} deposits)</span>
        <span>{totalProgress.toFixed(1)}%</span>
      </div>
      <div className="summary-details-enhanced">
        <div>Total deposited: {formatAmount(byAmountTotal)} TKN</div>
        <div>Total remaining: {formatAmount(byAmountRemaining)} TKN</div>
        <div>Combined target: {formatAmount(byAmountTarget)} TKN</div>
      </div>
    </div>
  );
};

const formatAmount = (amount: number) => (amount / 1_000_000).toFixed(2);

export const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { deposits } = useDeposits();
  const stats = computeAnalytics(deposits);
  const now = Math.floor(Date.now() / 1000);

  const pieDataCount = Object.entries(stats.depositsCountByToken).map(
    ([mint, count]) => ({ 
      name: shortenTokenAddress(mint), 
      value: count,
      fullName: mint 
    })
  );

  return (
    <div className="home-container analytics-wrapper">
      {/* Header */}
      <div className="create-deposit-header-centered">
        <button 
          className="back-btn" 
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="header-content-centered">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Detailed insights about your deposits</p>
        </div>
      </div>

      {/* Контент аналитики */}
      <div className="analytics-content">
        
        {/* Статистика готовая к выводу */}
        <div className="analytics-ready-section">
          <div className="analytics-ready-card">
            <div className="analytics-ready-icon">💰</div>
            <div className="analytics-ready-content">
              <h3>Ready to Withdraw</h3>
              <p className="analytics-ready-count">{stats.depositsReadyToWithdraw} deposits</p>
              <p className="analytics-ready-description">
                Deposits that have met their unlock conditions
              </p>
            </div>
          </div>
        </div>

        {/* Основная статистика */}
        <div className="analytics-stats-grid">
          <div className="stat-card">
            <h4>Total Deposits</h4>
            <p className="stat-number">{stats.totalDeposits}</p>
            <p className="stat-label">across all tokens</p>
          </div>
          
          <div className="stat-card">
            <h4>By Time</h4>
            <p className="stat-number">{stats.depositsByType.byTime}</p>
            <p className="stat-label">time-locked deposits</p>
          </div>
          
          <div className="stat-card">
            <h4>By Amount</h4>
            <p className="stat-number">{stats.depositsByType.byAmount}</p>
            <p className="stat-label">amount-target deposits</p>
          </div>
        </div>

        {/* Временной диапазон */}
        {stats.depositsByType.byTime > 0 && stats.byTimeStats.earliestUnlock !== null && stats.byTimeStats.latestUnlock !== null && (
          <div className="analytics-time-range">
            <h3>Unlock Time Range (By Time Deposits)</h3>
            <div className="time-range-bars">
              <div className="time-range-item">
                <span className="time-label">Earliest</span>
                <span className="time-value">
                  {formatDuration(Math.max(stats.byTimeStats.earliestUnlock - now, 0))}
                </span>
              </div>
              <div className="time-range-item">
                <span className="time-label">Latest</span>
                <span className="time-value">
                  {formatDuration(Math.max(stats.byTimeStats.latestUnlock - now, 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* График распределения по токенам */}
        {pieDataCount.length > 0 && (
          <div className="analytics-chart-section">
            <h3>Deposits Distribution by Token</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieDataCount}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={false}
                  >
                    {pieDataCount.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const fullName = props.payload.fullName;
                      return [`${value} deposits`, fullName];
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Детали по каждому токену */}
        <div className="analytics-tokens-wrapper">
          <div className="tokens-header">
            <h3>Token Details</h3>
            <p className="tokens-subtitle">Detailed breakdown for each token</p>
          </div>
          
          <div className="tokens-list">
            {Object.keys(stats.totalByToken)
              .filter((mint) => stats.totalByToken[mint] > 0)
              .map((mint) => {
                const total = stats.totalByToken[mint];
                const depositCount = stats.depositsCountByToken[mint];
                
                const byTimeTotal = stats.byTimeStats.totalByToken[mint] || 0;
                const byTimeCount = stats.byTimeStats.depositsCountByToken[mint] || 0;
                
                const byAmountTotal = stats.byAmountStats.totalByToken[mint] || 0;
                const byAmountCount = stats.byAmountStats.depositsCountByToken[mint] || 0;
                const byAmountRemaining = stats.byAmountStats.remainingByToken[mint] || 0;
                const byAmountTarget = stats.byAmountStats.targetByToken[mint] || 0;

                // Данные для графиков
                const pieDataByAmountProgress = byAmountCount > 0 ? [
                  { name: "Deposited", value: parseFloat(formatAmount(byAmountTotal)) },
                  { name: "Remaining", value: parseFloat(formatAmount(byAmountRemaining)) },
                ] : [];

                const pieDataTypeDistribution = (byTimeTotal > 0 && byAmountTotal > 0) ? [
                  { name: "By Time", value: parseFloat(formatAmount(byTimeTotal)) },
                  { name: "By Amount", value: parseFloat(formatAmount(byAmountTotal)) },
                ] : [];

                return (
                  <div className="token-card-full" key={mint}>
                    <div className="token-header-full">
                      <div className="token-title-section">
                        <h4 title={mint}>{shortenTokenAddress(mint)}</h4>
                        <span className="token-count-badge">{depositCount} deposit{depositCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    <div className="token-content-enhanced">
                      {/* Левая колонка - статистика и депозиты */}
                      <div className="token-stats-enhanced">
                        <div className="token-stat-full">
                          <span className="stat-label-full">Total Value</span>
                          <span className="stat-value-full">{formatAmount(total)} TKN</span>
                        </div>
                        
                        {/* By Time депозиты */}
                        {byTimeCount > 0 && (
                          <div className="deposit-type-section">
                            <h5>By Time ({byTimeCount})</h5>
                            <div className="deposits-grid-compact">
                              {deposits
                                .filter(d => d.mint === mint && d.lockCondition.conditionType === "ByTime")
                                .map((deposit, index) => (
                                  <DepositTimeCard 
                                    key={deposit.pubkey.toString()}
                                    deposit={deposit}
                                    index={index}
                                  />
                                ))}
                            </div>
                          </div>
                        )}
                        
                        {/* By Amount депозиты */}
                        {byAmountCount > 0 && (
                          <div className="deposit-type-section">
                            <h5>By Amount ({byAmountCount})</h5>
                            <div className="deposits-grid-compact">
                              {deposits
                                .filter(d => d.mint === mint && d.lockCondition.conditionType === "ByAmount")
                                .map((deposit, index) => (
                                  <DepositAmountCard 
                                    key={deposit.pubkey.toString()}
                                    deposit={deposit}
                                    index={index}
                                  />
                                ))}
                            </div>
                            
                            {/* Общая сводка для ByAmount */}
                            {byAmountCount > 1 && (
                              <TotalSummary 
                                byAmountTotal={byAmountTotal}
                                byAmountRemaining={byAmountRemaining}
                                byAmountTarget={byAmountTarget}
                                byAmountCount={byAmountCount}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Правая колонка - графики */}
                      <div className="token-charts-sidebar">
                        {/* График прогресса ByAmount */}
                        {pieDataByAmountProgress.length > 0 && (
                          <div className="chart-card">
                            <h5>ByAmount Progress</h5>
                            <PieChart width={200} height={200}>
                              <Pie
                                data={pieDataByAmountProgress}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={60}
                                label={false}
                              >
                                {pieDataByAmountProgress.map((entry, j) => (
                                  <Cell key={j} fill={entry.name === "Deposited" ? "#10b981" : "#f64f59"} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value, name) => [`${value} TKN`, name]}
                              />
                            </PieChart>
                          </div>
                        )}

                        {/* График распределения по типам */}
                        {pieDataTypeDistribution.length > 0 && (
                          <div className="chart-card">
                            <h5>Type Distribution</h5>
                            <PieChart width={200} height={200}>
                              <Pie
                                data={pieDataTypeDistribution}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={60}
                                label={false}
                              >
                                {pieDataTypeDistribution.map((_, j) => (
                                  <Cell key={j} fill={COLORS[(j + 2) % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value, name) => [`${value} TKN`, name]}
                              />
                            </PieChart>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};