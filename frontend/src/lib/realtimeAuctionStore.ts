/**
 * KissanMart Realtime Auction & APMC Bot Simulation Store
 *
 * Provides synchronized realtime state between:
 * - Farmer Mobile App (MarketPricesBids, OrdersPayments)
 * - Buyer Wholesale Portal (Auctions, Bidding Desk, Gate Pass)
 *
 * Features:
 * 1. 1-Minute Speed Run Timer (60 seconds countdown with live recycling).
 * 2. Automated APMC Bots with Dynamic Pricing and aggressive bidding war under 20s.
 * 3. Instant outbid alerts & sound/visual flash notifications.
 * 4. Cross-tab synchronization via BroadcastChannel & localStorage.
 * 5. Background sync with backend API (POST /api/v1/auctions/{id}/bids) when online.
 */

import { placeBid } from "./api"

export interface BidRecord {
  bidder: string
  amount: number
  time: string
  status: "LEADING" | "OUTBID"
  isUser?: boolean
}

export interface RealtimeAuctionLot {
  id: number
  farmer_id: number
  farmer_name: string
  phone: string
  title: string
  commodity: string
  variety: string
  quantity: number
  unit: string
  quality_grade: string
  moisture: string
  base_price: number
  current_highest_bid: number
  highest_bidder_name: string
  highest_bidder_id: number
  min_increment: number
  status: "LIVE" | "CLOSED" | "WON"
  timeLeftSeconds: number
  totalDurationSeconds: number
  district: string
  taluka: string
  village: string
  gat_no: string
  farm_area_acres: number
  soil_ph: number
  soil_ph_status: string
  nitrogen: string
  potash: string
  soil_type: string
  my_bid_status: "LEADING" | "OUTBID" | "NONE" | "WON"
  bid_count: number
  date: string
  bids_history: BidRecord[]
  last_increment?: number
  last_updated_at: number
}

export interface SettledOrder {
  id: number
  lot_id: number
  lot_title: string
  farmer_name: string
  buyer_name: string
  phone: string
  pickup_address: string
  quantity: number
  final_price_per_qtl: number
  total_value: number
  apmc_mandi_cess: number
  settlement_status: "PAID_ESCROW" | "DBT_SETTLED"
  gate_pass_no: string
  dispatch_date: string
  transport_truck_no: string
  driver_name: string
  dbt_utr: string
  settled_at: string
}

// Bot Roster with authentic Maharashtra APMC Licensed identities
export const APMC_BOTS = [
  { id: 2, name: "Vidarbha Cotton Mills Pvt Ltd", district: "Akola", aggressiveness: 0.9 },
  { id: 3, name: "Marathwada Solvents & Oilseeds", district: "Latur", aggressiveness: 0.8 },
  { id: 4, name: "Mumbai APMC Commission & Export Co.", district: "Mumbai", aggressiveness: 0.85 },
  { id: 5, name: "Nagpur Agro Processing Hub", district: "Nagpur", aggressiveness: 0.75 },
  { id: 6, name: "Jalna Dal Millers Association", district: "Jalna", aggressiveness: 0.7 },
  { id: 7, name: "Pawan Agro Commodity Traders", district: "Nashik", aggressiveness: 0.8 },
]

const SPEED_RUN_DURATION = 60 // 1 Minute speed-run

const INITIAL_LOTS: RealtimeAuctionLot[] = [
  {
    id: 1,
    farmer_id: 1,
    farmer_name: "तुकाराम पांडुरंग शिंदे (Tukaram Shinde)",
    phone: "+91 98765 43210",
    title: "Prime Shankar-6 Bt Cotton Lot (४.५ एकर)",
    commodity: "Bt Cotton",
    variety: "Shankar-6",
    quantity: 100,
    unit: "Qtl",
    quality_grade: "Grade A (FAQ+)",
    moisture: "8.5%",
    base_price: 7000,
    current_highest_bid: 7300,
    highest_bidder_name: "Vidarbha Cotton Mills Pvt Ltd",
    highest_bidder_id: 2,
    min_increment: 50,
    status: "LIVE",
    timeLeftSeconds: SPEED_RUN_DURATION,
    totalDurationSeconds: SPEED_RUN_DURATION,
    district: "Akola",
    taluka: "Akola",
    village: "Nimbhora",
    gat_no: "Gat No. 142",
    farm_area_acres: 4.5,
    soil_ph: 7.4,
    soil_ph_status: "Neutral (Ideal)",
    nitrogen: "Low (185 kg/ha)",
    potash: "High (340 kg/ha)",
    soil_type: "Black Cotton Soil (Regur)",
    my_bid_status: "OUTBID",
    bid_count: 5,
    date: "29/10/26 · 10:15 am",
    last_increment: 50,
    last_updated_at: Date.now(),
    bids_history: [
      { bidder: "Vidarbha Cotton Mills Pvt Ltd", amount: 7300, time: "Just now", status: "LEADING" },
      { bidder: "Akola Cotton Ginning (You)", amount: 7250, time: "15s ago", status: "OUTBID", isUser: true },
      { bidder: "Mumbai APMC Commission & Export Co.", amount: 7150, time: "30s ago", status: "OUTBID" },
      { bidder: "Maharashtra Agro Traders", amount: 7100, time: "45s ago", status: "OUTBID" },
      { bidder: "Kisan Commercial Corp", amount: 7000, time: "55s ago", status: "OUTBID" },
    ],
  },
  {
    id: 2,
    farmer_id: 2,
    farmer_name: "गणेश विठ्ठलराव देशमुख (Ganesh Deshmukh)",
    phone: "+91 98221 44556",
    title: "Certified Organic JS-335 Yellow Soybean",
    commodity: "Soybean",
    variety: "JS-335",
    quantity: 75,
    unit: "Qtl",
    quality_grade: "Grade A",
    moisture: "9.2%",
    base_price: 4600,
    current_highest_bid: 4850,
    highest_bidder_name: "Akola Cotton Ginning (You)",
    highest_bidder_id: 1,
    min_increment: 50,
    status: "LIVE",
    timeLeftSeconds: Math.floor(SPEED_RUN_DURATION * 0.8),
    totalDurationSeconds: SPEED_RUN_DURATION,
    district: "Latur",
    taluka: "Latur",
    village: "Ausa",
    gat_no: "Gat No. 89",
    farm_area_acres: 6.0,
    soil_ph: 7.1,
    soil_ph_status: "Neutral",
    nitrogen: "Medium",
    potash: "Medium",
    soil_type: "Medium Black Soil",
    my_bid_status: "LEADING",
    bid_count: 6,
    date: "29/10/26 · 09:30 am",
    last_increment: 50,
    last_updated_at: Date.now(),
    bids_history: [
      { bidder: "Akola Cotton Ginning (You)", amount: 4850, time: "Just now", status: "LEADING", isUser: true },
      { bidder: "Marathwada Solvents & Oilseeds", amount: 4800, time: "12s ago", status: "OUTBID" },
      { bidder: "Nagpur Agro Processing Hub", amount: 4700, time: "30s ago", status: "OUTBID" },
    ],
  },
  {
    id: 3,
    farmer_id: 3,
    farmer_name: "संजय भाऊराव पाटील (Sanjay Patil)",
    phone: "+91 94220 77889",
    title: "Lasalgaon Grade-1 Summer Red Onion",
    commodity: "Red Onion",
    variety: "Garwa Summer",
    quantity: 150,
    unit: "Qtl",
    quality_grade: "Grade 1 (55mm+)",
    moisture: "Dry Skin",
    base_price: 2200,
    current_highest_bid: 2450,
    highest_bidder_name: "Mumbai APMC Commission & Export Co.",
    highest_bidder_id: 4,
    min_increment: 25,
    status: "LIVE",
    timeLeftSeconds: Math.floor(SPEED_RUN_DURATION * 0.5),
    totalDurationSeconds: SPEED_RUN_DURATION,
    district: "Nashik",
    taluka: "Niphad",
    village: "Lasalgaon",
    gat_no: "Gat No. 214",
    farm_area_acres: 3.8,
    soil_ph: 6.9,
    soil_ph_status: "Slightly Acidic",
    nitrogen: "Medium",
    potash: "High",
    soil_type: "Alluvial Loam",
    my_bid_status: "NONE",
    bid_count: 8,
    date: "29/10/26 · 08:45 am",
    last_increment: 25,
    last_updated_at: Date.now(),
    bids_history: [
      { bidder: "Mumbai APMC Commission & Export Co.", amount: 2450, time: "Just now", status: "LEADING" },
      { bidder: "Pawan Agro Commodity Traders", amount: 2400, time: "14s ago", status: "OUTBID" },
    ],
  },
  {
    id: 4,
    farmer_id: 4,
    farmer_name: "एकनाथ बाबुराव कदम (Eknath Kadam)",
    phone: "+91 94211 33221",
    title: "Marathwada Prime BDN-711 White Tur Dal",
    commodity: "Tur (Pigeon Pea)",
    variety: "BDN-711",
    quantity: 60,
    unit: "Qtl",
    quality_grade: "FAQ Bold",
    moisture: "9.0%",
    base_price: 9200,
    current_highest_bid: 9650,
    highest_bidder_name: "Jalna Dal Millers Association",
    highest_bidder_id: 6,
    min_increment: 50,
    status: "LIVE",
    timeLeftSeconds: Math.floor(SPEED_RUN_DURATION * 0.9),
    totalDurationSeconds: SPEED_RUN_DURATION,
    district: "Jalna",
    taluka: "Ambad",
    village: "Sashtpippalgaon",
    gat_no: "Gat No. 51",
    farm_area_acres: 5.2,
    soil_ph: 7.3,
    soil_ph_status: "Neutral",
    nitrogen: "Low",
    potash: "Medium",
    soil_type: "Black Soil",
    my_bid_status: "NONE",
    bid_count: 5,
    date: "29/10/26 · 04:27 pm",
    last_increment: 50,
    last_updated_at: Date.now(),
    bids_history: [
      { bidder: "Jalna Dal Millers Association", amount: 9650, time: "Just now", status: "LEADING" },
    ],
  },
]

const INITIAL_SETTLED_ORDERS: SettledOrder[] = [
  {
    id: 101,
    lot_id: 5,
    lot_title: "50 Qtl Premium Soybean – MAUS-71",
    farmer_name: "बाबुराव नारायण शिंदे (Baburao Shinde)",
    buyer_name: "Akola Cotton Ginning & Pressing Pvt Ltd",
    phone: "+91 94228 11223",
    pickup_address: "Gat No. 78, Nimbhora, Akola",
    quantity: 50,
    final_price_per_qtl: 4800,
    total_value: 240000,
    apmc_mandi_cess: 2400,
    settlement_status: "DBT_SETTLED",
    gate_pass_no: "MH-AKL-GP-2026-9812",
    dispatch_date: "28 Oct 2026",
    transport_truck_no: "MH-30-BD-4412",
    driver_name: "Kishor Wankhade",
    dbt_utr: "SBIN9841029412",
    settled_at: "28 Oct 2026, 04:30 PM",
  },
]

type Listener = () => void

class RealtimeAuctionStore {
  private lots: RealtimeAuctionLot[] = INITIAL_LOTS
  private settledOrders: SettledOrder[] = INITIAL_SETTLED_ORDERS
  private listeners: Set<Listener> = new Set()
  private timerInterval: any = null
  private botInterval: any = null
  private channel: BroadcastChannel | null = null
  public isBotsActive: boolean = true
  public isSpeedRunActive: boolean = true
  public speedRunSeconds: number = SPEED_RUN_DURATION
  public latestEventNotification: string | null = null

  constructor() {
    // Try to load persisted state if available
    try {
      const savedLots = localStorage.getItem("kissanmart_realtime_lots")
      if (savedLots) {
        this.lots = JSON.parse(savedLots)
      }
      const savedOrders = localStorage.getItem("kissanmart_settled_orders")
      if (savedOrders) {
        this.settledOrders = JSON.parse(savedOrders)
      }
    } catch {
      // ignore
    }

    // Cross-tab broadcast channel
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        this.channel = new BroadcastChannel("kissanmart_auction_stream")
        this.channel.onmessage = (event) => {
          if (event.data?.type === "UPDATE_LOTS") {
            this.lots = event.data.lots
            this.settledOrders = event.data.settledOrders || this.settledOrders
            this.notify()
          }
        }
      }
    } catch {
      // ignore
    }

    this.startEngines()
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((l) => l())
    try {
      localStorage.setItem("kissanmart_realtime_lots", JSON.stringify(this.lots))
      localStorage.setItem("kissanmart_settled_orders", JSON.stringify(this.settledOrders))
      this.channel?.postMessage({
        type: "UPDATE_LOTS",
        lots: this.lots,
        settledOrders: this.settledOrders,
      })
    } catch {
      // ignore
    }
  }

  public getLots(): RealtimeAuctionLot[] {
    return this.lots
  }

  public getLot(id: number): RealtimeAuctionLot | undefined {
    return this.lots.find((l) => l.id === id)
  }

  public getSettledOrders(): SettledOrder[] {
    return this.settledOrders
  }

  public toggleBots(active?: boolean) {
    this.isBotsActive = active !== undefined ? active : !this.isBotsActive
    this.notify()
  }

  public toggleSpeedRun(active?: boolean) {
    this.isSpeedRunActive = active !== undefined ? active : !this.isSpeedRunActive
    this.notify()
  }

  /**
   * Reset the 1-Minute Speed Run clock for all lots or restart fresh
   */
  public resetSpeedRun(seconds: number = SPEED_RUN_DURATION) {
    this.speedRunSeconds = seconds
    this.lots = this.lots.map((lot) => ({
      ...lot,
      status: "LIVE",
      timeLeftSeconds: seconds,
      totalDurationSeconds: seconds,
    }))
    this.latestEventNotification = `⚡ 1-Minute Speed Run Reset! Live clock started (${seconds}s).`
    this.notify()
  }

  /**
   * User places a live bid (from Buyer portal)
   */
  public userPlaceBid(lotId: number, bidAmount: number, buyerCompanyName: string = "Akola Cotton Ginning (You)") {
    const lot = this.lots.find((l) => l.id === lotId)
    if (!lot || lot.status !== "LIVE") return false

    const minRequired = lot.current_highest_bid + lot.min_increment
    if (bidAmount < minRequired) return false

    const increment = bidAmount - lot.current_highest_bid

    const newHistory: BidRecord[] = [
      {
        bidder: buyerCompanyName,
        amount: bidAmount,
        time: "Just now",
        status: "LEADING",
        isUser: true,
      },
      ...lot.bids_history.map((b) => ({ ...b, status: "OUTBID" as const })),
    ]

    this.lots = this.lots.map((l) => {
      if (l.id === lotId) {
        return {
          ...l,
          current_highest_bid: bidAmount,
          highest_bidder_name: buyerCompanyName,
          highest_bidder_id: 1,
          my_bid_status: "LEADING",
          bid_count: l.bid_count + 1,
          bids_history: newHistory,
          last_increment: increment,
          last_updated_at: Date.now(),
        }
      }
      return l
    })

    this.latestEventNotification = `🎯 You placed ₹${bidAmount.toLocaleString("en-IN")}/qtl on ${lot.commodity}! You are now LEADING.`
    this.notify()

    // Post to backend database asynchronously
    placeBid(lotId, 1, bidAmount).catch(() => null)
    return true
  }

  /**
   * Bot places a dynamic bid
   */
  public triggerBotBid(specificLotId?: number) {
    if (!this.isBotsActive) return

    // Pick candidate live lots
    const liveLots = this.lots.filter((l) => l.status === "LIVE" && l.timeLeftSeconds > 1)
    if (liveLots.length === 0) return

    const targetLot = specificLotId
      ? liveLots.find((l) => l.id === specificLotId) || liveLots[0]
      : liveLots[Math.floor(Math.random() * liveLots.length)]

    // Pick random bot excluding current highest bidder
    const availableBots = APMC_BOTS.filter((b) => b.name !== targetLot.highest_bidder_name)
    const bot = availableBots[Math.floor(Math.random() * availableBots.length)] || APMC_BOTS[0]

    // Dynamic pricing calculation
    // Under 20s remaining, bots bid higher increments with intense urgency
    const isUnderPressure = targetLot.timeLeftSeconds <= 20
    const stepMultiplier = isUnderPressure ? (Math.random() > 0.4 ? 2 : 3) : 1
    const increment = targetLot.min_increment * stepMultiplier
    const newBidAmount = targetLot.current_highest_bid + increment

    const wasUserLeading = targetLot.my_bid_status === "LEADING"

    const newHistory: BidRecord[] = [
      {
        bidder: bot.name,
        amount: newBidAmount,
        time: "Just now",
        status: "LEADING",
        isUser: false,
      },
      ...targetLot.bids_history.map((b) => ({ ...b, status: "OUTBID" as const })),
    ]

    this.lots = this.lots.map((l) => {
      if (l.id === targetLot.id) {
        return {
          ...l,
          current_highest_bid: newBidAmount,
          highest_bidder_name: bot.name,
          highest_bidder_id: bot.id,
          my_bid_status: wasUserLeading ? "OUTBID" : l.my_bid_status,
          bid_count: l.bid_count + 1,
          bids_history: newHistory,
          last_increment: increment,
          last_updated_at: Date.now(),
        }
      }
      return l
    })

    if (wasUserLeading) {
      this.latestEventNotification = `⚠️ OUTBID ALERT! ${bot.name} outbid you with ₹${newBidAmount.toLocaleString("en-IN")}/qtl on ${targetLot.commodity}!`
    } else {
      this.latestEventNotification = `⚡ ${bot.name} placed bid ₹${newBidAmount.toLocaleString("en-IN")}/qtl on ${targetLot.commodity}`
    }

    this.notify()

    // Sync with backend database in background
    placeBid(targetLot.id, bot.id, newBidAmount).catch(() => null)
  }

  /**
   * Farmer accepts the current highest offer immediately
   */
  public farmerAcceptOffer(lotId: number = 1): SettledOrder | null {
    const lot = this.lots.find((l) => l.id === lotId)
    if (!lot) return null

    const totalValue = lot.current_highest_bid * lot.quantity
    const cess = Math.round(totalValue * 0.01)
    const utr = `SBIN${Math.floor(1000000000 + Math.random() * 9000000000)}`
    const passNo = `MH-AKL-GP-2026-${Math.floor(1000 + Math.random() * 9000)}`

    const settledOrder: SettledOrder = {
      id: 200 + lot.id,
      lot_id: lot.id,
      lot_title: lot.title,
      farmer_name: lot.farmer_name,
      buyer_name: lot.highest_bidder_name,
      phone: lot.phone,
      pickup_address: `${lot.gat_no}, ${lot.village}, ${lot.district}`,
      quantity: lot.quantity,
      final_price_per_qtl: lot.current_highest_bid,
      total_value: totalValue,
      apmc_mandi_cess: cess,
      settlement_status: "DBT_SETTLED",
      gate_pass_no: passNo,
      dispatch_date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      transport_truck_no: `MH-${lot.district === "Akola" ? "30" : "12"}-AZ-${Math.floor(1000 + Math.random() * 9000)}`,
      driver_name: "Santosh Gawande",
      dbt_utr: utr,
      settled_at: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    }

    this.settledOrders = [settledOrder, ...this.settledOrders]

    // Mark lot closed/won
    this.lots = this.lots.map((l) => {
      if (l.id === lotId) {
        return {
          ...l,
          status: l.highest_bidder_id === 1 ? "WON" : "CLOSED",
          timeLeftSeconds: 0,
          my_bid_status: l.highest_bidder_id === 1 ? "WON" : l.my_bid_status,
        }
      }
      return l
    })

    this.latestEventNotification = `🎉 Lot #${lot.id} accepted! ₹${totalValue.toLocaleString("en-IN")} DBT Transfer initiated to farmer's account.`
    this.notify()
    return settledOrder
  }

  /**
   * Finalize a lot when the countdown timer hits 0
   */
  private finalizeLot(lot: RealtimeAuctionLot) {
    const isUserWinner = lot.highest_bidder_id === 1 || lot.highest_bidder_name.includes("(You)")
    const totalValue = lot.current_highest_bid * lot.quantity
    const cess = Math.round(totalValue * 0.01)
    const utr = `SBIN${Math.floor(1000000000 + Math.random() * 9000000000)}`
    const passNo = `MH-AKL-GP-2026-${Math.floor(1000 + Math.random() * 9000)}`

    const settledOrder: SettledOrder = {
      id: 300 + lot.id,
      lot_id: lot.id,
      lot_title: lot.title,
      farmer_name: lot.farmer_name,
      buyer_name: lot.highest_bidder_name,
      phone: lot.phone,
      pickup_address: `${lot.gat_no}, ${lot.village}, ${lot.district}`,
      quantity: lot.quantity,
      final_price_per_qtl: lot.current_highest_bid,
      total_value: totalValue,
      apmc_mandi_cess: cess,
      settlement_status: "DBT_SETTLED",
      gate_pass_no: passNo,
      dispatch_date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      transport_truck_no: `MH-${lot.district === "Akola" ? "30" : "14"}-CD-${Math.floor(1000 + Math.random() * 9000)}`,
      driver_name: "Gajanan Patil",
      dbt_utr: utr,
      settled_at: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    }

    this.settledOrders = [settledOrder, ...this.settledOrders]

    this.lots = this.lots.map((l) => {
      if (l.id === lot.id) {
        return {
          ...l,
          status: isUserWinner ? "WON" : "CLOSED",
          timeLeftSeconds: 0,
          my_bid_status: isUserWinner ? "WON" : l.my_bid_status,
        }
      }
      return l
    })

    if (isUserWinner) {
      this.latestEventNotification = `🏆 CONGRATULATIONS! You WON Lot #${lot.id} (${lot.commodity}) at ₹${lot.current_highest_bid.toLocaleString("en-IN")}/qtl! Electronic Gate Pass generated.`
    } else {
      this.latestEventNotification = `⏱️ Auction Closed for Lot #${lot.id}. Winner: ${lot.highest_bidder_name} at ₹${lot.current_highest_bid.toLocaleString("en-IN")}/qtl.`
    }

    this.notify()
  }

  /**
   * Start 1-second countdown clock and dynamic bot interval
   */
  private startEngines() {
    if (typeof window === "undefined") return

    // 1. One-second countdown timer for speed-run
    if (!this.timerInterval) {
      this.timerInterval = setInterval(() => {
        if (!this.isSpeedRunActive) return

        let anyChanged = false
        const updated = this.lots.map((lot) => {
          if (lot.status === "LIVE" && lot.timeLeftSeconds > 0) {
            anyChanged = true
            const nextSec = lot.timeLeftSeconds - 1
            if (nextSec === 0) {
              // Finalize this lot
              setTimeout(() => this.finalizeLot(lot), 0)
              return { ...lot, timeLeftSeconds: 0 }
            }
            return { ...lot, timeLeftSeconds: nextSec }
          }
          return lot
        })

        if (anyChanged) {
          this.lots = updated
          this.notify()
        }
      }, 1000)
    }

    // 2. APMC dynamic trading bot loop
    if (!this.botInterval) {
      const scheduleNextBotBid = () => {
        // Fast dynamic intervals: between 3s and 6s
        // If an auction is under 15s, bid every 2s for adrenaline!
        const hasUrgentLot = this.lots.some((l) => l.status === "LIVE" && l.timeLeftSeconds <= 15 && l.timeLeftSeconds > 1)
        const delay = hasUrgentLot
          ? Math.floor(1800 + Math.random() * 1500)
          : Math.floor(3500 + Math.random() * 3000)

        this.botInterval = setTimeout(() => {
          if (this.isBotsActive) {
            this.triggerBotBid()
          }
          scheduleNextBotBid()
        }, delay)
      }

      scheduleNextBotBid()
    }
  }
}

// Global Singleton Instance
export const auctionStore = new RealtimeAuctionStore()

