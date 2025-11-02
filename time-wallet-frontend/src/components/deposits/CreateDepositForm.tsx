import React, { useState, useMemo } from 'react';
import { useCreateDeposit } from '../../hooks/useCreateDeposit';
import { FaTimes } from 'react-icons/fa';

// Временное решение для иконки
const TimesIcon = FaTimes as React.ComponentType<{}>;

interface CreateDepositFormProps {
  onClose: () => void; // 👈 ДОБАВЬТЕ ЭТОТ ПРОП
}

export const CreateDepositForm: React.FC<CreateDepositFormProps> = ({ onClose }) => {
  const { 
    createTimeDeposit, 
    createAmountDeposit, 
    loading, 
    error,
    userTokens,
    toMinimalUnits,
    fromMinimalUnits,
    isValidTimeDeposit,
    isValidAmountDeposit
  } = useCreateDeposit();

  const [depositType, setDepositType] = useState<'time' | 'amount'>('time');
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  const [unlockValue, setUnlockValue] = useState('');

  const selectedTokenInfo = useMemo(() => {
    return userTokens.find(token => token.mint.toBase58() === selectedToken);
  }, [userTokens, selectedToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTokenInfo) {
      console.log('❌ No token selected');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      console.log('❌ Invalid amount:', amount);
      alert('Please enter a valid amount');
      return;
    }

    const amountInMinimalUnits = toMinimalUnits(
      amountNum, 
      selectedTokenInfo.decimals
    );

    console.log('🔍 Creating deposit:', {
      amountNum,
      amountInMinimalUnits,
      tokenBalance: selectedTokenInfo.balance,
      hasEnoughBalance: amountInMinimalUnits <= selectedTokenInfo.balance
    });

    try {
      if (depositType === 'time') {
        const unlockTimestamp = Math.floor(new Date(unlockValue).getTime() / 1000);
        const now = Math.floor(Date.now() / 1000);
        
        console.log('🔍 Time deposit validation:', {
          unlockTimestamp,
          now,
          isFuture: unlockTimestamp > now
        });
        
        if (!isValidTimeDeposit(selectedTokenInfo.mint, amountInMinimalUnits, unlockTimestamp)) {
          alert('Invalid parameters: Please check that unlock date is in the future and you have sufficient balance');
          return;
        }

        await createTimeDeposit({
          mint: selectedTokenInfo.mint,
          amount: amountInMinimalUnits,
          unlockTimestamp,
        });
      } else {
        const unlockAmountNum = parseFloat(unlockValue);
        if (isNaN(unlockAmountNum) || unlockAmountNum <= 0) {
          alert('Please enter a valid target amount');
          return;
        }

        const unlockAmountInMinimalUnits = toMinimalUnits(
          unlockAmountNum,
          selectedTokenInfo.decimals
        );

        console.log('🔍 Amount deposit validation:', {
          unlockAmountNum,
          unlockAmountInMinimalUnits,
          amountInMinimalUnits
        });

        if (!isValidAmountDeposit(selectedTokenInfo.mint, amountInMinimalUnits, unlockAmountInMinimalUnits)) {
          alert('Invalid parameters: Please check that target amount is valid and you have sufficient balance');
          return;
        }

        await createAmountDeposit({
          mint: selectedTokenInfo.mint,
          amount: amountInMinimalUnits,
          unlockAmount: unlockAmountInMinimalUnits,
        });
      }
      
      alert('Deposit created successfully!');
      // Сброс формы и закрытие
      setAmount('');
      setUnlockValue('');
      onClose(); // 👈 ВЫЗОВИТЕ onClose ПОСЛЕ УСПЕХА
    } catch (err) {
      console.error('Error creating deposit:', err);
    }
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h2>Create Deposit</h2>
        <button
          className="close-button"
          onClick={onClose} // 👈 ИСПОЛЬЗУЙТЕ onClose ЗДЕСЬ
        >
          <TimesIcon />
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>Deposit Type:</label>
          <select 
            value={depositType} 
            onChange={(e) => setDepositType(e.target.value as 'time' | 'amount')}
          >
            <option value="time">Time Lock</option>
            <option value="amount">Amount Lock</option>
          </select>
        </div>

        <div>
          <label>Token:</label>
          <select 
            value={selectedToken} 
            onChange={(e) => setSelectedToken(e.target.value)}
          >
            <option value="">Select Token</option>
            {userTokens.map(token => (
              <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
                {token.symbol} - Balance: {fromMinimalUnits ? fromMinimalUnits(token.balance, token.decimals) : token.balance}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Amount:</label>
          <input
            type="number"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
          {selectedTokenInfo && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              Available: {fromMinimalUnits(selectedTokenInfo.balance, selectedTokenInfo.decimals)} {selectedTokenInfo.symbol}
            </div>
          )}
        </div>

        {depositType === 'time' ? (
          <div>
            <label>Unlock Date:</label>
            <input
              type="datetime-local"
              value={unlockValue}
              onChange={(e) => setUnlockValue(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <label>Target Amount:</label>
            <input
              type="number"
              step="0.000001"
              value={unlockValue}
              onChange={(e) => setUnlockValue(e.target.value)}
              placeholder="Enter target amount"
            />
          </div>
        )}

        <button type="submit" disabled={loading || !selectedTokenInfo}>
          {loading ? 'Creating Deposit...' : 'Create Deposit'}
        </button>

        {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      </form>
    </div>
  );
};