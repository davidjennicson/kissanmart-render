import React, { useState } from "react"
import {
  Sun,
  Droplets,
  Plus,
  Minus,
  LocateFixed,
  Maximize2,
  Sparkles,
  ArrowLeft,
  Layers,
  MapPin,
  CheckCircle2,
} from "lucide-react"
import { EsriFarmMap } from "@/components/farmer/EsriFarmMap"

interface Farm3DViewProps {
  onBack?: () => void
  lang?: "mr" | "en"
  registeredFarm?: {
    farm_name: string
    survey_number: string
    total_area_acres: number
    latitude: number
    longitude: number
    boundary_geojson?: string | null
    overlay_image?: string | null
  }
}

export function Farm3DView({ onBack, registeredFarm, lang = "mr" }: Farm3DViewProps) {
  const [viewMode, setViewMode] = useState<"esri" | "drone3d">("esri")
  const [zoomLevel, setZoomLevel] = useState(1)
  const isEn = lang === "en"

  const farmTitle = registeredFarm?.survey_number || "Gat No. 142"
  const farmArea = registeredFarm?.total_area_acres || 4.5
  const lat = registeredFarm?.latitude || 20.7002
  const lng = registeredFarm?.longitude || 77.0082

  // Parse GeoJSON polygon if present
  let polygonCoords: number[][] | undefined
  if (registeredFarm?.boundary_geojson) {
    try {
      const parsed = JSON.parse(registeredFarm.boundary_geojson)
      polygonCoords = parsed.coordinates[0]
    } catch {
      polygonCoords = undefined
    }
  }

  return (
    <div className="w-full space-y-2">
      {/* View Switcher Toggle: Esri Satellite Map vs 3D Drone View */}
      <div className="flex items-center justify-between bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
        <button
          onClick={() => setViewMode("esri")}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
            viewMode === "esri"
              ? "bg-[#ccff00] text-black shadow-xs"
              : "text-white/70 hover:text-white"
          }`}
        >
          <Layers className="size-3.5" />
          <span>{isEn ? "Satellite Map (Esri)" : "उपग्रह नकाशा"}</span>
        </button>

        <button
          onClick={() => setViewMode("drone3d")}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
            viewMode === "drone3d"
              ? "bg-[#ccff00] text-black shadow-xs"
              : "text-white/70 hover:text-white"
          }`}
        >
          <Maximize2 className="size-3.5" />
          <span>{isEn ? "3D Drone Mesh" : "३D ड्रोन दृश्य"}</span>
        </button>
      </div>

      {/* VIEW 1: LEAFLET WITH ESRI SATELLITE (Active registered farm appears here!) */}
      {viewMode === "esri" && (
        <div className="space-y-2">
          <EsriFarmMap
            centerLat={lat}
            centerLng={lng}
            zoom={17}
            isInteractiveSelection={false}
            initialPolygon={polygonCoords}
            farmName={isEn ? `Registered Farm: ${farmTitle}` : `नोंदणीकृत शेत: ${farmTitle}`}
            gatNumber={isEn ? `${farmTitle} (${farmArea} Acres)` : `${farmTitle} (${farmArea} एकर)`}
            lang={lang}
          />

          <div className="p-3 rounded-2xl bg-white dark:bg-[#18251b] border border-black/5 dark:border-white/10 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                {isEn ? "Registered Parcel Information" : "नोंदणीकृत शेत माहिती"}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-[#ccff00] font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Esri World Imagery
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded-xl bg-muted/40">
                <span className="text-muted-foreground block text-[10px]">
                  {isEn ? "Survey / Gat No." : "गट क्रमांक"}
                </span>
                <strong className="text-foreground">{farmTitle}</strong>
              </div>
              <div className="p-2 rounded-xl bg-muted/40">
                <span className="text-muted-foreground block text-[10px]">
                  {isEn ? "Scanned Area" : "स्कॅन केलेले क्षेत्र"}
                </span>
                <strong className="text-[#ccff00] font-mono">
                  {farmArea} {isEn ? "Acres" : "एकर"}
                </strong>
              </div>
            </div>

            {/* If registered farm has an ONNX mask image saved */}
            {registeredFarm?.overlay_image && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 font-mono">
                    <Sparkles className="size-3 text-[#ccff00]" />
                    {isEn ? "ONNX SAM Scanned Mask Photo:" : "ONNX SAM स्कॅन केलेला मास्क फोटो:"}
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden border border-[#ccff00]/40 relative h-32 bg-black">
                  <img
                    src={registeredFarm.overlay_image}
                    alt="ONNX Farm Mask"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-black/80 px-2 py-0.5 rounded text-[9px] text-[#ccff00] font-mono">
                    ONNX SAM Segmentation
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: 3D DRONE PERSPECTIVE SCANNER */}
      {viewMode === "drone3d" && (
        <div className="relative w-full h-[400px] rounded-3xl overflow-hidden bg-[#132216] select-none text-white border border-white/10 shadow-lg">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop')`,
              transform: `scale(${zoomLevel}) rotateX(12deg)`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#132817]/60 via-[#1e4624]/30 to-[#0e1d11]/90" />
          </div>

          <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20">
            {onBack ? (
              <button
                onClick={onBack}
                className="size-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white"
              >
                <ArrowLeft className="size-4" />
              </button>
            ) : (
              <div className="size-8" />
            )}

            <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-center">
              <span className="text-xs font-bold text-white block">{farmTitle}</span>
              <span className="text-[10px] text-[#ccff00] font-mono">
                {farmArea} {isEn ? "Acres • Cotton" : "एकर कापूस"}
              </span>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.3))}
                className="size-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white"
              >
                <Plus className="size-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.9))}
                className="size-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white"
              >
                <Minus className="size-3.5" />
              </button>
            </div>
          </div>

          {/* 3D Field Mesh */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div
              className="relative w-[230px] h-[210px] transition-transform duration-300"
              style={{
                transform: `perspective(600px) rotateX(28deg) rotateZ(-10deg) scale(${zoomLevel})`,
              }}
            >
              <div className="absolute inset-0 border-2 border-[#ccff00] rounded-xl bg-gradient-to-br from-[#ccff00]/25 to-emerald-500/20 shadow-[0_0_20px_rgba(204,255,0,0.3)]">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage: `radial-gradient(#ccff00 1.2px, transparent 1.2px)`,
                    backgroundSize: "14px 14px",
                  }}
                />
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#ccff00] to-transparent shadow-[0_0_12px_#ccff00] animate-laser" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-bold text-[#ccff00] bg-black/80 px-2 py-0.5 rounded-full border border-[#ccff00]/50">
                    {isEn ? "Drone Scan: 77%" : "ड्रोन स्कॅन: ७७%"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-3 inset-x-3 z-20 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-[#ccff00]">
                <Droplets className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {isEn ? "Soil Moisture Level" : "मातीतील ओलावा"}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {isEn ? "19% - Optimal (Normal)" : "१९% - योग्य प्रमाण"}
                </span>
              </div>
            </div>
            <button className="px-3 py-1 rounded-xl bg-[#ccff00] text-black font-bold text-xs hover:bg-[#b8e600]">
              {isEn ? "Start Drip" : "ड्रिप सुरू करा"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
