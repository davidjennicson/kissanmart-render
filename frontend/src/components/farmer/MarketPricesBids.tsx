import React, { useState } from "react"
import {
  Gavel,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react"
import { useRealtimeAuctions } from "@/lib/useRealtimeAuctions"

interface MarketPricesBidsProps {
  lang?: "mr" | "en"
}

export function MarketPricesBids({ lang = "mr" }: MarketPricesBidsProps) {
  const [activeTab, setActiveTab] = useState<"bids" | "mandi">("bids")
  const isEn = lang === "en"

  const { lots, farmerAcceptOffer } = useRealtimeAuctions()

  // Lot #1 is Farmer Tukaram's Shankar-6 Cotton Lot
  const lot = lots.find((l) => l.id === 1) || lots[0]
  const isAccepted = lot?.status === "CLOSED" || lot?.status === "WON"

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // Top 3 Mandi rates for Maharashtra
  const mandiRates = isEn
    ? [
        { crop: "Bt Cotton", market: "Akola APMC", rate: "₹7,450", change: "+₹120", up: true },
        { crop: "Soybean", market: "Latur APMC", rate: "₹4,820", change: "+₹45", up: true },
        { crop: "Red Onion", market: "Lasalgaon APMC", rate: "₹2,400", change: "-₹60", up: false },
      ]
    : [
        { crop: "कापूस (Bt Cotton)", market: "अकोला बाजार समिती", rate: "₹७,४५०", change: "+१२०", up: true },
        { crop: "सोयाबीन (Soybean)", market: "लातूर बाजार समिती", rate: "₹४,८२०", change: "+४५", up: true },
        { crop: "कांदा (Onion)", market: "लासलगाव बाजार समिती", rate: "₹२,४००", change: "-६०", up: false },
      ]

  return (
    <div className="w-full space-y-2.5">
      {/* 2 Big Simple Buttons for Tabs */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveTab("bids")}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
            activeTab === "bids"
              ? "bg-[#ccff00] text-black border-[#ccff00] shadow-xs"
              : "bg-white dark:bg-[#18251b] text-muted-foreground border-border"
          }`}
        >
          <Gavel className="size-4" />
          <span>{isEn ? "My Live Bids" : "माझी चालू बोली"}</span>
          <span className="size-2 rounded-full bg-red-500 animate-ping" />
        </button>

        <button
          onClick={() => setActiveTab("mandi")}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
            activeTab === "mandi"
              ? "bg-[#ccff00] text-black border-[#ccff00] shadow-xs"
              : "bg-white dark:bg-[#18251b] text-muted-foreground border-border"
          }`}
        >
          <TrendingUp className="size-4" />
          <span>{isEn ? "Today's APMC Rates" : "आजचे बाजारभाव"}</span>
        </button>
      </div>

      {/* Tab 1: Current Bids on Farmer's Produce */}
      {activeTab === "bids" && lot && (
        <div className="rounded-2xl bg-white dark:bg-[#18251b] p-3.5 shadow-xs border border-black/5 dark:border-white/10 space-y-3">
          {/* Active Produce Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-black text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full inline-block uppercase tracking-wide">
                  {lot.status === "LIVE" ? (isEn ? "⚡ 1-MIN LIVE AUCTION" : "⚡ १-मिनिट थेट लिलाव") : (isEn ? "AUCTION COMPLETED" : "लिलाव समाप्त")}
                </span>
                {lot.last_increment && (
                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded-full animate-pulse">
                    +₹{lot.last_increment}
                  </span>
                )}
              </div>
              <h3 className="text-xs font-bold text-foreground">
                {isEn ? `${lot.variety} ${lot.commodity} (${lot.quantity} ${lot.unit})` : `${lot.variety} कापूस (${lot.quantity} क्विंटल)`}
              </h3>
            </div>
            
            {/* Live 1-minute countdown timer */}
            <div className={`flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border ${
              lot.status === "LIVE"
                ? lot.timeLeftSeconds <= 15
                  ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                  : "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30"
                : "bg-gray-500/20 text-muted-foreground border-gray-500/30"
            }`}>
              <Clock className="size-3" />
              <span>
                {lot.status === "LIVE"
                  ? `${formatCountdown(lot.timeLeftSeconds)} ${isEn ? "left" : "शिल्लक"}`
                  : (isEn ? "Closed" : "बंद")}
              </span>
            </div>
          </div>

          {/* Current Highest Offer Card with Live Dynamic Pricing */}
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-500/30 relative overflow-hidden transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 tracking-wider block">
                {isEn ? "Highest Leading Offer (Live)" : "चालू सर्वोच्च बोली (थेट)"}
              </span>
              <span className="text-[10px] font-bold bg-[#ccff00] text-black px-2 py-0.2 rounded-full font-mono">
                {lot.bid_count} {isEn ? "Bids" : "बोली"}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <div>
                <span className="text-2xl font-black text-foreground font-mono">
                  ₹{lot.current_highest_bid.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  {isEn ? "/quintal" : "/क्विंटल"}
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {isEn ? "Total:" : "एकूण:"} ₹{(lot.current_highest_bid * lot.quantity).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-blue-500 shrink-0" />
              <span className="truncate">
                {lot.highest_bidder_name}
              </span>
            </div>
          </div>

          {/* Accept Button or Status */}
          {isAccepted ? (
            <div className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs">
              <CheckCircle2 className="size-4" />
              <span>
                {isEn
                  ? `Offer Finalized at ₹${lot.current_highest_bid.toLocaleString("en-IN")}/qtl (DBT Transfer Initiated)`
                  : `बोली ₹${lot.current_highest_bid.toLocaleString("en-IN")}/क्विंटल ला स्वीकारली (DBT पेमेंट सुरू)`}
              </span>
            </div>
          ) : (
            <button
              onClick={() => farmerAcceptOffer(lot.id)}
              className="w-full py-2.5 rounded-xl bg-[#ccff00] text-black font-extrabold text-xs hover:bg-[#b8e600] active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Zap className="size-3.5" />
              <span>
                {isEn
                  ? `Accept Offer Now (₹${lot.current_highest_bid.toLocaleString("en-IN")}/qtl)`
                  : `आत्ताच ही बोली स्वीकारा (₹${lot.current_highest_bid.toLocaleString("en-IN")}/क्विंटल)`}
              </span>
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      )}

      {/* Tab 2: Today's Mandi Rates */}
      {activeTab === "mandi" && (
        <div className="rounded-2xl bg-white dark:bg-[#18251b] p-3.5 shadow-xs border border-black/5 dark:border-white/10 space-y-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            {isEn ? "Maharashtra APMC Mandi Benchmark Rates" : "महाराष्ट्र कृषी उत्पन्न बाजार समिती (APMC)"}
          </span>

          <div className="divide-y divide-border/60">
            {mandiRates.map((item, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between first:pt-0 last:pb-0">
                <div>
                  <span className="text-xs font-bold text-foreground block">{item.crop}</span>
                  <span className="text-[10px] text-muted-foreground">{item.market}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-foreground font-mono block">
                    {item.rate}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      item.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                    }`}
                  >
                    {item.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
