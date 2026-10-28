import React from "react"
import { Wind, Droplets, CloudRain, Gauge, MapPin } from "lucide-react"

interface WeatherCardProps {
  location?: string
  temp?: number
  rainfall?: string
  humidity?: string
  windSpeed?: string
  lang?: "mr" | "en"
}

export function WeatherCard({
  location,
  temp = 29,
  rainfall = "18 mm",
  humidity = "74%",
  windSpeed = "12 km/h",
  lang = "mr",
}: WeatherCardProps) {
  const isEn = lang === "en"
  const displayLocation = location || (isEn ? "Nimbhora, Akola" : "निंभोरा, अकोला")

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#18251b] p-3.5 shadow-xs border border-black/5 dark:border-white/10">
      {/* Location Bar */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
          <MapPin className="size-3 text-emerald-600 dark:text-[#ccff00]" />
          <span>{displayLocation}</span>
        </div>
        <span className="text-[10px] font-bold text-emerald-700 dark:text-[#ccff00] bg-emerald-500/10 px-2 py-0.5 rounded-full">
          {isEn ? "Weather Forecast" : "हवामान अंदाज"}
        </span>
      </div>

      {/* Main Temperature and Rain Display */}
      <div className="flex items-center justify-between py-1">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight text-foreground font-sans">
              {temp}°C
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {isEn ? "Temperature" : "तपमान"}
            </span>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {isEn ? "Favorable for Cotton crop" : "कापूस पिकासाठी उत्तम हवामान"}
          </span>
        </div>

        {/* Big Rainfall Badge */}
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl">
          <CloudRain className="size-5 text-blue-500" />
          <div>
            <span className="text-sm font-black text-foreground font-mono block leading-none">
              {rainfall}
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
              {isEn ? "Rainfall" : "पाऊस"}
            </span>
          </div>
        </div>
      </div>

      {/* 2 Simple Stats: Wind and Humidity */}
      <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/10 grid grid-cols-2 gap-2 text-center text-xs">
        <div className="flex items-center justify-center gap-1.5 py-1 rounded-lg bg-muted/40">
          <Wind className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground text-[11px]">
            {isEn ? "Wind:" : "वारा:"}
          </span>
          <strong className="text-foreground font-mono text-[11px]">{windSpeed}</strong>
        </div>
        <div className="flex items-center justify-center gap-1.5 py-1 rounded-lg bg-muted/40">
          <Droplets className="size-3.5 text-blue-500" />
          <span className="text-muted-foreground text-[11px]">
            {isEn ? "Humidity:" : "ओलावा:"}
          </span>
          <strong className="text-foreground font-mono text-[11px]">{humidity}</strong>
        </div>
      </div>
    </div>
  )
}
