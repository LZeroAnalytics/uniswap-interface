"use client";

import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, Wallet, ArrowDownUp, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TokenList } from '@uniswap/token-lists';
import Image, { ImageLoader } from 'next/image';
import { ethers } from 'ethers';
import DEFAULT_TOKEN_LIST_JSON from './tokenList.json';

const DEFAULT_TOKEN_LIST = DEFAULT_TOKEN_LIST_JSON as TokenList;

interface Token {
    chainId: number;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
}

interface TokenSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (token: Token) => void;
    selectedToken?: Token;
    tokens: Token[];
}

const myLoader: ImageLoader = ({ src, width, quality }) => {
    if (src.startsWith('ipfs://')) {
        // Convert ipfs:// to an HTTP gateway URL
        src = src.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    return `${src}?w=${width}&q=${quality || 75}`;
};

const TokenSelectorModal = ({
                                isOpen,
                                onClose,
                                onSelect,
                                selectedToken,
                                tokens,
                            }: TokenSelectorModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTokens = tokens.filter(
        token =>
            token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            token.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Select a token</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X size={20} />
                    </Button>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or paste address"
                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="max-h-96 overflow-y-auto">
                    {filteredTokens.map((token) => (
                        <button
                            key={token.address}
                            className="w-full flex items-center p-2 hover:bg-gray-100 rounded-lg"
                            onClick={() => {
                                onSelect(token);
                                onClose();
                            }}
                        >
                            <div className="w-8 h-8 relative mr-3">
                                <Image
                                    loader={myLoader}
                                    src={token.logoURI}
                                    alt={token.symbol}
                                    width={32}
                                    height={32}
                                    className="rounded-full"
                                />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{token.symbol}</span>
                                <span className="text-sm text-gray-500">{token.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SwapInterface = () => {
    // Wallet and provider state
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
    const [networkName, setNetworkName] = useState<string>('');

    // Swap state
    const [fromToken, setFromToken] = useState<Token | undefined>(undefined);
    const [toToken, setToToken] = useState<Token | undefined>(undefined);
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [isSelectingFrom, setIsSelectingFrom] = useState(false);
    const [isSelectingTo, setIsSelectingTo] = useState(false);

    // Token balance state
    const [fromBalance, setFromBalance] = useState<string>('');
    const [toBalance, setToBalance] = useState<string>('');

    const tokens = DEFAULT_TOKEN_LIST.tokens.filter(token => token.chainId === 1); // Only showing Ethereum tokens

    const shortenAddress = (address: string) =>
        address.slice(0, 6) + '...' + address.slice(-4);

    const handleWalletConnect = async () => {
        if ((window as any).ethereum) {
            try {
                const ethProvider = new ethers.providers.Web3Provider((window as any).ethereum);
                await ethProvider.send('eth_requestAccounts', []);
                const signer = ethProvider.getSigner();
                const address = await signer.getAddress();
                setWalletAddress(address);
                setProvider(ethProvider);
                const network = await ethProvider.getNetwork();
                console.log("Eth Provider", ethProvider);
                if (network.chainId === 3151908) {
                    setNetworkName('LZero');
                } else {
                    setNetworkName(network.name);
                }

                setIsWalletConnected(true);
            } catch (error) {
                console.error('Wallet connection error:', error);
            }
        } else {
            console.log('No wallet extension detected');
        }
    };

    const handleSwap = () => {
        if (!isWalletConnected) {
            handleWalletConnect();
        }
        // Swap logic would go here
    };

    // A minimal ERC-20 ABI for balanceOf
    const erc20Abi = ['function balanceOf(address owner) view returns (uint256)'];

    // Fetch balance for fromToken when it or the wallet/provider changes
    useEffect(() => {
        const fetchFromBalance = async () => {
            if (provider && walletAddress && fromToken) {
                try {
                    let balance;
                    if (fromToken.symbol.toUpperCase() === 'ETH') {
                        balance = await provider.getBalance(walletAddress);
                        setFromBalance(parseFloat(ethers.utils.formatEther(balance)).toFixed(4));
                    } else {
                        const tokenContract = new ethers.Contract(fromToken.address, erc20Abi, provider);
                        balance = await tokenContract.balanceOf(walletAddress);
                        setFromBalance(parseFloat(ethers.utils.formatUnits(balance, fromToken.decimals)).toFixed(4));
                    }
                } catch (error) {
                    console.error(error);
                    setFromBalance('0');
                }
            }
        };
        fetchFromBalance();
    }, [provider, walletAddress, fromToken]);

    // Fetch balance for toToken when it or the wallet/provider changes
    useEffect(() => {
        const fetchToBalance = async () => {
            if (provider && walletAddress && toToken) {
                try {
                    let balance;
                    if (toToken.symbol.toUpperCase() === 'ETH') {
                        balance = await provider.getBalance(walletAddress);
                        setToBalance(parseFloat(ethers.utils.formatEther(balance)).toFixed(4));
                    } else {
                        const tokenContract = new ethers.Contract(toToken.address, erc20Abi, provider);
                        balance = await tokenContract.balanceOf(walletAddress);
                        setToBalance(parseFloat(ethers.utils.formatUnits(balance, toToken.decimals)).toFixed(4));
                    }
                } catch (error) {
                    console.error(error);
                    setToBalance('0');
                }
            }
        };
        fetchToBalance();
    }, [provider, walletAddress, toToken]);

    useEffect(() => {
        if ((window as any).ethereum) {
            const ethereum = (window as any).ethereum;

            const handleAccountsChanged = (accounts: string[]) => {
                if (accounts.length === 0) {
                    // Wallet is disconnected
                    setIsWalletConnected(false);
                    setWalletAddress(null);
                    // Optionally reset other related state
                } else {
                    setWalletAddress(accounts[0]);
                }
            };

            const handleChainChanged = (chainId: string) => {
                // When the network changes, you might want to update your provider and network state.
                if (provider) {
                    provider.getNetwork().then((network) => setNetworkName(network.name));
                }
            };

            ethereum.on('accountsChanged', handleAccountsChanged);
            ethereum.on('chainChanged', handleChainChanged);

            return () => {
                if (ethereum.removeListener) {
                    ethereum.removeListener('accountsChanged', handleAccountsChanged);
                    ethereum.removeListener('chainChanged', handleChainChanged);
                }
            };
        }
    }, [provider]);

    // Inline TokenSelector component with balance display
    const TokenSelector = ({
                               value,
                               onChange,
                               token,
                               onTokenSelect,
                               balance,
                           }: {
        value: string;
        onChange: (value: string) => void;
        token?: Token;
        onTokenSelect: () => void;
        balance?: string;
    }) => (
        <div>
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
                    onClick={onTokenSelect}
                >
                    {token ? (
                        <>
                            <div className="w-6 h-6 relative">
                                <Image
                                    loader={myLoader}
                                    src={token.logoURI}
                                    alt={token.symbol}
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                />
                            </div>
                            {token.symbol}
                        </>
                    ) : (
                        'Select token'
                    )}
                    <ChevronDown size={20} />
                </Button>
            </div>
            {balance && (
                <div className="text-sm text-gray-500 mt-1">
                    Balance: {balance}
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">LZero Uniswap Demo</h1>
                <div className="flex gap-2 items-center">
                    <Button variant="ghost" size="icon">
                        <Settings size={20} />
                    </Button>
                    <Button
                        variant={isWalletConnected ? 'outline' : 'default'}
                        onClick={handleWalletConnect}
                        className="flex items-center gap-2"
                    >
                        <Wallet size={16} />
                        {walletAddress ? (
                            <>
                                {shortenAddress(walletAddress)} ({networkName})
                            </>
                        ) : (
                            'Connect Wallet'
                        )}
                    </Button>
                </div>
            </div>

            <Card className="p-4 bg-white">
                <div className="space-y-4">
                    <TokenSelector
                        value={fromAmount}
                        onChange={setFromAmount}
                        token={fromToken}
                        onTokenSelect={() => setIsSelectingFrom(true)}
                        balance={fromBalance}
                    />

                    <div className="flex justify-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full bg-gray-100"
                            onClick={() => {
                                const tempToken = fromToken;
                                const tempAmount = fromAmount;
                                setFromToken(toToken);
                                setFromAmount(toAmount);
                                setToToken(tempToken);
                                setToAmount(tempAmount);
                            }}
                        >
                            <ArrowDownUp size={20} />
                        </Button>
                    </div>

                    <TokenSelector
                        value={toAmount}
                        onChange={setToAmount}
                        token={toToken}
                        onTokenSelect={() => setIsSelectingTo(true)}
                        balance={toBalance}
                    />

                    <div className="text-sm text-gray-500 space-y-1">
                        <div className="flex justify-between">
                            <span>Price Impact</span>
                            <span>{'<0.01%'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Minimum Received</span>
                            <span>
                {toAmount || '0.0'} {toToken?.symbol || ''}
              </span>
                        </div>
                    </div>

                    <Button
                        className="w-full"
                        disabled={
                            isWalletConnected &&
                            (!fromAmount || !toAmount || !fromToken || !toToken)
                        }
                        onClick={handleSwap}
                    >
                        {!isWalletConnected
                            ? 'Connect Wallet'
                            : !fromToken || !toToken
                                ? 'Select tokens'
                                : !fromAmount || !toAmount
                                    ? 'Enter an amount'
                                    : 'Swap'}
                    </Button>
                </div>
            </Card>

            {isWalletConnected && (
                <Alert className="mt-4">
                    <AlertDescription className="flex justify-between items-center">
                        <span>Network: {networkName}</span>
                        <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Connected
            </span>
                    </AlertDescription>
                </Alert>
            )}

            <TokenSelectorModal
                isOpen={isSelectingFrom}
                onClose={() => setIsSelectingFrom(false)}
                onSelect={setFromToken}
                selectedToken={fromToken}
                tokens={tokens}
            />

            <TokenSelectorModal
                isOpen={isSelectingTo}
                onClose={() => setIsSelectingTo(false)}
                onSelect={setToToken}
                selectedToken={toToken}
                tokens={tokens}
            />
        </div>
    );
};

export default SwapInterface;