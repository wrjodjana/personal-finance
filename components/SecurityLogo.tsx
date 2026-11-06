"use client";

import { useState } from "react";
import { MerchantAvatar } from "@/components/MerchantAvatar";

type Props = { ticker: string | null; name: string; size?: number };

function logoSources(ticker: string | null): string[] {
  if (!ticker || !/^[A-Z0-9.-]+$/i.test(ticker)) return [];
  const symbol = encodeURIComponent(ticker.toUpperCase().replace(/\./g, "-"));
  return [
    `https://assets.parqet.com/logos/symbol/${symbol}`,
    `https://financialmodelingprep.com/image-stock/${symbol}.png`,
  ];
}

export function SecurityLogo({ ticker, name, size = 24 }: Props) {
  const sources = logoSources(ticker);
  const [attempt, setAttempt] = useState(0);
  const source = sources[attempt];
  if (!source) return <MerchantAvatar name={ticker ?? name} logoUrl={null} size={size} shape="square" />;
  const next = () => setAttempt((current) => (sources[current] === source ? current + 1 : current));
  return (
    <img
      key={source}
      src={source}
      alt=""
      width={size}
      height={size}
      onError={next}
      ref={(image) => {
        if (image?.complete && image.naturalWidth === 0) next();
      }}
      className="shrink-0 rounded-md border border-edge bg-white object-cover"
      style={{ width: size, height: size }}
    />
  );
}
