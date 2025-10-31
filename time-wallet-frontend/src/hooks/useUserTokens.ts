import { useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAccount, getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Buffer } from "buffer";

// 👇 фиксим Buffer для браузера
if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
}

export interface UserToken {
  mint: PublicKey;
  balance: number;
  decimals: number;
  symbol: string; // 👈 делаем обязательным
  name: string;   // 👈 делаем обязательным
  isNative: boolean;
}

export function useUserTokens() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [tokens, setTokens] = useState<UserToken[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔥 Функция для получения информации о токене
  const getTokenInfo = useCallback((mint: PublicKey): { symbol: string; name: string } => {
    const mintString = mint.toBase58();
    
    return {
      symbol: `TOKEN${mintString.slice(0, 4)}`,
      name: `Token ${mintString.slice(0, 8)}...`
    };
  }, []);

  const fetchUserTokens = useCallback(async () => {
    if (!publicKey) {
      setTokens([]);
      return;
    }

    setLoading(true);
    try {
      const userTokens: UserToken[] = [];

      // ✅ 1. Получаем нативный SOL (правильный mint адрес)
      try {
        const solBalanceLamports = await connection.getBalance(publicKey);
        if (solBalanceLamports > 0) {
          userTokens.push({
            mint: new PublicKey('So11111111111111111111111111111111111111112'), // 🔥 правильный mint для SOL
            balance: solBalanceLamports,
            decimals: 9,
            symbol: "SOL",
            name: "Solana",
            isNative: true,
          });
        }
      } catch (error) {
        console.warn("Error fetching SOL balance:", error);
      }

      // ✅ 2. Получаем SPL-токены
      try {
        const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });

        for (const account of tokenAccounts.value) {
          try {
            const accountInfo = await getAccount(connection, account.pubkey);
            const mintInfo = await getMint(connection, accountInfo.mint);

            if (accountInfo.amount > 0) {
              const tokenInfo = getTokenInfo(accountInfo.mint);
              
              userTokens.push({
                mint: accountInfo.mint,
                balance: Number(accountInfo.amount),
                decimals: mintInfo.decimals,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                isNative: false,
              });
            }
          } catch (error) {
            console.warn("Error fetching token account:", error);
            
            // 🔥 Fallback: пытаемся получить базовую информацию
            try {
              const accountData = await connection.getAccountInfo(account.pubkey);
              if (accountData) {
                // Базовый парсинг данных токен-аккаунта
                const mint = new PublicKey(accountData.data.slice(0, 32));
                const amount = accountData.data.readBigUInt64LE(64);
                
                if (amount > 0) {
                  const tokenInfo = getTokenInfo(mint);
                  
                  userTokens.push({
                    mint: mint,
                    balance: Number(amount),
                    decimals: 9, // дефолт
                    symbol: tokenInfo.symbol,
                    name: tokenInfo.name,
                    isNative: false,
                  });
                }
              }
            } catch (fallbackError) {
              console.warn("Fallback also failed for token account");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching token accounts:", error);
      }

      // 🔥 Сортируем: SOL первый, затем по убыванию баланса
      userTokens.sort((a, b) => {
        if (a.isNative) return -1;
        if (b.isNative) return 1;
        return b.balance - a.balance;
      });

      console.log(
        "✅ Fetched tokens:",
        userTokens.map((t) => ({
          symbol: t.symbol,
          name: t.name,
          mint: t.mint.toBase58(),
          balance: t.balance / Math.pow(10, t.decimals),
          isNative: t.isNative
        }))
      );

      setTokens(userTokens);
    } catch (error) {
      console.error("Error fetching user tokens:", error);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, getTokenInfo]);

  useEffect(() => {
    fetchUserTokens();
  }, [fetchUserTokens]);

  // 🔥 Утилиты для удобства
  const formatBalance = useCallback((token: UserToken): string => {
    const humanBalance = token.balance / Math.pow(10, token.decimals);
    return humanBalance.toFixed(token.decimals > 6 ? 6 : token.decimals);
  }, []);

  const getHumanBalance = useCallback((token: UserToken): number => {
    return token.balance / Math.pow(10, token.decimals);
  }, []);

  return { 
    tokens, 
    loading, 
    refetch: fetchUserTokens,
    formatBalance,
    getHumanBalance
  };
}