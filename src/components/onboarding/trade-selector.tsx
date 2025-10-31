"use client";

import { type Trade, TRADES, TRADE_METADATA } from "@/lib/profile-types";
import { Card } from "@/components/ui/card";

interface TradeSelectorProps {
  selectedTrade: Trade | null;
  onSelectTrade: (trade: Trade) => void;
}

export function TradeSelector({
  selectedTrade,
  onSelectTrade,
}: TradeSelectorProps) {
  const trades = Object.values(TRADES);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">What trade are you pursuing?</h2>
        <p className="mt-2 text-muted-foreground">
          Select the skilled trade you&apos;re interested in
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {trades.map((trade) => {
          const metadata = TRADE_METADATA[trade];
          const isSelected = selectedTrade === trade;

          return (
            <Card
              key={trade}
              onClick={() => onSelectTrade(trade)}
              className={`cursor-pointer p-6 transition-all hover:scale-105 ${
                isSelected
                  ? "border-teal-500 bg-teal-500/10 ring-2 ring-teal-500"
                  : "border-border hover:border-teal-500/50"
              }`}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="text-4xl">{metadata.icon}</div>
                <div>
                  <h3 className="font-semibold">{metadata.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {metadata.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
