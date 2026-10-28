import React, { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { X, Play, Pause, Sun, Moon, CloudRain, MapPin, Layers, Sprout } from "lucide-react"

export interface FarmerProfileData {
  farmerName: string
  village: string
  taluka?: string
  district: string
  gatNo: string
  acres: number
  commodity?: string
  soilType?: string
}

interface FarmDigitalTwinModalProps {
  farmer: FarmerProfileData
  onClose: () => void
  lang?: "en" | "mr"
}

export function FarmDigitalTwinModal({ farmer, onClose, lang = "en" }: FarmDigitalTwinModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isEn = lang === "en"

  // Sensor state for reactive overlay
  const [tempVal, setTempVal] = useState(27.3)
  const [humVal, setHumVal] = useState(20.6)
  const [rainVal, setRainVal] = useState(18.2)
  const [siloTemps, setSiloTemps] = useState([31.2, 33.1, 30.9])
  const [whTemps, setWhTemps] = useState([31.2, 33.1])

  // Sparkline SVG point strings
  const [tempPath, setTempPath] = useState("")
  const [humPath, setHumPath] = useState("")
  const [rainPath, setRainPath] = useState("")

  // Timeline & Clock state
  const [clockText, setClockText] = useState("☀ 14:30 · 15 MAY")
  const [isPlaying, setIsPlaying] = useState(true)
  const [timelinePct, setTimelinePct] = useState(84)

  // Mutable refs to bridge React and Three.js animation loop
  const playingRef = useRef(true)
  const progRef = useRef(0.84)
  const reqIdRef = useRef<number | null>(null)
  const sensorTimerRef = useRef<number | null>(null)

  const togglePlay = () => {
    const next = !isPlaying
    setIsPlaying(next)
    playingRef.current = next
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, clickX / rect.width))
    progRef.current = pct
    setTimelinePct(Math.round(pct * 100))
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // ── Three.js Setup ────────────────────────────────────────────────────────
    const T = THREE
    const R = Math.random
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight

    const ren = new T.WebGLRenderer({ antialias: true, alpha: true })
    ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    ren.setSize(width, height)
    ren.shadowMap.enabled = true
    ren.shadowMap.type = T.PCFSoftShadowMap
    ren.toneMapping = T.ACESFilmicToneMapping
    ren.toneMappingExposure = 1.3
    ren.domElement.style.width = "100%"
    ren.domElement.style.height = "100%"
    ren.domElement.style.display = "block"
    container.appendChild(ren.domElement)

    const scene = new T.Scene()
    const FOG = 0x9c8c6e
    scene.fog = new T.FogExp2(FOG, 0.0024)

    // Sky Dome
    const sky = new T.Mesh(
      new T.SphereGeometry(1400, 32, 16),
      new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          sd: { value: new T.Vector3(-130, 62, -95).normalize() },
          hz: { value: new T.Color(FOG) },
          zn: { value: new T.Color(0.3, 0.5, 0.8) },
        },
        vertexShader: `varying vec3 p;
void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 p;uniform vec3 sd,hz,zn;
void main(){
  float h=clamp(p.y,0.,1.);
  vec3 c=mix(hz,zn,pow(h,.45));
  float s=max(dot(p,sd),0.);
  c+=vec3(1.,.8,.5)*(pow(s,3.)*.35+pow(s,40.)*.5+pow(s,400.)*2.);
  gl_FragColor=vec4(c,1.);
}`,
      })
    )
    sky.renderOrder = -1
    scene.add(sky)

    const cam = new T.PerspectiveCamera(42, width / height, 2, 2000)
    const hemi = new T.HemisphereLight(0xbfd4ff, 0x5a4630, 0.8)
    scene.add(hemi)

    const sun = new T.DirectionalLight(0xffd2a0, 1.8)
    sun.position.set(-130, 62, -95)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 300 })
    sun.shadow.bias = -0.0005
    sun.shadow.radius = 3
    sun.shadow.normalBias = 0.05
    scene.add(sun)

    // Ground Texture Canvas
    const S = 2048
    const k = S / 200
    const cv = document.createElement("canvas")
    cv.width = cv.height = S
    const g = cv.getContext("2d")!
    const X = (x: number) => (x + 100) * k
    const Z = (z: number) => (z + 100) * k

    function field(x0: number, z0: number, x1: number, z1: number, base: string, lines: string[], ang: number) {
      g.save()
      g.beginPath()
      g.rect(X(x0), Z(z0), (x1 - x0) * k, (z1 - z0) * k)
      g.clip()
      g.fillStyle = base
      g.fillRect(0, 0, S, S)
      g.translate(S / 2, S / 2)
      g.rotate(ang)
      for (let i = -S; i < S; i += 5) {
        g.fillStyle = lines[(R() * lines.length) | 0]
        g.fillRect(i, -S, 2.5, 2 * S)
      }
      g.restore()
    }

    g.fillStyle = "#6a8c3c"
    g.fillRect(0, 0, S, S)
    field(-100, -100, 100, -42, "#6f8f3e", ["#7a9a45", "#648535", "#86a24c"], 0.1)
    field(-100, -100, -8, -30, "#cfa862", ["#d9b878", "#c39a52", "#e0c284"], -0.5)
    field(5, -12, 100, 75, "#c9a257", ["#d8b872", "#b78f45", "#e3c785", "#a98440"], 0)
    field(-100, -12, 5, 75, "#5e402a", ["#6b4a30", "#523622", "#745236"], 0.02)
    field(-100, 75, 100, 100, "#6a8c3c", ["#7a9a45", "#648535"], 0)
    g.fillStyle = "#4e3624"
    g.fillRect(X(-100), Z(26), 200 * k, 5 * k)
    g.fillRect(X(-45), Z(-12), 5 * k, 87 * k)
    g.fillStyle = "#5a7f9a"
    g.beginPath()
    g.ellipse(X(88), Z(-38), 26 * k, 10 * k, 0.2, 0, 7)
    g.fill()

    for (let i = 0; i < 70000; i++) {
      g.fillStyle = R() < 0.5 ? "rgba(255,235,170,.28)" : "rgba(30,20,10,.22)"
      g.fillRect(R() * S, R() * S, 2, 2)
    }

    const tex = new T.CanvasTexture(cv)
    tex.anisotropy = 8
    const gnd = new T.Mesh(
      new T.PlaneGeometry(200, 200),
      new T.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 1.5, roughness: 1, metalness: 0 })
    )
    gnd.rotation.x = -Math.PI / 2
    gnd.receiveShadow = true
    scene.add(gnd)

    // Expanded World Rolling Hills
    const fc = document.createElement("canvas")
    fc.width = fc.height = 2048
    const fg = fc.getContext("2d")!
    fg.fillStyle = "#6a8c3c"
    fg.fillRect(0, 0, 2048, 2048)
    const pal = ["#d3b068", "#c9a257", "#6f8f3e", "#7a9a45", "#5e402a", "#b99a52", "#86a24c", "#658535"]
    for (let i = 0; i < 280; i++) {
      const w = 60 + R() * 220,
        h = 40 + R() * 170,
        x = R() * 2048,
        y = R() * 2048,
        vv = R() < 0.5
      fg.fillStyle = pal[(R() * pal.length) | 0]
      fg.fillRect(x, y, w, h)
      fg.fillStyle = "rgba(0,0,0,.08)"
      if (vv) for (let j = 0; j < w; j += 4) fg.fillRect(x + j, y, 1.5, h)
      else for (let j = 0; j < h; j += 4) fg.fillRect(x, y + j, w, 1.5)
    }
    fg.fillStyle = "#2f4a22"
    for (let i = 0; i < 110; i++) {
      R() < 0.5 ? fg.fillRect(R() * 2048, R() * 2048, 60 + R() * 260, 5) : fg.fillRect(R() * 2048, R() * 2048, 5, 60 + R() * 260)
    }

    const fgeo = new T.PlaneGeometry(1600, 1600, 100, 100)
    const fp = fgeo.attributes.position
    for (let i = 0; i < fp.count; i++) {
      const x = fp.getX(i),
        y = fp.getY(i),
        r = Math.hypot(x, y),
        e = Math.min(1, Math.max(0, (r - 300) / 260))
      fp.setZ(
        i,
        e *
          e *
          (30 +
            26 * Math.sin(x * 0.011 + 1) * Math.cos(y * 0.014) +
            14 * Math.sin(x * 0.035 + y * 0.03))
      )
    }
    fgeo.computeVertexNormals()
    const ft = new T.CanvasTexture(fc)
    ft.anisotropy = 8
    const far = new T.Mesh(fgeo, new T.MeshLambertMaterial({ map: ft }))
    far.rotation.x = -Math.PI / 2
    far.position.y = -0.7
    far.receiveShadow = true
    scene.add(far)

    // Green Farm Mask (Gat Area Highlight)
    const mcv = document.createElement("canvas")
    mcv.width = mcv.height = 1024
    const mg = mcv.getContext("2d")!
    const mk2 = 1024 / 200
    ;[
      [[-40, -12], [-8, -12], [-4, 24], [-40, 24]],
      [[-40, 31], [-4, 31], [-2, 75], [-40, 75]],
      [[-100, 31], [-45, 31], [-45, 75], [-100, 75]],
    ].forEach((p) => {
      mg.beginPath()
      p.forEach(([x, z], i) => mg[i ? "lineTo" : "moveTo"]((x + 100) * mk2, (z + 100) * mk2))
      mg.closePath()
      mg.fillStyle = "rgba(30,215,165,.55)"
      mg.fill()
      mg.strokeStyle = "rgba(170,255,230,.95)"
      mg.lineWidth = 3
      mg.stroke()
    })

    const mu = { rv: { value: 1 }, t: { value: 0 }, tx: { value: new T.CanvasTexture(mcv) } }
    const mask = new T.Mesh(
      new T.PlaneGeometry(200, 200),
      new T.ShaderMaterial({
        uniforms: mu,
        transparent: true,
        depthWrite: false,
        vertexShader: `varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec2 v;uniform sampler2D tx;uniform float rv,t;
void main(){
  vec4 c=texture2D(tx,v);float s=v.x*.6+(1.-v.y)*.4;float e=rv*1.3;
  float a=1.-smoothstep(e-.15,e,s);
  float gl=exp(-pow((s-e+.07)*16.,2.))*step(.001,rv)*step(rv,.98);
  float pu=.85+.15*sin(t*1.5+s*9.);
  gl_FragColor=vec4(mix(c.rgb,vec3(.8,1.,.95),gl*.6),c.a*a*pu+gl*c.a*.5);
}`,
      })
    )
    mask.rotation.x = -Math.PI / 2
    mask.position.y = 0.08
    mask.renderOrder = 1
    scene.add(mask)

    // Cattle & Fence
    const od = new T.Object3D()
    const cows = new T.InstancedMesh(new T.BoxGeometry(2.2, 1.3, 0.9), new T.MeshLambertMaterial({ color: 0xffffff }), 44)
    for (let i = 0; i < 44; i++) {
      const a = i < 24
      od.position.set(a ? -95 + R() * 190 : -320 + R() * 640, a ? 0.65 : -0.05, a ? 82 + R() * 14 : 105 + R() * 180)
      od.rotation.set(0, R() * 6.28, 0)
      od.updateMatrix()
      cows.setMatrixAt(i, od.matrix)
      cows.setColorAt(i, new T.Color().setHSL(0.07, 0.3, R() < 0.5 ? 0.04 : 0.12 + R() * 0.1))
    }
    cows.castShadow = true
    scene.add(cows)

    const fpo = new T.InstancedMesh(new T.BoxGeometry(0.25, 1.4, 0.25), new T.MeshLambertMaterial({ color: 0x7a6248 }), 67)
    for (let i = 0; i < 67; i++) {
      od.position.set(-100 + i * 3, 0.7, 77)
      od.rotation.set(0, 0, 0)
      od.updateMatrix()
      fpo.setMatrixAt(i, od.matrix)
    }
    fpo.castShadow = true
    scene.add(fpo)
    ;[1.2, 0.7].forEach((y) =>
      scene.add(
        new T.Line(
          new T.BufferGeometry().setFromPoints([new T.Vector3(-100, y, 77), new T.Vector3(100, y, 77)]),
          new T.LineBasicMaterial({ color: 0x6a5a44 })
        )
      )
    )

    // Helpers
    const M = (c: number) => new T.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.15 })
    function box(w: number, h: number, d: number, c: number, x: number, y: number, z: number, p?: THREE.Object3D) {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), M(c))
      m.position.set(x, y, z)
      m.castShadow = m.receiveShadow = true
      ;(p || scene).add(m)
      return m
    }
    function cyl(rt: number, rb: number, h: number, c: number, x: number, y: number, z: number, p?: THREE.Object3D, s?: number) {
      const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, s || 20), M(c))
      m.position.set(x, y, z)
      m.castShadow = true
      ;(p || scene).add(m)
      return m
    }

    // Farm Infrastructure (Silos & Warehouses)
    const farm = new T.Group()
    farm.position.set(-2, 0, -34)
    scene.add(farm)
    box(16, 6, 9, 0xb9c7d6, -10, 3, 0, farm)
    const roof = cyl(5.2, 5.2, 16.4, 0x7d93ad, -10, 6, 0, farm, 3)
    roof.rotation.set(Math.PI / 2, 0, Math.PI / 2)
    roof.scale.set(1, 1, 0.55)
    roof.position.y = 6.6
    box(14, 0.1, 0.1, 0x333333, -10, 0, 4.6, farm)
    for (let i = 0; i < 3; i++) {
      const x = 5 + i * 5.2
      cyl(2.3, 2.3, 13, 0xc9d2da, x, 6.5, 0, farm)
      cyl(0, 2.4, 2.4, 0x9fb0c0, x, 14.2, 0, farm)
    }
    cyl(0.3, 0.3, 16, 0x888888, 10, 11, 0, farm, 6).rotation.z = 1.5
    box(14, 3.5, 6, 0xe6e8ea, 20, 1.75, 8, farm)
    const r2 = cyl(3.6, 3.6, 14.2, 0x4a79b8, 20, 4.4, 8, farm, 3)
    r2.rotation.set(Math.PI / 2, 0, Math.PI / 2)
    r2.scale.set(1, 1, 0.4)
    box(10, 2.5, 5, 0xe6e8ea, 32, 1.25, 2, farm)
    box(10, 0.4, 5.6, 0x4a79b8, 32, 2.8, 2, farm)

    // Pylons
    function pylon(x: number, z: number, h: number) {
      const m = new T.Mesh(new T.ConeGeometry(3.2, h, 4, 3, true), new T.MeshBasicMaterial({ color: 0x4a4a44, wireframe: true }))
      m.position.set(x, h / 2, z)
      m.rotation.y = Math.PI / 4
      scene.add(m)
      const a = [-5, 0, 5]
      return a.map((o) => new T.Vector3(x + o, h * 0.8, z))
    }
    const pp = [pylon(-70, -62, 36), pylon(0, -70, 36), pylon(70, -62, 36)]
    for (let j = 0; j < 3; j++) {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i < 3; i++) pts.push(pp[i][j])
      const cur = new T.CatmullRomCurve3(pts.map((p, i) => (i === 1 ? p.clone().add(new T.Vector3(0, -3, 0)) : p)))
      scene.add(new T.Line(new T.BufferGeometry().setFromPoints(cur.getPoints(60)), new T.LineBasicMaterial({ color: 0x222222 })))
    }

    // Trees
    const tg = new T.ConeGeometry(2.2, 6, 7)
    const tm = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 })
    const N = 520
    const trees = new T.InstancedMesh(tg, tm, N)
    const d = new T.Object3D()
    for (let i = 0; i < N; i++) {
      const t = i / N
      const x = -110 + t * 220 + R() * 3
      const z = -50 - Math.sin(t * 6) * 3 - R() * 9
      const s = 0.8 + R() * 0.9
      d.position.set(x, 3 * s, z)
      d.scale.set(s, s, s)
      d.updateMatrix()
      trees.setMatrixAt(i, d.matrix)
      trees.setColorAt(i, new T.Color().setHSL(0.24 + R() * 0.08, 0.5, 0.07 + R() * 0.08))
    }
    trees.castShadow = true
    scene.add(trees)

    // Hay bales
    for (let i = 0; i < 16; i++) {
      const b = cyl(1.4, 1.4, 1.8, 0xd9b34a, -95 + R() * 85, 1.4, -28 - R() * 60, undefined, 12)
      b.rotation.z = Math.PI / 2
    }

    // Cut Map for Wheat Field
    const CV = document.createElement("canvas")
    CV.width = CV.height = 512
    const cx = CV.getContext("2d")!
    cx.fillStyle = "#000"
    cx.fillRect(0, 0, 512, 512)
    const cuB = new T.CanvasTexture(CV)
    const cutPlane = new T.Mesh(
      new T.PlaneGeometry(96, 92),
      new T.MeshLambertMaterial({ color: 0x5e402a, transparent: true, alphaMap: cuB, depthWrite: false })
    )
    cutPlane.rotation.x = -Math.PI / 2
    cutPlane.position.set(52, 0.05, 32)
    cutPlane.receiveShadow = true
    scene.add(cutPlane)

    // Wheat Field
    const WN = 75000
    const wg = new T.PlaneGeometry(0.55, 3.2, 1, 3)
    wg.translate(0, 1.6, 0)
    const whg = { value: 0.3 }
    const wu = { value: 0 }
    const wm = new T.MeshLambertMaterial({ color: 0xffffff, side: T.DoubleSide })
    wm.onBeforeCompile = (s) => {
      s.uniforms.t = wu
      s.uniforms.gh = whg
      s.vertexShader =
        "uniform float gh;uniform float t;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          `vec3 transformed=position;vec4 wp=instanceMatrix*vec4(position,1.);
float w=sin(t*1.6+wp.x*.12+wp.z*.09)*.5+sin(t*2.7+wp.z*.2)*.25;
transformed.x+=w*position.y*position.y*.12;
transformed.z+=w*position.y*position.y*.06;
transformed.y*=gh;`
        )
    }
    const wh = new T.InstancedMesh(wg, wm, WN)
    for (let i = 0; i < WN; i++) {
      d.position.set(6 + R() * 93, 0, -12 + R() * 86)
      d.rotation.set(0, R() * 6.28, 0)
      d.scale.set(1, 0.7 + R() * 0.6, 1)
      d.updateMatrix()
      wh.setMatrixAt(i, d.matrix)
      wh.setColorAt(i, new T.Color().setHSL(0.11 + R() * 0.025, 0.5, 0.26 + R() * 0.14))
    }
    scene.add(wh)

    // CPU Cutting Grid
    const WA = wh.instanceMatrix.array as Float32Array
    const WO = WA.slice()
    const CS = 4
    const GW = 24
    const GH = 23
    const cells: number[][] = Array.from({ length: GW * GH }, () => [])
    const cutF = new Uint8Array(WN)
    let cutDirty = false

    for (let i = 0; i < WN; i++) {
      const a = Math.floor((WA[i * 16 + 12] - 4) / CS)
      const b = Math.floor((WA[i * 16 + 14] + 14) / CS)
      if (a >= 0 && a < GW && b >= 0 && b < GH) cells[b * GW + a].push(i)
    }

    function cutRect(x0: number, x1: number, z0: number, z1: number) {
      for (let cz = Math.max(0, Math.floor((z0 + 14) / CS)); cz <= Math.min(GH - 1, Math.floor((z1 + 14) / CS)); cz++) {
        for (let ci = Math.max(0, Math.floor((x0 - 4) / CS)); ci <= Math.min(GW - 1, Math.floor((x1 - 4) / CS)); ci++) {
          for (const i of cells[cz * GW + ci]) {
            if (cutF[i]) continue
            const o = i * 16
            const x = WA[o + 12]
            const z = WA[o + 14]
            if (x < x0 || x > x1 || z < z0 || z > z1) continue
            cutF[i] = 1
            WA[o] *= 0.5
            WA[o + 1] *= 0.5
            WA[o + 2] *= 0.5
            WA[o + 4] *= 0.12
            WA[o + 5] *= 0.12
            WA[o + 6] *= 0.12
            WA[o + 8] *= 0.5
            WA[o + 9] *= 0.5
            WA[o + 10] *= 0.5
            cutDirty = true
          }
        }
      }
    }

    // Harvest Dust
    const dc = document.createElement("canvas")
    dc.width = dc.height = 64
    const dg = dc.getContext("2d")!
    const gr = dg.createRadialGradient(32, 32, 0, 32, 32, 32)
    gr.addColorStop(0, "rgba(255,240,200,.9)")
    gr.addColorStop(1, "rgba(255,240,200,0)")
    dg.fillStyle = gr
    dg.fillRect(0, 0, 64, 64)
    const DN = 120
    const dpos = new Float32Array(DN * 3).fill(-100)
    const dust = new T.Points(
      new T.BufferGeometry().setAttribute("position", new T.BufferAttribute(dpos, 3)),
      new T.PointsMaterial({
        map: new T.CanvasTexture(dc),
        size: 7,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        color: 0xe8d3a0,
      })
    )
    dust.frustumCulled = false
    scene.add(dust)
    let dI = 0

    // Clouds
    const cc = document.createElement("canvas")
    cc.width = 256
    cc.height = 128
    const cg = cc.getContext("2d")!
    for (let i = 0; i < 28; i++) {
      const x = 40 + R() * 176,
        y = 40 + R() * 50,
        r = 22 + R() * 26,
        q = cg.createRadialGradient(x, y, 0, x, y, r)
      q.addColorStop(0, "rgba(255,255,255,.35)")
      q.addColorStop(1, "rgba(255,255,255,0)")
      cg.fillStyle = q
      cg.fillRect(0, 0, 256, 128)
    }
    const cmat = new T.SpriteMaterial({ map: new T.CanvasTexture(cc), transparent: true, depthWrite: false, fog: false })
    const clouds: THREE.Sprite[] = []
    for (let i = 0; i < 9; i++) {
      const s = new T.Sprite(cmat)
      s.scale.set(220, 110, 1)
      s.position.set(-400 + R() * 800, 150 + R() * 60, -350 - R() * 100)
      scene.add(s)
      clouds.push(s)
    }

    // Combine Harvester Model
    function createCombine() {
      const c = new T.Group()
      const B = (w: number, h: number, d: number, col: number, x: number, y: number, z: number) => box(w, h, d, col, x, y, z, c)
      const G = 0x1f7a3a
      const K = 0x20252d
      const Y = (rt: number, h: number, col: number, x: number, y: number, z: number, s?: number) => cyl(rt, rt, h, col, x, y, z, c, s || 16)

      B(7.2, 1.5, 3.6, G, 0, 1.9, 0)
      B(5.4, 1.7, 3.9, G, -0.9, 3.45, 0)
      B(4.8, 0.9, 4.1, 0x232a35, -1.1, 4.75, 0)
      B(4.2, 0.35, 3.4, 0x2c3440, -1.1, 5.35, 0)
      B(2.5, 2.2, 2.9, 0x1a2430, 2.2, 4.55, 0)
      B(2.8, 0.28, 3.2, 0xdfe3e6, 2.2, 5.78, 0)
      B(0.06, 1.6, 2.5, 0x8fc0da, 3.47, 4.6, 0)
      B(1.9, 1.3, 0.06, 0x8fc0da, 2.2, 4.7, 1.48)
      B(1.9, 1.3, 0.06, 0x8fc0da, 2.2, 4.7, -1.48)
      ;[-1, 1].forEach((s) => {
        B(0.15, 0.15, 0.15, 0xffd84a, 3.2, 5.95, s * 1.3)
        B(0.1, 0.35, 0.25, 0xdd3322, -4.6, 3.4, s * 1.6)
        Y(1.3, 0.95, 0x15171a, 2.3, 1.3, s * 2.2, 24).rotation.x = Math.PI / 2
        Y(0.62, 1, 0xc3302a, 2.3, 1.3, s * 2.2, 12).rotation.x = Math.PI / 2
        Y(0.85, 0.7, 0x15171a, -3.2, 0.85, s * 1.7, 20).rotation.x = Math.PI / 2
        Y(0.4, 0.75, 0xc3302a, -3.2, 0.85, s * 1.7, 10).rotation.x = Math.PI / 2
        B(2.4, 0.2, 1.3, G, 2.3, 2.65, s * 2.2)
      })
      Y(0.38, 7, K, -0.2, 5.9, 2.15).rotation.z = Math.PI / 2
      Y(0.38, 3.2, K, 3.4, 4.1, 2.15)
      B(0.5, 0.5, 0.5, K, 3.4, 5.7, 2.15)
      Y(0.13, 1.5, 0x555b60, 0.8, 6.2, -1.5, 8)
      B(2, 1.9, 3.4, G, 4.5, 1.7, 0)
      B(1.5, 0.9, 9.8, 0x2a8a3a, 5.7, 1.2, 0)
      B(0.1, 0.12, 9.8, 0xb5b9bd, 6.5, 0.55, 0)
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * 6.283
        B(0.1, 0.1, 9.6, 0x1c2229, 6.2 + Math.cos(a) * 0.95, 2.4 + Math.sin(a) * 0.95, 0)
      }
      Y(0.25, 9.6, 0x1c2229, 6.2, 2.4, 0).rotation.x = Math.PI / 2
      for (let z = -4.8; z < 5; z += 2.4) B(0.1, 1.9, 0.1, 0x1c2229, 5.3, 2.3, z)
      B(0.1, 0.1, 9.8, 0x1c2229, 5.3, 3.25, 0)
      B(0.1, 2.4, 0.9, 0x333333, 1.4, 2.2, 1.95)
      return c
    }
    const cb = createCombine()
    cb.scale.setScalar(1.5)
    scene.add(cb)

    // Tractor on Road
    const tr = new T.Group()
    box(3, 2, 2.4, 0x2f7a2f, 0, 1.8, 0, tr)
    box(2, 1.4, 2.2, 0x2f7a2f, 1.6, 1.2, 0, tr)
    ;[1.6, -1.2].forEach((x) =>
      [1.4, -1.4].forEach((z) => {
        cyl(0.9, 0.9, 0.5, 0x111111, x, 0.9, z, tr, 12).rotation.x = 1.57
      })
    )
    box(5, 1.2, 2.6, 0x9a9a9a, -5, 1.4, 0, tr)
    tr.scale.setScalar(1.3)
    scene.add(tr)

    // Rain Particle System
    const RN = 4000
    const rp = new Float32Array(RN * 6)
    for (let i = 0; i < RN; i++) {
      const x = -130 + R() * 260,
        y = R() * 90,
        z = -110 + R() * 230
      rp.set([x, y, z, x + 0.4, y - 2.2, z], i * 6)
    }
    const rain = new T.LineSegments(
      new T.BufferGeometry().setAttribute("position", new T.BufferAttribute(rp, 3)),
      new T.LineBasicMaterial({ color: 0xb8cee0, transparent: true, opacity: 0, fog: false, depthWrite: false })
    )
    rain.frustumCulled = false
    scene.add(rain)

    // Night Stars
    const sp2 = new Float32Array(2700)
    for (let i = 0; i < 900; i++) {
      const u = R() * 6.283,
        v = Math.acos(R()),
        r = 1300
      sp2.set([r * Math.sin(v) * Math.cos(u), r * Math.cos(v), r * Math.sin(v) * Math.sin(u)], i * 3)
    }
    const stars = new T.Points(
      new T.BufferGeometry().setAttribute("position", new T.BufferAttribute(sp2, 3)),
      new T.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })
    )
    stars.frustumCulled = false
    scene.add(stars)

    // Camera Orbit State
    let th = 0.35,
      ph = 1.02,
      rad = 135,
      tth = th,
      tph = ph,
      trad = rad,
      drag: [number, number] | null = null,
      idle = 0
    const tgt = new T.Vector3(-5, 0, 10)
    const cvs = ren.domElement

    const onPointerDown = (e: PointerEvent) => {
      drag = [e.clientX, e.clientY]
      try {
        cvs.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!drag) return
      tth -= (e.clientX - drag[0]) * 0.004
      tph = Math.min(1.5, Math.max(0.15, tph - (e.clientY - drag[1]) * 0.004))
      drag = [e.clientX, e.clientY]
      idle = 0
    }
    const onPointerUp = () => {
      drag = null
    }
    const onWheel = (e: WheelEvent) => {
      trad = Math.min(380, Math.max(18, trad + e.deltaY * (trad > 60 ? 0.08 : 0.03)))
      e.preventDefault()
    }
    let fol = false
    const onDblClick = () => {
      fol = !fol
      trad = fol ? 32 : 135
    }

    cvs.addEventListener("pointerdown", onPointerDown)
    cvs.addEventListener("pointermove", onPointerMove)
    cvs.addEventListener("pointerup", onPointerUp)
    cvs.addEventListener("wheel", onWheel, { passive: false })
    cvs.addEventListener("dblclick", onDblClick)

    const onResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      ren.setSize(w, h)
      cam.aspect = w / h
      cam.updateProjectionMatrix()
    }
    window.addEventListener("resize", onResize)

    // ── Season Time-Lapse & Day/Night ─────────────────────────────────────────
    const CYC = 6
    const DUR = 110
    const sst = (a: number, b: number, x: number) => {
      x = Math.min(1, Math.max(0, (x - a) / (b - a)))
      return x * x * (3 - 2 * x)
    }
    const lrp = (a: number, b: number, t: number) => a + (b - a) * t
    const MN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL"]
    const ML = [31, 28, 31, 30, 31, 30, 31]

    const cA = new T.Color()
    const cB = new T.Color()
    const HZD = new T.Color(0x9c8c6e)
    const HZS = new T.Color(0xe0905a)
    const HZN = new T.Color(0x070a14)
    const HZR = new T.Color(0x70767c)
    const ZD = new T.Color(0.3, 0.5, 0.8)
    const ZN = new T.Color(0.01, 0.02, 0.06)
    const ZR = new T.Color(0.42, 0.45, 0.5)
    const SUNW = new T.Color(0xfff0d0)
    const SUNO = new T.Color(0xff9a50)
    const MOON = new T.Color(0x8aa4ff)

    function tlUpdate(dt: number) {
      if (playingRef.current) {
        progRef.current += dt / DUR
        if (progRef.current > 1) progRef.current -= 1
        setTimelinePct(Math.round(progRef.current * 100))
      }
      const prog = progRef.current
      const dp = (prog * CYC + 0.06) % 1
      const a = dp * 6.2832
      const e = Math.sin(a)
      const sx = -Math.cos(a) * 150
      const sy = e * 110
      const dayK = sst(-0.08, 0.22, e)
      const rainK = sst(0.36, 0.46, prog) * (1 - sst(0.58, 0.68, prog))
      const warm = 1 - sst(0, 0.45, e)

      if (e > -0.04) sun.position.set(sx, Math.max(sy, 6), -80)
      else sun.position.set(-sx, -sy * 0.6 + 30, -80)

      if (e > -0.04) sun.color.copy(SUNW).lerp(SUNO, warm * 0.85)
      else sun.color.copy(MOON)

      sun.intensity = Math.max(1.9 * dayK * (1 - 0.6 * rainK), 0.38 * (1 - dayK))
      hemi.intensity = 0.14 + 0.62 * dayK * (1 - 0.4 * rainK)

      const u = sky.material.uniforms
      u.sd.value.set(sx, sy, -80).normalize()

      cA.copy(HZD).lerp(HZS, warm * 0.75 * dayK)
      cA.lerp(HZR, rainK * 0.75 * dayK)
      cA.lerp(HZN, 1 - dayK * 0.96)
      u.hz.value.copy(cA)
      scene.fog!.color.copy(cA)
      ;(scene.fog as THREE.FogExp2).density = 0.0024 + 0.004 * rainK

      cB.copy(ZD).lerp(ZR, rainK * 0.8)
      cB.lerp(ZN, 1 - dayK)
      u.zn.value.copy(cB)

      stars.material.opacity = (1 - sst(-0.1, 0.12, e)) * (1 - rainK)
      rain.material.opacity = 0.45 * rainK
      rain.visible = rainK > 0.02

      const g = 0.12 + 0.88 * dayK
      cmat.color.setRGB(g * (1 - 0.45 * rainK), g * (1 - 0.4 * rainK), g * (1 - 0.35 * rainK))
      cmat.opacity = 0.7 + 0.3 * rainK

      ;(gnd.material as THREE.MeshStandardMaterial).color.setScalar(1 - 0.28 * rainK)
      ;(gnd.material as THREE.MeshStandardMaterial).roughness = 1 - 0.4 * rainK

      const gr = sst(0.2, 0.85, prog)
      whg.value = 0.3 + 0.7 * sst(0, 0.75, prog)
      wm.color.setRGB(lrp(0.5, 1, gr), lrp(0.9, 1, gr), lrp(0.4, 1, gr))

      const work = prog > 0.7
      cb.visible = tr.visible = dust.visible = work

      let m = 0
      let dd = Math.floor(prog * 210)
      while (m < 6 && dd >= ML[m]) {
        dd -= ML[m]
        m++
      }
      const hr = (dp * 24 + 6) % 24
      const timeStr =
        (e > 0.05 ? "☀ " : "☾ ") +
        String(Math.floor(hr)).padStart(2, "0") +
        ":" +
        String(Math.floor((hr % 1) * 60)).padStart(2, "0") +
        " · " +
        (dd + 1) +
        " " +
        MN[m] +
        (rainK > 0.15 ? " · ☂" : "")
      setClockText(timeStr)

      if (rain.visible) {
        const p = rain.geometry.attributes.position.array as Float32Array
        for (let i = 0; i < RN; i++) {
          const o = i * 6
          let y = p[o + 1] - dt * 70
          if (y < 0) y += 90
          const dy = y - p[o + 1]
          p[o + 1] = y
          p[o + 4] += dy
          p[o] += dt * 3
          p[o + 3] += dt * 3
          if (p[o] > 130) {
            p[o] -= 260
            p[o + 3] -= 260
          }
        }
        rain.geometry.attributes.position.needsUpdate = true
      }
    }

    // ── Animation Loop ────────────────────────────────────────────────────────
    const clock = new T.Clock()
    let lastRow = 0
    let fc2 = 0
    const home = new T.Vector3(-5, 0, 10)

    function loop() {
      reqIdRef.current = requestAnimationFrame(loop)
      const dt = Math.min(clock.getDelta(), 0.05)
      const t = clock.elapsedTime

      // Combine Boustrophedon
      const L = 82
      const sp = 7
      const u = (t * sp) / L
      const i = Math.floor(u)
      const fr = u - i
      const ev = i % 2 === 0
      const turn = fr > 0.93 ? (fr - 0.93) / 0.07 : 0
      const sm = turn * turn * (3 - 2 * turn)

      cb.position.set(ev ? 12 + fr * L : 94 - fr * L, 0, 4 + (i % 7) * 8 + sm * 8)
      const yaw = ev ? 0 : Math.PI
      cb.rotation.y = -yaw

      wu.value = t
      mu.t.value = t
      tlUpdate(dt)

      clouds.forEach((c) => {
        c.position.x += dt * 2
        if (c.position.x > 450) c.position.x = -450
      })

      // Dust Trail
      for (let j = 0; j < DN; j++) {
        dpos[j * 3 + 1] += dt * 1.2
        dpos[j * 3] += dt * 0.8
      }
      const o = (dI++ % DN) * 3
      dpos[o] = cb.position.x + (ev ? -6 : 6) + R() * 3 - 1.5
      dpos[o + 1] = 1 + R() * 2
      dpos[o + 2] = cb.position.z + R() * 5 - 2.5
      dust.geometry.attributes.position.needsUpdate = true

      if (i % 7 === 0 && lastRow % 7 !== 0) {
        cx.fillStyle = "#000"
        cx.fillRect(0, 0, 512, 512)
        cuB.needsUpdate = true
        WA.set(WO)
        cutF.fill(0)
        wh.instanceMatrix.needsUpdate = true
      }
      lastRow = i

      if (progRef.current > 0.7) {
        const hx = cb.position.x + (ev ? 9.75 : -9.75)
        cx.fillStyle = "#fff"
        cx.fillRect((hx - 2.5 - 4) * 5.333, (cb.position.z - 7.3 + 14) * 5.565, 5 * 5.333, 14.6 * 5.565)
        cutRect(hx - 2.5, hx + 2.5, cb.position.z - 7.3, cb.position.z + 7.3)
        if ((fc2++ & 3) === 0) {
          cuB.needsUpdate = true
          if (cutDirty) {
            wh.instanceMatrix.needsUpdate = true
            cutDirty = false
          }
        }
      }

      // Tractor on road
      const tp = (Math.sin(t * 0.12) + 1) / 2
      tr.position.set(-95 + tp * 50, 0, 28.5)
      tr.rotation.y = Math.cos(t * 0.12) > 0 ? Math.PI : 0

      // Camera lerp
      if (!drag) {
        idle += dt
        if (idle > 3) tth += Math.sin(t * 0.1) * 0.0006
      }
      tgt.lerp(fol ? cb.position : home, 0.04)
      th += (tth - th) * 0.05
      ph += (tph - ph) * 0.05
      rad += (trad - rad) * 0.05
      cam.position.set(
        tgt.x + rad * Math.sin(ph) * Math.sin(th),
        tgt.y + rad * Math.cos(ph),
        tgt.z + rad * Math.sin(ph) * Math.cos(th)
      )
      cam.lookAt(tgt)

      ren.render(scene, cam)
    }

    loop()

    // ── Sensor Sparklines & Telemetry Interval ───────────────────────────────
    const hist: number[][] = [[], [], []]
    const baseVals = [27.3, 20.6, 18.2]
    for (let i = 0; i < 30; i++) {
      hist.forEach((h, j) => h.push(baseVals[j] + Math.sin(i * 0.5 + j) * 2 + R() * 1.5))
    }

    const calcSparkline = (arr: number[], min: number, max: number) => {
      return arr
        .map((y, idx) => {
          const x = ((idx / (arr.length - 1)) * 100).toFixed(1)
          const normY = (34 - ((y - min) / (max - min)) * 28).toFixed(1)
          return `${x},${normY}`
        })
        .join(" ")
    }

    const updateSensors = () => {
      hist.forEach((h, j) => {
        h.shift()
        h.push(baseVals[j] + Math.sin(performance.now() / 2000 + j * 2) * 2.2 + R() * 1.8)
      })
      const curTemp = hist[0][hist[0].length - 1]
      const curHum = hist[1][hist[1].length - 1]
      const curRain = hist[2][hist[2].length - 1]

      setTempVal(parseFloat(curTemp.toFixed(1)))
      setHumVal(parseFloat(curHum.toFixed(1)))
      setRainVal(parseFloat(curRain.toFixed(1)))

      setTempPath(calcSparkline(hist[0], 20, 35))
      setHumPath(calcSparkline(hist[1], 12, 30))
      setRainPath(calcSparkline(hist[2], 10, 28))

      setSiloTemps([
        parseFloat((31.2 + R() * 0.4 - 0.2).toFixed(1)),
        parseFloat((33.1 + R() * 0.4 - 0.2).toFixed(1)),
        parseFloat((30.9 + R() * 0.4 - 0.2).toFixed(1)),
      ])
      setWhTemps([
        parseFloat((31.2 + R() * 0.3).toFixed(1)),
        parseFloat((33.1 + R() * 0.3).toFixed(1)),
      ])
    }

    updateSensors()
    sensorTimerRef.current = window.setInterval(updateSensors, 1200)

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current)
      if (sensorTimerRef.current) clearInterval(sensorTimerRef.current)
      window.removeEventListener("resize", onResize)
      cvs.removeEventListener("pointerdown", onPointerDown)
      cvs.removeEventListener("pointermove", onPointerMove)
      cvs.removeEventListener("pointerup", onPointerUp)
      cvs.removeEventListener("wheel", onWheel)
      cvs.removeEventListener("dblclick", onDblClick)
      try {
        ren.dispose()
        if (container.contains(ren.domElement)) {
          container.removeChild(ren.domElement)
        }
      } catch {
        /* ignore */
      }
    }
  }, [])

  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL"]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#12160e] text-white select-none animate-fadeIn">
      {/* ── Top Bar: Farmer Profile & Year (Strictly No Marketing Blurbs) ───── */}
      <div className="relative z-10 flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-emerald-900/30">
            {farmer.farmerName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white">{farmer.farmerName}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {farmer.commodity || (isEn ? "Soybean MAUS-71" : "सोयाबीन")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/70 mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="size-3 text-emerald-400" />
                {farmer.village}{farmer.taluka ? `, ${farmer.taluka}` : ""}, {farmer.district}
              </span>
              <span>·</span>
              <span className="font-mono text-emerald-300">Gat No. {farmer.gatNo}</span>
              <span>·</span>
              <span>{farmer.acres} Acres ({farmer.soilType || (isEn ? "Medium Black Soil" : "काळी जमीन")})</span>
            </div>
          </div>
        </div>

        {/* Year & Close Button */}
        <div className="flex items-center gap-4">
          <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-mono font-bold tracking-wider text-emerald-300">
            2026 Season
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
            title="Close"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* ── 3D Viewport ──────────────────────────────────────────────────────── */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Three.js Canvas Container */}
        <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

        {/* Floating Clock / Time of Day */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 backdrop-blur-md text-xs font-mono text-emerald-200 tracking-wider shadow-lg">
          {clockText}
        </div>

        {/* Orbit hint pill */}
        <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-[10px] text-white/50 pointer-events-none">
          Drag to orbit · Scroll to zoom
        </div>

        {/* ── Sensor Data HUD (Only Sensor Telemetry) ───────────────────────── */}
        <div className="absolute left-6 bottom-20 z-10 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl pointer-events-auto">
          {/* Weather Sensors Card */}
          <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 p-3.5 shadow-xl">
            <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase block mb-2">
              Sensor Data · Weather
            </span>
            <div className="space-y-2">
              {/* Temperature */}
              <div className="flex items-center justify-between gap-3">
                <div className="w-24 shrink-0">
                  <span className="text-[10px] text-white/60 block">Temperature</span>
                  <span className="text-sm font-mono font-black text-white">{tempVal} °C</span>
                </div>
                <svg className="h-8 flex-1 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 35">
                  <polyline points={tempPath} fill="none" stroke="#34d399" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>

              {/* Humidity */}
              <div className="flex items-center justify-between gap-3">
                <div className="w-24 shrink-0">
                  <span className="text-[10px] text-white/60 block">Humidity</span>
                  <span className="text-sm font-mono font-black text-white">{humVal} %</span>
                </div>
                <svg className="h-8 flex-1 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 35">
                  <polyline points={humPath} fill="none" stroke="#60a5fa" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>

              {/* Rainfall */}
              <div className="flex items-center justify-between gap-3">
                <div className="w-24 shrink-0">
                  <span className="text-[10px] text-white/60 block">Rainfall</span>
                  <span className="text-sm font-mono font-black text-white">{rainVal} mm</span>
                </div>
                <svg className="h-8 flex-1 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 35">
                  <polyline points={rainPath} fill="none" stroke="#38bdf8" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
            </div>
          </div>

          {/* Storage Silo & Warehouse Probes Card */}
          <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 p-3.5 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase block mb-2">
                Sensor Data · Silo Probes
              </span>
              <div className="grid grid-cols-3 gap-2">
                {siloTemps.map((val, idx) => (
                  <div key={idx} className="bg-white/5 rounded-xl p-2 border border-white/10 text-center">
                    <span className="text-[9px] text-white/50 block font-mono">Silo 0{idx + 1}</span>
                    <span className="text-xs font-mono font-black text-white">{val} °C</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase block mb-2">
                Sensor Data · Warehouses
              </span>
              <div className="grid grid-cols-2 gap-2">
                {whTemps.map((val, idx) => (
                  <div key={idx} className="bg-white/5 rounded-xl p-2 border border-white/10 text-center">
                    <span className="text-[9px] text-white/50 block font-mono">Warehouse 0{idx + 1}</span>
                    <span className="text-xs font-mono font-black text-white">{val} °C</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Daily Timeline & Month Scrubber (Strictly Timeline Only) ────────── */}
      <div className="relative z-10 bg-black/75 backdrop-blur-md border-t border-white/10 px-6 py-3 flex items-center gap-4">
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="size-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors shrink-0 shadow-md"
          title={isPlaying ? "Pause Timeline" : "Play Timeline"}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
        </button>

        {/* Scrubber Bar */}
        <div
          onClick={handleTimelineClick}
          className="relative flex-1 h-9 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center px-4 cursor-pointer transition-colors group"
        >
          {/* Month labels and tick marks */}
          <div className="w-full flex justify-between items-center text-[10px] font-mono tracking-wider text-white/60">
            {months.map((m, idx) => (
              <div key={m} className="flex flex-col items-center">
                <span className="group-hover:text-emerald-300 transition-colors">{m}</span>
                <div className="w-0.5 h-1.5 bg-white/30 mt-0.5" />
              </div>
            ))}
          </div>

          {/* Current Day / Progress Marker Dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full bg-emerald-400 border-2 border-white shadow-lg pointer-events-none transition-all duration-100 -ml-2"
            style={{ left: `${timelinePct}%` }}
          />
        </div>

        {/* Year Label */}
        <div className="text-xs font-mono text-white/70 shrink-0 font-semibold">
          2026
        </div>
      </div>
    </div>
  )
}
export default FarmDigitalTwinModal

