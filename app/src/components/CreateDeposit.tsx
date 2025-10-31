import React, { useState } from 'react';
import { useTimelockOperations } from '../hooks/useTimelockOperations';
import { PublicKey } from '@solana/web3.js';

export const CreateDeposit: React.FC = () => {
  const { initializeDeposit, initializeDepositByAmount, isConnected } = useTimelockOperations();
  const [amount, setAmount] = useState('');
  const [unlockValue, setUnlockValue] = useState('');
  const [depositType, setDepositType] = useState<'time' | 'amount'>('time');
  const [mintAddress, setMintAddress] = useState('');
  const [tokenAccountAddress, setTokenAccountAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setMessage('Please connect your wallet first');
      return;
    }

    if (!mintAddress || !tokenAccountAddress) {
      setMessage('Please enter Mint and Token Account addresses');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const mint = new PublicKey(mintAddress);
      const ownerTokenAccount = new PublicKey(tokenAccountAddress);
      const amountNumber = parseInt(amount);

      let signature: string;

      if (depositType === 'time') {
        // unlockValue в минутах, конвертируем в секунды
        const unlockTimestamp = Math.floor(Date.now() / 1000) + parseInt(unlockValue) * 60;
        signature = await initializeDeposit(
          amountNumber,
          unlockTimestamp,
          mint,
          ownerTokenAccount
        );
        setMessage(`Time deposit created successfully! Transaction: ${signature}`);
      } else {
        const unlockAmount = parseInt(unlockValue);
        signature = await initializeDepositByAmount(
          amountNumber,
          unlockAmount,
          mint,
          ownerTokenAccount
        );
        setMessage(`Amount deposit created successfully! Transaction: ${signature}`);
      }

      // Сброс формы
      setAmount('');
      setUnlockValue('');
    } catch (error: any) {
      console.error('Error creating deposit:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="create-deposit">
        <h2>Create TimeLock Deposit</h2>
        <div className="message info">Please connect your wallet to create a deposit</div>
      </div>
    );
  }

  return (
    <div className="create-deposit">
      <h2>Create TimeLock Deposit</h2>
      
      <form onSubmit={handleSubmit} className="deposit-form">
        <div className="form-group">
          <label>Deposit Type:</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="time"
                checked={depositType === 'time'}
                onChange={(e) => setDepositType(e.target.value as 'time' | 'amount')}
              />
              Time Lock
            </label>
            <label>
              <input
                type="radio"
                value="amount"
                checked={depositType === 'amount'}
                onChange={(e) => setDepositType(e.target.value as 'time' | 'amount')}
              />
              Amount Lock
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Amount (tokens):</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            required
            min="1"
          />
        </div>

        <div className="form-group">
          <label>
            {depositType === 'time' ? 'Lock Time (minutes):' : 'Target Amount (tokens):'}
          </label>
          <input
            type="number"
            value={unlockValue}
            onChange={(e) => setUnlockValue(e.target.value)}
            placeholder={depositType === 'time' ? 'Minutes from now' : 'Target amount to reach'}
            required
            min="1"
          />
        </div>

        <div className="form-group">
          <label>Token Mint Address:</label>
          <input
            type="text"
            value={mintAddress}
            onChange={(e) => setMintAddress(e.target.value)}
            placeholder="Enter token mint address"
            required
          />
        </div>

        <div className="form-group">
          <label>Your Token Account:</label>
          <input
            type="text"
            value={tokenAccountAddress}
            onChange={(e) => setTokenAccountAddress(e.target.value)}
            placeholder="Enter your token account address"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="submit-button"
        >
          {loading ? 'Creating Deposit...' : 'Create Deposit'}
        </button>

        {message && (
          <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
};