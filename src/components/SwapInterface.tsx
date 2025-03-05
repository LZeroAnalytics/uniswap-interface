"use client";

import React, { useState, useEffect } from 'react';
import { Wallet, ArrowDownUp, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TokenList } from '@uniswap/token-lists';
import Image, { ImageLoader } from 'next/image';
import { ethers } from 'ethers';
import DEFAULT_TOKEN_LIST_JSON from './tokenList.json';
import TokenSelector from '@/components/TokenSelector';
import {SwapRouter} from "@uniswap/v3-sdk";
import {AlphaRouter} from "@uniswap/smart-order-router";

const DEFAULT_TOKEN_LIST = DEFAULT_TOKEN_LIST_JSON as TokenList;

export interface Token {
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
                    <Search
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        size={20}
                    />
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

    // Token selecting modals
    const [isSelectingFrom, setIsSelectingFrom] = useState(false);
    const [isSelectingTo, setIsSelectingTo] = useState(false);

    // Token balance state
    const [fromBalance, setFromBalance] = useState<string>('');
    const [toBalance, setToBalance] = useState<string>('');

    // Quote / route states
    const [quoteData, setQuoteData] = useState<string | null>(null);
    const [swapRoute, setSwapRoute] = useState<any>(null);
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Swap transaction states
    const [isSwapping, setIsSwapping] = useState(false);
    const [isSwapSuccessful, setSwapSuccessful] = useState(false);

    const tokens: Token[] = DEFAULT_TOKEN_LIST.tokens
        .filter((token) => token.chainId === 1)
        .map((token) => ({
            chainId: token.chainId,
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            // Provide a default empty string if logoURI is missing
            logoURI: token.logoURI ?? "",
        }));

    const shortenAddress = (address: string) =>
        address.slice(0, 6) + '...' + address.slice(-4);

    const handleWalletConnect = async () => {
        if ((window as any).ethereum) {
            try {
                const ethProvider = new ethers.providers.Web3Provider(
                    (window as any).ethereum
                );
                await ethProvider.send('eth_requestAccounts', []);
                const signer = ethProvider.getSigner();
                const address = await signer.getAddress();
                setWalletAddress(address);
                setProvider(ethProvider);
                const network = await ethProvider.getNetwork();
                if (network.name === "unknown") {
                    setNetworkName("Bloctopus");
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

    // Whenever fromToken, toToken, and fromAmount are set, update the quote
    useEffect(() => {
        async function fetchQuote() {
            setFetchError(null);
            setSwapSuccessful(false);

            if (fromToken && toToken && fromAmount && provider) {
                try {
                    setIsQuoteLoading(true);
                    // Convert fromAmount to smallest unit (raw value)
                    const amountInRaw = ethers.utils
                        .parseUnits(fromAmount, fromToken.decimals)
                        .toString();

                    // Call our backend API (which uses getQuoteExactInputSingle and getSwapRoute)
                    const response = await fetch('/api/swap', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tokenIn: fromToken,
                            tokenOut: toToken,
                            amountIn: amountInRaw,
                            walletAddress,
                        }),
                    });
                    if (!response.ok) {
                        throw new Error('API error while fetching swap route');
                    }
                    const data = await response.json();

                    if (!data.methodParameters) {
                        setFetchError('No valid route found');
                        setQuoteData(null);
                        setSwapRoute(null);
                    } else {
                        setQuoteData(data.quote);
                        setSwapRoute(data.methodParameters);
                        setFetchError(null);
                        setToAmount(data.quote);
                    }
                } catch (error) {
                    console.error('Error fetching quote from API:', error);
                    setFetchError('Error fetching quote');
                    setQuoteData(null);
                    setSwapRoute(null);
                } finally {
                    setIsQuoteLoading(false);
                }
            } else {
                // If any piece of info is missing, clear out quote/route
                setQuoteData(null);
                setSwapRoute(null);
                setFetchError(null);
            }
        }
        const timer = setTimeout(fetchQuote, 500);
        return () => clearTimeout(timer);
    }, [fromToken, toToken, fromAmount, provider, walletAddress]);

    // Fetch token balances (unchanged)
    useEffect(() => {
        const fetchFromBalance = async () => {
            if (provider && walletAddress && fromToken) {
                try {
                    let balance;
                    if (fromToken.symbol.toUpperCase() === 'ETH') {
                        balance = await provider.getBalance(walletAddress);
                        setFromBalance(
                            parseFloat(ethers.utils.formatEther(balance)).toFixed(2)
                        );
                    } else {
                        const tokenContract = new ethers.Contract(
                            fromToken.address,
                            ['function balanceOf(address owner) view returns (uint256)'],
                            provider
                        );
                        balance = await tokenContract.balanceOf(walletAddress);
                        setFromBalance(
                            parseFloat(
                                ethers.utils.formatUnits(balance, fromToken.decimals)
                            ).toFixed(2)
                        );
                    }
                } catch (error) {
                    console.error(error);
                    setFromBalance('0');
                }
            }
        };
        fetchFromBalance();
    }, [provider, walletAddress, fromToken]);

    useEffect(() => {
        const fetchToBalance = async () => {
            if (provider && walletAddress && toToken) {
                try {
                    let balance;
                    if (toToken.symbol.toUpperCase() === 'ETH') {
                        balance = await provider.getBalance(walletAddress);
                        setToBalance(
                            parseFloat(ethers.utils.formatEther(balance)).toFixed(2)
                        );
                    } else {
                        const tokenContract = new ethers.Contract(
                            toToken.address,
                            ['function balanceOf(address owner) view returns (uint256)'],
                            provider
                        );
                        balance = await tokenContract.balanceOf(walletAddress);
                        setToBalance(
                            parseFloat(
                                ethers.utils.formatUnits(balance, toToken.decimals)
                            ).toFixed(2)
                        );
                    }
                } catch (error) {
                    console.error(error);
                    setToBalance('0');
                }
            }
        };
        fetchToBalance();
    }, [provider, walletAddress, toToken]);

    // Listen for account and chain changes (unchanged)
    useEffect(() => {
        if ((window as any).ethereum) {
            const ethereum = (window as any).ethereum;

            const handleAccountsChanged = (accounts: string[]) => {
                if (accounts.length === 0) {
                    setIsWalletConnected(false);
                    setWalletAddress(null);
                } else {
                    setWalletAddress(accounts[0]);
                }
            };

            const handleChainChanged = (chainId: string) => {
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

    // Handle Swap: Call our backend API to get the route and then send the transaction
    const handleSwap = async () => {
        if (!isWalletConnected) {
            await handleWalletConnect();
        }
        if (!fromToken || !toToken || !fromAmount || !provider || !walletAddress) {
            console.error('Missing swap parameters');
            return;
        }
        if (!swapRoute) {
            console.error('No route available for the swap');
            return;
        }

        setIsSwapping(true);
        setSwapSuccessful(false);

        try {
            // Convert fromAmount to raw units
            const amountInRaw = ethers.utils
                .parseUnits(fromAmount, fromToken.decimals)
                .toString();

            const signer = provider.getSigner();
            let spenderAddress = swapRoute.to || '0xE592427A0AEce92De3Edee1F18E0157C05861564';

            if (fromToken.symbol.toUpperCase() !== 'ETH') {
                const ERC20_ABI = [
                    'function approve(address spender, uint256 amount) public returns (bool)',
                    'function allowance(address owner, address spender) external view returns (uint256)'
                ];
                const tokenContract = new ethers.Contract(fromToken.address, ERC20_ABI, signer);

                // Read current allowance
                const currentAllowance: ethers.BigNumber = await tokenContract.allowance(walletAddress, spenderAddress);

                if (currentAllowance.lt(amountInRaw)) {
                    console.log('Current allowance is insufficient; sending approval...');
                    const approveTx = await tokenContract.approve(spenderAddress, amountInRaw);
                    console.log('Approve transaction sent:', approveTx.hash);
                    await approveTx.wait();
                    console.log('Approve transaction confirmed');
                }
            }

            // 3. Build the swap transaction from the returned route
            const txRequest = {
                data: swapRoute.calldata,
                to: spenderAddress,
                value: swapRoute.value,
            };

            // 4. Send the swap transaction using the connected wallet
            const txResponse = await signer.sendTransaction(txRequest);
            console.log('Trade broadcast, tx hash:', txResponse.hash);

            // Wait for 1 block confirmation
            const txReceipt = await txResponse.wait(1);
            console.log(`Swap confirmed in block: ${txReceipt.blockNumber}`);

            setSwapSuccessful(true);

            // Refresh the balances after the swap
            if (fromToken.symbol.toUpperCase() !== 'ETH') {
                const fromTokenContract = new ethers.Contract(
                    fromToken.address,
                    ['function balanceOf(address) view returns (uint256)'],
                    provider
                );
                const inBalance = await fromTokenContract.balanceOf(walletAddress);
                setFromBalance(
                    parseFloat(
                        ethers.utils.formatUnits(inBalance, fromToken.decimals)
                    ).toFixed(2)
                );
            } else {
                const inBalance = await provider.getBalance(walletAddress);
                setFromBalance(
                    parseFloat(ethers.utils.formatEther(inBalance)).toFixed(2)
                );
            }

            if (toToken.symbol.toUpperCase() !== 'ETH') {
                const toTokenContract = new ethers.Contract(
                    toToken.address,
                    ['function balanceOf(address) view returns (uint256)'],
                    provider
                );
                const outBalance = await toTokenContract.balanceOf(walletAddress);
                setToBalance(
                    parseFloat(
                        ethers.utils.formatUnits(outBalance, toToken.decimals)
                    ).toFixed(2)
                );
            } else {
                const outBalance = await provider.getBalance(walletAddress);
                setToBalance(
                    parseFloat(ethers.utils.formatEther(outBalance)).toFixed(2)
                );
            }
        } catch (error) {
            console.error('Swap execution error:', error);
        }

        setIsSwapping(false);
    };

    // Determine button text dynamically
    let swapButtonText = 'Swap';
    if (!isWalletConnected) {
        swapButtonText = 'Connect Wallet';
    } else if (isQuoteLoading) {
        swapButtonText = 'Loading Quote...';
    } else if (fetchError) {
        swapButtonText = `Error: ${fetchError}`;
    } else if (!fromToken || !toToken) {
        swapButtonText = 'Select tokens';
    } else if (!fromAmount) {
        swapButtonText = 'Enter an amount';
    } else if (isSwapping) {
        swapButtonText = 'Executing swap...';
    } else if (isSwapSuccessful) {
        swapButtonText = 'Swap successful';
    }

    return (
        <div className="w-full max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Bloctopus Uniswap</h1>
                <div className="flex gap-2 items-center">
                    <Button
                        variant={isWalletConnected ? 'outline' : 'default'}
                        onClick={handleWalletConnect}
                        className="flex items-center gap-2"
                    >
                        <Wallet size={16} />
                        {walletAddress ? (
                            <>
                                {shortenAddress(walletAddress)}
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
                            !isWalletConnected ||
                            !fromToken ||
                            !toToken ||
                            !fromAmount ||
                            isQuoteLoading ||
                            isSwapping ||
                            !!fetchError ||
                            !swapRoute
                        }
                        onClick={handleSwap}
                    >
                        {swapButtonText}
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