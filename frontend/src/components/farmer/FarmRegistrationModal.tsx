import React, { useState } from "react"
import {
  X,
  CreditCard,
  CheckCircle2,
  MapPin,
  FileText,
  UploadCloud,
  ArrowRight,
  Sparkles,
  Link2,
  Edit3,
  Layers,
} from "lucide-react"
import { EsriFarmMap } from "@/components/farmer/EsriFarmMap"
import { API_BASE } from "@/lib/api"

interface FarmRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  onFarmRegistered: (farmData: any) => void
  lang?: "mr" | "en"
}

export function FarmRegistrationModal({
  isOpen,
  onClose,
  onFarmRegistered,
  lang = "mr",
}: FarmRegistrationModalProps) {
  const isEn = lang === "en"
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1: Aadhaar state
  const [isAadhaarUploading, setIsAadhaarUploading] = useState(false)
  const [aadhaarVerified, setAadhaarVerified] = useState(false)
  const [farmerInfo, setFarmerInfo] = useState({
    name: isEn ? "Tukaram Pandurang Shinde" : "तुकाराम पांडुरंग शिंदे",
    aadharNumber: "XXXXXXXX9012",
    district: "Akola",
    taluka: "Akola",
    village: "Nimbhora",
    villageCode: 530013,
  })

  // Step 2: Land linking mode
  const [landSource, setLandSource] = useState<"bhumilink" | "manual">("bhumilink")
  const [manualGat, setManualGat] = useState("Gat No. 142")
  const [manualArea, setManualArea] = useState("4.5")
  const [landLinked, setLandLinked] = useState(false)

  // Step 3: Segmented Polygon State from ONNX
  const [segmentedData, setSegmentedData] = useState<{
    polygon: number[][]
    areaAcres: number
    center: { lat: number; lng: number }
    overlayImage?: string | null
    tileImage?: string | null
    maskImage?: string | null
    savedPaths?: Record<string, string> | null
  } | null>(null)

  // Step 4: Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  // Simulate Aadhaar OCR Upload
  const handleSimulateAadhaarUpload = () => {
    setIsAadhaarUploading(true)
    setTimeout(() => {
      setIsAadhaarUploading(false)
      setAadhaarVerified(true)
    }, 1200)
  }

  // Finalize Registration and save to backend
  const handleConfirmRegistration = async () => {
    setIsSubmitting(true)

    const farmPayload = {
      farmer_id: 1,
      farm_name: "Gat No. 142 (कापूस शेत)",
      survey_number: landSource === "bhumilink" ? "Gat No. 142" : manualGat,
      total_area_acres: segmentedData ? segmentedData.areaAcres : 4.5,
      state: "Maharashtra",
      district: farmerInfo.district,
      district_code: 467,
      taluka: farmerInfo.taluka,
      block_code: 4291,
      village: farmerInfo.village,
      village_code: farmerInfo.villageCode,
      soil_type: "Black Cotton Soil (काळी माती)",
      primary_crop: "Cotton (कापूस)",
      latitude: segmentedData?.center.lat || 20.7002,
      longitude: segmentedData?.center.lng || 77.0082,
      boundary_geojson: segmentedData
        ? JSON.stringify({ type: "Polygon", coordinates: [segmentedData.polygon] })
        : null,
      overlay_image: segmentedData?.overlayImage || null,
    }

    try {
      await fetch(`${API_BASE}/farms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(farmPayload),
      }).catch(() => null)
    } catch {
      // Graceful fallback
    }

    setIsSubmitting(false)
    onFarmRegistered(farmPayload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-[32px] bg-[#142317] border border-white/15 text-white p-5 shadow-2xl flex flex-col relative max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
        >
          <X className="size-4" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <span className="text-[10px] font-bold text-[#ccff00] bg-black/50 px-2.5 py-0.5 rounded-full border border-[#ccff00]/40 uppercase tracking-wider">
            {isEn ? `Step ${currentStep} of 4` : `नोंदणी पायरी ${currentStep} / ४`}
          </span>
          <h3 className="text-base font-bold text-white mt-1">
            {currentStep === 1 && (isEn ? "Aadhaar Card Verification (KYC)" : "आधार कार्ड सत्यापन")}
            {currentStep === 2 && (isEn ? "Land Record Linking" : "जमीन नोंदणी व ७/१२ लिंक")}
            {currentStep === 3 && (isEn ? "Select Farm on Map (ONNX SAM)" : "नकाशात शेत निवडा (ONNX SAM)")}
            {currentStep === 4 && (isEn ? "Confirm Farm Registration" : "शेत नोंदणी पूर्ण करा")}
          </h3>
        </div>

        {/* STEP 1: AADHAAR UPLOAD & SIMULATION */}
        {currentStep === 1 && (
          <div className="space-y-3.5">
            <p className="text-xs text-white/70">
              {isEn
                ? "Upload or tap to simulate Aadhaar OCR verification. Your details will be filled automatically."
                : "आपले आधार कार्ड अपलोड करा. आम्ही माहिती आपोआप भरून घेऊ."}
            </p>

            {/* Aadhaar Upload Box */}
            <div
              onClick={handleSimulateAadhaarUpload}
              className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                aadhaarVerified
                  ? "border-[#ccff00] bg-[#ccff00]/10"
                  : "border-white/20 bg-white/5 hover:border-[#ccff00]/50"
              }`}
            >
              {isAadhaarUploading ? (
                <div className="flex flex-col items-center">
                  <div className="size-8 rounded-full border-2 border-[#ccff00] border-t-transparent animate-spin mb-2" />
                  <span className="text-xs font-bold text-[#ccff00]">
                    {isEn ? "Verifying Aadhaar with UIDAI..." : "आधार तपासणी सुरू आहे..."}
                  </span>
                </div>
              ) : aadhaarVerified ? (
                <div className="flex flex-col items-center text-center">
                  <CheckCircle2 className="size-10 text-[#ccff00] mb-1" />
                  <span className="text-xs font-bold text-white">
                    {isEn ? "Aadhaar Verified Successfully!" : "आधार सत्यापित झाले!"}
                  </span>
                  <span className="text-[11px] text-white/60 font-mono mt-0.5">
                    {farmerInfo.aadharNumber}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <UploadCloud className="size-10 text-[#ccff00] mb-2 animate-bounce" />
                  <span className="text-xs font-bold text-white">
                    {isEn ? "Click here to upload Aadhaar Card" : "येथे क्लिक करून आधार कार्ड अपलोड करा"}
                  </span>
                  <span className="text-[10px] text-white/50 mt-1">
                    {isEn ? "(Simulate Aadhaar OCR scan)" : "(आधार कार्ड स्कॅन करा)"}
                  </span>
                </div>
              )}
            </div>

            {/* Extracted Details Preview */}
            {aadhaarVerified && (
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-1 animate-in fade-in duration-300">
                <div className="flex justify-between">
                  <span className="text-white/60">{isEn ? "Farmer Name:" : "शेतकरी नाव:"}</span>
                  <span className="font-bold text-white">{farmerInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">{isEn ? "Village / District:" : "गाव / जिल्हा:"}</span>
                  <span className="font-bold text-white">
                    {farmerInfo.village}, {farmerInfo.district}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">{isEn ? "LGD Village Code:" : "LGD गाव कोड:"}</span>
                  <span className="font-mono text-[#ccff00]">{farmerInfo.villageCode}</span>
                </div>
              </div>
            )}

            {/* Next Button */}
            <button
              disabled={!aadhaarVerified}
              onClick={() => setCurrentStep(2)}
              className="w-full py-2.5 rounded-xl bg-[#ccff00] disabled:opacity-40 text-black font-extrabold text-xs hover:bg-[#b8e600] active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>{isEn ? "Next: Link Land Records" : "पुढील पायरी: जमीन जोडा"}</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        )}

        {/* STEP 2: LAND REGISTRATION (Aadhaar BhumiLink vs Address) */}
        {currentStep === 2 && (
          <div className="space-y-3.5">
            <p className="text-xs text-white/70">
              {isEn ? "Choose your land record linking method:" : "आपली शेतजमीन कशी जोडायची आहे?"}
            </p>

            {/* Mode 1: Aadhaar BhumiLink (Auto 7/12) */}
            <div
              onClick={() => {
                setLandSource("bhumilink")
                setLandLinked(true)
              }}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                landSource === "bhumilink"
                  ? "bg-[#ccff00]/15 border-[#ccff00]"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="size-8 rounded-xl bg-[#ccff00]/20 flex items-center justify-center text-[#ccff00] shrink-0 mt-0.5">
                  <Link2 className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">
                      {isEn ? "Aadhaar BhumiLink (Auto 7/12)" : "आधार भूमिलिंक (७/१२ थेट)"}
                    </span>
                    <span className="text-[9px] bg-[#ccff00] text-black font-bold px-1.5 py-0.2 rounded">
                      {isEn ? "Recommended" : "शिफारस"}
                    </span>
                  </div>
                  <span className="text-[11px] text-white/60 block mt-0.5">
                    {isEn
                      ? "Automatically fetches linked 7/12 land records from Mahabhulekh."
                      : "महाभूलेख वरून आपल्या आधारशी जोडलेला ७/१२ आपोआप मिळवला जाईल."}
                  </span>
                </div>
              </div>

              {landSource === "bhumilink" && (
                <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] text-[#ccff00] font-mono flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-[#ccff00]" />
                  <span>
                    {isEn
                      ? "Gat No. 142 (Nimbhora, Akola) • 4.5 Acres detected"
                      : "गट क्र. १४२ (निंभोरा, अकोला) • ४.५ एकर सापडले"}
                  </span>
                </div>
              )}
            </div>

            {/* Mode 2: Manual Gat No / Address */}
            <div
              onClick={() => {
                setLandSource("manual")
                setLandLinked(true)
              }}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                landSource === "manual"
                  ? "bg-[#ccff00]/15 border-[#ccff00]"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Edit3 className="size-4" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-white block">
                    {isEn ? "Manual Gat Number & Address" : "पत्ता व गट क्रमांक टाका"}
                  </span>
                  <span className="text-[11px] text-white/60 block mt-0.5">
                    {isEn
                      ? "Enter district, taluka, and Gat number manually."
                      : "जिल्हा, तालुका आणि गट क्र. स्वतः भरून शोधा."}
                  </span>

                  {landSource === "manual" && (
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10">
                      <input
                        type="text"
                        value={manualGat}
                        onChange={(e) => setManualGat(e.target.value)}
                        placeholder={isEn ? "Gat No." : "गट क्र."}
                        className="bg-black/50 border border-white/20 rounded-lg px-2 py-1 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={manualArea}
                        onChange={(e) => setManualArea(e.target.value)}
                        placeholder={isEn ? "Area (Acres)" : "क्षेत्र (एकर)"}
                        className="bg-black/50 border border-white/20 rounded-lg px-2 py-1 text-xs text-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={() => setCurrentStep(3)}
              className="w-full py-2.5 rounded-xl bg-[#ccff00] text-black font-extrabold text-xs hover:bg-[#b8e600] active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>{isEn ? "Next: Select Farm on Map" : "पुढील पायरी: नकाशात शेत निवडा"}</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        )}

        {/* STEP 3: LEAFLET ESRI SATELLITE MAP & ONNX MASK CLICK */}
        {currentStep === 3 && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center gap-2">
              <Sparkles className="size-4 text-[#ccff00] shrink-0" />
              <span>
                {isEn ? (
                  <>
                    <strong>Action:</strong> Click anywhere on your land on the Esri Satellite map. The <strong>ONNX SAM</strong> model will automatically segment your field boundaries.
                  </>
                ) : (
                  <>
                    <strong>कृती करा:</strong> खालील उपग्रह नकाशात आपल्या शेतावर कुठेही क्लिक करा. <strong>ONNX SAM</strong> मॉडेल आपोआप बांध निश्चित करेल.
                  </>
                )}
              </span>
            </div>

            {/* Interactive Leaflet Esri Map with ONNX click integration */}
            <EsriFarmMap
              centerLat={20.7002}
              centerLng={77.0082}
              zoom={17}
              isInteractiveSelection={true}
              gatNumber={landSource === "bhumilink" ? "Gat No. 142" : manualGat}
              lang={lang}
              onPolygonCreated={(data) => {
                setSegmentedData(data)
              }}
            />

            {/* Next Button */}
            <button
              disabled={!segmentedData}
              onClick={() => setCurrentStep(4)}
              className="w-full py-2.5 rounded-xl bg-[#ccff00] disabled:opacity-40 text-black font-extrabold text-xs hover:bg-[#b8e600] active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>{isEn ? "Confirm Boundary & Continue" : "सीमा निश्चित झाली - पुढे जा"}</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        )}

        {/* STEP 4: FINAL CONFIRMATION & REGISTRATION */}
        {currentStep === 4 && (
          <div className="space-y-3.5">
            {/* ONNX SAM Mask Visual Preview */}
            {segmentedData?.overlayImage && (
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#ccff00] shadow-lg bg-black">
                <img
                  src={segmentedData.overlayImage}
                  alt="ONNX Segmented Farm Mask"
                  className="w-full h-36 object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/85 px-2 py-0.5 rounded-full border border-[#ccff00]/50 text-[10px] text-[#ccff00] font-mono flex items-center gap-1">
                  <Sparkles className="size-3" />
                  <span>{isEn ? "ONNX SAM Field Mask" : "ONNX SAM शेत मास्क"}</span>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/85 px-2 py-0.5 rounded text-[9px] text-white/80 font-mono">
                  {segmentedData.areaAcres} {isEn ? "Acres" : "एकर"}
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-black/40 border border-[#ccff00]/40 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-white">{isEn ? "Farm Verification Summary" : "शेत पडताळणी सारांश"}</span>
                <span className="text-[10px] text-[#ccff00] font-mono">ONNX SAM Verified</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">{isEn ? "Farmer Name:" : "शेतकरी नाव:"}</span>
                <span className="font-bold text-white">{farmerInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">{isEn ? "Gat Number:" : "गट क्रमांक:"}</span>
                <span className="font-bold text-white">
                  {landSource === "bhumilink" ? "Gat No. 142" : manualGat}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">{isEn ? "Scanned Area:" : "स्कॅन केलेले क्षेत्र:"}</span>
                <span className="font-extrabold text-[#ccff00] font-mono">
                  {segmentedData ? segmentedData.areaAcres : 4.5} {isEn ? "Acres" : "एकर"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">{isEn ? "Village & Taluka:" : "गाव / तालुका:"}</span>
                <span className="text-white font-medium">{isEn ? "Nimbhora, Akola" : "निंभोरा, अकोला"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">{isEn ? "Soil Type:" : "मातीचा प्रकार:"}</span>
                <span className="text-white font-medium">{isEn ? "Deep Black Cotton Soil (Regur)" : "काळी कापसाची माती"}</span>
              </div>
            </div>

            <p className="text-[11px] text-white/60 text-center">
              {isEn
                ? "Upon confirmation, your farm parcel will appear on the live dashboard and Esri satellite map."
                : "नोंदणी केल्यानंतर हे शेत थेट डॅशबोर्ड व उपग्रह नकाशावर दिसेल."}
            </p>

            {/* Confirm Registration Button */}
            <button
              disabled={isSubmitting}
              onClick={handleConfirmRegistration}
              className="w-full py-3 rounded-xl bg-[#ccff00] text-black font-black text-xs hover:bg-[#b8e600] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {isSubmitting ? (
                <span>{isEn ? "Registering Farm..." : "नोंदणी होत आहे..."}</span>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>{isEn ? "Confirm & Register My Farm" : "हे माझे शेत आहे - नोंदणी पूर्ण करा"}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

