// src/app/api/swap/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { Percent, Token, CurrencyAmount, TradeType } from '@uniswap/sdk-core';
import {
    AlphaRouter,
    SwapType,
    SwapOptionsSwapRouter02,
} from '@uniswap/smart-order-router';

const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) {
    throw new Error("RPC_URL must be defined in environment variables");
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            tokenIn,
            tokenOut,
            amountIn,
            walletAddress,
        } = body;

        if (!tokenIn || !tokenOut || !amountIn || !walletAddress) {
            return NextResponse.json(
                { error: "Missing required parameters" },
                { status: 400 }
            );
        }

        // Create a provider using your custom or environment RPC
        const provider = new ethers.providers.JsonRpcProvider({
            url: "https://5dd968c7015a4546a569fd6dcc215b2c-rpc.prod.lzeroanalytics.com",
            headers: {
                Referer: "",
            },
        });
        // Force the network detection if needed
        provider.detectNetwork = async () => ({ chainId: 1, name: "homestead" });

        // Instantiate our tokens as sdk-core Token objects
        const tokenInInstance = new Token(
            tokenIn.chainId,
            tokenIn.address,
            tokenIn.decimals,
            tokenIn.symbol,
            tokenIn.name
        );

        const tokenOutInstance = new Token(
            tokenOut.chainId,
            tokenOut.address,
            tokenOut.decimals,
            tokenOut.symbol,
            tokenOut.name
        );


        // Build an AlphaRouter to compute best route (including multi-hop if needed).
        const router = new AlphaRouter({
            chainId: tokenInInstance.chainId,
            provider,
        });

        // Convert raw input amount into a CurrencyAmount
        const amountInCurrency = CurrencyAmount.fromRawAmount(
            tokenInInstance,
            amountIn
        );

        const deadline = Math.floor(Date.now() / 1000) + 1800; // e.g. 30 mins from now
        const slippage = new Percent(50, 10000); // 0.50%

        const options: SwapOptionsSwapRouter02 = {
            recipient: walletAddress,
            slippageTolerance: slippage,
            deadline,
            type: SwapType.SWAP_ROUTER_02
        };
        const route = await router.route(
            amountInCurrency,
            tokenOutInstance,
            TradeType.EXACT_INPUT,
            options
        );

        if (!route) {
            return NextResponse.json(
                { error: "No valid multi-hop route found" },
                { status: 400 }
            );
        }

        // The route object contains a .quote field with the best output amount
        const rawQuote = route.quote.toExact();
        const bestQuote = parseFloat(rawQuote).toFixed(4);
        console.log("Best quote (multi-hop if needed):", bestQuote);

        if (!route?.methodParameters) {
            return NextResponse.json(
                { error: "No valid route with methodParameters found" },
                { status: 400 }
            );
        }

        // Return the best quoted output plus the route's methodParameters
        return NextResponse.json({
            quote: bestQuote,
            route: route.methodParameters,
        });
    } catch (error: any) {
        console.error("API swap error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}