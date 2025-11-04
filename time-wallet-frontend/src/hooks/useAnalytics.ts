// hooks/useAnalytics.ts
import { useMemo } from "react";
import { Deposit } from "../types/deposit";
import { analyticsService } from "../services/analyticsService";

export const useAnalytics = (deposits: Deposit[]) => {
  return useMemo(() => ({
    totalDeposits: analyticsService.totalDeposits(deposits),
    depositsByToken: analyticsService.depositsByToken(deposits),
    activeDeposits: analyticsService.activeDeposits(deposits),
    withdrawnDeposits: analyticsService.withdrawnDeposits(deposits),
    averageLockTime: analyticsService.averageLockTime(deposits),
  }), [deposits]);
}
