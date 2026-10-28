import { useState, useEffect } from "react"
import { auctionStore } from "./realtimeAuctionStore"
import type { RealtimeAuctionLot, SettledOrder } from "./realtimeAuctionStore"

export function useRealtimeAuctions() {
  const [lots, setLots] = useState<RealtimeAuctionLot[]>(auctionStore.getLots())
  const [settledOrders, setSettledOrders] = useState<SettledOrder[]>(auctionStore.getSettledOrders())
  const [isBotsActive, setIsBotsActive] = useState<boolean>(auctionStore.isBotsActive)
  const [isSpeedRunActive, setIsSpeedRunActive] = useState<boolean>(auctionStore.isSpeedRunActive)
  const [latestNotification, setLatestNotification] = useState<string | null>(auctionStore.latestEventNotification)

  useEffect(() => {
    const unsubscribe = auctionStore.subscribe(() => {
      setLots([...auctionStore.getLots()])
      setSettledOrders([...auctionStore.getSettledOrders()])
      setIsBotsActive(auctionStore.isBotsActive)
      setIsSpeedRunActive(auctionStore.isSpeedRunActive)
      setLatestNotification(auctionStore.latestEventNotification)
    })
    return unsubscribe
  }, [])

  return {
    lots,
    settledOrders,
    isBotsActive,
    isSpeedRunActive,
    latestNotification,
    setLatestNotification,
    userPlaceBid: (lotId: number, amount: number, companyName?: string) =>
      auctionStore.userPlaceBid(lotId, amount, companyName),
    triggerBotBid: (lotId?: number) => auctionStore.triggerBotBid(lotId),
    farmerAcceptOffer: (lotId?: number) => auctionStore.farmerAcceptOffer(lotId),
    resetSpeedRun: (seconds?: number) => auctionStore.resetSpeedRun(seconds),
    toggleBots: (active?: boolean) => auctionStore.toggleBots(active),
    toggleSpeedRun: (active?: boolean) => auctionStore.toggleSpeedRun(active),
  }
}
