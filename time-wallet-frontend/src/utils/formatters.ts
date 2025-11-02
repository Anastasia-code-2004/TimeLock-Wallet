export const formatAmount = (amount: number, decimals: number = 6): string => {
  return (amount / Math.pow(10, decimals)).toFixed(4);
};

export const formatDate = (timestamp: number): string => {
  if (!timestamp) return "Unknown";
  return new Date(timestamp * 1000).toLocaleString();
};

export const getTokenSymbol = (mint: string): string => {
  if (mint === "So11111111111111111111111111111111111111112") return "SOL";
  if (mint === "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU") return "USDC";
  return `TOKEN${mint.slice(0, 4)}`;
};