// src/app/api/swap/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function POST(req: NextRequest) {
    console.log('Request received', req);
    try {
        const SERVER_URL = process.env.SERVER_URL;
        console.log('Backend server', SERVER_URL);
        if (!SERVER_URL) {
            return NextResponse.json(
                { error: "SERVER_URL environment variable is missing" },
                { status: 500 }
            );
        }

        const body = await req.json();
        console.log('Received body', body);

        const { tokenIn, tokenOut, amountIn, walletAddress } = body;

        if (!tokenIn || !tokenOut || !amountIn || !walletAddress) {
            return NextResponse.json(
                { error: "Missing required parameters" },
                { status: 400 }
            );
        }

        const queryParams = new URLSearchParams({
            tokenInAddress: tokenIn.address,
            tokenInChainId: "1",
            tokenOutAddress: tokenOut.address,
            tokenOutChainId: "1",
            amount: amountIn,
            type: "exactIn",
        });

        // Construct the full URL for the external /quote endpoint.
        const url = `${SERVER_URL}/quote?${queryParams.toString()}`;
        console.log("Forwarding request to:", url);

        // Make the GET request to the external /quote endpoint.
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
            const text = await response.text();
            console.error("Upstream /quote failed:", text);
            return NextResponse.json(
                { error: "Failed to fetch from /quote" },
                { status: 502 }
            );
        }

        const data = await response.json();

        const humanReadableQuote = parseFloat(
            ethers.utils.formatUnits(data.quote, tokenOut.decimals)
        );
        const formattedQuote = humanReadableQuote.toFixed(4);

        const result = {
            quote: formattedQuote,
            route: data.route,
        };

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("API swap error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}