import React from "react"
import { CheckCircle2, Clock, Landmark, QrCode } from "lucide-react"
import { useRealtimeAuctions } from "@/lib/useRealtimeAuctions"

interface OrdersPaymentsProps {
  lang?: "mr" | "en"
}

export function OrdersPayments({ lang = "mr" }: OrdersPaymentsProps) {
  const isEn = lang === "en"
  const { settledOrders } = useRealtimeAuctions()

  const totalDbtReceived = settledOrders.reduce((sum, item) => sum + item.total_value, 0)
  const latestOrder = settledOrders[0]

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#18251b] p-3.5 shadow-xs border border-black/5 dark:border-white/10 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Landmark className="size-3.5 text-emerald-500" />
          <span>{isEn ? "Direct Bank Payouts (DBT)" : "थेट बँक जमा (DBT Transfer)"}</span>
        </span>
        <span className="text-[10px] text-emerald-600 dark:text-[#ccff00] font-bold font-mono">
          SBI •••• 4812
        </span>
      </div>

      {/* Main Settled Total Card */}
      {latestOrder && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground block font-medium">
                {isEn ? "Latest Settled Contract" : "नुकतीच जमा झालेली रक्कम"}
              </span>
              <span className="text-2xl font-black text-foreground font-mono">
                ₹{latestOrder.total_value.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-lg">
              <CheckCircle2 className="size-3.5" />
              <span>{isEn ? "DBT Credited" : "जमा झाले"}</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{latestOrder.lot_title}</span>
              <span className="font-mono text-emerald-500 font-bold">UTR: {latestOrder.dbt_utr}</span>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span>{isEn ? "Buyer:" : "खरेदीदार:"} {latestOrder.buyer_name}</span>
              <span>{latestOrder.settled_at}</span>
            </div>
          </div>
        </div>
      )}

      {/* Additional Orders if more than 1 */}
      {settledOrders.length > 1 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            {isEn ? "Previous Settled Lots" : "मागील जमा लॉट्स"}
          </span>
          {settledOrders.slice(1, 3).map((item) => (
            <div
              key={item.id}
              className="p-2 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-foreground block">{item.lot_title}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  UTR: {item.dbt_utr} · {item.dispatch_date}
                </span>
              </div>
              <div className="text-right">
                <span className="font-black font-mono text-foreground">
                  ₹{item.total_value.toLocaleString("en-IN")}
                </span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                  {isEn ? "Settled" : "जमा"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* APMC Escrow Protection Footnote */}
      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">
          {isEn
            ? "100% DBT Bank settlements protected under APMC Mandi Escrow"
            : "APMC एस्क्रो कायद्यान्वये १००% सुरक्षित थेट बँक जमा (DBT)"}
        </span>
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
          ₹{totalDbtReceived.toLocaleString("en-IN")} Total
        </span>
      </div>
    </div>
  )
}
