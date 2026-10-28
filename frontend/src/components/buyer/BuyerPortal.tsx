import React, { useState, useEffect, useRef } from "react"
import {
  LayoutDashboard,
  Gavel,
  TrendingUp,
  ShieldCheck,
  FileText,
  CreditCard,
  Truck,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  Plus,
  Search,
  Bell,
  ChevronDown,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
  Filter,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  QrCode,
  X,
  ArrowUpRight,
  Sparkles,
  Globe,
  Building2,
  Wallet,
  RefreshCw,
  ArrowRight,
  Zap,
  Box,
} from "lucide-react"
import { fetchAuctions, placeBid, fetchBuyerWonAuctions } from "@/lib/api"
import { useRealtimeAuctions } from "@/lib/useRealtimeAuctions"
import type { RealtimeAuctionLot, SettledOrder } from "@/lib/realtimeAuctionStore"
import { FarmDigitalTwinModal, type FarmerProfileData } from "./FarmDigitalTwinModal"

// ─── Types ────────────────────────────────────────────────────────────────────
interface BuyerPortalProps {
  onSwitchToFarmer: () => void
  lang?: "en" | "mr"
  onToggleLang?: () => void
}

type SidebarPage = "dashboard" | "auctions" | "bids" | "won" | "payments" | "farmers" | "analytics" | "settings"
type AuctionFilter = "all" | "live" | "my_bids" | "won" | "closed"

// ─── Utility: Status Badge ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    LIVE:     { label: "Live",     cls: "bg-red-100 text-red-600 border-red-200" },
    LEADING:  { label: "Leading",  cls: "bg-green-100 text-green-700 border-green-200" },
    OUTBID:   { label: "Outbid",   cls: "bg-amber-100 text-amber-700 border-amber-200" },
    NONE:     { label: "Not Bid",  cls: "bg-gray-100 text-gray-500 border-gray-200" },
    WON:      { label: "Won",      cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    CLOSED:   { label: "Closed",   cls: "bg-gray-100 text-gray-500 border-gray-200" },
    PENDING:  { label: "Pending",  cls: "bg-amber-50 text-amber-600 border-amber-200" },
  }
  const cfg = map[status] || { label: status, cls: "bg-gray-100 text-gray-500 border-gray-200" }
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, change, changeDir }: { label: string; value: number | string; change: string; changeDir?: "up" | "down" }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-1.5">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className="text-3xl font-black text-gray-900 leading-none">{value}</span>
      <span className={`text-xs font-semibold flex items-center gap-1 ${changeDir === "up" ? "text-green-600" : "text-red-500"}`}>
        <ArrowUpRight className={`size-3 ${changeDir === "down" ? "rotate-180" : ""}`} />
        {change}
      </span>
      <span className="text-[11px] text-gray-400">vs last week</span>
    </div>
  )
}

// ─── Sidebar Nav Item ──────────────────────────────────────────────────────────
function NavItem({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? "bg-[#16a34a] text-white shadow-sm"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
      }`}
    >
      <Icon className={`size-4 shrink-0 ${active ? "text-white" : "text-gray-400"}`} />
      <span className="truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-red-100 text-red-600"}`}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function BuyerPortal({ onSwitchToFarmer, lang: initialLang = "en", onToggleLang }: BuyerPortalProps) {
  const [lang, setLang] = useState<"en" | "mr">(initialLang)
  const isEn = lang === "en"

  const {
    lots: auctionLots,
    settledOrders: wonLots,
    isBotsActive,
    isSpeedRunActive,
    latestNotification,
    userPlaceBid,
    triggerBotBid,
    resetSpeedRun,
    toggleBots,
    toggleSpeedRun,
  } = useRealtimeAuctions()

  const [sidebarPage, setSidebarPage] = useState<SidebarPage>("auctions")
  const [auctionFilter, setAuctionFilter] = useState<AuctionFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [commodityFilter, setCommodityFilter] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 5

  // Bidding modal
  const [bidModalLot, setBidModalLot] = useState<RealtimeAuctionLot | null>(null)
  const [bidAmountInput, setBidAmountInput] = useState(0)
  const [isPlacingBid, setIsPlacingBid] = useState(false)
  const [bidSuccessAlert, setBidSuccessAlert] = useState<string | null>(null)

  // Gate pass modal
  const [showGatePassModal, setShowGatePassModal] = useState(false)
  const [activeGatePassLot, setActiveGatePassLot] = useState<SettledOrder | null>(null)

  // Farm Digital Twin modal
  const [digitalTwinFarmer, setDigitalTwinFarmer] = useState<FarmerProfileData | null>(null)

  const openFarmerDigitalTwin = (farmer: {
    farmer_name: string
    village: string
    taluka?: string
    district: string
    gat_no: string
    farm_area_acres?: number
    commodity?: string
  }) => {
    setDigitalTwinFarmer({
      farmerName: farmer.farmer_name,
      village: farmer.village,
      taluka: farmer.taluka,
      district: farmer.district,
      gatNo: farmer.gat_no,
      acres: farmer.farm_area_acres || 4.2,
      commodity: farmer.commodity,
      soilType: isEn ? "Medium Black Soil" : "काळी जमीन",
    })
  }

  const selectedBuyer = {
    id: 1,
    company_name: "Akola Cotton Ginning & Pressing Pvt Ltd",
    contact_person: "Rameshwar Agrawal",
    business_type: "APMC Licensed Trader",
    license_no: "MH-AKL-APMC-2024-889",
    district: "Akola",
    escrow_balance: 2450000,
  }

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // Handle bid modal open
  const openBidModal = (lot: RealtimeAuctionLot) => {
    setBidModalLot(lot)
    setBidAmountInput(lot.current_highest_bid + lot.min_increment)
  }

  const handlePlaceBid = async () => {
    if (!bidModalLot) return
    setIsPlacingBid(true)
    userPlaceBid(bidModalLot.id, bidAmountInput, `${selectedBuyer.company_name} (You)`)
    setIsPlacingBid(false)
    setBidSuccessAlert(`Bid ₹${bidAmountInput.toLocaleString("en-IN")}/qtl placed — you are now leading!`)
    setBidModalLot(null)
    setTimeout(() => setBidSuccessAlert(null), 5000)
  }

  // Filtering
  const filteredLots = auctionLots.filter((lot) => {
    const matchFilter =
      auctionFilter === "all" ||
      (auctionFilter === "live" && lot.status === "LIVE") ||
      (auctionFilter === "my_bids" && ["LEADING", "OUTBID"].includes(lot.my_bid_status)) ||
      (auctionFilter === "won" && lot.my_bid_status === "WON") ||
      (auctionFilter === "closed" && lot.status === "CLOSED")
    const matchSearch =
      lot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.farmer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.district.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCommodity =
      commodityFilter === "All" || lot.commodity.toLowerCase().includes(commodityFilter.toLowerCase())
    return matchFilter && matchSearch && matchCommodity
  })

  const totalPages = Math.max(1, Math.ceil(filteredLots.length / rowsPerPage))
  const pagedLots = filteredLots.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  // Stats
  const liveLots = auctionLots.filter((l) => l.status === "LIVE").length
  const myBidsCount = auctionLots.filter((l) => ["LEADING", "OUTBID"].includes(l.my_bid_status)).length
  const leadingCount = auctionLots.filter((l) => l.my_bid_status === "LEADING").length
  const outbidCount = auctionLots.filter((l) => l.my_bid_status === "OUTBID").length
  const wonCount = auctionLots.filter((l) => l.my_bid_status === "WON").length + wonLots.length

  // Sidebar items
  const sidebarItems = [
    { id: "dashboard",  label: isEn ? "Dashboard"  : "डॅशबोर्ड",   icon: LayoutDashboard },
    { id: "auctions",   label: isEn ? "Auctions"   : "लिलाव",       icon: Gavel,   badge: liveLots },
    { id: "bids",       label: isEn ? "My Bids"    : "माझ्या बोली", icon: TrendingUp, badge: myBidsCount },
    { id: "won",        label: isEn ? "Won Lots"   : "जिंकलेले",    icon: ShieldCheck, badge: wonCount },
    { id: "payments",   label: isEn ? "Payments"   : "देयके",       icon: CreditCard },
    { id: "farmers",    label: isEn ? "Farmers"    : "शेतकरी",      icon: Users },
    { id: "analytics",  label: isEn ? "Analytics"  : "विश्लेषण",    icon: BarChart3 },
    { id: "settings",   label: isEn ? "Settings"   : "सेटिंग्ज",    icon: Settings },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col h-full overflow-y-auto">
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-[#16a34a] flex items-center justify-center shadow-sm">
              <span className="text-xs font-black text-white">KM</span>
            </div>
            <div>
              <span className="text-sm font-black text-gray-900 leading-none block">KissanMart</span>
              <span className="text-[10px] text-gray-400 font-mono">APMC Exchange</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pb-1 block">Main Menu</span>
          {sidebarItems.slice(0, 6).map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={sidebarPage === item.id}
              badge={item.badge}
              onClick={() => { setSidebarPage(item.id as SidebarPage); if (["auctions","bids","won"].includes(item.id)) { /* stay on table */ } }}
            />
          ))}
          <div className="pt-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pb-1 block">Other</span>
            {sidebarItems.slice(6).map((item) => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={sidebarPage === item.id}
                onClick={() => setSidebarPage(item.id as SidebarPage)}
              />
            ))}
          </div>
        </nav>

        {/* Setup Progress */}
        <div className="m-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-gray-600">Account Setup</span>
            <span className="text-[11px] font-mono text-green-600">5/6</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
            <div className="bg-[#16a34a] h-1.5 rounded-full" style={{ width: "83%" }} />
          </div>
          <button className="w-full text-[11px] font-bold text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg py-1.5 transition-colors">
            Complete Setup
          </button>
        </div>

        {/* User Footer */}
        <div className="border-t border-gray-100 px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-green-700">RA</span>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-gray-800 block truncate">{selectedBuyer.contact_person}</span>
              <span className="text-[10px] text-gray-400 block">Admin</span>
            </div>
            <ChevronDown className="size-3.5 text-gray-400 ml-auto shrink-0" />
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── TOP HEADER ── */}
        <header className="bg-white border-b border-gray-100 h-14 flex items-center px-6 gap-4 shrink-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
            <input
              type="text"
              placeholder={isEn ? "Search auctions, commodities…" : "लिलाव, पिके शोधा…"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-green-400 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Escrow Balance */}
            <div className="hidden md:flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-1.5 text-xs">
              <Wallet className="size-3.5 text-green-600" />
              <span className="font-mono font-bold text-green-700">₹{selectedBuyer.escrow_balance.toLocaleString("en-IN")}</span>
              <span className="text-green-500 text-[10px]">Escrow</span>
            </div>

            {/* Lang toggle */}
            <button
              onClick={() => { setLang(l => l === "en" ? "mr" : "en"); onToggleLang?.() }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Globe className="size-3.5 text-green-600" />
              {isEn ? "मराठी" : "English"}
            </button>

            {/* Notifications */}
            <button className="relative size-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
              <Bell className="size-4 text-gray-500" />
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center">3</span>
            </button>

            {/* Switch to Farmer App */}
            <button
              onClick={onSwitchToFarmer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold transition-colors shadow-sm"
            >
              📱 {isEn ? "Farmer App" : "शेतकरी ॲप"}
            </button>

            {/* Profile */}
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="size-9 rounded-xl bg-green-100 flex items-center justify-center border border-green-200">
                <span className="text-xs font-bold text-green-700">RA</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-semibold text-gray-800 block">Rameshwar A.</span>
                <span className="text-[10px] text-gray-400">Admin</span>
              </div>
              <ChevronDown className="size-3.5 text-gray-400" />
            </div>
          </div>
        </header>

        {/* ── SCROLLABLE CONTENT ── */}
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ⚡ 1-MINUTE SPEED RUN & APMC BOTS CONTROL BANNER */}
          <div className="bg-gradient-to-r from-emerald-950 via-[#102214] to-black text-white p-4 rounded-2xl shadow-md border border-emerald-500/40 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-[#ccff00] text-black flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(204,255,0,0.5)]">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm tracking-wide text-white uppercase flex items-center gap-1.5">
                    {isEn ? "1-Minute Speed Run APMC Engine" : "१-मिनिट स्पीड रन लिलाव इंजिन"}
                  </span>
                  <span className="text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.2 rounded-full font-bold flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-red-500 animate-ping" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-white/70 mt-0.5">
                  {isEn
                    ? "Automatic APMC traders bidding with dynamic pricing. Connected real-time to Farmer App."
                    : "स्वयंचलित व्यापारी थेट बोली लावत आहेत. शेतकरी ॲपशी रिअल-टाइम जोडलेले."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Trigger Instant Bot Bid */}
              <button
                onClick={() => triggerBotBid()}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Zap className="size-3.5 text-[#ccff00]" />
                <span>{isEn ? "Trigger Bot Bid" : "बोट बोली लावा"}</span>
              </button>

              {/* Toggle Bots */}
              <button
                onClick={() => toggleBots()}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isBotsActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white/10 text-white/50 hover:bg-white/20"
                }`}
              >
                <span>🤖 {isEn ? `Bots: ${isBotsActive ? "ON" : "OFF"}` : `बोट: ${isBotsActive ? "सुरू" : "बंद"}`}</span>
              </button>

              {/* Restart 60s Round */}
              <button
                onClick={() => resetSpeedRun(60)}
                className="px-3.5 py-1.5 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] active:scale-95 text-black text-xs font-black flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(204,255,0,0.3)]"
              >
                <RefreshCw className="size-3.5" />
                <span>{isEn ? "Restart 1-Min Round" : "पुन्हा १-मिनिट सुरू करा"}</span>
              </button>
            </div>
          </div>

          {/* Live Notification / Outbid Ticker Banner */}
          {latestNotification && (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs px-4 py-2.5 rounded-2xl shadow-xs animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-emerald-500 shrink-0" />
                <span className="font-semibold">{latestNotification}</span>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {bidSuccessAlert && (
            <div className="flex items-center justify-between bg-green-50 border border-green-300 text-green-800 text-sm px-4 py-3 rounded-2xl shadow-sm animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                <span className="font-medium">{bidSuccessAlert}</span>
              </div>
              <button onClick={() => setBidSuccessAlert(null)}>
                <X className="size-4 text-green-600" />
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* PAGE: DASHBOARD                               */}
          {/* ══════════════════════════════════════════════ */}
          {sidebarPage === "dashboard" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{isEn ? "Dashboard" : "डॅशबोर्ड"}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{isEn ? "Welcome back, Rameshwar. Here's your trading summary." : "आपले स्वागत आहे, रामेश्वरजी."}</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm">
                    <Calendar className="size-4 text-gray-400" /><span>28 Oct 2026</span>
                  </button>
                  <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm">
                    <Download className="size-4 text-gray-400" /><span>Export</span>
                  </button>
                </div>
              </div>

              {/* Stats row 1 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label={isEn ? "Live Auctions" : "चालू लिलाव"} value={liveLots} change="+2 today" changeDir="up" />
                <StatCard label={isEn ? "My Active Bids" : "माझ्या बोली"} value={myBidsCount} change="+1 this hour" changeDir="up" />
                <StatCard label={isEn ? "Leading Bids" : "अग्रेसर बोली"} value={leadingCount} change="You're winning!" changeDir="up" />
                <StatCard label={isEn ? "Outbid Alerts" : "मागे पडलेल्या"} value={outbidCount} change="Re-bid needed" changeDir="down" />
              </div>

              {/* Stats row 2 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label={isEn ? "Won This Week" : "जिंकलेले"} value={wonCount} change="+4.9%" changeDir="up" />
                <StatCard label={isEn ? "Pending Payments" : "प्रलंबित देयके"} value={2} change="Action needed" changeDir="down" />
                <StatCard label={isEn ? "Gate Passes" : "गेट पास"} value={1} change="+4.9%" changeDir="up" />
                <StatCard label={isEn ? "Total Spend" : "एकूण खर्च"} value="₹2.4L" change="+12.3%" changeDir="up" />
              </div>

              {/* Quick action cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => setSidebarPage("auctions")}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4 hover:border-green-300 hover:shadow-md transition-all text-left group">
                  <div className="size-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                    <Gavel className="size-6 text-red-500" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block">{isEn ? "Browse Live Auctions" : "लिलाव पाहा"}</span>
                    <span className="text-xs text-gray-400">{liveLots} lots active now</span>
                  </div>
                  <ArrowRight className="size-4 text-gray-300 ml-auto group-hover:text-green-500 transition-colors" />
                </button>

                <button onClick={() => setSidebarPage("bids")}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4 hover:border-green-300 hover:shadow-md transition-all text-left group">
                  <div className="size-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                    <TrendingUp className="size-6 text-amber-500" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block">{isEn ? "Manage My Bids" : "बोली व्यवस्थापन"}</span>
                    <span className="text-xs text-gray-400">{outbidCount > 0 ? `${outbidCount} outbid — re-bid now` : "All bids current"}</span>
                  </div>
                  <ArrowRight className="size-4 text-gray-300 ml-auto group-hover:text-green-500 transition-colors" />
                </button>

                <button onClick={() => setSidebarPage("won")}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4 hover:border-green-300 hover:shadow-md transition-all text-left group">
                  <div className="size-12 rounded-2xl bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
                    <ShieldCheck className="size-6 text-green-600" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block">{isEn ? "Won Lots & Gate Pass" : "जिंकलेले व गेट पास"}</span>
                    <span className="text-xs text-gray-400">{wonCount} lots to collect</span>
                  </div>
                  <ArrowRight className="size-4 text-gray-300 ml-auto group-hover:text-green-500 transition-colors" />
                </button>
              </div>

              {/* Recent activity + outbid alerts two column */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Recent bids activity */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <span className="font-bold text-gray-900 text-sm">{isEn ? "Recent Bid Activity" : "अलीकडील बोली"}</span>
                    <button onClick={() => setSidebarPage("bids")} className="text-xs text-green-600 font-semibold hover:underline">View all</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {auctionLots.filter(l => l.my_bid_status !== "NONE").slice(0, 4).map((lot) => (
                      <div key={lot.id} className="flex items-center justify-between px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${lot.my_bid_status === "LEADING" ? "bg-green-100" : lot.my_bid_status === "WON" ? "bg-emerald-100" : "bg-amber-100"}`}>
                            {lot.my_bid_status === "LEADING" ? <TrendingUp className="size-4 text-green-600" /> : lot.my_bid_status === "WON" ? <ShieldCheck className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-amber-500" />}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-800 block">{lot.title}</span>
                            <span className="text-[10px] text-gray-400">{lot.district} · {lot.date}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black font-mono text-[#16a34a] block">₹{lot.current_highest_bid.toLocaleString("en-IN")}</span>
                          <StatusBadge status={lot.my_bid_status} />
                        </div>
                      </div>
                    ))}
                    {auctionLots.filter(l => l.my_bid_status !== "NONE").length === 0 && (
                      <p className="text-center text-sm text-gray-400 py-8">No bids placed yet.</p>
                    )}
                  </div>
                </div>

                {/* Outbid alerts */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <span className="font-bold text-gray-900 text-sm">{isEn ? "🔔 Outbid Alerts" : "🔔 मागे पडलेल्या बोली"}</span>
                    <span className="text-[11px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{outbidCount} alerts</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {auctionLots.filter(l => l.my_bid_status === "OUTBID").map((lot) => (
                      <div key={lot.id} className="px-5 py-4 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-gray-800 block">{lot.title}</span>
                          <span className="text-[10px] text-gray-400">{isEn ? "New leader:" : "नवीन बोली:"} ₹{lot.current_highest_bid.toLocaleString("en-IN")}/qtl by {lot.highest_bidder_name}</span>
                        </div>
                        <button onClick={() => openBidModal(lot)}
                          className="ml-3 shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg transition-colors">
                          Re-Bid
                        </button>
                      </div>
                    ))}
                    {outbidCount === 0 && (
                      <div className="flex flex-col items-center py-8 text-gray-400">
                        <CheckCircle2 className="size-8 mb-2 text-green-400" />
                        <span className="text-sm font-medium">{isEn ? "No outbid alerts!" : "सर्व बोली अद्ययावत आहेत!"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* PAGE: AUCTIONS (Browse & Place Bids)          */}
          {/* ══════════════════════════════════════════════ */}
          {sidebarPage === "auctions" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{isEn ? "Live Auctions" : "चालू लिलाव"}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{isEn ? "Browse Maharashtra APMC lots and place bids" : "महाराष्ट्र APMC लिलावात भाग घ्या"}</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm">
                    <Download className="size-4 text-gray-400" /><span>Export</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Live Lots" value={liveLots} change="+2 today" changeDir="up" />
                <StatCard label="Closing Soon" value={auctionLots.filter(l => l.status === "LIVE" && l.timeLeftSeconds <= 20).length} change="< 20s left" changeDir="down" />
                <StatCard label="Total Volume" value={`${auctionLots.reduce((s,l)=>s+l.quantity,0)} Qtl`} change="+4.9%" changeDir="up" />
                <StatCard label="My Active Bids" value={myBidsCount} change="+1 this hour" changeDir="up" />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* PAGE: MY BIDS (Manage bids)                   */}
          {/* ══════════════════════════════════════════════ */}
          {sidebarPage === "bids" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{isEn ? "My Bids" : "माझ्या बोली"}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{isEn ? "Track and manage all your active bids" : "आपल्या सर्व बोलींचे व्यवस्थापन करा"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Bids" value={myBidsCount} change="Active" changeDir="up" />
                <StatCard label="Leading" value={leadingCount} change="You're winning!" changeDir="up" />
                <StatCard label="Outbid" value={outbidCount} change="Re-bid needed" changeDir="down" />
                <StatCard label="Bid Value" value={`₹${auctionLots.filter(l=>["LEADING","OUTBID"].includes(l.my_bid_status)).reduce((s,l)=>s+l.current_highest_bid*l.quantity,0).toLocaleString("en-IN")}`} change="Est. total" changeDir="up" />
              </div>

              {/* Outbid Alert Banner */}
              {outbidCount > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3.5">
                  <AlertCircle className="size-5 text-amber-500 shrink-0" />
                  <span className="text-sm font-semibold text-amber-800">
                    {isEn ? `You've been outbid on ${outbidCount} lot(s). Increase your bid to stay in the race!` : `${outbidCount} लिलावात इतरांनी जास्त बोली लावली आहे. बोली वाढवा!`}
                  </span>
                </div>
              )}

              {/* Bids table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-bold text-gray-900">{isEn ? "All My Bids" : "सर्व बोली"}</span>
                  <div className="flex gap-2">
                    {(["all","leading","outbid","won"] as const).map((f) => (
                      <button key={f} onClick={() => setAuctionFilter(f === "all" ? "all" : f === "leading" ? "my_bids" : f === "won" ? "won" : "my_bids")}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold transition-colors capitalize">
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {auctionLots.filter(l => l.my_bid_status !== "NONE").map((lot) => (
                    <div key={lot.id} className={`flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors ${lot.my_bid_status === "OUTBID" ? "bg-amber-50/40" : ""}`}>
                      <div className="flex items-center gap-4">
                        <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          lot.my_bid_status === "LEADING" ? "bg-green-100" : lot.my_bid_status === "WON" ? "bg-emerald-100" : "bg-amber-100"
                        }`}>
                          {lot.my_bid_status === "LEADING" ? <TrendingUp className="size-5 text-green-600" /> : lot.my_bid_status === "WON" ? <ShieldCheck className="size-5 text-emerald-600" /> : <AlertCircle className="size-5 text-amber-500" />}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900 block">{lot.title}</span>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <MapPin className="size-3 text-green-500" />{lot.village}, {lot.district}
                            <span>·</span><span className="font-mono">{lot.gat_no}</span>
                            <span>·</span><span>{lot.quantity} {lot.unit}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-5 shrink-0">
                        <div className="text-right hidden md:block">
                          <span className="text-[10px] text-gray-400 block">My Bid / Current Lead</span>
                          <span className="text-sm font-black font-mono text-[#16a34a]">₹{lot.current_highest_bid.toLocaleString("en-IN")}</span>
                          <span className="text-[10px] text-gray-500 block">
                            {lot.bid_count} bids · {lot.status === "LIVE" ? formatCountdown(lot.timeLeftSeconds) : "Closed"}
                          </span>
                        </div>
                        <StatusBadge status={lot.my_bid_status} />
                        {lot.my_bid_status === "OUTBID" && (
                          <button onClick={() => openBidModal(lot)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-colors shadow-sm">
                            <Gavel className="size-3.5" />{isEn ? "Increase Bid" : "बोली वाढवा"}
                          </button>
                        )}
                        {lot.my_bid_status === "LEADING" && (
                          <button onClick={() => openBidModal(lot)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold transition-colors">
                            <Eye className="size-3.5" />{isEn ? "View Bids" : "बोली पाहा"}
                          </button>
                        )}
                        {lot.my_bid_status === "WON" && (
                          <button onClick={() => { setActiveGatePassLot(wonLots[0]); setShowGatePassModal(true) }}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold transition-colors">
                            <QrCode className="size-3.5" />{isEn ? "Gate Pass" : "गेट पास"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {auctionLots.filter(l => l.my_bid_status !== "NONE").length === 0 && (
                    <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
                      <Gavel className="size-10 text-gray-200" />
                      <span className="text-sm font-medium">{isEn ? "No bids placed yet. Browse live auctions to start bidding." : "अजून कोणतीही बोली लावलेली नाही."}</span>
                      <button onClick={() => setSidebarPage("auctions")}
                        className="px-4 py-2 rounded-xl bg-[#16a34a] text-white text-sm font-bold hover:bg-[#15803d] transition-colors">
                        {isEn ? "Browse Auctions" : "लिलाव पाहा"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* PAGE: WON LOTS                                */}
          {/* ══════════════════════════════════════════════ */}
          {sidebarPage === "won" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{isEn ? "Won Lots & Gate Passes" : "जिंकलेले लॉट व गेट पास"}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{isEn ? "Collect produce and generate APMC e-gate passes" : "माल उचलण्यासाठी APMC ई-गेट पास मिळवा"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Won" value={wonCount} change="This season" changeDir="up" />
                <StatCard label="Pending Pickup" value={wonLots.length} change="Awaiting collection" changeDir="down" />
                <StatCard label="Total Value" value={`₹${wonLots.reduce((s,l)=>s+l.total_value,0).toLocaleString("en-IN")}`} change="Settled via DBT" changeDir="up" />
                <StatCard label="Gate Passes" value={wonLots.length} change="Issued" changeDir="up" />
              </div>

              <div className="space-y-4">
                {wonLots.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">{isEn ? "CONTRACT SETTLED · DBT PAID" : "करार पूर्ण · DBT पेमेंट झाले"}</span>
                      </div>
                      <span className="text-xs font-mono text-gray-500">{item.gate_pass_no}</span>
                    </div>
                    <div className="px-5 py-4 flex flex-col md:flex-row gap-4 justify-between">
                      <div className="space-y-3 flex-1">
                        <h3 className="font-bold text-gray-900">{item.lot_title}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          {[
                            [isEn ? "Farmer" : "शेतकरी", item.farmer_name],
                            [isEn ? "Pickup Address" : "पत्ता", item.pickup_address],
                            [isEn ? "Transport" : "वाहन", item.transport_truck_no],
                            [isEn ? "Dispatch Date" : "तारीख", item.dispatch_date],
                            [isEn ? "DBT UTR" : "DBT UTR", item.dbt_utr],
                            [isEn ? "APMC Cess" : "APMC शुल्क", `₹${item.apmc_mandi_cess.toLocaleString("en-IN")}`],
                          ].map(([k, v]) => (
                            <div key={k} className="bg-gray-50 rounded-xl p-2.5">
                              <span className="text-[10px] text-gray-400 block">{k}</span>
                              <span className="font-semibold text-gray-800 text-xs">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between shrink-0 gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block">{isEn ? "Total Contract Value" : "एकूण रक्कम"}</span>
                          <span className="text-2xl font-black text-[#16a34a] font-mono">₹{item.total_value.toLocaleString("en-IN")}</span>
                          <span className="text-xs text-gray-400 block">{item.quantity} qtl @ ₹{item.final_price_per_qtl}/qtl</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setActiveGatePassLot(item); setShowGatePassModal(true) }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold transition-colors shadow-sm">
                            <QrCode className="size-3.5" />{isEn ? "View E-Gate Pass" : "गेट पास पाहा"}
                          </button>
                          <button className="px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                            <Download className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {wonLots.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center py-16 gap-3 text-gray-400">
                    <ShieldCheck className="size-10 text-gray-200" />
                    <span className="text-sm font-medium">{isEn ? "No won auctions yet. Keep bidding!" : "अजून कोणताही लिलाव जिंकला नाही."}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* PAGE: PAYMENTS                                */}
          {/* ══════════════════════════════════════════════ */}
          {sidebarPage === "payments" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{isEn ? "Payments & Escrow" : "देयके व एस्क्रो"}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{isEn ? "Manage APMC escrow deposits and DBT settlements" : "APMC एस्क्रो व DBT देयके व्यवस्थापित करा"}</p>
                </div>
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-2.5">
                  <Wallet className="size-5 text-green-600" />
                  <div>
                    <span className="text-[10px] text-green-500 block">APMC Escrow Balance</span>
                    <span className="font-black text-green-700 text-base font-mono">₹{selectedBuyer.escrow_balance.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Escrow Balance" value="₹24.5L" change="Available" changeDir="up" />
                <StatCard label="Pending Payments" value={2} change="Action needed" changeDir="down" />
                <StatCard label="Settled This Month" value="₹2.4L" change="+12%" changeDir="up" />
                <StatCard label="APMC Cess Paid" value="₹2,400" change="On-time" changeDir="up" />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-bold text-gray-900">{isEn ? "Payment History" : "देयक इतिहास"}</span>
                  <button className="flex items-center gap-1.5 text-xs text-green-600 font-semibold hover:underline">
                    <Download className="size-3.5" />Export
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {[
                    { id: "PAY-001", lot: "50 Qtl Soybean – MAUS-71", amount: 240000, cess: 2400, method: "APMC Escrow → DBT", date: "28 Oct 2026", status: "SETTLED", utr: "SBIN9841029412" },
                    { id: "PAY-002", lot: "75 Qtl Soybean JS-335 (Bid Active)", amount: 363750, cess: 3637, method: "APMC Escrow", date: "28 Oct 2026", status: "PENDING", utr: "—" },
                    { id: "PAY-003", lot: "100 Qtl Bt Cotton (Bid Active)", amount: 730000, cess: 7300, method: "APMC Escrow", date: "28 Oct 2026", status: "PENDING", utr: "—" },
                  ].map((pay) => (
                    <div key={pay.id} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${pay.status === "SETTLED" ? "bg-green-100" : "bg-amber-100"}`}>
                          <CreditCard className={`size-4 ${pay.status === "SETTLED" ? "text-green-600" : "text-amber-500"}`} />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-800 block">{pay.lot}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{pay.id} · {pay.method} · {pay.date}</span>
                          {pay.utr !== "—" && <span className="text-[10px] text-green-600 font-mono block">UTR: {pay.utr}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right hidden md:block">
                          <span className="text-sm font-black font-mono text-gray-900">₹{pay.amount.toLocaleString("en-IN")}</span>
                          <span className="text-[10px] text-gray-400 block">+ ₹{pay.cess.toLocaleString("en-IN")} cess</span>
                        </div>
                        <StatusBadge status={pay.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* PAGE: FARMERS                                 */}
          {/* ══════════════════════════════════════════════ */}
          {sidebarPage === "farmers" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-gray-900">{isEn ? "Farmers Directory" : "शेतकरी यादी"}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{isEn ? "Registered farmers currently listing produce on APMC" : "APMC वर माल नोंदणी केलेले शेतकरी"}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <span className="font-bold text-gray-900">{isEn ? "Active Sellers" : "सक्रिय शेतकरी"}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {auctionLots.map((lot) => (
                    <div key={lot.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors">
                      <div
                        onClick={() => openFarmerDigitalTwin(lot)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="size-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <span className="text-sm font-bold text-green-700">{lot.farmer_name.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors block">{lot.farmer_name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <Box className="size-2.5" /> 3D Twin
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="size-3 text-green-500" />{lot.village}, {lot.taluka}, {lot.district}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">{lot.gat_no} · {lot.farm_area_acres} Acres</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden md:block">
                          <span className="text-xs text-gray-400 block">{lot.commodity} — {lot.quantity} {lot.unit}</span>
                          <span className="text-xs font-mono font-bold text-[#16a34a]">₹{lot.current_highest_bid.toLocaleString("en-IN")}/qtl</span>
                        </div>
                        <button
                          onClick={() => openFarmerDigitalTwin(lot)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-colors shadow-xs"
                        >
                          <Box className="size-3.5" />
                          {isEn ? "View 3D Farm" : "3D शेत पाहा"}
                        </button>
                        {lot.status === "LIVE" && (
                          <button onClick={() => { setSidebarPage("auctions"); openBidModal(lot) }}
                            className="px-3 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl transition-colors">
                            {isEn ? "Bid Now" : "बोली लावा"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* PAGE: ANALYTICS                               */}
          {/* ══════════════════════════════════════════════ */}
          {sidebarPage === "analytics" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-gray-900">{isEn ? "Analytics" : "विश्लेषण"}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{isEn ? "Your bidding performance and commodity trends" : "आपल्या बोली कामगिरीचे विश्लेषण"}</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Win Rate" value="68%" change="+5% vs last month" changeDir="up" />
                <StatCard label="Avg Bid Premium" value="+4.2%" change="Over base price" changeDir="up" />
                <StatCard label="Total Lots Bid" value={myBidsCount + wonCount} change="This season" changeDir="up" />
                <StatCard label="Total Spend" value="₹9.7L" change="+12.3%" changeDir="up" />
              </div>
              {/* Commodity breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <span className="font-bold text-gray-900">{isEn ? "Commodity Spend Breakdown" : "पिकांनुसार खर्च"}</span>
                {[
                  { label: "Bt Cotton", value: 73, color: "bg-green-500", amount: "₹7.3L" },
                  { label: "Soybean", value: 18, color: "bg-amber-400", amount: "₹1.8L" },
                  { label: "Red Onion", value: 6, color: "bg-red-400", amount: "₹0.6L" },
                  { label: "Tur Dal", value: 3, color: "bg-purple-400", amount: "₹0.3L" },
                ].map((c) => (
                  <div key={c.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-gray-700">
                      <span>{c.label}</span>
                      <span>{c.amount} ({c.value}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className={`${c.color} h-2.5 rounded-full`} style={{ width: `${c.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* District heatmap */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <span className="font-bold text-gray-900">{isEn ? "District Activity" : "जिल्हानिहाय क्रियाकलाप"}</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { district: "Akola", lots: 2, spend: "₹7.3L", color: "border-green-400 bg-green-50" },
                    { district: "Latur", lots: 1, spend: "₹1.8L", color: "border-amber-400 bg-amber-50" },
                    { district: "Nashik", lots: 1, spend: "₹0.6L", color: "border-red-400 bg-red-50" },
                    { district: "Jalna", lots: 1, spend: "₹0.3L", color: "border-purple-400 bg-purple-50" },
                  ].map((d) => (
                    <div key={d.district} className={`rounded-2xl border-2 p-4 ${d.color}`}>
                      <span className="text-sm font-bold text-gray-900 block">{d.district}</span>
                      <span className="text-xs text-gray-500">{d.lots} lots bid</span>
                      <span className="text-base font-black text-gray-800 block mt-1">{d.spend}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* PAGE: SETTINGS                                */}
          {/* ══════════════════════════════════════════════ */}
          {sidebarPage === "settings" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-gray-900">{isEn ? "Settings" : "सेटिंग्ज"}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{isEn ? "Manage your buyer profile and APMC credentials" : "आपली प्रोफाइल व APMC तपशील व्यवस्थापित करा"}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                  <span className="font-bold text-gray-900 block">{isEn ? "Company Profile" : "कंपनी प्रोफाइल"}</span>
                  {[
                    [isEn ? "Company Name" : "कंपनीचे नाव", selectedBuyer.company_name],
                    [isEn ? "Contact Person" : "संपर्क व्यक्ती", selectedBuyer.contact_person],
                    [isEn ? "Business Type" : "व्यवसाय प्रकार", selectedBuyer.business_type],
                    [isEn ? "APMC License No" : "APMC परवाना क्र.", selectedBuyer.license_no],
                    [isEn ? "District" : "जिल्हा", selectedBuyer.district],
                  ].map(([k, v]) => (
                    <div key={k} className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{k}</label>
                      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                        <span className="text-sm font-medium text-gray-800">{v}</span>
                        <Pencil className="size-3.5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <span className="font-bold text-gray-900 block">{isEn ? "Notification Preferences" : "सूचना सेटिंग"}</span>
                    {[
                      [isEn ? "Outbid Alerts" : "मागे पडल्याच्या सूचना", true],
                      [isEn ? "Auction Closing Reminder" : "लिलाव संपण्याची आठवण", true],
                      [isEn ? "DBT Payment Confirmation" : "DBT पेमेंट पुष्टी", true],
                      [isEn ? "New Lot Listings" : "नवीन लिलाव सूचना", false],
                    ].map(([label, on]) => (
                      <div key={String(label)} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{label}</span>
                        <button className={`size-11 rounded-full flex items-center transition-colors px-1 border-2 ${on ? "bg-[#16a34a] border-[#16a34a]" : "bg-gray-100 border-gray-200"}`}>
                          <div className={`size-5 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                    <span className="font-bold text-gray-900 block">{isEn ? "Account" : "खाते"}</span>
                    <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
                      <span>{isEn ? "Change Password" : "पासवर्ड बदला"}</span><ArrowRight className="size-4 text-gray-400" />
                    </button>
                    <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
                      <span>{isEn ? "Download My Data" : "डेटा डाउनलोड करा"}</span><Download className="size-4 text-gray-400" />
                    </button>
                    <button onClick={onSwitchToFarmer} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 text-sm font-bold text-green-700 transition-colors">
                      <span>📱 {isEn ? "Switch to Farmer App" : "शेतकरी ॲपवर जा"}</span><ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── AUCTION TABLE SECTION ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Table Header */}
            <div className="px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Filter tabs */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 text-xs font-semibold">
                  {([
                    { id: "all",     label: isEn ? "All Lots"   : "सर्व" },
                    { id: "live",    label: isEn ? "Live"        : "लाइव्ह" },
                    { id: "my_bids", label: isEn ? "My Bids"    : "माझ्या बोली" },
                    { id: "won",     label: isEn ? "Won"         : "जिंकलेले" },
                    { id: "closed",  label: isEn ? "Closed"      : "संपलेले" },
                  ] as { id: AuctionFilter; label: string }[]).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setAuctionFilter(f.id); setCurrentPage(1) }}
                      className={`px-3.5 py-1.5 rounded-lg transition-all ${
                        auctionFilter === f.id
                          ? "bg-[#16a34a] text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                  {/* Commodity filter */}
                  <select
                    value={commodityFilter}
                    onChange={(e) => { setCommodityFilter(e.target.value); setCurrentPage(1) }}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 focus:outline-none focus:border-green-400"
                  >
                    <option value="All">{isEn ? "All Commodities" : "सर्व पिके"}</option>
                    <option value="Cotton">{isEn ? "Cotton" : "कापूस"}</option>
                    <option value="Soybean">{isEn ? "Soybean" : "सोयाबीन"}</option>
                    <option value="Onion">{isEn ? "Onion" : "कांदा"}</option>
                    <option value="Tur">{isEn ? "Tur Dal" : "तूर"}</option>
                  </select>

                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                    <Filter className="size-3.5" />
                    {isEn ? "Filter" : "फिल्टर"}
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left text-xs font-semibold text-gray-400 px-5 py-3 whitespace-nowrap">Lot No</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 whitespace-nowrap">Farmer</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 whitespace-nowrap">Commodity</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 whitespace-nowrap">Quantity</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 whitespace-nowrap">Current Bid</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 whitespace-nowrap">Lot Value</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 whitespace-nowrap">District</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 whitespace-nowrap">Time Left</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 whitespace-nowrap">Bid Status</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLots.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-12 text-center text-gray-400 text-sm">
                        {isEn ? "No auctions match the selected filter." : "निवडलेल्या फिल्टरसाठी कोणतेही लिलाव नाहीत."}
                      </td>
                    </tr>
                  ) : (
                    pagedLots.map((lot, i) => (
                      <tr
                        key={lot.id}
                        className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}
                      >
                        {/* Lot No */}
                        <td className="px-5 py-3.5">
                          <div>
                            <span className="text-xs font-bold text-gray-700 font-mono">#{String(lot.id).padStart(3, "0")}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              {lot.status === "LIVE" && <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />}
                              <span className={`text-[10px] font-semibold ${lot.status === "LIVE" ? "text-red-500" : "text-gray-400"}`}>
                                {lot.status}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Farmer */}
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => openFarmerDigitalTwin(lot)}
                            className="text-left group cursor-pointer"
                            title={isEn ? "View Farmer Profile & 3D Farm Digital Twin" : "शेतकरी प्रोफाइल व 3D डिजिटल ट्विन पाहा"}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-gray-800 group-hover:text-green-700 transition-colors block">
                                {lot.farmer_name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-0.5 group-hover:bg-emerald-100">
                                <Box className="size-2.5" /> Twin
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono block">{lot.gat_no} · {lot.village}</span>
                          </button>
                        </td>

                        {/* Commodity */}
                        <td className="px-4 py-3.5">
                          <div>
                            <span className="text-xs font-semibold text-gray-800 block">{lot.commodity}</span>
                            <span className="text-[10px] text-gray-400">{lot.variety} · {lot.quality_grade}</span>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-bold font-mono text-gray-800">
                            {lot.quantity}
                            <span className="text-[10px] text-gray-400 font-sans ml-0.5">{lot.unit}</span>
                          </span>
                        </td>

                        {/* Current Bid */}
                        <td className="px-4 py-3.5">
                          <div>
                            <span className="text-sm font-black font-mono text-[#16a34a]">₹{lot.current_highest_bid.toLocaleString("en-IN")}</span>
                            <span className="text-[10px] text-gray-400 block">/qtl · {lot.bid_count} bids</span>
                          </div>
                        </td>

                        {/* Lot Value */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-bold font-mono text-gray-700">
                            ₹{(lot.current_highest_bid * lot.quantity).toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* District */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="size-3 text-green-500 shrink-0" />
                            {lot.district}
                          </div>
                        </td>

                        {/* Time Left */}
                        <td className="px-4 py-3.5">
                          <div className={`flex items-center gap-1 text-xs font-mono font-semibold ${
                            lot.status === "LIVE"
                              ? lot.timeLeftSeconds <= 15
                                ? "text-red-500 animate-pulse font-bold"
                                : "text-amber-600"
                              : "text-gray-400"
                          }`}>
                            <Clock className="size-3 shrink-0" />
                            {lot.status === "LIVE" ? formatCountdown(lot.timeLeftSeconds) : "Closed"}
                          </div>
                        </td>

                        {/* Bid Status */}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={lot.my_bid_status === "NONE" ? (lot.status === "CLOSED" ? "CLOSED" : "NONE") : lot.my_bid_status} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {lot.status === "LIVE" ? (
                              <button
                                onClick={() => openBidModal(lot)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-[11px] font-bold transition-colors shadow-sm"
                              >
                                <Gavel className="size-3" />
                                {isEn ? "Bid" : "बोली"}
                              </button>
                            ) : lot.my_bid_status === "WON" ? (
                              <button
                                onClick={() => { setActiveGatePassLot(wonLots[0] || null); setShowGatePassModal(true) }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[11px] font-bold transition-colors"
                              >
                                <QrCode className="size-3" />
                                {isEn ? "Gate Pass" : "गेट पास"}
                              </button>
                            ) : null}
                            <button className="size-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                              <Eye className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Page {currentPage} of {totalPages} · {filteredLots.length} lots
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="size-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`size-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      currentPage === p
                        ? "bg-[#16a34a] text-white shadow-sm"
                        : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="size-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="size-4" />
                </button>
                <select className="ml-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none">
                  <option>5 per page</option>
                  <option>10 per page</option>
                  <option>20 per page</option>
                </select>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* ── BID PLACEMENT MODAL ── */}
      {bidModalLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-[#16a34a] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-green-200 block">LOT #{String(bidModalLot.id).padStart(3, "0")} · {bidModalLot.commodity}</span>
                <h3 className="text-base font-black text-white leading-snug">{bidModalLot.title}</h3>
              </div>
              <button onClick={() => setBidModalLot(null)} className="size-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <span className="text-[10px] text-gray-400 block">Current Lead</span>
                  <span className="text-lg font-black text-[#16a34a] font-mono">₹{bidModalLot.current_highest_bid.toLocaleString("en-IN")}</span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <span className="text-[10px] text-gray-400 block">Quantity</span>
                  <span className="text-lg font-black text-gray-800 font-mono">{bidModalLot.quantity}</span>
                  <span className="text-[10px] text-gray-400">Qtl</span>
                </div>
                <div className="bg-amber-50 rounded-2xl p-3 text-center border border-amber-200">
                  <span className="text-[10px] text-amber-600 block">Time Left</span>
                  <span className="text-base font-black text-amber-700 font-mono">
                    {bidModalLot.status === "LIVE" ? formatCountdown(bidModalLot.timeLeftSeconds) : "Closed"}
                  </span>
                </div>
              </div>

              {/* Bid Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Gavel className="size-3.5 text-green-600" />
                  {isEn ? "Your Bid (₹ per Quintal)" : "आपली बोली (₹ प्रति क्विंटल)"}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-lg font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    min={bidModalLot.current_highest_bid + bidModalLot.min_increment}
                    step={bidModalLot.min_increment}
                    value={bidAmountInput}
                    onChange={(e) => setBidAmountInput(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-xl font-black font-mono text-[#16a34a] focus:outline-none focus:border-green-400 focus:bg-white transition-colors"
                  />
                </div>
                {/* Quick increment */}
                <div className="flex gap-2">
                  {[50, 100, 250, 500].map((inc) => (
                    <button
                      key={inc}
                      onClick={() => setBidAmountInput((p) => p + inc)}
                      className="flex-1 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                    >
                      +{inc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total value */}
              <div className="bg-gray-50 rounded-2xl p-3 flex items-center justify-between text-xs">
                <span className="text-gray-500">{isEn ? "Total Contract Value" : "एकूण करार मूल्य"}</span>
                <span className="font-black text-base font-mono text-gray-900">₹{(bidAmountInput * bidModalLot.quantity).toLocaleString("en-IN")}</span>
              </div>

              {/* Recent bids */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{isEn ? "Recent Bids" : "अलीकडील बोली"}</span>
                {bidModalLot.bids_history.slice(0, 3).map((b, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${
                    b.status === "LEADING" ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-100"
                  }`}>
                    <span className={`font-medium ${b.status === "LEADING" ? "text-green-700" : "text-gray-600"}`}>{b.bidder}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-800">₹{b.amount.toLocaleString("en-IN")}</span>
                      {b.status === "LEADING" && <span className="text-[9px] bg-green-600 text-white font-black px-1.5 py-0.5 rounded-full">LEAD</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setBidModalLot(null)}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {isEn ? "Cancel" : "रद्द करा"}
                </button>
                <button
                  disabled={isPlacingBid || bidAmountInput < bidModalLot.current_highest_bid + bidModalLot.min_increment}
                  onClick={handlePlaceBid}
                  className="flex-1 py-3 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white text-sm font-black flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  {isPlacingBid ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      {isEn ? `Submit Bid (₹${bidAmountInput.toLocaleString("en-IN")})` : `बोली लावा (₹${bidAmountInput.toLocaleString("en-IN")})`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── APMC E-GATE PASS MODAL ── */}
      {showGatePassModal && activeGatePassLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-[#16a34a] overflow-hidden">
            <button onClick={() => setShowGatePassModal(false)} className="absolute top-4 right-4 size-8 rounded-full bg-black/10 flex items-center justify-center text-gray-700 hover:bg-black/20 transition-colors">
              <X className="size-4" />
            </button>
            <div className="bg-[#16a34a] px-6 py-4 text-center">
              <span className="text-[10px] font-black tracking-widest text-green-200 block font-mono">GOVERNMENT OF MAHARASHTRA · APMC</span>
              <h3 className="text-lg font-black text-white">Electronic Gate Pass</h3>
              <span className="text-xs font-mono text-green-200">{activeGatePassLot.gate_pass_no}</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-[10px] text-gray-400 block font-mono">COMMODITY LOT</span>
                  <span className="font-bold text-gray-900 text-sm">{activeGatePassLot.lot_title}</span>
                  <span className="text-xs font-mono font-bold text-green-700 block">{activeGatePassLot.quantity} Quintals</span>
                </div>
                <div className="size-16 border border-gray-200 rounded-xl p-1 bg-white flex items-center justify-center">
                  <QrCode className="size-12 text-gray-800" />
                </div>
              </div>
              <div className="space-y-2 text-xs border-b border-gray-100 pb-4">
                {[
                  ["Seller / Farmer", activeGatePassLot.farmer_name],
                  ["Authorized Buyer", selectedBuyer.company_name],
                  ["Transport Truck", activeGatePassLot.transport_truck_no],
                  ["DBT Settlement", `UTR: ${activeGatePassLot.dbt_utr}`],
                  ["Total Value", `₹${activeGatePassLot.total_value.toLocaleString("en-IN")}`],
                  ["Dispatch Date", activeGatePassLot.dispatch_date],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-400">{k}:</span>
                    <span className="font-semibold text-gray-800">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => window.print()} className="flex-1 py-2.5 rounded-xl bg-[#16a34a] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#15803d] transition-colors">
                  <Download className="size-3.5" />
                  Print Gate Pass
                </button>
                <button onClick={() => setShowGatePassModal(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Farmer Profile & Farm 3D Digital Twin Modal ── */}
      {digitalTwinFarmer && (
        <FarmDigitalTwinModal
          farmer={digitalTwinFarmer}
          onClose={() => setDigitalTwinFarmer(null)}
          lang={lang}
        />
      )}
    </div>
  )
}
