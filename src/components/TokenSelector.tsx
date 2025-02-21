import React from "react";
import {Button} from "@/components/ui/button";
import Image, {ImageLoader} from "next/image";
import {ChevronDown} from "lucide-react";

interface Token {
    chainId: number;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
}

const myLoader: ImageLoader = ({ src, width, quality }) => {
    if (src.startsWith('ipfs://')) {
        // Convert ipfs:// to an HTTP gateway URL
        src = src.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    return `${src}?w=${width}&q=${quality || 75}`;
};

const TokenSelector = React.memo (({
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
));

export default TokenSelector;