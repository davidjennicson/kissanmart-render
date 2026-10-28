import React, { useState } from "react"
import {
  Layers,
  Activity,
  Gavel,
  Wallet,
  Mic,
  Maximize2,
  MapPin,
  Globe,
  PlusCircle,
  CheckCircle2,
  Sparkles,
  Building2,
  Smartphone,
} from "lucide-react"

import { WeatherCard } from "@/components/farmer/WeatherCard"
import { Farm3DView } from "@/components/farmer/Farm3DView"
import { MarketPricesBids } from "@/components/farmer/MarketPricesBids"
import { OrdersPayments } from "@/components/farmer/OrdersPayments"
import { VoiceAssistantModal } from "@/components/farmer/VoiceAssistantModal"
import { FarmRegistrationModal } from "@/components/farmer/FarmRegistrationModal"
import { BuyerPortal } from "@/components/buyer/BuyerPortal"

import { useEffect } from "react"
import { checkBackendHealth, fetchFarmerFarms } from "@/lib/api"
import { useRealtimeAuctions } from "@/lib/useRealtimeAuctions"
import { Zap } from "lucide-react"

export function App() {
  const [portalMode, setPortalMode] = useState<"farmer" | "buyer">("farmer")
  const [activeTab, setActiveTab] = useState<"overview" | "field3d" | "bids" | "payments">("overview")
  const [isVoiceOpen, setIsVoiceOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [lang, setLang] = useState<"mr" | "en">("mr")
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null)
  const isEn = lang === "en"

  const { latestNotification } = useRealtimeAuctions()

  // Registered Farm State (Updated upon registration)
  const [registeredFarm, setRegisteredFarm] = useState<{
    farm_name: string
    survey_number: string
    total_area_acres: number
    latitude: number
    longitude: number
    boundary_geojson?: string | null
    overlay_image?: string | null
  }>({
    farm_name: "Gat No. 142 (कापूस शेत)",
    survey_number: "Gat No. 142",
    total_area_acres: 4.5,
    latitude: 20.7002,
    longitude: 77.0082,
    boundary_geojson: null,
    overlay_image: null,
  })

  const [hasJustRegistered, setHasJustRegistered] = useState(false)

  // Probe backend on mount & periodically
  useEffect(() => {
    const probe = async () => {
      const online = await checkBackendHealth()
      setIsBackendOnline(online)
      if (online) {
        const farms = await fetchFarmerFarms(1)
        if (farms && farms.length > 0) {
          const f = farms[0]
          setRegisteredFarm((prev) => ({
            ...prev,
            farm_name: f.farm_name,
            survey_number: f.survey_number || prev.survey_number,
            total_area_acres: f.total_area_acres,
            latitude: f.latitude || prev.latitude,
            longitude: f.longitude || prev.longitude,
            boundary_geojson: f.boundary_geojson || prev.boundary_geojson,
          }))
        }
      }
    }
    probe()
    const timer = setInterval(probe, 8000)
    return () => clearInterval(timer)
  }, [])

  const handleFarmRegistered = (newFarm: any) => {
    setRegisteredFarm({
      farm_name: newFarm.farm_name,
      survey_number: newFarm.survey_number,
      total_area_acres: newFarm.total_area_acres,
      latitude: newFarm.latitude,
      longitude: newFarm.longitude,
      boundary_geojson: newFarm.boundary_geojson,
      overlay_image: newFarm.overlay_image,
    })
    setHasJustRegistered(true)
    setActiveTab("field3d")
    setTimeout(() => setHasJustRegistered(false), 5000)
  }

  // If in Buyer Portal mode, render full enterprise desktop portal
  if (portalMode === "buyer") {
    return (
      <BuyerPortal
        onSwitchToFarmer={() => setPortalMode("farmer")}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === "en" ? "mr" : "en"))}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0e130f] py-2 px-2 sm:py-6 flex flex-col items-center justify-center font-sans antialiased text-foreground">
      
      {/* Top Portal Switcher Bar */}
      <div className="mb-3 flex items-center gap-2 bg-black/60 p-1 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg z-50">
        <button
          onClick={() => setPortalMode("farmer")}
          className="px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all bg-[#ccff00] text-black shadow-xs"
        >
          <Smartphone className="size-3.5" />
          <span>{isEn ? "Farmer Mobile App" : "बळीराजा शेतकरी ॲप"}</span>
        </button>

        <button
          onClick={() => setPortalMode("buyer")}
          className="px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all text-white/70 hover:text-white"
        >
          <Building2 className="size-3.5" />
          <span>{isEn ? "Buyer Wholesale Portal" : "व्यापारी लिलाव पोर्टल"}</span>
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        {/* Live Backend Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-white/5 text-[10px] font-mono">
          <span className={`size-2 rounded-full ${isBackendOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span className={isBackendOnline ? "text-emerald-300 font-bold" : "text-amber-300/80"}>
            {isBackendOnline ? "API: 8000 Live" : "API: Offline (Demo Mode)"}
          </span>
        </div>
      </div>

      {/* Realtime APMC Bot & Speed-Run Live Ticker Banner */}
      {latestNotification && (
        <div className="mb-2.5 max-w-[390px] w-full px-3 py-1.5 rounded-xl bg-black/80 border border-[#ccff00]/40 backdrop-blur-md text-[11px] font-semibold text-[#ccff00] flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 truncate">
            <Zap className="size-3.5 text-[#ccff00] shrink-0 animate-pulse" />
            <span className="truncate">{latestNotification}</span>
          </div>
          <span className="text-[9px] font-mono uppercase bg-[#ccff00]/20 text-[#ccff00] px-1.5 py-0.2 rounded shrink-0 ml-1">
            APMC
          </span>
        </div>
      )}

      {/* Smartphone Frame */}
      <div className="w-full max-w-[390px] h-[740px] max-h-[94vh] bg-[#f5f7f4] dark:bg-[#121c14] rounded-[42px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] border-[6px] border-[#223326] relative overflow-hidden flex flex-col justify-between select-none">
        
        {/* Status Bar */}
        <div className="pt-2.5 px-5 pb-1 flex items-center justify-between text-[11px] font-semibold text-foreground z-30 shrink-0">
          <span>9:41</span>
          <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center gap-1 shadow-inner">
            <span className="size-1.5 rounded-full bg-[#ccff00] animate-pulse" />
            <span className="text-[9px] text-white/90 font-mono tracking-wider">KISAN</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono">4G</span>
            <div className="w-4 h-2 border border-foreground rounded-2xs p-0.5 flex items-center">
              <div className="h-full w-2/3 bg-foreground rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Clean Farmer Header */}
        <div className="px-4 py-2 border-b border-border/50 bg-white/70 dark:bg-white/5 backdrop-blur-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[#1b3b22] text-[#ccff00] flex items-center justify-center font-black text-sm">
              KM
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block leading-tight">
                {isEn ? "Tukaram Shinde" : "तुकाराम शिंदे"}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MapPin className="size-2.5 text-emerald-600 dark:text-[#ccff00]" />
                {isEn ? "Nimbhora, Akola" : "निंभोरा, अकोला"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Farm Registration Trigger Button */}
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="px-2 py-1 rounded-full bg-[#ccff00] text-black text-[10px] font-extrabold flex items-center gap-1 hover:bg-[#b8e600] transition-transform active:scale-95 shadow-xs"
              title="Aadhaar &amp; ONNX Farm Registration"
            >
              <PlusCircle className="size-3" />
              <span>{isEn ? "Register Farm" : "शेत नोंदणी"}</span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={() => setLang((l) => (l === "mr" ? "en" : "mr"))}
              className="px-2 py-1 rounded-full bg-secondary text-[10px] font-bold text-foreground border border-border flex items-center gap-0.5 hover:bg-black/10 transition-colors"
            >
              <Globe className="size-3 text-muted-foreground" />
              <span>{isEn ? "EN" : "मराठी"}</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner on Registration */}
        {hasJustRegistered && (
          <div className="mx-3 mt-2 p-2.5 rounded-xl bg-emerald-500/20 border border-[#ccff00] text-foreground text-xs flex items-center gap-2 animate-in slide-in-from-top duration-300">
            <CheckCircle2 className="size-4 text-[#ccff00] shrink-0" />
            <span className="font-semibold text-[11px]">
              {isEn
                ? "Farm registered successfully! View boundary in the satellite map below."
                : "शेत यशस्वीरित्या नोंदणीकृत झाले! खाली उपग्रह नकाशात सीमा पहा."}
            </span>
          </div>
        )}

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 space-y-3">
          
          {/* TAB 1: MAIN DASHBOARD */}
          {activeTab === "overview" && (
            <>
              {/* 1. Weather & Rainfall */}
              <WeatherCard
                location={isEn ? "Nimbhora, Akola" : "निंभोरा, अकोला"}
                temp={29}
                rainfall="18 mm"
                humidity="74%"
                windSpeed="12 km/h"
                lang={lang}
              />

              {/* 2. Registered Farm Map Glance (Tapping switches directly to Esri Leaflet Satellite Map) */}
              <div
                onClick={() => setActiveTab("field3d")}
                className="w-full rounded-2xl bg-gradient-to-r from-[#152e1a] to-[#0e1d11] text-white p-3 border border-emerald-500/30 shadow-xs cursor-pointer hover:border-[#ccff00] transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-xl bg-[#ccff00]/20 flex items-center justify-center text-[#ccff00]">
                    <Activity className="size-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isEn
                        ? `Registered Farm: ${registeredFarm.survey_number}`
                        : `नोंदणीकृत शेत: ${registeredFarm.survey_number}`}
                    </span>
                    <span className="text-[10px] text-emerald-300 font-mono">
                      {registeredFarm.total_area_acres} {isEn ? "Acres • Esri Satellite Map" : "एकर • Esri उपग्रह नकाशा"}
                    </span>
                  </div>
                </div>
                <div className="size-7 rounded-full bg-white/10 flex items-center justify-center text-[#ccff00]">
                  <Maximize2 className="size-3.5" />
                </div>
              </div>

              {/* 3. Today's Prices & Current Bids */}
              <MarketPricesBids lang={lang} />

              {/* 4. Orders and Bank Payouts */}
              <OrdersPayments lang={lang} />
            </>
          )}

          {/* TAB 2: REGISTERED FARM IN LEAFLET ESRI SATELLITE MAP */}
          {activeTab === "field3d" && (
            <Farm3DView
              onBack={() => setActiveTab("overview")}
              registeredFarm={registeredFarm}
              lang={lang}
            />
          )}

          {/* TAB 3: BIDS TAB */}
          {activeTab === "bids" && (
            <div className="space-y-3">
              <MarketPricesBids lang={lang} />
            </div>
          )}

          {/* TAB 4: PAYMENTS TAB */}
          {activeTab === "payments" && (
            <div className="space-y-3">
              <OrdersPayments lang={lang} />
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION BAR WITH CENTER VOICE ASSISTANT */}
        <div className="bg-white/95 dark:bg-[#121c14]/95 backdrop-blur-md border-t border-black/5 dark:border-white/10 px-4 py-2 flex items-center justify-between z-40 shrink-0">
          
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === "overview" ? "text-emerald-700 dark:text-[#ccff00]" : "text-muted-foreground"
            }`}
          >
            <Layers className="size-5" />
            <span className="text-[10px] font-bold">
              {isEn ? "Home" : "मुख्य"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("field3d")}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === "field3d" ? "text-emerald-700 dark:text-[#ccff00]" : "text-muted-foreground"
            }`}
          >
            <Activity className="size-5" />
            <span className="text-[10px] font-bold">
              {isEn ? "Farm Map" : "शेत नकाशा"}
            </span>
          </button>

          {/* CENTER VOICE BUTTON */}
          <div className="relative -top-4 flex flex-col items-center">
            <div className="absolute size-12 rounded-full bg-[#ccff00]/40 animate-ping pointer-events-none" />
            <button
              onClick={() => setIsVoiceOpen(true)}
              className="relative size-12 rounded-full bg-[#ccff00] text-black flex items-center justify-center shadow-[0_0_16px_rgba(204,255,0,0.7)] border-3 border-[#0e130f] hover:scale-105 active:scale-95 transition-transform"
              title={isEn ? "Voice Assistant" : "बोलून विचारा"}
            >
              <Mic className="size-6" />
            </button>
            <span className="text-[9px] font-extrabold text-[#ccff00] mt-0.5 font-mono">
              {isEn ? "VOICE" : "बोला"}
            </span>
          </div>

          <button
            onClick={() => setActiveTab("bids")}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === "bids" ? "text-emerald-700 dark:text-[#ccff00]" : "text-muted-foreground"
            }`}
          >
            <Gavel className="size-5" />
            <span className="text-[10px] font-bold">
              {isEn ? "Bids" : "लिलाव"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === "payments" ? "text-emerald-700 dark:text-[#ccff00]" : "text-muted-foreground"
            }`}
          >
            <Wallet className="size-5" />
            <span className="text-[10px] font-bold">
              {isEn ? "Payments" : "पैसे"}
            </span>
          </button>
        </div>

        {/* Home Indicator Bar */}
        <div className="w-24 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto my-1 shrink-0 pointer-events-none" />
      </div>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        defaultLang={lang}
      />

      {/* Farm Registration Wizard Modal */}
      <FarmRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onFarmRegistered={handleFarmRegistered}
        lang={lang}
      />
    </div>
  )
}

export default App
