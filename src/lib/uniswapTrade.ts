import { ethers } from 'ethers';
import { Token, CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { AlphaRouter, SwapOptionsSwapRouter02, SwapType } from '@uniswap/smart-order-router';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';

/**
 * Uniswap V3 addresses for mainnet (adjust if needed)
 */
export const QUOTER_CONTRACT_ADDRESS = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
export const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

/**
 * Get a best quote for an exact-input swap using Uniswap’s AlphaRouter.
 * This will find multi-hop routes if a direct pool doesn’t exist.
 *
 * @param tokenIn - The input token (Token instance)
 * @param tokenOut - The output token (Token instance)
 * @param amountIn - The input amount (in *smallest units*) as a string
 * @param provider - An ethers JsonRpcProvider
 * @param recipient - The wallet address that will receive the output tokens.
 * @param slippageTolerance - The acceptable slippage as a Percent.
 * @param deadline - A Unix timestamp after which the trade will revert.
 * @returns The quoted output amount as a string (decimal).
 */
export async function getQuoteExactInput(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    provider: ethers.providers.JsonRpcProvider,
    recipient: string,
    slippageTolerance: Percent,
    deadline: number
): Promise<string> {
    // Create an AlphaRouter for multi-hop route discovery
    const router = new AlphaRouter({ chainId: tokenIn.chainId, provider });

    // Convert raw input amount to a CurrencyAmount
    const amountInCurrency = CurrencyAmount.fromRawAmount(tokenIn, amountIn);

    const options: SwapOptionsSwapRouter02 = {
        recipient,
        slippageTolerance,
        deadline,
        type: SwapType.SWAP_ROUTER_02
    };
    const route = await router.route(
        amountInCurrency,
        tokenOut,
        TradeType.EXACT_INPUT,
        options
    );

    if (!route) {
        throw new Error('No valid route found for this token pair and amount.');
    }

    // route.quote is a CurrencyAmount representing the output.
    // Convert it to a decimal string using .toExact() or .quotient to get the raw number.
    return route.quote.toExact();
}

/**
 * Get an optimal swap route (using the smart order router) for an exact-input trade.
 * @param tokenIn - The input token.
 * @param tokenOut - The output token.
 * @param amountIn - The input amount (in smallest units) as a string.
 * @param provider - An ethers Provider.
 * @param recipient - The wallet address that will receive the output tokens.
 * @param slippageTolerance - The acceptable slippage as a Percent.
 * @param deadline - A Unix timestamp after which the trade will revert.
 * @returns A route object containing methodParameters for execution.
 */
export async function getSwapRoute(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    provider: ethers.providers.JsonRpcProvider,
    recipient: string,
    slippageTolerance: Percent,
    deadline: number
): Promise<any> {
    const router = new AlphaRouter({
        chainId: tokenIn.chainId,
        provider
    });
    const amountInCurrency = CurrencyAmount.fromRawAmount(tokenIn, amountIn);
    const options: SwapOptionsSwapRouter02 = {
        recipient,
        slippageTolerance,
        deadline,
        type: SwapType.SWAP_ROUTER_02
    };
    const route = await router.route(
        amountInCurrency,
        tokenOut,
        TradeType.EXACT_INPUT,
        options
    );
    return route;
}

/**
 * Approve the Uniswap V3 Swap Router to spend the given token.
 * @param token - The ERC20 token to approve.
 * @param provider - A Web3Provider (from a wallet extension).
 * @param amount - The amount (in smallest units) to approve.
 * @returns The transaction response.
 */
export async function approveToken(
    token: Token,
    provider: ethers.providers.Web3Provider,
    amount: string
): Promise<ethers.providers.TransactionResponse> {
    const ERC20_ABI = [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
    ];
    const signer = provider.getSigner();
    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
    const tx = await tokenContract.approve(SWAP_ROUTER_ADDRESS, amount);
    return tx;
}

/**
 * Execute the trade using the computed route.
 * @param route - The route object from getSwapRoute.
 * @param walletAddress - The sender’s wallet address.
 * @param provider - A Web3Provider.
 * @param maxFeePerGas - (Optional) Maximum fee per gas.
 * @param maxPriorityFeePerGas - (Optional) Maximum priority fee per gas.
 * @returns The transaction response.
 */
export async function executeTrade(
    route: any,
    walletAddress: string,
    provider: ethers.providers.Web3Provider,
    maxFeePerGas?: ethers.BigNumber,
    maxPriorityFeePerGas?: ethers.BigNumber
): Promise<ethers.providers.TransactionResponse> {
    if (!route || !route.methodParameters) {
        throw new Error("No valid route found for trade execution");
    }
    const tx = {
        data: route.methodParameters.calldata,
        to: SWAP_ROUTER_ADDRESS,
        value: ethers.BigNumber.from(route.methodParameters.value),
        from: walletAddress,
        maxFeePerGas,
        maxPriorityFeePerGas
    };
    const signer = provider.getSigner();
    const txResponse = await signer.sendTransaction(tx);
    return txResponse;
}