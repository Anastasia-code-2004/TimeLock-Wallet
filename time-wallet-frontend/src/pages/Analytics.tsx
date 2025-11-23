import React from "react";
import { useNavigate } from "react-router-dom";
import { useDeposits } from "../hooks/useDeposits";
import { Deposit } from "../types/deposit";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { ArrowLeft } from "lucide-react";

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
  remainingByToken: Record<string, number>;
  earliestUnlock: number | null;
  latestUnlock: number | null;
  depositsCountByToken: Record<string, number>;
  depositsTypeByToken: Record<
    string,
    { byTime: number; byAmount: number; amountByTime: number; amountByAmount: number }
  >;
};

function computeAnalytics(deposits: Deposit[]): AnalyticsStats {
  const now = Math.floor(Date.now() / 1000);
  const stats: AnalyticsStats = {
    totalDeposits: deposits.length,
    depositsReadyToWithdraw: 0,
    depositsByType: { byTime: 0, byAmount: 0 },
    totalByToken: {},
    remainingByToken: {},
    earliestUnlock: null,
    latestUnlock: null,
    depositsCountByToken: {},
    depositsTypeByToken: {},
  };

  deposits.forEach((d) => {
    const mint = d.mint;
    if (!stats.depositsTypeByToken[mint]) {
      stats.depositsTypeByToken[mint] = {
        byTime: 0,
        byAmount: 0,
        amountByTime: 0,
        amountByAmount: 0,
      };
    }

    stats.depositsCountByToken[mint] = (stats.depositsCountByToken[mint] || 0) + 1;
    stats.totalByToken[mint] = (stats.totalByToken[mint] || 0) + d.amount;

    if (d.lockCondition.conditionType === "ByTime") {
      stats.depositsByType.byTime++;
      stats.depositsTypeByToken[mint].byTime++;
      stats.depositsTypeByToken[mint].amountByTime += d.amount;
      const unlock = d.lockCondition.unlockTimestamp || 0;
      if (unlock <= now) stats.depositsReadyToWithdraw++;
      if (stats.earliestUnlock === null || unlock < stats.earliestUnlock)
        stats.earliestUnlock = unlock;
      if (stats.latestUnlock === null || unlock > stats.latestUnlock)
        stats.latestUnlock = unlock;
    } else {
      stats.depositsByType.byAmount++;
      stats.depositsTypeByToken[mint].byAmount++;
      stats.depositsTypeByToken[mint].amountByAmount += d.amount;
      const remaining = d.lockCondition.unlockAmount || 0;
      if (remaining <= 0) stats.depositsReadyToWithdraw++;
      stats.remainingByToken[mint] =
        (stats.remainingByToken[mint] || 0) + remaining;
    }
  });

  return stats;
}

// Функция для сокращения адреса токена
function shortenTokenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { deposits } = useDeposits();
  const stats = computeAnalytics(deposits);
  const now = Math.floor(Date.now() / 1000);
  const formatAmount = (amount: number) => (amount / 1_000_000).toFixed(2);

  const pieDataCount = Object.entries(stats.depositsCountByToken).map(
    ([mint, count]) => ({ 
      name: shortenTokenAddress(mint), 
      value: count,
      fullName: mint 
    })
  );

  return (
    <div className="home-container analytics-wrapper">
      {/* Header с таким же выравниванием как на других страницах */}
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
        {stats.earliestUnlock !== null && stats.latestUnlock !== null && (
          <div className="analytics-time-range">
            <h3>Unlock Time Range</h3>
            <div className="time-range-bars">
              <div className="time-range-item">
                <span className="time-label">Earliest</span>
                <span className="time-value">
                  {formatDuration(Math.max(stats.earliestUnlock - now, 0))}
                </span>
              </div>
              <div className="time-range-item">
                <span className="time-label">Latest</span>
                <span className="time-value">
                  {formatDuration(Math.max(stats.latestUnlock - now, 0))}
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
              <PieChart width={400} height={300}>
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
            </div>
          </div>
        )}
        {/* Детали по каждому токену - ОДНА КАРТОЧКА НА СТРОКУ */}
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
        const remaining = stats.remainingByToken[mint] ?? 0;
        const t = stats.depositsTypeByToken[mint];
        const depositCount = stats.depositsCountByToken[mint];

        const pieDataRemaining = [
          { name: "Deposited", value: parseFloat(formatAmount(total - remaining)) },
          { name: "Remaining", value: parseFloat(formatAmount(remaining)) },
        ];

        const pieDataTypeAmount = [
          { name: "By Time", value: parseFloat(formatAmount(t.amountByTime)) },
          { name: "By Amount", value: parseFloat(formatAmount(t.amountByAmount)) },
        ];

        return (
          <div className="token-card-full" key={mint}>
            <div className="token-header-full">
              <div className="token-title-section">
                <h4 title={mint}>{shortenTokenAddress(mint)}</h4>
                <span className="token-count-badge">{depositCount} deposit{depositCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            
            <div className="token-content-full">
              <div className="token-stats-full">
                <div className="token-stat-full">
                  <span className="stat-label-full">Total Value</span>
                  <span className="stat-value-full">{formatAmount(total)} TKN</span>
                </div>
                
                <div className="token-stat-full">
                  <span className="stat-label-full">By Time</span>
                  <span className="stat-value-full">
                    {t.byTime} deposit{t.byTime !== 1 ? 's' : ''} · {formatAmount(t.amountByTime)} TKN
                  </span>
                </div>
                
                <div className="token-stat-full">
                  <span className="stat-label-full">By Amount</span>
                  <span className="stat-value-full">
                    {t.byAmount} deposit{t.byAmount !== 1 ? 's' : ''} · {formatAmount(t.amountByAmount)} TKN
                  </span>
                </div>
                
                {remaining > 0 && (
                  <div className="token-stat-full">
                    <span className="stat-label-full">Remaining to Unlock</span>
                    <span className="stat-value-full remaining-value">{formatAmount(remaining)} TKN</span>
                  </div>
                )}
              </div>

              {/* Мини-графики для токена */}
              <div className="token-charts-full">
                {t.byAmount > 0 && remaining > 0 && (
                  <div className="mini-chart-full">
                    <h5>ByAmount Progress</h5>
                    <PieChart width={140} height={140}>
                      <Pie
                        data={pieDataRemaining}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        label={false}
                      >
                        {pieDataRemaining.map((_, j) => (
                          <Cell key={j} fill={COLORS[j % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </div>
                )}

                {(t.amountByTime > 0 || t.amountByAmount > 0) && (
                  <div className="mini-chart-full">
                    <h5>Type Distribution</h5>
                    <PieChart width={140} height={140}>
                      <Pie
                        data={pieDataTypeAmount}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        label={false}
                      >
                        {pieDataTypeAmount.map((_, j) => (
                          <Cell key={j} fill={COLORS[(j + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
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