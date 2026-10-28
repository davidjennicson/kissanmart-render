import React, { useState, useEffect, useRef } from "react"
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Sparkles,
  CloudRain,
  TrendingUp,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Radio,
  X,
} from "lucide-react"
import { queryVoiceAgent, streamAudioToBackend } from "@/lib/api"
import { useRealtimeAuctions } from "@/lib/useRealtimeAuctions"

interface VoiceAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  defaultLang?: "mr" | "en"
}

export function VoiceAssistantModal({
  isOpen,
  onClose,
  defaultLang = "mr",
}: VoiceAssistantModalProps) {
  const [lang, setLang] = useState<"mr" | "en" | "hi">(defaultLang)
  const isEn = lang === "en"

  // Live auction context from store
  const { lots } = useRealtimeAuctions()
  const liveLot = lots.find((l) => l.id === 1) || lots[0]

  // Call Agent States
  const [callStatus, setCallStatus] = useState<"connecting" | "active" | "ended">("connecting")
  const [callDurationSeconds, setCallDurationSeconds] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [isUserSpeaking, setIsUserSpeaking] = useState(false)

  // Spoken text & AI reply
  const [userTranscript, setUserTranscript] = useState("")
  const [aiResponseText, setAiResponseText] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("greeting")
  const [isProcessing, setIsProcessing] = useState(false)
  const [micAudioLevel, setMicAudioLevel] = useState(0)

  // Web Audio & Speech Recognition references
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Start Call on Modal Open
  useEffect(() => {
    if (!isOpen) return

    setCallStatus("connecting")
    setCallDurationSeconds(0)
    setUserTranscript("")
    setIsMuted(false)
    setIsAiSpeaking(false)

    // Initial greeting based on language
    const initialGreeting =
      lang === "mr"
        ? "नमस्कार तुकारामजी! मी किसानमार्ट ॲग्री AI कॉल एजंट आहे. आजचे कापसाचे भाव, गट १४२ ची माती किंवा पावसाचा अंदाज विचारा."
        : lang === "hi"
        ? "नमस्ते किसान भाई! मैं किसानमार्ट एग्री AI कॉल एजेंट हूँ। फसल भाव, खेत रिपोर्ट या बारिश के बारे में पूछिए।"
        : "Hello Farmer! I am your KissanMart Agri AI Call Agent. Ask me about today's crop prices, Gat 142 farm and soil status, or rainfall alerts."

    setAiResponseText(initialGreeting)

    // Connect Call after 800ms
    const connectTimer = setTimeout(() => {
      setCallStatus("active")
      speakText(initialGreeting, lang)
      initMicrophoneStream()
    }, 800)

    return () => {
      clearTimeout(connectTimer)
      stopAudioStreams()
    }
  }, [isOpen, lang])

  // Call duration counter
  useEffect(() => {
    if (callStatus !== "active") return
    const timer = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [callStatus])

  // Initialize Microphone & Visualizer
  const initMicrophoneStream = async () => {
    try {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      // Connect Web Audio API Analyser for real-time wave visuals
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const audioCtx = new AudioCtx()
        audioContextRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateLevel = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const avg = sum / dataArray.length
          setMicAudioLevel(avg)
          setIsUserSpeaking(avg > 18)
          animFrameRef.current = requestAnimationFrame(updateLevel)
        }
        updateLevel()
      }

      // MediaRecorder to capture audio chunks to send to backend stream
      try {
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
        mediaRecorderRef.current = recorder
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && userTranscript) {
            streamAudioToBackend(e.data, lang, userTranscript).catch(() => null)
          }
        }
        recorder.start(4000) // 4s chunks
      } catch {
        // fallback if mimeType not supported
      }

      // Initialize Web Speech Recognition
      initSpeechRecognition()
    } catch {
      // Microphone access fallback gracefully
    }
  }

  // Client-Side Streaming Speech Recognition
  const initSpeechRecognition = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRec) return

    try {
      const recognition = new SpeechRec()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = lang === "mr" ? "mr-IN" : lang === "hi" ? "hi-IN" : "en-IN"

      recognition.onresult = (event: any) => {
        let transcript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        setUserTranscript(transcript)

        // If sentence completed
        if (event.results[event.results.length - 1].isFinal) {
          handleProcessVoiceQuery(transcript)
        }
      }

      recognition.onerror = () => {
        // restart silently if still on call
        if (callStatus === "active" && !isMuted) {
          try {
            recognition.start()
          } catch {}
        }
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch {}
  }

  // Process Query with Backend Gemma Agent
  const handleProcessVoiceQuery = async (queryText: string) => {
    if (!queryText.trim() || isProcessing) return
    setIsProcessing(true)

    // Call backend Gemma AI Agent
    const result = await queryVoiceAgent(queryText, lang, 1)

    let reply = ""
    let category = "general"

    if (result && result.response_text) {
      reply = result.response_text
      category = result.category
    } else {
      // Offline fallback grounded in current state
      reply = generateLocalFallback(queryText, lang)
    }

    setAiResponseText(reply)
    setActiveCategory(category)
    setIsProcessing(false)

    // Stream spoken audio back to farmer
    speakText(reply, lang)
  }

  // Client-Side Audio Output Stream (Text-to-Speech)
  const speakText = (text: string, currentLang: string) => {
    if (!isSpeakerOn || typeof window === "undefined" || !("speechSynthesis" in window)) return

    window.speechSynthesis.cancel() // Stop prior speech
    const utterance = new SpeechSynthesisUtterance(text)

    utterance.lang = currentLang === "mr" ? "mr-IN" : currentLang === "hi" ? "hi-IN" : "en-IN"
    utterance.rate = 0.95 // Natural call pace
    utterance.pitch = 1.0

    // Try finding Indian English / Marathi / Hindi voice
    const voices = window.speechSynthesis.getVoices()
    const matchingVoice = voices.find((v) =>
      currentLang === "mr"
        ? v.lang.startsWith("mr") || v.lang.includes("IN")
        : currentLang === "hi"
        ? v.lang.startsWith("hi") || v.lang.includes("IN")
        : v.lang.includes("IN") || v.name.includes("India")
    )
    if (matchingVoice) utterance.voice = matchingVoice

    utterance.onstart = () => setIsAiSpeaking(true)
    utterance.onend = () => setIsAiSpeaking(false)
    utterance.onerror = () => setIsAiSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  const stopAudioStreams = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => null)
    }
  }

  const handleEndCall = () => {
    setCallStatus("ended")
    stopAudioStreams()
    setTimeout(onClose, 400)
  }

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled
      })
    }
    setIsMuted((prev) => !prev)
  }

  const toggleSpeaker = () => {
    if (isSpeakerOn) {
      window.speechSynthesis?.cancel()
      setIsAiSpeaking(false)
    }
    setIsSpeakerOn((prev) => !prev)
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // Local fallback with real-time values from store
  const generateLocalFallback = (q: string, language: string) => {
    const lower = q.toLowerCase()
    if (lower.includes("price") || lower.includes("rate") || lower.includes("भाव") || lower.includes("cotton")) {
      return language === "mr"
        ? "आज अकोला बाजार समितीत शंकर-६ कापसाचा भाव ₹७,४५० प्रति क्विंटल आहे, जो आज ₹१२० ने वाढला आहे."
        : "Today in Akola APMC, Shankar-6 Bt Cotton rate is ₹7,450 per quintal (+₹120 today)."
    }
    if (lower.includes("rain") || lower.includes("weather") || lower.includes("पाऊस") || lower.includes("हवामान")) {
      return language === "mr"
        ? "हवामान इशारा: अकोला व विदर्भात पुढील ४८ तासांत सुमारे १५ मिमी हलक्या पावसाचा इशारा आहे. हा पाऊस आपल्या पिकासाठी फायदेशीर आहे."
        : "Weather Alert: Light rainfall warning of 15mm expected over the next 48 hours in Akola. Favorable for your Cotton and Soybean crop."
    }
    if (lower.includes("bid") || lower.includes("बोली") || lower.includes("लिलाव")) {
      return language === "mr"
        ? `आपल्या कापसावर ${liveLot.highest_bidder_name} ची ₹${liveLot.current_highest_bid.toLocaleString("en-IN")} प्रति क्विंटलची सर्वोच्च बोली लागली आहे.`
        : `On your Cotton lot, ${liveLot.highest_bidder_name} holds the highest bid at ₹${liveLot.current_highest_bid.toLocaleString("en-IN")}/quintal.`
    }
    return language === "mr"
      ? "आपले शेत गट क्र. १४२ मध्ये ४.५ एकर आहे. मातीचा सामू (pH) ७.४ असून पोटॅश ३४० किलो (उच्च) आहे."
      : "Your farm Gat No. 142 spans 4.5 acres. Soil pH is 7.4 (neutral) and Potash is 340 kg/ha."
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[370px] rounded-[36px] bg-[#0d160f] border-2 border-emerald-500/30 text-white p-6 shadow-2xl flex flex-col items-center justify-between relative overflow-hidden h-[620px] max-h-[92vh]">
        
        {/* Glow backdrop */}
        <div className="absolute -top-16 size-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 size-56 bg-[#ccff00]/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── CALL HEADER ── */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
              Gemma Agri Call Agent
            </span>
          </div>

          {/* Language Selector */}
          <div className="flex gap-1 bg-black/50 p-1 rounded-full border border-white/10 text-[10px]">
            {(["mr", "en", "hi"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded-full font-bold transition-all ${
                  lang === l ? "bg-[#ccff00] text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {l === "mr" ? "मराठी" : l === "en" ? "EN" : "हिन्दी"}
              </button>
            ))}
          </div>
        </div>

        {/* ── AGENT AVATAR & CALL STATUS ── */}
        <div className="flex flex-col items-center text-center space-y-3 my-auto z-10 w-full">
          {/* Avatar with Sound Pulse Ring */}
          <div className="relative flex items-center justify-center">
            {/* Pulsing rings when speaking */}
            {(isAiSpeaking || isUserSpeaking) && (
              <>
                <div
                  className="absolute size-36 rounded-full border-2 border-[#ccff00]/30 animate-ping"
                  style={{ animationDuration: "1.8s" }}
                />
                <div
                  className="absolute size-28 rounded-full border border-emerald-400/50 animate-pulse"
                  style={{ animationDuration: "1s" }}
                />
              </>
            )}

            <div className={`size-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
              isAiSpeaking
                ? "bg-gradient-to-tr from-emerald-500 to-[#ccff00] text-black scale-105 shadow-[0_0_35px_rgba(204,255,0,0.6)]"
                : isUserSpeaking
                ? "bg-emerald-600 text-white scale-100 shadow-[0_0_25px_rgba(16,185,129,0.5)]"
                : "bg-[#182a1d] text-emerald-400 border-2 border-emerald-500/30"
            }`}>
              {isAiSpeaking ? (
                <Radio className="size-10 animate-pulse text-black" />
              ) : (
                <Sparkles className="size-10 text-emerald-400" />
              )}
            </div>
          </div>

          {/* Name & Call duration */}
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {lang === "mr" ? "किसानमार्ट कृषी AI कॉल एजंट" : "KissanMart Agri AI Call Agent"}
            </h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className={`text-xs font-mono font-bold ${
                callStatus === "active" ? "text-emerald-400" : "text-amber-400 animate-pulse"
              }`}>
                {callStatus === "connecting"
                  ? (isEn ? "Connecting Call..." : "कॉल जोडत आहे...")
                  : `In Call · ${formatDuration(callDurationSeconds)}`}
              </span>
            </div>
          </div>

          {/* Real-time Dynamic Waveform visualizer */}
          <div className="flex items-center justify-center gap-1.5 h-8 my-1">
            {[0.4, 0.8, 1.2, 0.6, 1.0, 0.5, 0.9, 0.7].map((heightMod, i) => {
              const barHeight = isUserSpeaking
                ? Math.min(32, Math.max(6, (micAudioLevel / 4) * heightMod))
                : isAiSpeaking
                ? Math.min(28, Math.max(6, 16 * heightMod))
                : 4
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isAiSpeaking
                      ? "bg-[#ccff00]"
                      : isUserSpeaking
                      ? "bg-emerald-400"
                      : "bg-white/20"
                  }`}
                  style={{ height: `${barHeight}px` }}
                />
              )
            })}
          </div>

          {/* AI Spoken Speech Bubble */}
          <div className="w-full bg-black/50 border border-white/10 rounded-2xl p-3.5 text-xs text-white/90 text-left max-h-32 overflow-y-auto shadow-inner">
            <span className="text-[10px] font-mono text-emerald-400 font-bold block mb-1">
              {isAiSpeaking
                ? (isEn ? "AI is speaking..." : "कृषी एजंट बोलत आहे...")
                : (isEn ? "KissanMart Agent:" : "कृषी एजंट उत्तर:")}
            </span>
            <p className="leading-relaxed font-sans">{aiResponseText}</p>
          </div>

          {/* Live User Transcript */}
          {userTranscript && (
            <div className="w-full text-[11px] text-white/60 italic px-2 text-center truncate">
              "{userTranscript}"
            </div>
          )}
        </div>

        {/* ── QUICK AGRI TOPIC SHORTCUTS ── */}
        <div className="w-full space-y-1.5 z-10 mb-2">
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <button
              onClick={() => handleProcessVoiceQuery("What is today's Cotton price in Akola APMC?")}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-left transition-colors flex items-center gap-1.5"
            >
              <TrendingUp className="size-3 text-[#ccff00] shrink-0" />
              <span className="truncate">{isEn ? "Cotton APMC Price" : "कापूस बाजारभाव"}</span>
            </button>

            <button
              onClick={() => handleProcessVoiceQuery("Is there any rainfall alert for Gat 142?")}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-left transition-colors flex items-center gap-1.5"
            >
              <CloudRain className="size-3 text-cyan-400 shrink-0" />
              <span className="truncate">{isEn ? "Rainfall Alert" : "पावसाचा इशारा"}</span>
            </button>

            <button
              onClick={() => handleProcessVoiceQuery("Tell me about Gat 142 farm and soil potash")}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-left transition-colors flex items-center gap-1.5"
            >
              <Landmark className="size-3 text-emerald-400 shrink-0" />
              <span className="truncate">{isEn ? "Gat 142 Soil Potash" : "गट १४२ माती अहवाल"}</span>
            </button>

            <button
              onClick={() => handleProcessVoiceQuery("Who is the highest bidder on my cotton lot?")}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-left transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="size-3 text-amber-400 shrink-0" />
              <span className="truncate">{isEn ? "Recent Live Bids" : "चालू लिलाव बोली"}</span>
            </button>
          </div>
        </div>

        {/* ── CALL CONTROL ACTIONS (PHONE CONTROLS) ── */}
        <div className="w-full flex items-center justify-around pt-3 border-t border-white/10 z-10">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`size-12 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? "bg-amber-500 text-white shadow-lg"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title="Mute / Unmute"
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          {/* End Call Button (Big Red Button) */}
          <button
            onClick={handleEndCall}
            className="size-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.6)] transition-transform"
            title="End Call"
          >
            <PhoneOff className="size-6" />
          </button>

          {/* Speaker Button */}
          <button
            onClick={toggleSpeaker}
            className={`size-12 rounded-full flex items-center justify-center transition-all ${
              !isSpeakerOn
                ? "bg-amber-500 text-white shadow-lg"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title="Speaker On / Off"
          >
            {isSpeakerOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
        </div>

      </div>
    </div>
  )
}
