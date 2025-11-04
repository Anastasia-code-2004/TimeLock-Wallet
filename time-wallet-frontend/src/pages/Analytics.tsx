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

export const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { deposits } = useDeposits();
  const stats = computeAnalytics(deposits);
  const now = Math.floor(Date.now() / 1000);
  const formatAmount = (amount: number) => (amount / 1_000_000).toFixed(2);

  const pieDataCount = Object.entries(stats.depositsCountByToken).map(
    ([mint, count]) => ({ name: mint, value: count })
  );

  return (
    <div className="analytics-container">
      
      <button className="back-btn" onClick={() => navigate("/")}>
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h1>Analytics</h1>

      <div className="analytics-ready">
        💰 Ready to withdraw: <span>{stats.depositsReadyToWithdraw}</span> pcs
      </div>

      <div className="analytics-summary">
        <p>
          <strong>Total deposits:</strong> {stats.totalDeposits} pcs
        </p>
        <p>
          <strong>By type (overall):</strong> Time = {stats.depositsByType.byTime} pcs,{" "}
          Amount = {stats.depositsByType.byAmount} pcs
        </p>
        {stats.earliestUnlock !== null && stats.latestUnlock !== null && (
          <p>
            <strong>Unlock range (ByTime):</strong>{" "}
            {formatDuration(Math.max(stats.earliestUnlock - now, 0))} →{" "}
            {formatDuration(Math.max(stats.latestUnlock - now, 0))}
          </p>
        )}
      </div>

      {pieDataCount.length > 0 && (
        <div className="analytics-section">
          <h2>Deposits count by Token (pcs)</h2>
          <div className="analytics-chart">
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
              <Tooltip />
              <Legend />
            </PieChart>
          </div>
        </div>
      )}

      <div className="analytics-section">
        <h2>Per Token Details</h2>

        {Object.keys(stats.totalByToken)
          .filter((mint) => stats.totalByToken[mint] > 0)
          .map((mint) => {
            const total = stats.totalByToken[mint];
            const remaining = stats.remainingByToken[mint] ?? 0;
            const t = stats.depositsTypeByToken[mint];

            const pieDataRemaining = [
              { name: "Deposited", value: parseFloat(formatAmount(total - remaining)) },
              { name: "Remaining", value: parseFloat(formatAmount(remaining)) },
            ];

            const pieDataTypeAmount = [
              { name: "By Time", value: parseFloat(formatAmount(t.amountByTime)) },
              { name: "By Amount", value: parseFloat(formatAmount(t.amountByAmount)) },
            ];

            return (
              <div className="analytics-token" key={mint}>
                <h3>{mint}</h3>
                <p>
                  <strong>Total deposited:</strong> {formatAmount(total)} TKN
                </p>
                <ul>
                  <li>By Time: {formatAmount(t.amountByTime)} TKN</li>
                  <li>By Amount: {formatAmount(t.amountByAmount)} TKN</li>
                </ul>
                <p>
                  <strong>Remaining (ByAmount):</strong> {formatAmount(remaining)} TKN
                </p>
                <p>
                  <strong>By type (count):</strong> Time = {t.byTime} pcs, Amount ={" "}
                  {t.byAmount} pcs
                </p>

                <div className="analytics-duo-charts">
                  {t.byAmount > 0 && remaining > 0 && (
                    <div>
                      <h4 className="analytics-label">ByAmount Deposits</h4>
                      <PieChart width={220} height={180}>
                        <Pie
                          data={pieDataRemaining}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label
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
                    <div>
                      <h4 className="analytics-label">Deposit Type Distribution</h4>
                      <PieChart width={220} height={180}>
                        <Pie
                          data={pieDataTypeAmount}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label
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
            );
          })}
      </div>
    </div>
  );
};
