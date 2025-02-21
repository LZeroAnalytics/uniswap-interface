"use client";

import React, { useState } from 'react';
import { Settings, ChevronDown, Wallet, ArrowDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Token {
  symbol: string;
  balance: string;
}

const SwapInterface = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [fromToken, setFromToken] = useState<Token>({ symbol: 'ETH', balance: '0.0' });
  const [toToken, setToToken] = useState<Token>({ symbol: 'Select a token', balance: '0.0' });
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  // Sample token list
  const tokens = [
    { symbol: 'ETH', balance: '1.5' },
    { symbol: 'USDC', balance: '1000.0' },
    { symbol: 'USDT', balance: '1000.0' },
    { symbol: 'DAI', balance: '1000.0' },
    { symbol: 'WBTC', balance: '0.05' }
  ];

  const handleWalletConnect = () => {
    setIsWalletConnected(!isWalletConnected);
  };

  const handleSwap = () => {
    if (!isWalletConnected) return;
    // Swap logic would go here
  };

  const TokenSelector = ({ value, onChange, tokens }: {
    value: string;
    onChange: (value: string) => void;
    tokens: Token[];
  }) => (
      <div className="flex items-center justify-between w-full p-4 bg-gray-100 rounded-lg">
        <input
            type="number"
            placeholder="0.0"
            className="w-1/2 bg-transparent text-2xl outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
        <Button
            variant="outline"
            className="flex items-center gap-2 px-4 py-2"
        >
          {fromToken.symbol}
          <ChevronDown size={20} />
        </Button>
      </div>
  );

  return (
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">LZero Uniswap Demo</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <Settings size={20} />
            </Button>
            <Button
                variant={isWalletConnected ? "outline" : "default"}
                onClick={handleWalletConnect}
                className="flex items-center gap-2"
            >
              <Wallet size={16} />
              {isWalletConnected ? "0x1234...5678" : "Connect Wallet"}
            </Button>
          </div>
        </div>

        {/* Swap Card */}
        <Card className="p-4 bg-white">
          <div className="space-y-4">
            {/* From Token */}
            <TokenSelector
                value={fromAmount}
                onChange={setFromAmount}
                tokens={tokens}
            />

            {/* Swap Direction Button */}
            <div className="flex justify-center">
              <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-gray-100"
              >
                <ArrowDownUp size={20} />
              </Button>
            </div>

            {/* To Token */}
            <TokenSelector
                value={toAmount}
                onChange={setToAmount}
                tokens={tokens}
            />

            {/* Price Impact & Slippage */}
            <div className="text-sm text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Price Impact</span>
                <span>{'<0.01%'}</span>
              </div>
              <div className="flex justify-between">
                <span>Minimum Received</span>
                <span>{toAmount || '0.0'} {toToken.symbol}</span>
              </div>
            </div>

            {/* Swap Button */}
            <Button
                className="w-full"
                disabled={!isWalletConnected || !fromAmount || !toAmount}
                onClick={handleSwap}
            >
              {!isWalletConnected
                  ? "Connect Wallet"
                  : !fromAmount || !toAmount
                      ? "Enter an amount"
                      : "Swap"}
            </Button>
          </div>
        </Card>

        {/* Network Status */}
        {isWalletConnected && (
            <Alert className="mt-4">
              <AlertDescription className="flex justify-between items-center">
                <span>Network: Ethereum</span>
                <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Connected
            </span>
              </AlertDescription>
            </Alert>
        )}
      </div>
  );
};

export default SwapInterface;