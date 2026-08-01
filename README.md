import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, Car, Calculator, ShieldCheck, Radio, Lock, Ban,
  CheckCircle2, AlertTriangle, Clock, MapPin, Fingerprint, Camera,
  Gauge, Inbox, ArrowUpRight, QrCode, Search, DoorOpen, Printer, ScanLine,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   PARKOPS ENTERPRISE · SOLVEX · Bogotá D.C.
   Instalación limpia · recibo + QR + tiquete térmico + salida por talanquera
   ═══════════════════════════════════════════════════════════════════ */

/* ---------- Sistema de diseño (torre de control · movilidad) ---------- */
const C = {
  ink: "#0C1618", bg: "#EEF2F1", card: "#FFFFFF", border: "#DCE5E3", sub: "#5B6E6C",
  text: "#0C1618", teal: "#0E7C6B", tealD: "#0B4F4A", tealBright: "#17C3B2",
  gold: "#D6A44A", green: "#158A5A", amber: "#C97A16", red: "#C0392B",
  redBg: "#FBEAE7", greenBg: "#E7F3EC", amberBg: "#FBF1E2", tealBg: "#E4F0EE",
};
const FONT = "'Inter', system-ui, sans-serif";
const DISPLAY = "'Space Grotesk', 'Inter', sans-serif";
const MONO = "'JetBrains Mono', 'Courier New', monospace";

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
.px-root *{box-sizing:border-box;}
.px-root ::-webkit-scrollbar{width:9px;height:9px;}
.px-root ::-webkit-scrollbar-thumb{background:#c3d1ce;border-radius:6px;}
.px-tab{transition:all .15s ease;}
.px-tab:hover{color:#17C3B2 !important;}
.px-btn{transition:all .13s ease;cursor:pointer;border:none;}
.px-btn:hover{filter:brightness(1.08);}
.px-btn:active{transform:translateY(1px);}
.px-row:hover{background:#f3f7f6 !important;}
.px-kpi{transition:transform .13s ease, box-shadow .13s ease;}
@keyframes px-pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
.px-live{animation:px-pulse 1.6s infinite;}
@keyframes px-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
.px-fade{animation:px-in .25s ease both;}
@keyframes px-gate{from{transform:rotate(0deg);}to{transform:rotate(-72deg);}}
.px-gate{transform-origin:left center;animation:px-gate .7s cubic-bezier(.2,.7,.3,1) forwards;}
.px-input{font-family:${MONO};border:1px solid ${C.border};border-radius:8px;padding:9px 11px;font-size:13px;outline:none;background:#fff;width:100%;}
.px-input:focus{border-color:${C.teal};box-shadow:0 0 0 3px ${C.tealBg};}
@media (prefers-reduced-motion: reduce){.px-live,.px-fade,.px-gate{animation:none !important;}}
@media print {
  body{background:#fff;}
  body *{visibility:hidden !important;}
  .px-print, .px-print *{visibility:visible !important;}
  .px-print{position:fixed !important;left:0;top:0;margin:0;width:80mm;box-shadow:none !important;border:none !important;border-radius:0 !important;}
}
`;

/* ---------- Formato Colombia ---------- */
const cop = (n) => "$ " + Math.round(n || 0).toLocaleString("es-CO");
const num = (n) => Math.round(n || 0).toLocaleString("es-CO");
const pct = (n) => (n || 0).toFixed(1).replace(".", ",") + " %";
const hhmm = (d) => new Date(d).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
const ddmmaa = (d) => new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); };
const codigoFmt = (n) => "SVX-" + String(n).padStart(6, "0");
const tokenDe = (n) => { const c = codigoFmt(n); return c + "." + fnv(c + "|SVX·PARKOPS·2026").slice(0, 4).toUpperCase(); };

/* ═══════════════ Generador de QR real (byte mode · EC-L · v1–4 · MIT-style) ═══════════════ */
const EXP = new Array(512), LOG = new Array(256);
(function () { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const gmul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
function rsGen(n) { let g = [1]; for (let i = 0; i < n; i++) { const ng = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= gmul(g[j], EXP[i]); } g = ng; } return g; }
function ecCodewords(data, n) { const g = rsGen(n); const res = data.concat(new Array(n).fill(0)); for (let i = 0; i < data.length; i++) { const c = res[i]; if (c !== 0) for (let j = 0; j < g.length; j++) res[i + j] ^= gmul(g[j], c); } return res.slice(data.length); }
const VER = { 1: { size: 21, data: 19, ec: 7, align: [] }, 2: { size: 25, data: 34, ec: 10, align: [18] }, 3: { size: 29, data: 55, ec: 15, align: [22] }, 4: { size: 33, data: 80, ec: 20, align: [26] } };
const MASKS = [
  (r, c) => (r + c) % 2 === 0, (r, c) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];
function fmt15(mask) { const data = (1 << 3) | mask; let d = data << 10; const g = 0x537; for (let i = 14; i >= 10; i--) if ((d >> i) & 1) d ^= g << (i - 10); return ((data << 10) | d) ^ 0x5412; }
function encodeQR(str) {
  const bytes = []; for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); if (c < 128) bytes.push(c); else { bytes.push(63); } }
  let ver = 4; for (const v of [1, 2, 3, 4]) if (bytes.length + 2 <= VER[v].data) { ver = v; break; }
  const info = VER[ver]; const bits = []; const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  put(0b0100, 4); put(bytes.length, 8); for (const b of bytes) put(b, 8);
  const cap = info.data * 8; put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
  const pad = [0xEC, 0x11]; let pi = 0; while (bits.length < cap) put(pad[pi++ % 2], 8);
  const dcw = []; for (let i = 0; i < bits.length; i += 8) { let v = 0; for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j]; dcw.push(v); }
  const all = dcw.concat(ecCodewords(dcw, info.ec)); const final = [];
  for (const cw of all) for (let i = 7; i >= 0; i--) final.push((cw >> i) & 1);
  return { ver, info, final };
}
function penalty(m, n) {
  let p = 0;
  for (let r = 0; r < n; r++) { let run = 1; for (let c = 1; c < n; c++) { if (m[r][c] === m[r][c - 1]) run++; else { if (run >= 5) p += 3 + (run - 5); run = 1; } } if (run >= 5) p += 3 + (run - 5); }
  for (let c = 0; c < n; c++) { let run = 1; for (let r = 1; r < n; r++) { if (m[r][c] === m[r - 1][c]) run++; else { if (run >= 5) p += 3 + (run - 5); run = 1; } } if (run >= 5) p += 3 + (run - 5); }
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) { const v = m[r][c]; if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3; }
  const p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const scan = (g) => { for (let i = 0; i + 11 <= n; i++) { let a = true, b = true; for (let k = 0; k < 11; k++) { const v = g(i + k); if (v !== p1[k]) a = false; if (v !== p2[k]) b = false; } if (a) p += 40; if (b) p += 40; } };
  for (let r = 0; r < n; r++) scan((k) => m[r][k]); for (let c = 0; c < n; c++) scan((k) => m[k][c]);
  let dark = 0; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) dark++;
  p += Math.floor(Math.abs(dark / (n * n) * 100 - 50) / 5) * 10; return p;
}
function buildQR(str) {
  const { info, final } = encodeQR(str); const n = info.size;
  const base = Array.from({ length: n }, () => new Array(n).fill(0));
  const res = Array.from({ length: n }, () => new Array(n).fill(false));
  const setF = (r, c, v) => { base[r][c] = v; res[r][c] = true; };
  const finder = (r, c) => { for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) { const rr = r + i, cc = c + j; if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue; const inb = i >= 0 && i <= 6 && j >= 0 && j <= 6; let v = 0; if (inb) { const bd = i === 0 || i === 6 || j === 0 || j === 6; const inr = i >= 2 && i <= 4 && j >= 2 && j <= 4; v = bd || inr ? 1 : 0; } setF(rr, cc, v); } };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  for (let i = 8; i < n - 8; i++) { setF(6, i, i % 2 === 0 ? 1 : 0); setF(i, 6, i % 2 === 0 ? 1 : 0); }
  for (const a of info.align) for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) setF(a + i, a + j, Math.max(Math.abs(i), Math.abs(j)) !== 1 ? 1 : 0);
  // reservar módulos de formato
  const fmtC = [];
  for (let i = 0; i <= 5; i++) fmtC.push([8, i]); fmtC.push([8, 7], [8, 8], [7, 8]);
  for (let i = 9; i < 15; i++) fmtC.push([14 - i, 8]);
  for (let i = 0; i < 8; i++) fmtC.push([n - 1 - i, 8]);
  for (let i = 8; i < 15; i++) fmtC.push([8, n - 15 + i]);
  fmtC.forEach(([r, c]) => (res[r][c] = true)); res[n - 8][8] = true;
  // ruta de datos (zigzag)
  const path = [];
  for (let right = n - 1; right >= 1; right -= 2) { let rr = right === 6 ? 5 : right; for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) { const col = rr - j; const up = ((rr + 1) & 2) === 0; const row = up ? n - 1 - vert : vert; if (!res[row][col]) path.push([row, col]); } }
  // evaluar máscaras
  let best = null, bestP = Infinity;
  for (let mk = 0; mk < 8; mk++) {
    const m = base.map((r) => r.slice()); const fn = MASKS[mk];
    for (let i = 0; i < path.length; i++) { const [r, c] = path[i]; const v = i < final.length ? final[i] : 0; m[r][c] = v ^ (fn(r, c) ? 1 : 0); }
    const f = fmt15(mk); const b = (i) => (f >> i) & 1;
    for (let i = 0; i <= 5; i++) m[8][i] = b(i); m[8][7] = b(6); m[8][8] = b(7); m[7][8] = b(8);
    for (let i = 9; i < 15; i++) m[14 - i][8] = b(i);
    for (let i = 0; i < 8; i++) m[n - 1 - i][8] = b(i);
    for (let i = 8; i < 15; i++) m[8][n - 15 + i] = b(i);
    m[n - 8][8] = 1;
    const pen = penalty(m, n); if (pen < bestP) { bestP = pen; best = m; }
  }
  return { matrix: best, n };
}
function QR({ value, scale = 4 }) {
  const data = useMemo(() => { try { return buildQR(value); } catch (e) { return null; } }, [value]);
  if (!data) return <div style={{ fontFamily: MONO, fontSize: 9, padding: 8, border: `1px solid ${C.border}` }}>{value}</div>;
  const { matrix, n } = data; const q = 4, dim = n + q * 2; const rects = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (matrix[r][c]) rects.push(<rect key={r + "_" + c} x={c + q} y={r + q} width="1" height="1" fill="#000" />);
  return (
    <svg width={dim * scale} height={dim * scale} viewBox={`0 0 ${dim} ${dim}`} shapeRendering="crispEdges" style={{ background: "#fff", display: "block" }}>
      <rect width={dim} height={dim} fill="#fff" />{rects}
    </svg>
  );
}

/* ═══════════════ Motor de liquidación · Algoritmo T5 ═══════════════ */
function liquidar({ msTranscurridos, tarifaMin, gracia, fraccion, topeDiario, iva = 0.19, servicios = 0, descuentos = 0 }) {
  const minutosBrutos = Math.max(0, Math.ceil(msTranscurridos / 60000));
  let minutosFacturables = Math.max(0, minutosBrutos - gracia);
  const dentroGracia = minutosBrutos > 0 && minutosFacturables === 0;
  if (minutosFacturables > 0 && minutosFacturables < fraccion) minutosFacturables = fraccion;
  let valorTiempo = minutosFacturables * tarifaMin;
  const dias = Math.max(1, Math.ceil(msTranscurridos / 86400000));
  const topeAcum = topeDiario * dias;
  const topeAplicado = valorTiempo > topeAcum; if (topeAplicado) valorTiempo = topeAcum;
  const subtotal = valorTiempo + servicios;
  const baseGravable = Math.max(0, subtotal - descuentos);
  const ivaVal = Math.round(baseGravable * iva);
  const total = Math.round((baseGravable + ivaVal) / 50) * 50;
  return { minutosBrutos, minutosFacturables, dentroGracia, valorTiempo, topeAcum, topeAplicado, subtotal, servicios, descuentos, baseGravable, ivaVal, total, dias };
}

/* ═══════════════ Topes legales verificados · Bogotá 2026 ═══════════════ */
const LEGAL = {
  norma: "Decreto Distrital 026 de 2026",
  detalle: "Modifica arts. 199 y 200 del Decreto Distrital 652 de 2025 (Único del Sector Movilidad)",
  vigenteDesde: "30/01/2026", fuente: "Secretaría Distrital de Movilidad · movilidadbogota.gov.co",
  caps: {
    AUTO: { normal: 230, oro: 253, label: "Automóvil, campero, camioneta y vehículo pesado", ref2025: 191 },
    MOTO: { normal: 161, oro: 177, label: "Motocicleta", ref2025: 134 },
    BICI: { normal: 10, oro: 0, label: "Bicicleta", ref2025: 8 },
  },
};

const SEDE_DEFAULT = {
  id: "S1", nombre: "Sede 1", direccion: "Bogotá D.C.", oro: false, cap: 200,
  tar: { AUTO: { min: 225, gracia: 15, fraccion: 30, tope: 38000 }, MOTO: { min: 158, gracia: 15, fraccion: 30, tope: 22000 } },
};
const PERFILES = ["1 SOCIO", "2 INVITADO", "3 HUÉSPED", "4 EVENTO", "5 AUTORIZADO", "6 CONTRATISTA", "7 FUNCIONARIO"];
const MEDIOS = ["Efectivo", "Datáfono", "PSE", "Nequi", "Bre-B QR", "Mensualidad"];

/* ═══════════════ App ═══════════════ */
export default function App() {
  const [tab, setTab] = useState("board");
  const [tiquetes, setTiquetes] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [nextRecibo, setNextRecibo] = useState(1);
  const [pendingExit, setPendingExit] = useState(null);
  const [sede] = useState(SEDE_DEFAULT);
  const [hoy, setHoy] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setHoy(new Date()), 30000); return () => clearInterval(t); }, []);

  const addAudit = (acc, usr, ent, val) => setBitacora((b) => {
    const prev = b.length ? b[b.length - 1].h : "00000000"; const core = { acc, usr, ent, val, i: b.length };
    return [...b, { ...core, prev, h: fnv(prev + JSON.stringify(core) + core.i), ts: Date.now() }];
  });

  const registrarIngreso = (data) => {
    const recibo = nextRecibo; setNextRecibo((n) => n + 1);
    const tq = { id: Date.now() + Math.random(), recibo, codigo: codigoFmt(recibo), token: tokenDe(recibo), sede: sede.id, ...data, estado: "EN PISO", ingreso: Date.now(), salida: null, total: 0, base: 0, iva: 0, descuentos: 0 };
    setTiquetes((t) => [tq, ...t]);
    addAudit("CREAR_TIQUETE", data.recibe || "Operador", tq.codigo, `${data.placa} · EN PISO · ${data.bahia}`);
    return tq;
  };
  const registrarSalida = (tq, liq, medio, entrega) => {
    setTiquetes((t) => t.map((x) => x.id === tq.id ? { ...x, estado: "ENTREGADO", salida: Date.now(), minutos: liq.minutosBrutos, total: liq.total, base: liq.baseGravable, iva: liq.ivaVal, descuentos: liq.descuentos, medio, entrega } : x));
    addAudit("COBRO", entrega || "Cajero", tq.codigo, `${cop(liq.total)} · ${medio} · talanquera abierta`);
  };
  const registrarCambioTarifa = (detalle, usr) => addAudit("CAMBIO_TARIFA", usr || "Administrador", "tarifa", detalle);

  const irSalida = (tq) => { setPendingExit(tq); setTab("salida"); };

  const tabs = [
    { id: "board", label: "Tablero directivo", icon: LayoutDashboard },
    { id: "op", label: "Operación / Patio", icon: Car },
    { id: "salida", label: "Salida / Talanquera", icon: DoorOpen },
    { id: "tar", label: "Motor tarifario", icon: Calculator },
    { id: "aud", label: "Auditoría", icon: ShieldCheck },
  ];

  return (
    <div className="px-root" style={{ fontFamily: FONT, background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{STYLE}</style>
      <header style={{ background: C.ink, color: "#fff", padding: "13px 22px", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 30, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg,${C.teal},${C.tealBright})`, display: "grid", placeItems: "center" }}><QrCode size={18} color="#fff" /></div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, letterSpacing: "-.01em" }}>PARKOPS <span style={{ color: C.tealBright }}>ENTERPRISE</span></div>
            <div style={{ fontSize: 10.5, color: "#8fb0ab", fontFamily: MONO, letterSpacing: ".04em" }}>SOLVEX · BOGOTÁ D.C.</div>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 4, marginLeft: 8, flexWrap: "wrap" }}>
          {tabs.map((t) => { const on = tab === t.id; const I = t.icon; return (
            <button key={t.id} className="px-tab px-btn" onClick={() => setTab(t.id)} style={{ background: on ? C.teal : "transparent", color: on ? "#fff" : "#a9c4c0", padding: "7px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><I size={14} /> {t.label}</button>
          ); })}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 11, color: "#8fb0ab" }}>
          <span className="px-live" style={{ width: 8, height: 8, borderRadius: 8, background: C.tealBright, display: "inline-block" }} />{sede.nombre} · {ddmmaa(hoy)}
        </div>
      </header>

      <main style={{ padding: "22px", maxWidth: 1320, margin: "0 auto" }}>
        {tab === "board" && <Board tiquetes={tiquetes} irOperar={() => setTab("op")} />}
        {tab === "op" && <Operacion sede={sede} tiquetes={tiquetes} onIngreso={registrarIngreso} onExit={irSalida} />}
        {tab === "salida" && <Salida sede={sede} tiquetes={tiquetes} onSalida={registrarSalida} pending={pendingExit} clearPending={() => setPendingExit(null)} />}
        {tab === "tar" && <Tarifario sede={sede} onCambio={registrarCambioTarifa} />}
        {tab === "aud" && <Auditoria bitacora={bitacora} />}
      </main>

      <footer style={{ textAlign: "center", padding: "18px", color: C.sub, fontSize: 11.5, borderTop: `1px solid ${C.border}` }}>
        Instalación limpia · sin registros precargados. Topes tarifarios: {LEGAL.norma}, en firme {LEGAL.vigenteDesde}.
      </footer>
    </div>
  );
}

/* ---------- primitivos ---------- */
const Card = ({ children, style, className, onClick }) => (<div className={className} onClick={onClick} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, ...style }}>{children}</div>);
const Eyebrow = ({ children }) => (<div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".12em", color: C.teal, fontWeight: 600, textTransform: "uppercase" }}>{children}</div>);
const Section = ({ children }) => (<h2 style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 700, margin: "0 0 2px", letterSpacing: "-.01em" }}>{children}</h2>);
const lbl = { fontSize: 11, fontFamily: MONO, color: C.sub, letterSpacing: ".04em", display: "block", marginBottom: 5, textTransform: "uppercase" };
const pill = { display: "flex", alignItems: "center", gap: 3, background: C.bg, padding: "3px 8px", borderRadius: 6 };
const backdrop = { position: "fixed", inset: 0, background: "rgba(12,22,24,.5)", zIndex: 50, display: "grid", placeItems: "center", padding: 20 };

/* ═══════════════ TABLERO DIRECTIVO ═══════════════ */
function Board({ tiquetes, irOperar }) {
  const K = useMemo(() => {
    const cerrados = tiquetes.filter((m) => m.estado === "ENTREGADO");
    const enPiso = tiquetes.filter((m) => m.estado === "EN PISO").length;
    const ingresos = cerrados.reduce((a, m) => a + m.total, 0);
    const cortesias = tiquetes.reduce((a, m) => a + (m.descuentos || 0), 0);
    const ticket = cerrados.length ? ingresos / cerrados.length : 0;
    const minProm = cerrados.length ? cerrados.reduce((a, m) => a + (m.minutos || 0), 0) / cerrados.length : 0;
    const baseCierre = tiquetes.length - enPiso;
    const cierre = baseCierre > 0 ? Math.min(100, (cerrados.length / baseCierre) * 100) : null;
    const mapDia = {}; cerrados.forEach((m) => { const k = ddmmaa(m.ingreso); mapDia[k] = (mapDia[k] || 0) + m.total; });
    const dias = Object.entries(mapDia).map(([d, ing]) => ({ d: d.slice(0, 5), ing }));
    const mp = {}; cerrados.forEach((m) => (mp[m.medio] = (mp[m.medio] || 0) + m.total));
    const medios = Object.entries(mp).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    return { ingresos, mov: tiquetes.length, ticket, minProm, cierre, enPiso, cortesias, cerrados: cerrados.length, dias, medios };
  }, [tiquetes]);
  const vacio = tiquetes.length === 0;
  const donutCol = [C.teal, C.tealBright, C.gold, C.tealD, C.amber, C.sub];
  const semColor = K.cierre == null ? C.sub : K.cierre >= 97 ? C.green : K.cierre >= 93 ? C.amber : C.red;
  const semTxt = K.cierre == null ? "SIN DATOS" : K.cierre >= 97 ? "ÓPTIMO" : K.cierre >= 93 ? "ACEPTABLE" : "CRÍTICO";
  const kpis = [
    { label: "Ingresos", v: cop(K.ingresos), sub: `${num(K.cerrados)} cerrados` },
    { label: "Movimientos", v: num(K.mov), sub: "período actual" },
    { label: "Ticket promedio", v: K.cerrados ? cop(K.ticket) : "—", sub: K.cerrados ? `estadía ${Math.round(K.minProm)} min` : "sin cierres aún" },
    { label: "Vehículos en piso", v: num(K.enPiso), sub: "responsabilidad viva" },
  ];
  return (
    <div className="px-fade">
      <div style={{ marginBottom: 16 }}><Eyebrow>Board Room · resumen ejecutivo</Eyebrow><Section>Control operativo y financiero</Section>
        <p style={{ color: C.sub, fontSize: 13.5, margin: "4px 0 0", maxWidth: 720 }}>Cada cifra se calcula sobre los movimientos reales del período (regla R1: hora de ingreso). La operación arranca desde cero.</p></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14, marginBottom: 16 }}>
        {kpis.map((x) => (<Card key={x.label} className="px-kpi" style={{ padding: "16px 17px" }}>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.sub, letterSpacing: ".05em", textTransform: "uppercase" }}>{x.label}</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 27, fontWeight: 700, margin: "6px 0 3px", letterSpacing: "-.02em" }}>{x.v}</div>
          <div style={{ color: C.sub, fontSize: 11.5 }}>{x.sub}</div></Card>))}
      </div>
      {vacio ? (
        <Card style={{ padding: "48px 30px", textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: C.tealBg, display: "grid", placeItems: "center", margin: "0 auto 16px" }}><Inbox size={28} color={C.teal} /></div>
          <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Sin registros todavía</div>
          <p style={{ color: C.sub, fontSize: 13.5, maxWidth: 460, margin: "0 auto 18px", lineHeight: 1.55 }}>El tablero se construye solo, en tiempo real, a medida que el patio registra ingresos y salidas.</p>
          <button className="px-btn" onClick={irOperar} style={{ background: C.teal, color: "#fff", padding: "11px 20px", borderRadius: 10, fontWeight: 700, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>Ir a Operación / Patio <ArrowUpRight size={16} /></button>
        </Card>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1.6fr", gap: 14, marginBottom: 14 }}>
            <Card style={{ padding: "17px 18px" }}><Eyebrow>Semáforo de cierre</Eyebrow>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                <div style={{ position: "relative", width: 108, height: 108 }}>
                  <svg width="108" height="108" style={{ transform: "rotate(-90deg)" }}><circle cx="54" cy="54" r="46" fill="none" stroke={C.border} strokeWidth="11" /><circle cx="54" cy="54" r="46" fill="none" stroke={semColor} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${((K.cierre || 0) / 100) * 289} 289`} /></svg>
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 700 }}>{K.cierre == null ? "—" : pct(K.cierre)}</div></div>
                </div>
                <div><span style={{ background: C.tealBg, color: semColor, padding: "4px 11px", borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: MONO }}>{semTxt}</span>
                  <p style={{ color: C.sub, fontSize: 12, margin: "10px 0 0", lineHeight: 1.5 }}>Umbrales: <b style={{ color: C.green }}>≥97 %</b> · <b style={{ color: C.amber }}>93–97 %</b> · <b style={{ color: C.red }}>&lt;93 %</b>. <b>EntregaPropia</b> impide superar 100 %.</p></div>
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 12.5 }}><span style={{ color: C.sub }}>Cortesías (costo real)</span><span style={{ fontFamily: MONO, fontWeight: 600, color: C.amber }}>{cop(K.cortesias)}</span></div>
            </Card>
            <Card style={{ padding: "16px 18px 8px" }}><Eyebrow>Ingresos por día</Eyebrow>
              {K.dias.length ? (<ResponsiveContainer width="100%" height={182}><AreaChart data={K.dias} margin={{ top: 12, right: 6, left: -6, bottom: 0 }}>
                <defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.teal} stopOpacity={0.28} /><stop offset="100%" stopColor={C.teal} stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f1" vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 10, fontFamily: MONO, fill: C.sub }} tickLine={false} axisLine={{ stroke: C.border }} />
                <YAxis tick={{ fontSize: 10, fontFamily: MONO, fill: C.sub }} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "K"} tickLine={false} axisLine={false} width={46} />
                <Tooltip formatter={(v) => cop(v)} contentStyle={{ fontFamily: MONO, fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}` }} /><Area type="monotone" dataKey="ing" stroke={C.teal} strokeWidth={2.2} fill="url(#gA)" /></AreaChart></ResponsiveContainer>)
                : <div style={{ height: 182, display: "grid", placeItems: "center", color: C.sub, fontSize: 13 }}>Aún no hay cierres para graficar.</div>}
            </Card>
          </div>
          <Card style={{ padding: "16px 18px 6px" }}><Eyebrow>Ingresos por medio de pago</Eyebrow>
            {K.medios.length ? (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center" }}>
              <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={K.medios} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2}>{K.medios.map((e, i) => <Cell key={i} fill={donutCol[i % donutCol.length]} />)}</Pie><Tooltip formatter={(v) => cop(v)} contentStyle={{ fontFamily: MONO, fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}` }} /></PieChart></ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5 }}>{K.medios.map((m, i) => (<div key={m.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: C.sub }}><span style={{ width: 9, height: 9, borderRadius: 2, background: donutCol[i % donutCol.length] }} />{m.name}</span><span style={{ fontFamily: MONO, fontWeight: 600 }}>{cop(m.value)}</span></div>))}</div>
            </div>) : <div style={{ height: 120, display: "grid", placeItems: "center", color: C.sub, fontSize: 13 }}>Sin cobros registrados.</div>}
          </Card>
        </>
      )}
    </div>
  );
}

/* ═══════════════ OPERACIÓN / PATIO ═══════════════ */
function Operacion({ sede, tiquetes, onIngreso, onExit }) {
  const [nuevo, setNuevo] = useState({ placa: "", tipo: "AUTO", marca: "", cel: "", perfil: "2 INVITADO", recibe: "", consent: false });
  const [ticket, setTicket] = useState(null);
  const [msg, setMsg] = useState("");
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const piso = tiquetes.filter((t) => t.estado === "EN PISO" && t.sede === sede.id);

  const ingresar = () => {
    if (!nuevo.placa.trim()) return setMsg("Digita la placa.");
    if (!nuevo.cel.trim()) return setMsg("El celular es obligatorio para emitir el tiquete (excepción exige supervisor).");
    if (!nuevo.consent) return setMsg("Falta el consentimiento de datos (Ley 1581 de 2012).");
    const b = (nuevo.tipo === "MOTO" ? "M-" : "N1-") + String(piso.length + 1).padStart(2, "0");
    const tq = onIngreso({ placa: nuevo.placa.toUpperCase().trim(), tipo: nuevo.tipo, marca: nuevo.marca.toUpperCase().trim() || "—", perfil: nuevo.perfil, cel: nuevo.cel.trim(), bahia: b, recibe: nuevo.recibe.trim() || "Operador", ingresa: nuevo.recibe.trim() || "Operador" });
    setTicket(tq); setMsg("");
    setNuevo({ placa: "", tipo: "AUTO", marca: "", cel: "", perfil: "2 INVITADO", recibe: "", consent: false });
  };

  return (
    <div className="px-fade">
      <Eyebrow>M01 · Operación en tiempo real</Eyebrow><Section>Patio — {sede.nombre}</Section>
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, marginTop: 14 }}>
        <Card style={{ padding: 18, alignSelf: "start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><Car size={16} color={C.teal} /><b style={{ fontSize: 14 }}>Ingreso express</b></div>
          <label style={lbl}>Placa</label>
          <input className="px-input" value={nuevo.placa} onChange={(e) => setNuevo({ ...nuevo, placa: e.target.value.toUpperCase() })} placeholder="ABC123" style={{ textTransform: "uppercase", marginBottom: 10 }} />
          <label style={lbl}>Tipo de vehículo</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>{["AUTO", "MOTO"].map((t) => (<button key={t} className="px-btn" onClick={() => setNuevo({ ...nuevo, tipo: t })} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: nuevo.tipo === t ? C.teal : C.bg, color: nuevo.tipo === t ? "#fff" : C.sub }}>{t === "AUTO" ? "Automóvil" : "Motocicleta"}</button>))}</div>
          <label style={lbl}>Marca</label><input className="px-input" value={nuevo.marca} onChange={(e) => setNuevo({ ...nuevo, marca: e.target.value })} placeholder="Opcional" style={{ marginBottom: 10 }} />
          <label style={lbl}>Perfil</label><select className="px-input" value={nuevo.perfil} onChange={(e) => setNuevo({ ...nuevo, perfil: e.target.value })} style={{ marginBottom: 10, fontFamily: FONT }}>{PERFILES.map((p) => <option key={p}>{p}</option>)}</select>
          <label style={lbl}>Celular (obligatorio)</label><input className="px-input" value={nuevo.cel} onChange={(e) => setNuevo({ ...nuevo, cel: e.target.value })} placeholder="300 000 0000" style={{ marginBottom: 10 }} />
          <label style={lbl}>Colaborador que recibe</label><input className="px-input" value={nuevo.recibe} onChange={(e) => setNuevo({ ...nuevo, recibe: e.target.value })} placeholder="Nombre" style={{ marginBottom: 12 }} />
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11.5, color: C.sub, cursor: "pointer", marginBottom: 12, lineHeight: 1.4 }}><input type="checkbox" checked={nuevo.consent} onChange={(e) => setNuevo({ ...nuevo, consent: e.target.checked })} style={{ marginTop: 2 }} />Autorizo el tratamiento de datos (Ley 1581/2012 · Decreto 1074/2015). Texto v1.0.</label>
          <div style={{ display: "flex", gap: 6, fontSize: 11, color: C.sub, marginBottom: 12 }}><span style={pill}><Camera size={11} /> 6 fotos</span><span style={pill}>Checklist</span><span style={pill}><QrCode size={11} /> QR</span></div>
          <button className="px-btn" onClick={ingresar} style={{ width: "100%", background: C.teal, color: "#fff", padding: "11px", borderRadius: 9, fontWeight: 700, fontSize: 14 }}>Registrar ingreso e imprimir tiquete</button>
          {msg && <div style={{ marginTop: 10, fontSize: 12, padding: "9px 11px", borderRadius: 8, background: C.amberBg, color: C.amber, lineHeight: 1.4 }}>{msg}</div>}
        </Card>

        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Radio size={15} color={C.teal} className="px-live" /><b style={{ fontSize: 14 }}>Vehículos en piso</b><span style={{ background: C.tealBg, color: C.teal, borderRadius: 20, padding: "2px 9px", fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>{piso.length}</span></div>
            <span style={{ fontSize: 11.5, color: C.sub, fontFamily: MONO }}>ordenados por antigüedad</span>
          </div>
          {piso.length === 0 && (<div style={{ padding: "44px 0", textAlign: "center", color: C.sub }}><Inbox size={26} color={C.sub} style={{ opacity: .6 }} /><div style={{ fontSize: 13, marginTop: 8 }}>Patio vacío. Registra el primer ingreso para empezar a operar.</div></div>)}
          {[...piso].sort((a, b) => a.ingreso - b.ingreso).map((v) => {
            const mins = Math.floor((Date.now() - v.ingreso) / 60000); const anomalo = mins > 90; const t = sede.tar[v.tipo];
            const preview = liquidar({ msTranscurridos: Date.now() - v.ingreso, tarifaMin: t.min, gracia: t.gracia, fraccion: t.fraccion, topeDiario: t.tope });
            return (<div key={v.id} className="px-row" style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 12, alignItems: "center", padding: "11px 8px", borderBottom: `1px solid ${C.border}`, borderRadius: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: v.tipo === "MOTO" ? C.amberBg : C.tealBg, display: "grid", placeItems: "center" }}><Car size={18} color={v.tipo === "MOTO" ? C.amber : C.teal} /></div>
              <div><div style={{ fontWeight: 700, fontSize: 14, fontFamily: MONO }}>{v.placa} <span style={{ fontFamily: FONT, fontWeight: 500, color: C.sub, fontSize: 12 }}>· {v.marca}</span></div>
                <div style={{ fontSize: 11.5, color: C.sub, display: "flex", gap: 10, marginTop: 2 }}><span><MapPin size={11} style={{ verticalAlign: -1 }} /> {v.bahia}</span><span>{v.codigo}</span><span>{v.cel}</span></div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14, color: anomalo ? C.amber : C.text, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>{anomalo && <AlertTriangle size={13} />}<Clock size={12} />{mins} min</div>
                <div style={{ fontSize: 11.5, color: C.sub, fontFamily: MONO }}>≈ {cop(preview.total)}</div></div>
              <button className="px-btn" onClick={() => onExit(v)} style={{ background: C.ink, color: "#fff", padding: "8px 13px", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>Salida</button>
            </div>);
          })}
        </Card>
      </div>
      {ticket && <TicketModal tq={ticket} sede={sede} onClose={() => setTicket(null)} />}
    </div>
  );
}

/* ---------- Tiquete térmico imprimible ---------- */
function TicketModal({ tq, sede, onClose }) {
  const t = sede.tar[tq.tipo]; const cap = sede.oro ? LEGAL.caps[tq.tipo].oro : LEGAL.caps[tq.tipo].normal;
  const dash = { borderTop: "1px dashed #000", margin: "8px 0" };
  const rowT = (a, b) => (<div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, margin: "2px 0" }}><span>{a}</span><span style={{ fontWeight: 700 }}>{b}</span></div>);
  return (
    <div style={backdrop} onClick={onClose}>
      <div className="px-fade" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(330px,96vw)", overflow: "hidden" }}>
        <div className="px-print">
          <div className="px-ticket" style={{ fontFamily: MONO, color: "#000", padding: "18px 20px", background: "#fff" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, letterSpacing: "-.01em" }}>SOLVEX</div>
              <div style={{ fontSize: 10 }}>{sede.nombre} · {sede.direccion}</div>
              <div style={{ fontSize: 10, marginTop: 2 }}>TIQUETE DE PARQUEADERO</div>
            </div>
            <div style={dash} />
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 10 }}>RECIBO</div><div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, letterSpacing: ".02em" }}>{tq.codigo}</div></div>
            <div style={dash} />
            {rowT("Placa", tq.placa)}{rowT("Vehículo", `${tq.tipo} · ${tq.marca}`)}{rowT("Perfil", tq.perfil)}{rowT("Bahía", tq.bahia)}
            {rowT("Ingreso", `${ddmmaa(tq.ingreso)} ${hhmm(tq.ingreso)}`)}{rowT("Recibe", tq.recibe)}
            <div style={dash} />
            {rowT("Tarifa / min", cop(t.min))}{rowT("Tope legal / min", cop(cap))}{rowT("Minutos de gracia", `${t.gracia} min`)}
            <div style={dash} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, margin: "6px 0" }}>
              <QR value={tq.token} scale={4} />
              <div style={{ fontSize: 10, letterSpacing: ".05em" }}>{tq.token}</div>
              <div style={{ fontSize: 10, textAlign: "center", fontWeight: 700 }}>ESCANEE ESTE CÓDIGO EN LA TALANQUERA DE SALIDA</div>
            </div>
            <div style={dash} />
            <div style={{ fontSize: 9, textAlign: "center", lineHeight: 1.4 }}>Contrato de depósito · Cód. de Comercio. Datos tratados conforme a la Ley 1581 de 2012. Tarifas: {LEGAL.norma}. Conserve el código hasta la salida.</div>
          </div>
        </div>
        <div style={{ padding: "12px 16px", display: "flex", gap: 8, borderTop: `1px solid ${C.border}` }}>
          <button className="px-btn" onClick={onClose} style={{ flex: 1, background: C.bg, color: C.text, padding: "10px", borderRadius: 9, fontWeight: 600 }}>Cerrar</button>
          <button className="px-btn" onClick={() => window.print()} style={{ flex: 2, background: C.teal, color: "#fff", padding: "10px", borderRadius: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Printer size={16} /> Imprimir (impresora térmica)</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ SALIDA / TALANQUERA ═══════════════ */
function Salida({ sede, tiquetes, onSalida, pending, clearPending }) {
  const [scan, setScan] = useState("");
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(null);
  const [medio, setMedio] = useState("Efectivo");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(null);
  const scanRef = useRef(null);
  const piso = tiquetes.filter((t) => t.estado === "EN PISO" && t.sede === sede.id);

  useEffect(() => { if (pending) { setSel(pending); clearPending(); } }, [pending]);
  useEffect(() => { if (!sel && !ok && scanRef.current) scanRef.current.focus(); }, [sel, ok]);

  const buscarPorCodigo = (code) => {
    const c = code.trim().toUpperCase(); if (!c) return;
    const found = tiquetes.find((t) => (t.token.toUpperCase() === c || t.codigo.toUpperCase() === c));
    if (!found) { setError(`Código ${c} no encontrado. Verifique el tiquete.`); return; }
    if (found.estado !== "EN PISO") { setError(`El tiquete ${found.codigo} ya fue entregado. No abre talanquera.`); return; }
    setError(""); setSel(found);
  };
  const resultados = query.trim() ? piso.filter((t) => {
    const q = query.trim().toUpperCase();
    return t.codigo.toUpperCase().includes(q) || t.token.toUpperCase().includes(q) || t.placa.toUpperCase().includes(q) || t.placa.toUpperCase().endsWith(q) || (t.cel || "").includes(query.trim());
  }) : [];

  const confirmar = (liq) => { onSalida(sel, liq, medio, sel.recibe); setOk({ tq: sel, liq, medio }); setSel(null); setScan(""); setQuery(""); };

  if (ok) return <TalanqueraOK data={ok} onNext={() => setOk(null)} />;

  if (sel) {
    const t = sede.tar[sel.tipo]; const cap = sede.oro ? LEGAL.caps[sel.tipo].oro : LEGAL.caps[sel.tipo].normal;
    const L = liquidar({ msTranscurridos: Date.now() - sel.ingreso, tarifaMin: t.min, gracia: t.gracia, fraccion: t.fraccion, topeDiario: t.tope });
    const rows = [["Minutos brutos", `${L.minutosBrutos} min`], [`Gracia (−${t.gracia})`, L.dentroGracia ? "dentro de gracia" : `${L.minutosFacturables} facturables`], [`Valor tiempo (${L.minutosFacturables} × ${cop(t.min)})`, cop(L.minutosFacturables * t.min)], ...(L.topeAplicado ? [["Tope diario aplicado", cop(L.valorTiempo)]] : []), ["Base gravable", cop(L.baseGravable)], ["IVA 19 %", cop(L.ivaVal)]];
    return (
      <div className="px-fade">
        <Eyebrow>Punto de salida · liquidación</Eyebrow><Section>Validar y abrir talanquera</Section>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ background: C.ink, color: "#fff", padding: "16px 20px" }}><Eyebrow>Vehículo identificado</Eyebrow>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, marginTop: 2 }}>{sel.placa} · {sel.marca}</div>
              <div style={{ fontSize: 12, color: "#8fb0ab", fontFamily: MONO }}>{sel.codigo} · {sel.bahia} · tope legal {cop(cap)}/min ✓</div></div>
            <div style={{ padding: "16px 20px" }}>{rows.map(([a, b], i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: "1px solid #f2f6f5", color: C.sub }}><span>{a}</span><span style={{ fontFamily: MONO, color: C.text }}>{b}</span></div>))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "12px 14px", background: C.tealBg, borderRadius: 10 }}><span style={{ fontWeight: 700 }}>Total a pagar</span><span style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 700, color: C.tealD }}>{cop(L.total)}</span></div>
            </div>
          </Card>
          <Card style={{ padding: 18 }}>
            <label style={lbl}>Medio de pago</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>{MEDIOS.map((m) => (<button key={m} className="px-btn" onClick={() => setMedio(m)} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: medio === m ? C.teal : C.bg, color: medio === m ? "#fff" : C.sub }}>{m}</button>))}</div>
            <div style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", fontSize: 12, color: C.sub, marginBottom: 16, lineHeight: 1.5 }}>Al validar el pago, el sistema emite la factura electrónica (DIAN), envía el recibo final por WhatsApp y ordena la <b>apertura de la talanquera</b> vía relé/API. Ningún cierre supera el tope legal.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="px-btn" onClick={() => setSel(null)} style={{ flex: 1, background: C.bg, color: C.text, padding: "12px", borderRadius: 10, fontWeight: 600 }}>Cancelar</button>
              <button className="px-btn" onClick={() => confirmar(L)} style={{ flex: 2, background: C.green, color: "#fff", padding: "12px", borderRadius: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><DoorOpen size={17} /> Cobrar y abrir talanquera</button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="px-fade">
      <Eyebrow>M01 · Punto de salida</Eyebrow><Section>Salida / Talanquera</Section>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><ScanLine size={17} color={C.teal} /><b style={{ fontSize: 14 }}>Escanear código QR</b></div>
          <p style={{ fontSize: 12, color: C.sub, margin: "0 0 12px" }}>Apunte el lector al QR del tiquete. El lector USB escribe el código y valida automáticamente.</p>
          <input ref={scanRef} className="px-input" value={scan} autoFocus onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") buscarPorCodigo(scan); }} placeholder="Esperando lectura del QR…" style={{ fontSize: 15, padding: "13px 14px", textAlign: "center", letterSpacing: ".08em" }} />
          <button className="px-btn" onClick={() => buscarPorCodigo(scan)} style={{ width: "100%", marginTop: 10, background: C.ink, color: "#fff", padding: "11px", borderRadius: 9, fontWeight: 600, fontSize: 13 }}>Validar código</button>
          <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: C.tealBg, fontSize: 11.5, color: C.tealD, lineHeight: 1.5 }}>
            <b>Integración de hardware:</b> el lector de QR se conecta por USB (emula teclado) y valida contra la talanquera; la impresora térmica recibe el tiquete al ingreso. Ambos se enlazan por una capa de abstracción de dispositivos (relé/API o MQTT), sin depender de una marca.
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Search size={17} color={C.teal} /><b style={{ fontSize: 14 }}>Buscar vehículo</b></div>
          <p style={{ fontSize: 12, color: C.sub, margin: "0 0 12px" }}>Por recibo, placa, últimos 3 dígitos de la placa o celular.</p>
          <input className="px-input" value={query} onChange={(e) => setQuery(e.target.value.toUpperCase())} placeholder="SVX-000001 · ABC123 · 123 · 300…" style={{ fontSize: 14, padding: "12px 14px" }} />
          <div style={{ marginTop: 12, maxHeight: 240, overflow: "auto" }}>
            {query.trim() && resultados.length === 0 && <div style={{ padding: "20px 0", textAlign: "center", color: C.sub, fontSize: 12.5 }}>Sin coincidencias en piso.</div>}
            {resultados.map((v) => { const mins = Math.floor((Date.now() - v.ingreso) / 60000); return (
              <div key={v.id} className="px-row px-btn" onClick={() => setSel(v)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 10px", borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 6 }}>
                <div><div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14 }}>{v.placa} <span style={{ color: C.sub, fontWeight: 500, fontFamily: FONT, fontSize: 12 }}>· {v.marca}</span></div>
                  <div style={{ fontSize: 11.5, color: C.sub }}>{v.codigo} · {v.bahia} · {mins} min · {v.cel}</div></div>
                <ArrowUpRight size={16} color={C.teal} />
              </div>); })}
            {!query.trim() && <div style={{ padding: "20px 0", textAlign: "center", color: C.sub, fontSize: 12.5 }}>{piso.length} vehículo(s) en piso disponibles para salida.</div>}
          </div>
        </Card>
      </div>
      {error && <Card style={{ marginTop: 14, padding: "14px 18px", background: C.redBg, border: `1px solid ${C.red}`, color: C.red, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={17} /> {error}</Card>}
    </div>
  );
}

function TalanqueraOK({ data, onNext }) {
  const { tq, liq, medio } = data;
  return (
    <div className="px-fade" style={{ maxWidth: 640, margin: "10px auto" }}>
      <Card style={{ padding: "28px 30px", textAlign: "center", overflow: "hidden" }}>
        <div style={{ width: 62, height: 62, borderRadius: 40, background: C.greenBg, display: "grid", placeItems: "center", margin: "0 auto 14px" }}><CheckCircle2 size={34} color={C.green} /></div>
        <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700 }}>Pago validado · Talanquera abierta</div>
        <p style={{ color: C.sub, fontSize: 13, margin: "6px 0 18px" }}>{tq.codigo} · {tq.placa} · {cop(liq.total)} · {medio}. Recibo final enviado por WhatsApp y factura electrónica emitida.</p>
        {/* talanquera */}
        <svg viewBox="0 0 320 120" style={{ width: "100%", maxWidth: 360, height: 120 }}>
          <rect x="0" y="104" width="320" height="6" fill={C.border} />
          <rect x="150" y="120" width="0" height="0" />
          <rect x="146" y="40" width="16" height="66" rx="3" fill={C.ink} />
          <circle cx="154" cy="40" r="7" fill={C.teal} />
          <g className="px-gate"><rect x="154" y="36" width="150" height="8" rx="4" fill={C.gold} />
            {[168, 198, 228, 258, 288].map((x) => <rect key={x} x={x} y="36" width="14" height="8" fill={C.red} />)}
          </g>
          <text x="250" y="96" fontFamily={MONO} fontSize="11" fill={C.green} fontWeight="700">ABIERTA</text>
        </svg>
        <button className="px-btn" onClick={onNext} style={{ marginTop: 12, background: C.teal, color: "#fff", padding: "11px 22px", borderRadius: 10, fontWeight: 700, fontSize: 14 }}>Siguiente vehículo</button>
      </Card>
    </div>
  );
}

/* ═══════════════ MOTOR TARIFARIO ═══════════════ */
function Tarifario({ sede, onCambio }) {
  const [tipo, setTipo] = useState("AUTO");
  const [oro, setOro] = useState(sede.oro);
  const [valorMin, setValorMin] = useState(sede.tar.AUTO.min);
  const [guardado, setGuardado] = useState("");
  const cap = oro ? LEGAL.caps[tipo].oro : LEGAL.caps[tipo].normal;
  const ilegal = valorMin > cap;
  const guardar = () => { if (ilegal) return; onCambio(`${tipo} → ${cop(valorMin)}/min (tope ${cop(cap)})`); setGuardado(`Guardado como versión nueva · ${cop(valorMin)}/min para ${tipo}. Registrado en bitácora.`); setTimeout(() => setGuardado(""), 4000); };
  return (
    <div className="px-fade">
      <Eyebrow>M02 · Motor tarifario y validación de legalidad</Eyebrow><Section>Tarifas con tope legal · Bogotá 2026</Section>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><ShieldCheck size={16} color={C.teal} /><b style={{ fontSize: 14 }}>Tabla de topes legales (configurable)</b></div>
          <p style={{ fontSize: 12, color: C.sub, margin: "0 0 12px" }}>{LEGAL.norma} · en firme {LEGAL.vigenteDesde}. {LEGAL.detalle}.</p>
          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
            <thead><tr style={{ color: C.sub, fontFamily: MONO, fontSize: 10.5 }}><th style={{ textAlign: "left", padding: "6px 4px" }}>TIPO</th><th style={{ textAlign: "right", padding: "6px 4px" }}>2025</th><th style={{ textAlign: "right", padding: "6px 4px" }}>ESTÁNDAR</th><th style={{ textAlign: "right", padding: "6px 4px" }}>SELLO ORO</th></tr></thead>
            <tbody>{Object.entries(LEGAL.caps).map(([k, c]) => (<tr key={k} style={{ borderTop: `1px solid ${C.border}` }}><td style={{ padding: "9px 4px", fontWeight: 600, fontSize: 12 }}>{c.label}</td><td style={{ padding: "9px 4px", textAlign: "right", fontFamily: MONO, color: C.sub }}>{cop(c.ref2025)}</td><td style={{ padding: "9px 4px", textAlign: "right", fontFamily: MONO, fontWeight: 600 }}>{cop(c.normal)}</td><td style={{ padding: "9px 4px", textAlign: "right", fontFamily: MONO, fontWeight: 600, color: C.gold }}>{c.oro === 0 ? "Gratuito" : cop(c.oro)}</td></tr>))}</tbody>
          </table>
          <div style={{ marginTop: 12, fontSize: 11.5, color: C.sub, background: C.bg, padding: "10px 12px", borderRadius: 8, lineHeight: 1.5 }}>Son <b>topes máximos por minuto</b>, no tarifas obligatorias. El sistema permite cobrar igual o menos, nunca más. Fuente: {LEGAL.fuente}.</div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><Lock size={16} color={ilegal ? C.red : C.teal} /><b style={{ fontSize: 14 }}>Configurar tarifa · validación dura (T1)</b></div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>{["AUTO", "MOTO", "BICI"].map((k) => (<button key={k} className="px-btn" onClick={() => { setTipo(k); setValorMin(oro ? LEGAL.caps[k].oro : LEGAL.caps[k].normal); }} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600, background: tipo === k ? C.teal : C.bg, color: tipo === k ? "#fff" : C.sub }}>{k}</button>))}</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 14, cursor: "pointer" }}><input type="checkbox" checked={oro} onChange={(e) => setOro(e.target.checked)} /> Sede con certificación Sello Oro (tope {cop(LEGAL.caps[tipo].oro)}/min)</label>
          <label style={lbl}>Valor por minuto que se intenta guardar</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><span style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 700, color: ilegal ? C.red : C.text }}>{cop(valorMin)}</span><span style={{ fontSize: 12, color: C.sub }}>/ min</span></div>
          <input type="range" min="0" max="320" value={valorMin} onChange={(e) => setValorMin(+e.target.value)} style={{ width: "100%", accentColor: ilegal ? C.red : C.teal, marginBottom: 14 }} />
          {ilegal ? (<div className="px-fade" style={{ background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.red, fontWeight: 700, fontSize: 14, marginBottom: 6 }}><Ban size={18} /> Guardado bloqueado</div>
            <p style={{ fontSize: 12.5, color: "#7a2318", margin: 0, lineHeight: 1.55 }}>{cop(valorMin)}/min supera el tope legal de <b>{cop(cap)}/min</b> para {LEGAL.caps[tipo].label.toLowerCase()} {oro ? "con Sello Oro" : ""}. Según el <b>{LEGAL.norma}</b>, cobrar por encima del tope no es permitido. El intento queda en la bitácora.</p></div>)
            : (<div style={{ background: C.greenBg, border: `1px solid ${C.green}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.green, fontWeight: 700, fontSize: 14, marginBottom: 4 }}><CheckCircle2 size={18} /> Tarifa válida</div>
              <p style={{ fontSize: 12.5, color: "#155a3a", margin: "0 0 10px" }}>{cop(valorMin)}/min está dentro del tope legal de {cop(cap)}/min. Se guarda como <b>versión nueva</b> con vigencia y referencia normativa.</p>
              <button className="px-btn" onClick={guardar} style={{ background: C.green, color: "#fff", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>Guardar versión</button>
              {guardado && <div style={{ marginTop: 8, fontSize: 11.5, color: C.green }}>{guardado}</div>}</div>)}
        </Card>
      </div>
      <Card style={{ padding: 18, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Gauge size={16} color={C.teal} /><b style={{ fontSize: 14 }}>Algoritmo de liquidación T5 — reproducible y auditable</b></div>
        <p style={{ fontSize: 12, color: C.sub, margin: "0 0 12px" }}>Cada componente se persiste en el tiquete; jamás se guarda solo el total. Dinero en enteros (pesos).</p>
        <pre style={{ fontFamily: MONO, fontSize: 11.5, background: C.ink, color: "#c8e6e0", padding: "14px 16px", borderRadius: 10, overflow: "auto", lineHeight: 1.7, margin: 0 }}>{`minutos_brutos      = ceil((salida - ingreso) / 60 s)
minutos_facturables = max(0, brutos - minutos_gracia)
si facturables < fraccion_minima -> fraccion_minima
valor_tiempo        = facturables x tarifa_minuto_vigente
valor_tiempo        = min(valor_tiempo, tope_diario x dias)
subtotal            = valor_tiempo + servicios_adicionales
base_gravable       = subtotal - (cortesias + convenios + promos)
iva                 = round(base_gravable x 0,19)
total               = redondear(base_gravable + iva, $50)`}</pre>
      </Card>
    </div>
  );
}

/* ═══════════════ AUDITORÍA ═══════════════ */
function Auditoria({ bitacora }) {
  const [verif, setVerif] = useState(null);
  const verificar = () => { let prev = "00000000", roto = -1; bitacora.forEach((e) => { const ex = fnv(prev + JSON.stringify({ acc: e.acc, usr: e.usr, ent: e.ent, val: e.val, i: e.i }) + e.i); if (ex !== e.h && roto === -1) roto = e.i; prev = e.h; }); setVerif(roto === -1 ? "ok" : "roto:" + roto); };
  const cumplimiento = ["Certificado de firma digital (DIAN)", "Resolución de numeración DIAN", `Decreto tarifario aplicado (${LEGAL.norma})`, "Póliza de responsabilidad civil", "Registro de bases de datos (SIC)", "Prueba de restauración de backup"];
  return (
    <div className="px-fade">
      <Eyebrow>M07 · Auditoría forense y cumplimiento</Eyebrow><Section>Control interno, bitácora encadenada y semáforo normativo</Section>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginTop: 14 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Fingerprint size={16} color={C.teal} /><b style={{ fontSize: 14 }}>Bitácora inmutable (encadenamiento por hash)</b></div>
            {bitacora.length > 0 && <button className="px-btn" onClick={verificar} style={{ background: C.ink, color: "#fff", padding: "6px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600 }}>Verificar integridad</button>}
          </div>
          {bitacora.length === 0 ? (<div style={{ padding: "44px 0", textAlign: "center", color: C.sub }}><Inbox size={26} color={C.sub} style={{ opacity: .6 }} /><div style={{ fontSize: 13, marginTop: 8 }}>Bitácora vacía. Cada acción real (ingreso, cobro, cambio de tarifa) se registrará aquí, encadenada por hash.</div></div>)
            : bitacora.map((e) => (<div key={e.i} style={{ padding: "9px 11px", borderRadius: 8, background: C.bg, marginBottom: 6, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 700, fontFamily: MONO, fontSize: 11.5, color: C.tealD }}>{e.acc}</span><span style={{ color: C.sub, fontSize: 11 }}>{ddmmaa(e.ts)} {hhmm(e.ts)}</span></div>
              <div style={{ color: C.sub, margin: "3px 0" }}>{e.usr} · {e.ent} · <b style={{ color: C.text }}>{e.val}</b></div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: "#9fb2af", display: "flex", gap: 10 }}><span>prev: {e.prev}</span><span style={{ color: C.teal }}>hash: {e.h}</span></div></div>))}
          {verif === "ok" && <div className="px-fade" style={{ marginTop: 8, background: C.greenBg, color: C.green, padding: "12px 14px", borderRadius: 9, fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={17} /> Cadena íntegra · certificado CONFORME</div>}
          {verif && verif.startsWith("roto") && <div className="px-fade" style={{ marginTop: 8, background: C.redBg, color: C.red, padding: "12px 14px", borderRadius: 9, fontWeight: 600, fontSize: 13 }}>Alteración detectada en el registro #{+verif.split(":")[1] + 1}.</div>}
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card style={{ padding: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><ShieldCheck size={16} color={C.teal} /><b style={{ fontSize: 14 }}>Panel de cumplimiento</b></div>
            {cumplimiento.map((c) => (<div key={c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}><span style={{ width: 9, height: 9, borderRadius: 9, background: C.sub, flexShrink: 0 }} /><div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{c}</div><div style={{ fontSize: 11, color: C.sub }}>Pendiente de configuración</div></div></div>))}
            <p style={{ fontSize: 11, color: C.sub, marginTop: 10 }}>Cada parqueadero configura estos ítems al implementar.</p></Card>
          <Card style={{ padding: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><AlertTriangle size={16} color={C.amber} /><b style={{ fontSize: 14 }}>Alertas antifraude</b></div>
            <div style={{ padding: "24px 0", textAlign: "center", color: C.sub, fontSize: 12.5 }}>Sin alertas. El motor evalúa en tiempo real a medida que se registran movimientos.</div></Card>
        </div>
      </div>
    </div>
  );
}
