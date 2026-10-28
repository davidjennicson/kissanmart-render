/**
 * Kissanmart Frontend API Client
 * Dynamically connects to the FastAPI backend:
 * - Local Vite dev (port 5173) -> http://localhost:8000/api/v1
 * - Production / Single unified package -> {window.location.origin}/api/v1
 * - Or customized via VITE_API_URL
 */

export const API_BASE =
  (import.meta.env.VITE_API_URL as string) ||
  (typeof window !== "undefined"
    ? window.location.port === "5173"
      ? "http://localhost:8000/api/v1"
      : `${window.location.origin}/api/v1`
    : "http://localhost:8000/api/v1")

// 1. Health check
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

// 2. Auctions API
export async function fetchAuctions(params?: { status?: string; commodity?: string; district?: string }) {
  try {
    const url = new URL(`${API_BASE}/auctions`)
    if (params?.status) url.searchParams.set("status", params.status)
    if (params?.commodity && params.commodity !== "All") url.searchParams.set("commodity_name", params.commodity)
    if (params?.district && params.district !== "All") url.searchParams.set("district", params.district)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(3500) })
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Return null on failure so component can use fallback
  }
  return null
}

export async function fetchAuctionDetail(auctionId: number) {
  try {
    const res = await fetch(`${API_BASE}/auctions/${auctionId}`, { signal: AbortSignal.timeout(3500) })
    if (res.ok) return await res.json()
  } catch {
    // null fallback
  }
  return null
}

export async function placeBid(auctionId: number, buyerId: number, bidAmount: number) {
  try {
    const res = await fetch(`${API_BASE}/auctions/${auctionId}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyer_id: buyerId, bid_amount: bidAmount }),
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) return await res.json()
  } catch {
    // null fallback
  }
  return null
}

// 3. Farms API
export async function fetchFarmerFarms(farmerId: number = 1) {
  try {
    const res = await fetch(`${API_BASE}/farms?farmer_id=${farmerId}`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) return await res.json()
  } catch {
    // null fallback
  }
  return null
}

export async function createFarm(payload: any) {
  try {
    const res = await fetch(`${API_BASE}/farms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) return await res.json()
  } catch {
    // null fallback
  }
  return null
}

export async function segmentFarmMask(lat: number, lng: number, gatNumber?: string) {
  try {
    const res = await fetch(`${API_BASE}/farms/segment-mask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        zoom: 17,
        point_coords: [[128, 128]],
        point_labels: [1],
        gat_number: gatNumber,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) return await res.json()
  } catch {
    // null fallback
  }
  return null
}

export async function fetchFarmSoilReport(farmId: number = 1) {
  try {
    const res = await fetch(`${API_BASE}/farms/${farmId}/soil-report`, { signal: AbortSignal.timeout(3500) })
    if (res.ok) return await res.json()
  } catch {
    // null fallback
  }
  return null
}

// 4. Buyers API
export async function fetchBuyerWonAuctions(buyerId: number = 1) {
  try {
    const res = await fetch(`${API_BASE}/buyers/${buyerId}/won-auctions`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) return await res.json()
  } catch {
    // null fallback
  }
  return null
}

// 5. Gemma AI Voice Call Agent API
export async function queryVoiceAgent(query: string, language: string = "mr", farmerId: number = 1) {
  try {
    const res = await fetch(`${API_BASE}/voice/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, language, farmer_id: farmerId }),
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) return await res.json()
  } catch {
    // null fallback
  }
  return null
}

export async function streamAudioToBackend(audioBlob: Blob, language: string = "mr", queryText?: string) {
  try {
    const formData = new FormData()
    formData.append("audio_file", audioBlob, "farmer_speech.webm")
    formData.append("language", language)
    if (queryText) formData.append("query_text", queryText)

    const res = await fetch(`${API_BASE}/voice/call-stream`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(9000),
    })
    if (res.ok) return await res.json()
  } catch {
    // null fallback
  }
  return null
}

