import { Deposit } from "../types/deposit";

export const analyticsService = {
  totalDeposits(deposits: Deposit[]) {
    return deposits.reduce((sum, d) => sum + d.amount, 0);
  },

  depositsByToken(deposits: Deposit[]) {
    return deposits.reduce((acc: Record<string, number>, d) => {
      acc[d.mint] = (acc[d.mint] || 0) + d.amount;
      return acc;
    }, {});
  },

  activeDeposits(deposits: Deposit[]) {
    return deposits.filter(d => d.state === "Active");
  },

  withdrawnDeposits(deposits: Deposit[]) {
    return deposits.filter(d => d.state === "Withdrawn");
  },

  averageLockTime(deposits: Deposit[]) {
    const active = deposits.filter(
      d => d.state === "Active" && d.lockCondition.conditionType === "ByTime"
    );
    if (!active.length) return 0;
    const total = active.reduce((sum, d) => {
      const unlock = d.lockCondition.unlockTimestamp ?? 0;
      const created = d.createdAt ?? 0;
      return sum + (unlock - created);
    }, 0);
    return total / active.length;
  },

  // НОВАЯ ФУНКЦИЯ: Расчет оставшейся суммы для разблокировки
  calculateRemainingToUnlock(deposit: Deposit): number {
    if (deposit.lockCondition.conditionType === "ByAmount") {
      const targetAmount = deposit.lockCondition.unlockAmount || 0;
      const deposited = deposit.amount;
      return Math.max(targetAmount - deposited, 0);
    }
    return 0; // Для ByTime remaining всегда 0
  },

  // НОВАЯ ФУНКЦИЯ: Проверка готовности к выводу
  isReadyToWithdraw(deposit: Deposit): boolean {
    const now = Math.floor(Date.now() / 1000);
    
    if (deposit.lockCondition.conditionType === "ByTime") {
      return (deposit.lockCondition.unlockTimestamp || 0) <= now;
    } else {
      return this.calculateRemainingToUnlock(deposit) <= 0;
    }
  }
}