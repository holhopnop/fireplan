import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ComposedChart, Line, BarChart, Bar, Legend
} from "recharts";

/* ═══════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════ */
const fmt = (n) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtS = (n) => n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n/1e3).toFixed(0)}k` : fmt(n);

const AOW_LEEFTIJD = 67;
const AOW_SAMEN_BRUTO = 1122;
const AOW_ALLEEN_BRUTO = 1638;
const PENSIOEN_RICHTLEEFTIJD = 68;
const KORTING_PER_JAAR = 0.08; // ~8% minder per jaar vervroeging
const SPAARRENTE = 0.02; // spaargeld groeit ~2%/jaar
const BELASTING_TARIEF = 0.37; // marginaal tarief voor belastingvoordeel pensioenbeleggen

const TIPS = {
  aow: "AOW is geld dat je elke maand van de overheid krijgt vanaf je 67e. Iedereen die in Nederland heeft gewoond krijgt dit, of je nu hebt gewerkt of niet. Hoeveel je krijgt hangt af van of je samenwoont of alleen woont. Je kunt de AOW niet eerder laten ingaan.",
  werkgeverspensioen: "Dit is pensioen dat je via je werk opbouwt. Je werkgever betaalt mee. Hoeveel je krijgt hangt af van je salaris, hoe lang je ergens werkt, en je pensioenregeling. Check mijnpensioenoverzicht.nl voor jouw bedrag.",
  pensioenbeleggen: "Je kunt zelf extra pensioen opbouwen door te beleggen via een pensioenrekening of lijfrente (bijv. Brand New Day of Bright). Het voordeel: je betaalt nu minder belasting over het bedrag dat je inlegt. Je mag het geld pas opnemen rond je pensioen.",
  spaargeld: "Geld op je spaarrekening. Veilig, maar groeit nauwelijks — op dit moment zo'n 2% rente per jaar. Door inflatie wordt je spaargeld elk jaar iets minder waard in koopkracht.",
  beleggingen: "Geld dat je belegt, bijvoorbeeld in indexfondsen, aandelen of ETF's. Groeit gemiddeld sneller dan spaargeld (~7%/jaar), maar schommelt. Hoe langer je belegt, hoe stabieler het gemiddelde.",
  vrijvermogen: "Spaargeld + beleggingen samen. Het verschil met pensioenbeleggen: je kunt er altijd bij. Maar je krijgt er geen belastingvoordeel voor.",
  stopleeftijd: "De leeftijd waarop jij wilt stoppen met werken. Dit is niet hetzelfde als je pensioenleeftijd of je AOW-leeftijd. Je mag zelf kiezen wanneer je stopt — maar hoe eerder, hoe meer je zelf moet overbruggen.",
  pensioenrichtleeftijd: "Dit is de leeftijd waarop je werkgeverspensioen automatisch ingaat. Bij de meeste regelingen is dat 68 jaar. Je kunt het eerder laten ingaan, maar dan krijg je minder per maand — reken op zo'n 8% minder per jaar dat je het vervroegt.",
  aowleeftijd: "De leeftijd waarop je AOW van de overheid krijgt. Nu is dat 67 jaar. Vanaf 2028 wordt het 67 jaar en 3 maanden. Je kunt hier niks aan veranderen — het is vastgesteld bij wet.",
  overbrugging: "De periode tussen het moment dat je stopt met werken en het moment dat je pensioen en AOW ingaan. In deze periode heb je geen salaris meer, maar ook nog geen pensioen. Dit gat moet je zelf opvangen — met spaargeld, beleggingen of een lijfrente.",
  hypotheek: "Als je hypotheek is afgelost, zijn je woonlasten een stuk lager. Dat scheelt al snel honderden euro's per maand. We rekenen dit mee: na je einddatum dalen je benodigde uitgaven automatisch.",
  rendement: "Als je belegt, groeit je geld gemiddeld zo'n 7% per jaar op de lange termijn. Dat is een gemiddelde — sommige jaren gaat het harder, soms verlies je. Hoe langer je belegt, hoe stabieler het gemiddelde.",
  inflatie: "Elk jaar worden dingen iets duurder. Gemiddeld zo'n 2-3% per jaar. Dat betekent dat €1.000 nu over 20 jaar nog maar zo'n €650 waard is. Alle bedragen in deze tool zijn in euro's van vandaag — de werkelijke koopkracht zal lager zijn. Houd hier rekening mee bij je planning.",
  compound: "Je verdient niet alleen rendement op het geld dat je inlegt, maar ook op het rendement dat je al eerder hebt verdiend. Dat sneeuwbaleffect maakt een enorm verschil over 10-20 jaar. Hoe eerder je begint, hoe harder het groeit.",
  jaarruimte: "Elk jaar mag je een bepaald bedrag belastingvrij opzij zetten voor je pensioen. Dit heet jaarruimte. Je betaalt nu minder belasting en bouwt tegelijk extra pensioen op. Win-win, maar veel mensen laten dit liggen.",
  box3: "Als je meer dan €57.000 aan spaargeld en beleggingen hebt, betaal je daar belasting over. De belastingdienst rekent met een 'verwacht rendement', niet met wat je echt hebt verdiend. Pensioenbeleggen via een lijfrente valt hier niet onder.",
  hooglaag: "Bij veel pensioenfondsen kun je kiezen: de eerste jaren een hogere uitkering, daarna lager (of andersom). Handig als je de periode vóór je AOW wilt overbruggen met een hoger pensioen. Nadeel: daarna krijg je minder.",
  belastingverschil: "Vóór je 67e betaal je meer belasting op je inkomen dan erna. Dat komt doordat je tot je AOW-leeftijd ook AOW-premie betaalt (~18%). Daarna vervalt die. In de praktijk: van hetzelfde bruto-pensioen houd je na je 67e meer over.",
  vervroegen: "Je kunt je werkgeverspensioen eerder laten ingaan dan de pensioenrichtleeftijd. Maar: je krijgt dan minder per maand, voor de rest van je leven. Reken op zo'n 8% minder per jaar vervroeging. Twee jaar eerder = ~16% minder.",
  woonsituatie: "Of je samenwoont of alleen woont bepaalt hoeveel AOW je krijgt. Alleenstaand: ~€1.638/mnd bruto. Samenwonend: ~€1.122/mnd bruto per persoon. Een verschil van ruim €500 per maand.",
  verdeling: "Je kunt je maandelijkse inleg verdelen over privé beleggen en pensioenbeleggen. Privé beleggen: vrij opneembaar, geen belastingvoordeel. Pensioenbeleggen: vergrendeld tot je pensioen, maar je krijgt ~37% van je inleg terug via belastingteruggave.",
  belastingvoordeel: "Wat je inlegt in een pensioenproduct (lijfrente/pensioenrekening) mag je aftrekken van je belastbaar inkomen. Bij een modaal inkomen krijg je ~37% terug. Dus €200/mnd inleg levert ~€74/mnd terug van de belastingdienst. Dat geld kun je vervolgens privé herbeleggen.",
  vierprocentregel: "De 4%-regel stelt dat je elk jaar ~4% van je vermogen kunt opnemen zonder dat het opraakt over een periode van 30+ jaar. Het is een vuistregel uit onderzoek — geen garantie. Bij tegenvallende beursjaren kun je minder opnemen.",
  lijfrentestart: "Je mag je lijfrente (pensioenbeleggen) eerder laten ingaan dan je AOW-leeftijd. De minimale startleeftijd is 5 jaar vóór je AOW (dus 62 bij AOW op 67). Let op: hoe eerder je start, hoe langer de minimale uitkeringsduur. Start je op 62, dan moet de uitkering minimaal 25 jaar lopen (5 jaar tot AOW + 20 jaar daarna). Eerder starten = lagere uitkering per maand, maar je hebt wel eerder inkomen.",
  uitgaven: "Vul hier in hoeveel je per maand wilt uitgeven als je gestopt bent met werken. Een veelgebruikte vuistregel: 70% van wat je nu uitgeeft. Je reist niet meer naar werk, eet vaker thuis, en je hypotheek is misschien afgelost."
};

/* ═══════════════════════════════════════ STORAGE ═══════════════════════════════════════ */
const SKEY = "pensioenplanner-v1";
function load() { try { const r = localStorage.getItem(SKEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function save(d) { try { localStorage.setItem(SKEY, JSON.stringify(d)); } catch {} }

/* ═══════════════════════════════════════ INFO TOOLTIP ═══════════════════════════════════════ */
/* ═══════════════════════════════════════ GLOBAL TOOLTIP ═══════════════════════════════════════ */
let _setGlobalTip = null;
function GlobalTooltip() {
  const [tip, setTip] = useState(null);
  _setGlobalTip = setTip;
  useEffect(() => {
    if (!tip) return;
    const cl = () => setTip(null);
    setTimeout(() => document.addEventListener("click", cl), 10);
    return () => document.removeEventListener("click", cl);
  }, [tip]);
  if (!tip) return null;
  return (
    <div style={{ position: "fixed", top: tip.flip ? tip.top : undefined, bottom: tip.flip ? undefined : `calc(100vh - ${tip.top}px)`, left: tip.left, transform: "translateX(-50%)", width: 280, background: "#1a1a2e", color: "#E0E4E3", borderRadius: 12, padding: "14px 16px", fontSize: 12, lineHeight: 1.6, fontWeight: 500, fontFamily: "'Outfit', sans-serif", boxShadow: "0 8px 30px rgba(0,0,0,0.18)", zIndex: 99999, animation: "tipIn 0.15s ease" }} onClick={e => e.stopPropagation()}>
      {tip.text}<div style={{ position: "absolute", [tip.flip ? "top" : "bottom"]: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 10, height: 10, background: "#1a1a2e" }} />
    </div>
  );
}

function Info({ tip }) {
  const ref = useRef(null);
  const text = TIPS[tip] || tip;
  const handleClick = (e) => {
    e.stopPropagation();
    if (ref.current && _setGlobalTip) {
      const r = ref.current.getBoundingClientRect();
      const flip = r.top < 200;
      _setGlobalTip({
        text,
        top: flip ? r.bottom + 8 : r.top - 8,
        left: Math.min(Math.max(r.left + r.width / 2, 150), window.innerWidth - 150),
        flip
      });
    }
  };
  return (
    <span ref={ref} style={{ display: "inline-flex", marginLeft: 4, cursor: "pointer" }} onClick={handleClick}>
      <span style={{ width: 16, height: 16, borderRadius: 8, background: "#E5E5E5", color: "#999", fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", fontFamily: "var(--f)" }}>?</span>
    </span>
  );
}

/* ═══════════════════════════════════════ CHART TOOLTIP ═══════════════════════════════════════ */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: "1px solid #E8E8E8", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#999", marginBottom: 5, fontFamily: "var(--f)" }}>Leeftijd {label}</div>
      {payload.filter(p => p.value > 0).map((p, i) => (
        <div key={i} style={{ fontSize: 12, fontWeight: 600, color: p.color || "#111", marginBottom: 1, fontFamily: "var(--f)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />{p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════ INPUT COMPONENTS ═══════════════════════════════════════ */
function Field({ label, value, onChange, prefix, suffix, hint, info, compact }) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(String(value));
  const lastVal = useRef(value);
  if (value !== lastVal.current && !focused) { setRaw(String(value)); lastVal.current = value; }
  return (
    <div style={{ marginBottom: compact ? 10 : 14, flex: compact ? "1 1 180px" : undefined }}>
      <label style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3, fontFamily: "var(--f)" }}>{label}{info && <Info tip={info} />}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: compact ? "6px 8px" : "8px 10px", borderRadius: 8, border: `1.5px solid ${focused ? "var(--brand)" : "#EBEBEB"}`, background: "#FAFAFA", transition: "border-color 0.15s" }}>
        {prefix && <span style={{ color: "#BBB", fontSize: 13, fontWeight: 600, fontFamily: "var(--f)" }}>{prefix}</span>}
        <input type="text" inputMode="numeric" value={focused ? raw : String(value)}
          onChange={(e) => { const v = e.target.value.replace(/[^0-9.-]/g, ""); setRaw(v); const n = Number(v); if (!isNaN(n)) { onChange(n); lastVal.current = n; } }}
          onFocus={(e) => { setFocused(true); setRaw(String(value)); setTimeout(() => e.target.select(), 0); }}
          onBlur={() => { setFocused(false); setRaw(String(value)); }}
          style={{ border: "none", background: "transparent", outline: "none", fontSize: compact ? 13 : 14, fontWeight: 700, color: "#111", width: "100%", fontFamily: "var(--f)" }} />
        {suffix && <span style={{ color: "#BBB", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", fontFamily: "var(--f)" }}>{suffix}</span>}
      </div>
      {hint && <span style={{ fontSize: 10, color: "#CCC", marginTop: 1, display: "block", fontFamily: "var(--f)" }}>{hint}</span>}
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step, format, info, compact }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: compact ? 12 : 16, flex: compact ? "1 1 180px" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--f)" }}>{label}{info && <Info tip={info} />}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--f)" }}>{format ? format(value) : value}</span>
      </div>
      <div style={{ position: "relative", height: 4, background: "#EBEBEB", borderRadius: 2 }}>
        <div style={{ position: "absolute", height: "100%", background: "var(--brand)", borderRadius: 2, width: `${pct}%`, transition: "width 0.1s" }} />
        <div style={{ position: "absolute", top: -6, left: `${pct}%`, transform: "translateX(-50%)", width: 14, height: 14, borderRadius: 7, background: "var(--brand)", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(30,58,95,0.25)", transition: "left 0.1s", pointerEvents: "none" }} />
        <input type="range" min={min} max={max} step={step || 1} value={value} onChange={(e) => onChange(Number(e.target.value))}
          style={{ position: "absolute", top: -8, left: 0, width: "100%", height: 20, opacity: 0, cursor: "pointer" }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ ALLOCATION SLIDER ═══════════════════════════════════════ */
function AllocationSlider({ total, pct, onTotalChange, onPctChange, rendement, compact }) {
  const priv = Math.round(total * (1 - pct / 100));
  const pens = Math.round(total * pct / 100);
  const taxBack = Math.round(pens * BELASTING_TARIEF);
  const setPriv = (v) => { const newTotal = v + pens; onTotalChange(newTotal); onPctChange(newTotal > 0 ? Math.round(pens / newTotal * 100) : 0); };
  const setPens = (v) => { const newTotal = priv + v; onTotalChange(newTotal); onPctChange(newTotal > 0 ? Math.round(v / newTotal * 100) : 0); };
  return (
    <div style={{ marginBottom: compact ? 10 : 16 }}>
      {/* EDITABLE FIELDS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 140px" }}>
          <Field label="Privé beleggen" value={priv} onChange={setPriv} prefix="€" suffix="/mnd" compact={compact} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <Field label="Pensioenbeleggen" value={pens} onChange={setPens} prefix="€" suffix="/mnd" compact={compact} />
        </div>
      </div>
      {total > 0 && <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#8B8FA3", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--f)" }}>Verdeling <Info tip="verdeling" /></span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#8B8FA3", fontFamily: "var(--f)" }}>Totaal {fmt(total)}/mnd · {100 - pct}% privé · {pct}% pensioen</span>
        </div>
        <div style={{ fontSize: 10, color: "#C4C8D0", marginBottom: 5, fontFamily: "var(--f)" }}>Privé = overbruggen tot je pensioen ingaat · pensioen = oude dag + belastingvoordeel</div>
        <div style={{ position: "relative", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ position: "absolute", inset: 0, display: "flex" }}>
            <div style={{ flex: 100 - pct, background: "var(--brand)", transition: "flex 0.15s", borderRadius: pct === 0 ? 4 : "4px 0 0 4px" }} />
            <div style={{ flex: pct, background: "#D97706", transition: "flex 0.15s", borderRadius: pct === 100 ? 4 : "0 4px 4px 0" }} />
          </div>
          <input type="range" min={0} max={100} step={5} value={pct} onChange={e => onPctChange(Number(e.target.value))}
            style={{ position: "absolute", top: -4, left: 0, width: "100%", height: 16, opacity: 0, cursor: "pointer" }} />
        </div>
        {taxBack > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "var(--brand-light)" }}>
            <span style={{ fontSize: 14 }}>🎁</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--f)" }}>Belastingvoordeel <Info tip="belastingvoordeel" /></div>
              <div style={{ fontSize: 12, color: "var(--brand-mid)", fontFamily: "var(--f)" }}>~{fmt(taxBack)}/mnd terug van de belastingdienst</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--brand)", fontFamily: "var(--f)" }}>+{fmt(taxBack)}</div>
          </div>
        )}
      </>}
    </div>
  );
}

function Metric({ label, value, sub, accent, info, hero }) {
  return (
    <div style={{ flex: hero ? "1 1 100%" : "1 1 140px", background: hero ? "var(--brand-light)" : "#fff", borderRadius: hero ? 16 : 12, padding: hero ? "22px 24px" : "16px 18px", boxShadow: hero ? "none" : "0 1px 3px rgba(0,0,0,0.03)", transition: "box-shadow 0.2s, transform 0.2s" }}
      onMouseEnter={e => { if (!hero) { e.currentTarget.style.boxShadow = "0 4px 16px rgba(13,107,88,0.06)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { if (!hero) { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)"; e.currentTarget.style.transform = "none"; } }}
    >
      <div style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: hero ? "var(--brand)" : "#8B8FA3", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: hero ? 8 : 6, fontFamily: "var(--f)" }}>{label}{info && <Info tip={info} />}</div>
      <div style={{ fontSize: hero ? 34 : 24, fontWeight: 800, color: accent || "var(--brand)", letterSpacing: "-0.03em", fontFamily: "var(--f)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: hero ? 12 : 11, color: hero ? "var(--brand-mid)" : "#8B8FA3", marginTop: hero ? 8 : 5, fontFamily: "var(--f)", lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════ EDIT PANEL ═══════════════════════════════════════ */
function EditPanel({ title, open, onToggle, children, summary, showHint }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", overflow: "hidden", border: showHint && !open ? "1.5px solid var(--brand)" : "1px solid transparent" }}>
      <button onClick={onToggle} style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--f)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14 }}>⚙</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--brand)" }}>{title}</span>
          {!open && summary && <span style={{ fontSize: 11, color: "#BBB", fontWeight: 500, marginLeft: 4 }}>— {summary}</span>}
          {showHint && !open && <span style={{ fontSize: 10, color: "var(--brand)", fontWeight: 600, marginLeft: 4 }}>← klik om aan te passen</span>}
        </div>
        <span style={{ fontSize: 11, color: "#BBB", fontWeight: 600, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </button>
      {open && <div style={{ padding: "4px 16px 16px", borderTop: "1px solid #F5F5F5", animation: "fadeUp 0.2s ease" }}>{children}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════ */
function Landing({ onBegeleid, onDirect }) {
  return (
    <div style={{ minHeight: "100vh", background: "#FAFBF9", fontFamily: "var(--f)" }}>
      {/* HERO */}
      <div style={{ background: "#fff" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "52px 24px 48px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 800 }}>P</div>
            <span style={{ fontSize: 17, fontWeight: 700, color: "var(--brand)", letterSpacing: "-0.03em" }}>Pensioenplanner</span>
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5.5vw, 50px)", fontWeight: 800, color: "#1a1a2e", lineHeight: 1.1, letterSpacing: "-0.04em", margin: "0 0 18px" }}>
            Kun jij stoppen met werken<br/>wanneer je wilt?
          </h1>
          <p style={{ fontSize: "clamp(15px, 2.5vw, 18px)", color: "#8B8FA3", lineHeight: 1.65, maxWidth: 480, margin: "0 auto 36px", fontWeight: 400 }}>
            De meeste Nederlanders ontdekken te laat dat ze een pensioengat hebben. Bereken in 5 minuten of jij genoeg opbouwt.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onBegeleid} style={{
              padding: "15px 36px", borderRadius: 12, border: "none", background: "var(--brand)", color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--f)", transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(13,107,88,0.2)"
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(13,107,88,0.25)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(13,107,88,0.2)"; }}
            >Bereken mijn pensioenplan →</button>
            <button onClick={onDirect} style={{
              padding: "15px 24px", borderRadius: 12, border: "1.5px solid #E0E4E3", background: "#fff", color: "#8B8FA3",
              fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--f)", transition: "all 0.15s"
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0E4E3"; e.currentTarget.style.color = "#8B8FA3"; }}
            >Ik weet wat ik doe</button>
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: "#C4C8D0" }}>Gratis — alles blijft in je browser</div>
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #E0E4E3, transparent)" }} />

      {/* EXAMPLE */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "44px 24px 0" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "28px 26px", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(13,107,88,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--brand)" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--brand)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Voorbeeld</span>
          </div>
          <div style={{ fontSize: 15, color: "#8B8FA3", lineHeight: 1.7, marginBottom: 20 }}>
            Lisa (42) wil op haar <strong style={{ color: "#1a1a2e" }}>62e</strong> stoppen. Ze heeft <strong style={{ color: "#1a1a2e" }}>€35.000</strong> vermogen, belegt <strong style={{ color: "#1a1a2e" }}>€300/mnd</strong> en heeft <strong style={{ color: "#1a1a2e" }}>€750/mnd</strong> werkgeverspensioen.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { l: "Vermogen op 62", v: "€198.000", c: "#1a1a2e" },
              { l: "Overbrugging", v: "€144.000", c: "#B45309" },
              { l: "Resultaat", v: "€54.000 over", c: "#0D6B58" },
            ].map(m => (
              <div key={m.l} style={{ flex: "1 1 140px", padding: "14px 16px", borderRadius: 10, background: "#FAFBF9" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#C4C8D0", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>{m.l}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: m.c, letterSpacing: "-0.03em" }}>{m.v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#B0B4C0", lineHeight: 1.6 }}>
            Twee jaar eerder stoppen? Dan heeft Lisa <strong style={{ color: "#DC2626" }}>€38.000 tekort</strong>. Kleine keuzes, groot verschil.
          </div>
        </div>
      </div>

      {/* VALUE PROPS */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "44px 24px" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {[
            { icon: "📊", title: "Zie je overbrugging", desc: "Wat heb je nodig tussen stoppen en je AOW? We splitsen het in fases en laten zien wat je tekort komt." },
            { icon: "💡", title: "Begrijp je bronnen", desc: "AOW, werkgeverspensioen, eigen pensioen, spaargeld — vier potjes. We leggen ze uit in gewone taal." },
            { icon: "🎯", title: "Weet wat je kunt doen", desc: "Meer beleggen, later stoppen, pensioen anders inrichten. We berekenen het effect in euro's." },
          ].map(p => (
            <div key={p.title} style={{ flex: "1 1 220px", padding: "22px 20px", borderRadius: 14, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", transition: "box-shadow 0.25s, transform 0.25s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(13,107,88,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)"; e.currentTarget.style.transform = "none"; }}
            >
              <span style={{ fontSize: 28, display: "block", marginBottom: 14 }}>{p.icon}</span>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e", marginBottom: 6, letterSpacing: "-0.02em" }}>{p.title}</div>
              <div style={{ fontSize: 13, color: "#8B8FA3", lineHeight: 1.65 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 44px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", letterSpacing: "-0.03em", margin: "0 0 16px" }}>Veelgestelde vragen</h2>
        {[
          { q: "Wat is een pensioengat?", a: "Een pensioengat ontstaat als je pensioeninkomen lager is dan wat je nodig hebt. Hoe eerder je stopt, hoe groter het gat." },
          { q: "Wat is het verschil tussen AOW en pensioen?", a: "AOW krijg je van de overheid vanaf je 67e. Werkgeverspensioen bouw je op via je werk. Het zijn twee aparte potjes." },
          { q: "Kan ik eerder stoppen dan mijn AOW-leeftijd?", a: "Ja, maar je moet het gat zelf overbruggen. Dat kan met spaargeld, beleggingen, of door je pensioen eerder te laten ingaan." },
          { q: "Hoeveel minder pensioen bij vervroeging?", a: "Vuistregel: ~8% minder per jaar vervroeging. Twee jaar eerder = ~16% minder, levenslang." },
          { q: "Worden mijn gegevens opgeslagen?", a: "Alleen lokaal in je browser. We sturen niks naar een server." },
        ].map((f, i) => (
          <details key={i} style={{ borderRadius: 12, marginBottom: 6, overflow: "hidden", background: "#fff" }}>
            <summary style={{ padding: "14px 18px", fontSize: 14, fontWeight: 600, color: "#1a1a2e", cursor: "pointer", fontFamily: "var(--f)", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {f.q}<span style={{ color: "#D0D4DC", fontSize: 18, flexShrink: 0, marginLeft: 8, fontWeight: 300 }}>+</span>
            </summary>
            <div style={{ padding: "0 18px 16px", fontSize: 13, color: "#8B8FA3", lineHeight: 1.7 }}>{f.a}</div>
          </details>
        ))}
      </div>

      {/* FINAL CTA */}
      <div style={{ background: "var(--brand-light)", padding: "48px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 800, color: "var(--brand)", letterSpacing: "-0.03em", margin: "0 0 10px" }}>Weet waar je staat</h2>
        <p style={{ fontSize: 14, color: "#8B8FA3", margin: "0 0 28px" }}>In 5 minuten inzicht in je pensioen. Gratis.</p>
        <button onClick={onBegeleid} style={{
          padding: "15px 36px", borderRadius: 12, border: "none", background: "var(--brand)", color: "#fff",
          fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--f)", boxShadow: "0 2px 8px rgba(13,107,88,0.2)", transition: "all 0.2s"
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(13,107,88,0.25)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(13,107,88,0.2)"; }}
        >Start mijn pensioenplan →</button>
      </div>

      <footer style={{ textAlign: "center", padding: "16px 20px", color: "#C4C8D0", fontSize: 10, lineHeight: 1.6, background: "#FAFBF9" }}>
        Indicatieve berekening — raadpleeg een financieel adviseur voor persoonlijk advies
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════
   ONBOARDING — 3 steps, pension-focused
   ═══════════════════════════════════════ */
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    leeftijd: 40, stopLeeftijd: 63, samenwonend: true,
    gewenstUitgaven: 2000, uitgavenNaAOW: 1800,
    hypotheekPerMaand: 900, hypotheekEindjaar: 2042, woningType: "koop_hypotheek", restKostenNaAflossing: 300, huurPerMaand: 1000, huurIndexatie: 3, vasteWoonlasten: 300,
    werkgeversPensioen: 800, pensioenIngangLeeftijd: 68, lijfrenteStartLeeftijd: 62,
    pensioenbeleggenPot: 0, spaargeld: 15000, beleggingen: 15000, totaalInleg: 500, pensioenPct: 40,
    rendement: 7, inflatie: 2.5
  });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const aowBedrag = d.samenwonend ? AOW_SAMEN_BRUTO : AOW_ALLEEN_BRUTO;

  const steps = [
    {
      title: "Wanneer wil je stoppen?",
      sub: "Er zijn drie momenten die je pensioeninkomen bepalen. We leggen het even uit.",
      content: (
        <div>
          <Slider label="Hoe oud ben je nu?" value={d.leeftijd} onChange={v => set("leeftijd", v)} min={18} max={65} format={v => `${v} jaar`} />
          <Slider label="Wanneer wil je stoppen met werken?" value={d.stopLeeftijd} onChange={v => set("stopLeeftijd", v)} min={50} max={70} format={v => `${v} jaar`} info="stopleeftijd" />

          <div style={{ background: "#FAFBF9", borderRadius: 10, padding: "14px 16px", marginTop: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 8, fontFamily: "var(--f)" }}>Drie leeftijden die ertoe doen:</div>
            {[
              { l: `Jouw stopleeftijd`, v: `${d.stopLeeftijd} jaar`, c: "var(--brand)", s: "Wanneer jij wilt stoppen", info: "stopleeftijd" },
              { l: "AOW-leeftijd", v: `${AOW_LEEFTIJD} jaar`, c: "var(--brand)", s: "Overheid betaalt je AOW", info: "aowleeftijd" },
              { l: "Pensioenrichtleeftijd", v: `${PENSIOEN_RICHTLEEFTIJD} jaar`, c: "var(--brand)", s: "Werkgeverspensioen gaat in", info: "pensioenrichtleeftijd" },
            ].map((r, i) => (
              <div key={r.l} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderTop: i > 0 ? "1px solid #EBEBEB" : "none" }}>
                <div style={{ width: 3, height: 22, borderRadius: 2, background: r.c, marginRight: 10, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700, color: "#111", fontFamily: "var(--f)" }}>{r.l} <Info tip={r.info} /></div>
                  <div style={{ fontSize: 10, color: "#BBB", fontFamily: "var(--f)" }}>{r.s}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: r.c, fontFamily: "var(--f)" }}>{r.v}</div>
              </div>
            ))}
            {d.stopLeeftijd < AOW_LEEFTIJD && (
              <div style={{ marginTop: 8, padding: "8px 10px", background: "#FFF5F5", borderRadius: 6, fontSize: 11, color: "#B91C1C", fontFamily: "var(--f)", lineHeight: 1.5 }}>
                ⚠ Je stopt {AOW_LEEFTIJD - d.stopLeeftijd} jaar vóór je AOW. In die periode heb je geen salaris en geen AOW. Dit gat moet je zelf overbruggen.
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6, fontFamily: "var(--f)" }}>Woonsituatie <Info tip="woonsituatie" /></div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ v: true, l: "Samenwonend" }, { v: false, l: "Alleenstaand" }].map(o => (
                <button key={String(o.v)} onClick={() => set("samenwonend", o.v)} style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, border: `1.5px solid ${d.samenwonend === o.v ? "var(--brand)" : "#EBEBEB"}`,
                  background: d.samenwonend === o.v ? "var(--brand)" : "#fff", color: d.samenwonend === o.v ? "#fff" : "#AAA",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--f)", transition: "all 0.15s"
                }}>{o.l}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 6, fontFamily: "var(--f)" }}>Jouw geschatte AOW-uitkering: <strong style={{ color: "#111" }}>{fmt(aowBedrag)}</strong>/mnd bruto</div>
          </div>
        </div>
      )
    },
    {
      title: "Wat heb je nodig?",
      sub: "Hoeveel wil je per maand te besteden hebben als je gestopt bent met werken?",
      content: (
        <div>
          <Field label="Gewenste maanduitgaven na stoppen" value={d.gewenstUitgaven} onChange={v => set("gewenstUitgaven", v)} prefix="€" info="uitgaven" hint="Vuistregel: ~70% van wat je nu uitgeeft" />
          <Field label="Gewenste maanduitgaven vanaf AOW-leeftijd" value={d.uitgavenNaAOW} onChange={v => set("uitgavenNaAOW", v)} prefix="€" hint="Vaak iets lager — rustiger leven, lagere belasting" />

          <div style={{ borderTop: "1px solid #F0F0F0", marginTop: 8, paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, fontFamily: "var(--f)" }}>Woonlasten</div>
          </div>

          {/* WONING TYPE */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {[
              { v: "koop_hypotheek", l: "Koop + hypotheek" },
              { v: "huur", l: "Huur" },
              { v: "koop_afgelost", l: "Koop (afgelost)" },
            ].map(o => (
              <button key={o.v} onClick={() => set("woningType", o.v)} style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: "var(--f)", cursor: "pointer", transition: "all 0.15s",
                border: d.woningType === o.v ? "1.5px solid var(--brand)" : "1.5px solid #EBEBEB",
                background: d.woningType === o.v ? "var(--brand-light)" : "#fff",
                color: d.woningType === o.v ? "var(--brand)" : "#8B8FA3",
              }}>{o.l}</button>
            ))}
          </div>

          {d.woningType === "koop_hypotheek" && <>
            <Field label="Hypotheeklasten per maand" value={d.hypotheekPerMaand} onChange={v => set("hypotheekPerMaand", v)} prefix="€" />
            <Field label="Hypotheek afgelost in (jaar)" value={d.hypotheekEindjaar} onChange={v => set("hypotheekEindjaar", v)} hint="Na dit jaar dalen je woonlasten" />
            <Field label="Restkosten na aflossing" value={d.restKostenNaAflossing} onChange={v => set("restKostenNaAflossing", v)} prefix="€" suffix="/mnd" hint="VvE, onderhoud, gemeentebelasting — 0 als je dit al in je uitgaven hebt" />
            {d.hypotheekPerMaand > 0 && (
              <div style={{ background: "#F0FFF4", borderRadius: 8, padding: "12px 14px", marginTop: 4 }}>
                <div style={{ fontSize: 11, color: "#16A34A", fontFamily: "var(--f)" }}>
                  Na aflossing dalen je uitgaven met <strong>{fmt(d.hypotheekPerMaand - d.restKostenNaAflossing)}</strong>/mnd. Je houdt {fmt(d.restKostenNaAflossing)}/mnd aan vaste woonlasten.
                </div>
              </div>
            )}
          </>}

          {d.woningType === "huur" && <>
            <Field label="Huur per maand" value={d.huurPerMaand} onChange={v => set("huurPerMaand", v)} prefix="€" hint="Je huidige kale/bruto huur" />
            <Slider label="Verwachte jaarlijkse huurstijging" value={d.huurIndexatie} onChange={v => set("huurIndexatie", v)} min={0} max={6} step={0.5} format={v => `${v}%`} />
            <div style={{ background: "#FFFBF5", borderRadius: 8, padding: "12px 14px", marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "#B45309", fontFamily: "var(--f)", lineHeight: 1.6 }}>
                Huur stopt niet. Bij {d.huurIndexatie}% stijging per jaar kost je huur over 20 jaar ~{fmt(Math.round(d.huurPerMaand * Math.pow(1 + d.huurIndexatie / 100, 20)))}/mnd. Houd hier rekening mee in je planning.
              </div>
            </div>
          </>}

          {d.woningType === "koop_afgelost" && <>
            <Field label="Vaste woonlasten per maand" value={d.vasteWoonlasten} onChange={v => set("vasteWoonlasten", v)} prefix="€" suffix="/mnd" hint="VvE, onderhoud, gemeentebelasting, verzekeringen" />
            <div style={{ background: "#F0FFF4", borderRadius: 8, padding: "12px 14px", marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "#16A34A", fontFamily: "var(--f)" }}>
                Geen hypotheek — alleen vaste lasten. Dat is een sterke uitgangspositie voor je pensioenplan.
              </div>
            </div>
          </>}
        </div>
      )
    },
    {
      title: "Wat bouw je op?",
      sub: "Je pensioen bestaat uit vier bronnen. We leggen ze even uit.",
      content: (
        <div>
          <div style={{ background: "#FAFBF9", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 8, fontFamily: "var(--f)" }}>Je pensioen komt uit vier bronnen:</div>
            {[
              { e: "🏛", l: "AOW", s: "Van de overheid, krijgt iedereen", c: "#2563EB", info: "aow" },
              { e: "🏢", l: "Werkgeverspensioen", s: "Via je werk, check mijnpensioenoverzicht.nl", c: "#7C3AED", info: "werkgeverspensioen" },
              { e: "📈", l: "Eigen pensioenbeleggen", s: "Lijfrente, Brand New Day — belastingvoordeel", c: "#D97706", info: "pensioenbeleggen" },
              { e: "💰", l: "Vrij vermogen", s: "Spaargeld, beleggingen — vrij opneembaar", c: "var(--brand)", info: "vrijvermogen" },
            ].map((r, i) => (
              <div key={r.l} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderTop: i > 0 ? "1px solid #EBEBEB" : "none" }}>
                <span style={{ fontSize: 16, marginRight: 8, width: 24, textAlign: "center" }}>{r.e}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700, color: "#111", fontFamily: "var(--f)" }}>{r.l} <Info tip={r.info} /></div>
                  <div style={{ fontSize: 10, color: "#BBB", fontFamily: "var(--f)" }}>{r.s}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, fontFamily: "var(--f)" }}>Werkgeverspensioen</div>
          <Field label="Geschatte uitkering op pensioenleeftijd" value={d.werkgeversPensioen} onChange={v => set("werkgeversPensioen", v)} prefix="€" suffix="/mnd bruto" info="werkgeverspensioen" hint="Staat op mijnpensioenoverzicht.nl of je UPO" />
          <div style={{ marginTop: -8, marginBottom: 10 }}>
            <a href="https://www.mijnpensioenoverzicht.nl" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--brand)", fontWeight: 600, fontFamily: "var(--f)", textDecoration: "none", borderBottom: "1px dashed var(--brand)" }}>→ Open mijnpensioenoverzicht.nl om je bedrag op te zoeken</a>
          </div>
          <Slider label="Pensioen gaat in op leeftijd" value={d.pensioenIngangLeeftijd} onChange={v => set("pensioenIngangLeeftijd", v)} min={60} max={70} format={v => `${v} jaar`} info="pensioenrichtleeftijd" />
          {d.pensioenIngangLeeftijd < PENSIOEN_RICHTLEEFTIJD && (
            <div style={{ background: "#FFF5F5", borderRadius: 6, padding: "8px 10px", marginBottom: 12, fontSize: 11, color: "#B91C1C", fontFamily: "var(--f)" }}>
              {PENSIOEN_RICHTLEEFTIJD - d.pensioenIngangLeeftijd} jaar eerder = ~{Math.round((PENSIOEN_RICHTLEEFTIJD - d.pensioenIngangLeeftijd) * 8)}% minder uitkering. Van {fmt(d.werkgeversPensioen)} naar ~{fmt(Math.round(d.werkgeversPensioen * (1 - (PENSIOEN_RICHTLEEFTIJD - d.pensioenIngangLeeftijd) * KORTING_PER_JAAR)))}/mnd
            </div>
          )}

          <div style={{ borderTop: "1px solid #F0F0F0", marginTop: 6, paddingTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, fontFamily: "var(--f)" }}>Eigen opbouw</div>
          </div>
          <Field label="Eigen pensioenpotje" value={d.pensioenbeleggenPot} onChange={v => set("pensioenbeleggenPot", v)} prefix="€" hint="Wat er nu al in je lijfrente/pensioenrekening zit — 0 als je dit niet hebt" />
          <Field label="Spaargeld" value={d.spaargeld} onChange={v => set("spaargeld", v)} prefix="€" info="spaargeld" hint="Spaarrekening — groeit ~2% per jaar" />
          <Field label="Beleggingen" value={d.beleggingen} onChange={v => set("beleggingen", v)} prefix="€" info="beleggingen" hint="Indexfondsen, ETF's, aandelen" />

          <div style={{ borderTop: "1px solid #F0F2F5", marginTop: 8, paddingTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#8B8FA3", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, fontFamily: "var(--f)" }}>Maandelijkse inleg</div>
          </div>
          <AllocationSlider total={d.totaalInleg} pct={d.pensioenPct} onTotalChange={v => set("totaalInleg", v)} onPctChange={v => set("pensioenPct", v)} rendement={d.rendement} />
          <Slider label="Verwacht rendement" value={d.rendement} onChange={v => set("rendement", v)} min={1} max={12} step={0.5} format={v => `${v}%`} info="rendement" />
        </div>
      )
    }
  ];

  const s = steps[step];
  return (
    <div style={{ minHeight: "100vh", background: "#FAFBF9", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "var(--f)" }}>
      <div style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 18, padding: "30px 26px", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 12px 36px rgba(13,107,88,0.06)" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>{steps.map((_, i) => (<div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? "var(--brand)" : "#EBEBEB", transition: "background 0.3s" }} />))}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#BBB", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, fontFamily: "var(--f)" }}>Stap {step + 1} van {steps.length}</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--brand)", margin: "0 0 6px", letterSpacing: "-0.03em", fontFamily: "var(--f)" }}>{s.title}</h2>
        <p style={{ fontSize: 13, color: "#999", lineHeight: 1.5, margin: "0 0 20px", fontFamily: "var(--f)" }}>{s.sub}</p>
        <div style={{ maxHeight: "55vh", overflowY: "auto", paddingRight: 4 }}>{s.content}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {step > 0 && <button onClick={() => setStep(step - 1)} style={{ padding: "11px 20px", borderRadius: 8, border: "1.5px solid #EBEBEB", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#999", fontFamily: "var(--f)" }}>Terug</button>}
          <button onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete(d)} style={{ flex: 1, padding: "11px 20px", borderRadius: 8, border: "none", background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--f)" }}>
            {step < steps.length - 1 ? "Volgende →" : "Bekijk mijn pensioenplan →"}
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: "#DDD", fontFamily: "var(--f)" }}>Alles blijft in je browser — we slaan niks extern op.</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════ */
export default function App() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("landing"); // "landing" | "onboarding" | "dashboard"
  const [tab, setTab] = useState("overzicht");
  const [editOpen, setEditOpen] = useState(false);
  const [firstVisit, setFirstVisit] = useState(true);

  const [leeftijd, setLeeftijd] = useState(40);
  const [stopLeeftijd, setStopLeeftijd] = useState(63);
  const [samenwonend, setSamenwonend] = useState(true);
  const [gewenstUitgaven, setGewenstUitgaven] = useState(2000);
  const [uitgavenNaAOW, setUitgavenNaAOW] = useState(1800);
  const [woningType, setWoningType] = useState("koop_hypotheek"); // "koop_hypotheek" | "huur" | "koop_afgelost"
  const [hypotheekPerMaand, setHypotheekPerMaand] = useState(900);
  const [hypotheekEindjaar, setHypotheekEindjaar] = useState(2042);
  const [restKostenNaAflossing, setRestKostenNaAflossing] = useState(300);
  const [huurPerMaand, setHuurPerMaand] = useState(1000);
  const [huurIndexatie, setHuurIndexatie] = useState(3);
  const [vasteWoonlasten, setVasteWoonlasten] = useState(300);
  const [werkgeversPensioen, setWerkgeversPensioen] = useState(800);
  const [pensioenIngangLeeftijd, setPensioenIngangLeeftijd] = useState(68);
  const [pensioenbeleggenPot, setPensioenbeleggenPot] = useState(0);
  const [lijfrenteStartLeeftijd, setLijfrenteStartLeeftijd] = useState(62);
  const [spaargeld, setSpaargeld] = useState(15000);
  const [beleggingen, setBeleggingen] = useState(15000);
  const [totaalInleg, setTotaalInleg] = useState(500);
  const [pensioenPct, setPensioenPct] = useState(40);
  const [rendement, setRendement] = useState(7);
  const [scenStop, setScenStop] = useState(65);
  const [scenInleg, setScenInleg] = useState(700);
  const [scenRend, setScenRend] = useState(4);
  const [toonReeel, setToonReeel] = useState(false);
  const INFLATIE = 0.025;
  const defleer = (bedrag, jaren) => toonReeel ? Math.round(bedrag / Math.pow(1 + INFLATIE, jaren)) : bedrag;
  const defJ = (a) => Math.max(0, a - leeftijd); // jaren vanaf nu

  const maandInleg = Math.round(totaalInleg * (1 - pensioenPct / 100));
  const pensioenbeleggen = Math.round(totaalInleg * pensioenPct / 100);
  const belastingVoordeel = Math.round(pensioenbeleggen * BELASTING_TARIEF);
  const huidigVermogen = spaargeld + beleggingen;
  const allState = { leeftijd, stopLeeftijd, samenwonend, gewenstUitgaven, uitgavenNaAOW, woningType, hypotheekPerMaand, hypotheekEindjaar, restKostenNaAflossing, huurPerMaand, huurIndexatie, vasteWoonlasten, werkgeversPensioen, pensioenIngangLeeftijd, lijfrenteStartLeeftijd, pensioenbeleggenPot, spaargeld, beleggingen, totaalInleg, pensioenPct, rendement };
  const currentYear = new Date().getFullYear();
  const hypotheekAflosLeeftijd = leeftijd + (hypotheekEindjaar - currentYear);
  // Woonlasten reductie na aflossing (alleen koop_hypotheek)
  const woonlastenReductie = woningType === "koop_hypotheek" ? Math.max(0, hypotheekPerMaand - restKostenNaAflossing) : 0;
  // Effectieve woonlasten per leeftijd
  const woonlastenOpLeeftijd = (age, jarenVanafNu) => {
    if (woningType === "koop_hypotheek") return age >= hypotheekAflosLeeftijd ? restKostenNaAflossing : hypotheekPerMaand;
    if (woningType === "huur") return Math.round(huurPerMaand * Math.pow(1 + huurIndexatie / 100, jarenVanafNu));
    return vasteWoonlasten; // koop_afgelost
  };

  useEffect(() => {
    const d = load();
    if (d && d.leeftijd) {
      const S = { leeftijd: setLeeftijd, stopLeeftijd: setStopLeeftijd, samenwonend: setSamenwonend, gewenstUitgaven: setGewenstUitgaven, uitgavenNaAOW: setUitgavenNaAOW, woningType: setWoningType, hypotheekPerMaand: setHypotheekPerMaand, hypotheekEindjaar: setHypotheekEindjaar, restKostenNaAflossing: setRestKostenNaAflossing, huurPerMaand: setHuurPerMaand, huurIndexatie: setHuurIndexatie, vasteWoonlasten: setVasteWoonlasten, werkgeversPensioen: setWerkgeversPensioen, pensioenIngangLeeftijd: setPensioenIngangLeeftijd, lijfrenteStartLeeftijd: setLijfrenteStartLeeftijd, pensioenbeleggenPot: setPensioenbeleggenPot, spaargeld: setSpaargeld, beleggingen: setBeleggingen, totaalInleg: setTotaalInleg, pensioenPct: setPensioenPct, rendement: setRendement };
      Object.entries(d).forEach(([k, v]) => { if (S[k] && v !== undefined) S[k](v); });
      setReady(true);
      setPage("dashboard");
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (ready) save(allState); }, [leeftijd, stopLeeftijd, samenwonend, gewenstUitgaven, uitgavenNaAOW, woningType, hypotheekPerMaand, hypotheekEindjaar, restKostenNaAflossing, huurPerMaand, huurIndexatie, vasteWoonlasten, werkgeversPensioen, pensioenIngangLeeftijd, lijfrenteStartLeeftijd, pensioenbeleggenPot, spaargeld, beleggingen, totaalInleg, pensioenPct, rendement]);
  useEffect(() => { setEditOpen(false); }, [tab]);

  const handleOnboard = useCallback((d) => {
    setLeeftijd(d.leeftijd); setStopLeeftijd(d.stopLeeftijd); setSamenwonend(d.samenwonend);
    setGewenstUitgaven(d.gewenstUitgaven); setUitgavenNaAOW(d.uitgavenNaAOW);
    setHypotheekPerMaand(d.hypotheekPerMaand); setHypotheekEindjaar(d.hypotheekEindjaar);
    if (d.woningType) setWoningType(d.woningType);
    if (d.restKostenNaAflossing !== undefined) setRestKostenNaAflossing(d.restKostenNaAflossing);
    if (d.huurPerMaand !== undefined) setHuurPerMaand(d.huurPerMaand);
    if (d.huurIndexatie !== undefined) setHuurIndexatie(d.huurIndexatie);
    if (d.vasteWoonlasten !== undefined) setVasteWoonlasten(d.vasteWoonlasten);
    setWerkgeversPensioen(d.werkgeversPensioen); setPensioenIngangLeeftijd(d.pensioenIngangLeeftijd);
    if (d.lijfrenteStartLeeftijd !== undefined) setLijfrenteStartLeeftijd(d.lijfrenteStartLeeftijd);
    setPensioenbeleggenPot(d.pensioenbeleggenPot); setSpaargeld(d.spaargeld); setBeleggingen(d.beleggingen);
    setTotaalInleg(d.totaalInleg); setPensioenPct(d.pensioenPct); setRendement(d.rendement);
    setReady(true);
    setPage("dashboard");
  }, []);

  const handleDirectStart = useCallback(() => {
    setReady(true);
    setPage("dashboard");
    setEditOpen(true);
  }, []);

  // Derived
  const aowM = samenwonend ? AOW_SAMEN_BRUTO : AOW_ALLEEN_BRUTO;
  const jarenVervroeging = Math.max(0, PENSIOEN_RICHTLEEFTIJD - pensioenIngangLeeftijd);
  const pensioenKorting = jarenVervroeging * KORTING_PER_JAAR;
  const effectiefPensioen = Math.round(werkgeversPensioen * (1 - pensioenKorting));

  // Pensioenbeleggen pot — groeit tot lijfrenteStartLeeftijd
  const pbPot = useMemo(() => {
    if (pensioenbeleggen <= 0 && pensioenbeleggenPot <= 0) return 0;
    let v = pensioenbeleggenPot;
    for (let i = 0; i < Math.max(0, lijfrenteStartLeeftijd - leeftijd); i++) v = v * (1 + rendement / 100) + pensioenbeleggen * 12;
    return v;
  }, [pensioenbeleggen, pensioenbeleggenPot, rendement, leeftijd, lijfrenteStartLeeftijd]);
  const lijfrenteUitkeringsDuur = Math.max(20, (AOW_LEEFTIJD - lijfrenteStartLeeftijd) + 20);
  const pbUitkering = pbPot > 0 ? Math.round(pbPot / (lijfrenteUitkeringsDuur * 12)) : 0;

  // Vermogen op stopleeftijd
  const vermogenOpStop = useMemo(() => {
    let sp = spaargeld, bl = beleggingen;
    for (let i = 0; i < Math.max(0, stopLeeftijd - leeftijd); i++) {
      sp = sp * (1 + SPAARRENTE);
      bl = bl * (1 + rendement / 100) + maandInleg * 12;
    }
    return Math.round(sp + bl);
  }, [spaargeld, beleggingen, maandInleg, rendement, leeftijd, stopLeeftijd]);

  // Groei data — split per vermogenstype + rendement bandbreedte
  const groeiData = useMemo(() => {
    const d = [];
    let sp = spaargeld, bl = beleggingen, pb = pensioenbeleggenPot;
    let blLow = beleggingen, blHigh = beleggingen;
    const rLow = 4, rHigh = 9;
    for (let a = leeftijd; a <= 85; a++) {
      d.push({
        leeftijd: a,
        spaargeld: Math.round(Math.max(0, sp)),
        beleggingen: Math.round(Math.max(0, bl)),
        pensioenpot: Math.round(Math.max(0, pb)),
        vermogen: Math.round(Math.max(0, sp) + Math.max(0, bl)),
        bandLow: Math.round(Math.max(0, sp) + Math.max(0, blLow)),
        bandHigh: Math.round(Math.max(0, sp) + Math.max(0, blHigh)),
      });
      if (a < stopLeeftijd) {
        sp = sp * (1 + SPAARRENTE);
        bl = bl * (1 + rendement / 100) + maandInleg * 12;
        blLow = blLow * (1 + rLow / 100) + maandInleg * 12;
        blHigh = blHigh * (1 + rHigh / 100) + maandInleg * 12;
        pb = pb * (1 + rendement / 100) + pensioenbeleggen * 12;
      } else {
        const wl = woonlastenOpLeeftijd(a, a - leeftijd);
        const baseUitg = a >= AOW_LEEFTIJD ? uitgavenNaAOW : gewenstUitgaven;
        // For koop_hypotheek: before aflossing, full hypotheek in uitgaven. After: restkosten.
        // For huur: huur grows with indexatie, we add the delta above current huur
        // For koop_afgelost: no change (vaste lasten already in uitgaven)
        let uitgAdj = baseUitg;
        if (woningType === "koop_hypotheek" && a >= hypotheekAflosLeeftijd) uitgAdj = Math.max(0, baseUitg - woonlastenReductie);
        if (woningType === "huur") uitgAdj = baseUitg + Math.max(0, wl - huurPerMaand); // add huur growth above current
        const uitg = uitgAdj * 12;
        const aow = a >= AOW_LEEFTIJD ? aowM * 12 : 0;
        const pen = (a >= pensioenIngangLeeftijd ? effectiefPensioen * 12 : 0) + (a >= lijfrenteStartLeeftijd ? pbUitkering * 12 : 0);
        const onttrekking = Math.max(0, uitg - aow - pen);
        const fromSp = Math.min(Math.max(0, sp), onttrekking);
        sp = sp * (1 + SPAARRENTE) - fromSp;
        bl = Math.max(0, bl * (1 + rendement / 100 * 0.4) - Math.max(0, onttrekking - fromSp));
        blLow = Math.max(0, blLow * (1 + rLow / 100 * 0.4) - Math.max(0, onttrekking - fromSp));
        blHigh = Math.max(0, blHigh * (1 + rHigh / 100 * 0.4) - Math.max(0, onttrekking - fromSp));
        if (sp < 0) sp = 0;
        if (a < lijfrenteStartLeeftijd) pb = pb * (1 + rendement / 100) + pensioenbeleggen * 12;
      }
    }
    return d;
  }, [leeftijd, stopLeeftijd, spaargeld, beleggingen, pensioenbeleggenPot, pensioenbeleggen, maandInleg, rendement, gewenstUitgaven, uitgavenNaAOW, aowM, effectiefPensioen, pbUitkering, pensioenIngangLeeftijd, lijfrenteStartLeeftijd, hypotheekAflosLeeftijd, woningType, hypotheekPerMaand, restKostenNaAflossing, huurPerMaand, huurIndexatie, woonlastenReductie]);

  // Overbrugging phases — event-based to handle lijfrente, werkgeverspensioen, AOW as separate dates
  const overbrugging = useMemo(() => {
    // Build sorted event boundaries after stopLeeftijd
    const events = new Set([stopLeeftijd]);
    if (lijfrenteStartLeeftijd > stopLeeftijd && (pensioenbeleggen > 0 || pensioenbeleggenPot > 0)) events.add(lijfrenteStartLeeftijd);
    if (pensioenIngangLeeftijd > stopLeeftijd) events.add(pensioenIngangLeeftijd);
    if (AOW_LEEFTIJD > stopLeeftijd) events.add(AOW_LEEFTIJD);
    const sorted = [...events].sort((a, b) => a - b);

    const incomeAt = (age) => {
      let inc = 0;
      if (age >= AOW_LEEFTIJD) inc += aowM;
      if (age >= pensioenIngangLeeftijd) inc += effectiefPensioen;
      if (age >= lijfrenteStartLeeftijd && pbUitkering > 0) inc += pbUitkering;
      return inc;
    };
    const uitgavenAt = (age) => {
      const base = age >= AOW_LEEFTIJD ? uitgavenNaAOW : gewenstUitgaven;
      if (woningType === "koop_hypotheek") return age >= hypotheekAflosLeeftijd ? Math.max(0, base - woonlastenReductie) : base;
      if (woningType === "huur") { const wl = woonlastenOpLeeftijd(age, age - leeftijd); return base + Math.max(0, wl - huurPerMaand); }
      return base; // koop_afgelost
    };

    const phases = [];
    for (let i = 0; i < sorted.length; i++) {
      const start = sorted[i];
      const end = i < sorted.length - 1 ? sorted[i + 1] : null;
      const jaren = end ? end - start : 0;
      const ink = incomeAt(start);
      const uitg = uitgavenAt(start);
      const gat = Math.max(0, uitg - ink);
      if (jaren > 0) {
        phases.push({ start, end, jaren, uitgaven: uitg, inkomen: ink, gat, totaal: gat * 12 * jaren });
      }
    }

    // Final phase — everything running
    const allesStart = Math.max(pensioenIngangLeeftijd, AOW_LEEFTIJD, pbUitkering > 0 ? lijfrenteStartLeeftijd : 0);
    const allesInkomen = incomeAt(allesStart);
    const allesUitgaven = uitgavenAt(allesStart);
    const allesGat = Math.max(0, allesUitgaven - allesInkomen);

    const totaalNodig = phases.reduce((s, p) => s + p.totaal, 0);
    const tekort = Math.max(0, totaalNodig - vermogenOpStop);

    return { phases, alles: { start: allesStart, uitgaven: allesUitgaven, inkomen: allesInkomen, gat: allesGat }, totaalNodig, tekort, vermogenOpStop };
  }, [stopLeeftijd, pensioenIngangLeeftijd, lijfrenteStartLeeftijd, effectiefPensioen, pbUitkering, aowM, gewenstUitgaven, uitgavenNaAOW, woningType, hypotheekPerMaand, hypotheekAflosLeeftijd, woonlastenReductie, huurPerMaand, huurIndexatie, leeftijd, vermogenOpStop, pensioenbeleggen, pensioenbeleggenPot]);

  // Scenario: impact extra inleg
  const extraInlegImpact = useMemo(() => {
    const extra = 200;
    let sp = spaargeld, bl = beleggingen;
    for (let i = 0; i < Math.max(0, stopLeeftijd - leeftijd); i++) { sp = sp * (1 + SPAARRENTE); bl = bl * (1 + rendement / 100) + (maandInleg + extra) * 12; }
    return Math.round(sp + bl) - vermogenOpStop;
  }, [spaargeld, beleggingen, maandInleg, rendement, leeftijd, stopLeeftijd, vermogenOpStop]);

  const fonts = <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />;
  const baseStyles = <style>{`:root{--f:'Outfit',sans-serif;--brand:#0D6B58;--brand-light:#EBF5F3;--brand-mid:#0A8C72;--bg:#FAFBF9;--card:#fff;--border:#ECF0EE;--text:#1a1a2e;--muted:#8B8FA3;--shadow:rgba(13,107,88,0.06)}*{box-sizing:border-box;margin:0}@keyframes tipIn{from{opacity:0;transform:translateX(-50%) translateY(4px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}.fu{animation:fadeUp 0.4s ease forwards}.si{animation:slideIn 0.4s ease forwards}@media(max-width:768px){.dsk{display:none!important}}@media(min-width:769px){.mob{display:none!important}}@media print{body{background:#fff!important}header,.mob,.dsk,[data-noprint]{display:none!important}footer{page-break-before:always}}`}</style>;

  if (loading) return <div style={{ minHeight: "100vh", background: "#FAFBF9", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 14, color: "#BBB" }}>Laden...</div></div>;

  if (page === "landing") return <>{fonts}{baseStyles}<GlobalTooltip /><Landing onBegeleid={() => setPage("onboarding")} onDirect={handleDirectStart} /></>;
  if (page === "onboarding") return <>{fonts}{baseStyles}<GlobalTooltip /><Onboarding onComplete={handleOnboard} /></>;

  const TABS = [
    { id: "overzicht", l: "Overzicht", s: "🏠 Overzicht" },
    { id: "overbrugging", l: "Overbrugging", s: "📊 Overbrugging" },
    { id: "opbouw", l: "Mijn opbouw", s: "📈 Opbouw" },
    { id: "actie", l: "Wat kan ik doen?", s: "💡 Acties" },
    { id: "scenario", l: "Wat als?", s: "🔀 Wat als?" },
    { id: "pro", l: "Over", s: "ℹ️ Over" },
  ];

  const editPanels = {
    overbrugging: { title: "Gegevens aanpassen", summary: `Stop ${stopLeeftijd}j · ${fmt(totaalInleg)}/m (${pensioenPct}% pensioen)`, content: (
      <div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Slider compact label="Stopleeftijd" value={stopLeeftijd} onChange={setStopLeeftijd} min={50} max={70} format={v => `${v} jaar`} info="stopleeftijd" />
          <Slider compact label="Leeftijd nu" value={leeftijd} onChange={setLeeftijd} min={18} max={65} format={v => `${v} jaar`} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Field compact label="Gewenst na stoppen" value={gewenstUitgaven} onChange={setGewenstUitgaven} prefix="€" suffix="/mnd" />
          <Field compact label="Gewenst na AOW" value={uitgavenNaAOW} onChange={setUitgavenNaAOW} prefix="€" suffix="/mnd" />
        </div>
        <AllocationSlider compact total={totaalInleg} pct={pensioenPct} onTotalChange={setTotaalInleg} onPctChange={setPensioenPct} rendement={rendement} />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Field compact label="Werkgeverspensioen" value={werkgeversPensioen} onChange={setWerkgeversPensioen} prefix="€" suffix="/mnd" />
          <Slider compact label="Pensioen ingangsl." value={pensioenIngangLeeftijd} onChange={setPensioenIngangLeeftijd} min={60} max={70} format={v => `${v}j`} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Slider compact label="Lijfrente start" value={lijfrenteStartLeeftijd} onChange={setLijfrenteStartLeeftijd} min={AOW_LEEFTIJD - 5} max={AOW_LEEFTIJD} format={v => `${v}j`} info="lijfrentestart" />
          {woningType === "koop_hypotheek" && <Field compact label="Hypotheek" value={hypotheekPerMaand} onChange={setHypotheekPerMaand} prefix="€" suffix="/mnd" />}
          {woningType === "huur" && <Field compact label="Huur" value={huurPerMaand} onChange={setHuurPerMaand} prefix="€" suffix="/mnd" />}
        </div>
      </div>
    )},
    opbouw: { title: "Gegevens aanpassen", summary: `${fmt(spaargeld)} spaar · ${fmt(beleggingen)} beleg · ${fmt(totaalInleg)}/m`, content: (
      <div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Field compact label="Spaargeld" value={spaargeld} onChange={setSpaargeld} prefix="€" info="spaargeld" />
          <Field compact label="Beleggingen" value={beleggingen} onChange={setBeleggingen} prefix="€" info="beleggingen" />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Field compact label="Pensioenpotje" value={pensioenbeleggenPot} onChange={setPensioenbeleggenPot} prefix="€" hint="Huidig saldo lijfrente/pensioenrekening" />
          <Slider compact label="Rendement" value={rendement} onChange={setRendement} min={1} max={12} step={0.5} format={v => `${v}%`} info="rendement" />
        </div>
        <AllocationSlider compact total={totaalInleg} pct={pensioenPct} onTotalChange={setTotaalInleg} onPctChange={setPensioenPct} rendement={rendement} />
      </div>
    )},
    actie: { title: "Gegevens aanpassen", summary: `${fmt(totaalInleg)}/m · ${pensioenPct}% pensioen`, content: (
      <div>
        <AllocationSlider compact total={totaalInleg} pct={pensioenPct} onTotalChange={setTotaalInleg} onPctChange={setPensioenPct} rendement={rendement} />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Slider compact label="Stopleeftijd" value={stopLeeftijd} onChange={setStopLeeftijd} min={50} max={70} format={v => `${v} jaar`} />
          <Slider compact label="Pensioen ingangsl." value={pensioenIngangLeeftijd} onChange={setPensioenIngangLeeftijd} min={60} max={70} format={v => `${v}j`} />
          <Slider compact label="Lijfrente start" value={lijfrenteStartLeeftijd} onChange={setLijfrenteStartLeeftijd} min={AOW_LEEFTIJD - 5} max={AOW_LEEFTIJD} format={v => `${v}j`} info="lijfrentestart" />
        </div>
      </div>
    )},
    scenario: { title: "Gegevens aanpassen", summary: `Stop ${stopLeeftijd}j · ${fmt(totaalInleg)}/m`, content: (
      <div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Field compact label="Spaargeld" value={spaargeld} onChange={setSpaargeld} prefix="€" />
          <Field compact label="Beleggingen" value={beleggingen} onChange={setBeleggingen} prefix="€" />
        </div>
        <AllocationSlider compact total={totaalInleg} pct={pensioenPct} onTotalChange={setTotaalInleg} onPctChange={setPensioenPct} rendement={rendement} />
      </div>
    )}
  };

  const ep = editPanels[tab];

  // Phase bar component
  const PhaseCard = ({ label, color, jaren, start, end, uitgaven, inkomen, gat, details, delay, totaalFase, vermogenDaarna, vermogenPct }) => (
    <div style={{ flex: "1 1 260px", background: "#fff", borderRadius: 14, padding: "20px 22px", borderLeft: `4px solid ${color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", transition: "box-shadow 0.25s, transform 0.25s", animation: `fadeUp 0.4s ease ${delay || 0}s both` }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(13,107,88,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#C4C8D0", fontWeight: 500 }}>{jaren === "rest" ? `Vanaf ${start}` : `${start}–${end} · ${jaren}j`}</div>
      </div>
      <div style={{ fontSize: 11, color: "#8B8FA3", lineHeight: 1.55, marginBottom: 14 }}>{details}</div>
      <div style={{ display: "flex", gap: 0 }}>
        {inkomen === 0 && totaalFase !== undefined ? (
          // NO INCOME: show cost-focused metrics
          [
            { l: "Maandlasten", v: fmt(uitgaven), c: "#1a1a2e", suffix: "/m" },
            { l: "Totaal", v: fmt(totaalFase), c: "#DC2626", suffix: "" },
            { l: "Vermogen daarna", v: vermogenDaarna !== undefined ? fmt(vermogenDaarna) : "—", c: vermogenDaarna !== undefined && vermogenDaarna > 0 ? "var(--brand)" : "#DC2626", suffix: "" },
          ].map((r, i) => (
            <div key={r.l} style={{ flex: 1, padding: "8px 0", borderTop: "1px solid #F0F2F5", textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#C4C8D0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{r.l}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: r.c }}>{r.v}{r.suffix && <span style={{ fontSize: 10, fontWeight: 500, color: "#D0D4DC" }}>{r.suffix}</span>}</div>
            </div>
          ))
        ) : (
          // HAS INCOME: show nodig/inkomen/tekort
          [
            { l: "Nodig", v: fmt(uitgaven), c: "#1a1a2e" },
            { l: "Inkomen", v: fmt(inkomen), c: inkomen > 0 ? "#0D6B58" : "#C4C8D0" },
            { l: gat > 0 ? "Tekort" : "OK", v: fmt(gat > 0 ? gat : Math.max(0, inkomen - uitgaven)), c: gat > 0 ? "#DC2626" : "#0D6B58" },
          ].map((r, i) => (
            <div key={r.l} style={{ flex: 1, padding: "8px 0", borderTop: "1px solid #F0F2F5", textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#C4C8D0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{r.l}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: r.c }}>{r.v}<span style={{ fontSize: 10, fontWeight: 500, color: "#D0D4DC" }}>/m</span></div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div style={{ "--f": "'Outfit', sans-serif", "--brand": "#0D6B58", "--brand-light": "#EBF5F3", "--brand-mid": "#0A8C72", minHeight: "100vh", background: "#FAFBF9", fontFamily: "var(--f)" }}>
      {fonts}{baseStyles}
      <style>{`::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}`}</style>
      <GlobalTooltip />

      <header style={{ background: "#fff", borderBottom: "1px solid #ECF0EE", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800 }}>P</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", letterSpacing: "-0.03em" }}>Pensioenplanner</span>
        </div>
        <nav className="dsk" style={{ display: "flex", gap: 2, background: "#F5F7F6", borderRadius: 10, padding: 3 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "var(--f)", transition: "all 0.15s", color: tab === t.id ? "#fff" : "#8B8FA3", background: tab === t.id ? "var(--brand)" : "transparent" }}>{t.l}</button>
          ))}
        </nav>
        <button data-noprint onClick={() => { try { localStorage.removeItem(SKEY); } catch {} setReady(false); setPage("landing"); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #ECF0EE", background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#C4C8D0", fontFamily: "var(--f)", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#ECF0EE"; e.currentTarget.style.color = "#C4C8D0"; }}
        >Reset</button>
      </header>

      <div className="mob" style={{ display: "flex", gap: 4, padding: "8px 12px", overflowX: "auto", background: "#fff", borderBottom: "1px solid #ECF0EE" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: 12, fontWeight: 700, fontFamily: "var(--f)", color: tab === t.id ? "#fff" : "#8B8FA3", background: tab === t.id ? "var(--brand)" : "#F5F7F6" }}>{t.s}</button>
        ))}
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {ep && <div data-noprint><EditPanel title={ep.title} open={editOpen} onToggle={() => { setEditOpen(!editOpen); if (firstVisit) setFirstVisit(false); }} summary={ep.summary} showHint={firstVisit}>{ep.content}</EditPanel></div>}

        {/* ═══ OVERZICHT TAB ═══ */}
        {tab === "overzicht" && <>
          {/* SCORE */}
          {(() => {
            const overschot = Math.max(0, vermogenOpStop - overbrugging.totaalNodig);
            const tekortMaanden = overbrugging.tekort > 0 ? Math.round(overbrugging.tekort / Math.max(1, gewenstUitgaven)) : 0;
            const tekortJaren = Math.round(tekortMaanden / 12 * 10) / 10;
            const score = overbrugging.tekort <= 0 && overschot > overbrugging.totaalNodig * 0.1 ? "goed"
              : overbrugging.tekort <= 0 ? "opkoers"
              : overbrugging.tekort <= gewenstUitgaven * 12 ? "aandacht"
              : "serieus";
            const scoreColor = { goed: "var(--brand)", opkoers: "#2563EB", aandacht: "#B45309", serieus: "#DC2626" }[score];
            const scoreBg = { goed: "#EBF5F3", opkoers: "#EFF6FF", aandacht: "#FFFBF5", serieus: "#FFF5F5" }[score];
            const scoreBorder = { goed: "var(--brand)", opkoers: "#2563EB", aandacht: "#D97706", serieus: "#DC2626" }[score];
            // Concrete fix suggestions
            const jarenLaterNodig = overbrugging.tekort > 0 ? Math.ceil(overbrugging.tekort / Math.max(1, gewenstUitgaven * 12)) : 0;
            const extraInlegNodig = overbrugging.tekort > 0 && (stopLeeftijd - leeftijd) > 0 ? Math.round(overbrugging.tekort / ((stopLeeftijd - leeftijd) * 12)) : 0;
            const topActie = extraInlegImpact > 0 ? `€200/mnd extra beleggen levert ${fmt(extraInlegImpact)} op` : "Bekijk je opties";
            return <>
              <div style={{ background: scoreBg, borderRadius: 16, padding: "28px 26px", borderLeft: `4px solid ${scoreBorder}` }} className="fu">
                <div style={{ fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 800, color: scoreColor, lineHeight: 1.3, marginBottom: 6, fontFamily: "var(--f)" }}>
                  {score === "goed" && `Je kunt op je ${stopLeeftijd}e stoppen met werken`}
                  {score === "opkoers" && `Je kunt op je ${stopLeeftijd}e stoppen, maar je hebt weinig marge`}
                  {score === "aandacht" && `Op je ${stopLeeftijd}e stoppen kan, maar je komt ${fmt(overbrugging.tekort)} tekort`}
                  {score === "serieus" && `Op je ${stopLeeftijd}e stoppen lukt nog niet`}
                </div>
                <div style={{ fontSize: 13, color: "#8B8FA3", lineHeight: 1.65, fontFamily: "var(--f)" }}>
                  {score === "goed" && `Je bouwt ${fmt(vermogenOpStop)} op en hebt ${fmt(overbrugging.totaalNodig)} nodig. Je houdt ${fmt(overschot)} over als buffer.`}
                  {score === "opkoers" && `Je bouwt net genoeg op: ${fmt(vermogenOpStop)} bij ${fmt(overbrugging.totaalNodig)} nodig. Je buffer van ${fmt(overschot)} is klein — een tegenvallend beursjaar kan je plan onder druk zetten.`}
                  {score === "aandacht" && `Je komt ${fmt(overbrugging.tekort)} tekort — dat is ${tekortMaanden} maanden aan uitgaven. ${jarenLaterNodig === 1 ? "1 jaar later stoppen" : `${jarenLaterNodig} jaar later stoppen`} of ${fmt(extraInlegNodig)}/mnd extra beleggen zou dit dekken.`}
                  {score === "serieus" && `Je komt ${fmt(overbrugging.tekort)} tekort — dat is ${tekortJaren > 1 ? `${tekortJaren} jaar` : `${tekortMaanden} maanden`} aan uitgaven. Je bouwt ${fmt(vermogenOpStop)} op maar hebt ${fmt(overbrugging.totaalNodig)} nodig. Bekijk welke combinatie van aanpassingen het verschil maakt.`}
                </div>
              </div>

              {/* FOUR CARDS */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }} className="fu">
                {[
                  { tab: "overbrugging", icon: "📊", q: "Heb ik genoeg om te overbruggen?",
                    value: overbrugging.tekort > 0 ? fmt(overbrugging.tekort) + " tekort" : fmt(vermogenOpStop - overbrugging.totaalNodig) + " over",
                    accent: overbrugging.tekort > 0 ? "#DC2626" : "var(--brand)",
                    sub: `${fmt(overbrugging.totaalNodig)} nodig in vrij vermogen${overbrugging.phases.length > 0 ? " · " + overbrugging.phases.map(p => `${p.jaren}j ${p.inkomen > 0 ? "deels" : "geen"} inkomen`).join(" · ") : ""}`
                  },
                  { tab: "opbouw", icon: "📈", q: "Hoe groeit mijn vermogen?",
                    value: fmt(vermogenOpStop),
                    accent: "var(--brand)",
                    sub: `${fmt(spaargeld)} spaar + ${fmt(beleggingen)} beleg → ${fmt(vermogenOpStop)} op je ${stopLeeftijd}e`
                  },
                  { tab: "actie", icon: "💡", q: "Hoe verbeter ik mijn plan?",
                    value: topActie,
                    accent: "#16A34A",
                    sub: `${pensioenPct > 0 ? `Belastingvoordeel: ${fmt(belastingVoordeel)}/mnd` : "Je mist belastingvoordeel — je belegt 0% via pensioen"}`
                  },
                  { tab: "scenario", icon: "🔀", q: "Wat als ik iets verander?",
                    value: `${stopLeeftijd + 2} → ${fmt((() => { let sp2 = spaargeld, bl2 = beleggingen; for (let i = 0; i < Math.max(0, stopLeeftijd + 2 - leeftijd); i++) { sp2 *= (1 + SPAARRENTE); bl2 = bl2 * (1 + rendement / 100) + maandInleg * 12; } return Math.round(sp2 + bl2); })())}`,
                    accent: "#2563EB",
                    sub: "2 jaar later stoppen — wat levert het op?"
                  },
                ].map((c, i) => (
                  <button key={c.tab} onClick={() => setTab(c.tab)} style={{
                    flex: "1 1 200px", background: "#fff", borderRadius: 14, padding: "20px 20px 18px",
                    border: "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--f)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)", transition: "all 0.25s",
                    animation: `fadeUp 0.4s ease ${i * 0.08}s both`
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(13,107,88,0.1)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)"; e.currentTarget.style.transform = "none"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 24 }}>{c.icon}</span>
                      <span style={{ fontSize: 11, color: "#C4C8D0", fontWeight: 600 }}>→</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 8, lineHeight: 1.35 }}>{c.q}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: c.accent, marginBottom: 4 }}>{c.value}</div>
                    <div style={{ fontSize: 11, color: "#8B8FA3", lineHeight: 1.45 }}>{c.sub}</div>
                  </button>
                ))}
              </div>

              {/* AANDACHTSPUNTEN */}
              {(() => {
                const punten = [];
                if (spaargeld > beleggingen * 2 && spaargeld > 10000)
                  punten.push({ icon: "💤", text: `Je hebt ${fmt(spaargeld)} spaargeld dat op ~2% staat. Dat verliest koopkracht door inflatie. Overweeg een deel te beleggen.`, tab: "actie" });
                if (pensioenPct === 0 && totaalInleg > 0)
                  punten.push({ icon: "🎁", text: `Je belegt ${fmt(totaalInleg)}/mnd, maar niks via pensioen. Je mist ~${fmt(Math.round(totaalInleg * 0.37))}/mnd belastingvoordeel. Schuif een deel richting pensioen.`, tab: "actie" });
                if (jarenVervroeging > 0)
                  punten.push({ icon: "⚠️", text: `Je pensioen gaat in op ${pensioenIngangLeeftijd} — dat is ${jarenVervroeging} jaar vervroegd. Dit kost ~${Math.round(pensioenKorting * 100)}% van je uitkering, levenslang.`, tab: "opbouw" });
                if (overbrugging.phases.length > 0 && overbrugging.phases[0].inkomen === 0 && overbrugging.phases[0].jaren >= 5)
                  punten.push({ icon: "🔴", text: `Je hebt ${overbrugging.phases[0].jaren} jaar zonder enig inkomen. Dat is een lange periode om te overbruggen met eigen vermogen.`, tab: "overbrugging" });
                if (woningType === "koop_hypotheek" && hypotheekAflosLeeftijd > stopLeeftijd)
                  punten.push({ icon: "🏠", text: `Je hypotheek is pas afgelost op ${hypotheekAflosLeeftijd}. Tot die tijd zijn je woonlasten ${fmt(hypotheekPerMaand)}/mnd (daarna ${fmt(restKostenNaAflossing)}/mnd).`, tab: "overbrugging" });
                if (woningType === "huur" && huurIndexatie > 2)
                  punten.push({ icon: "🏠", text: `Je huur stijgt ${huurIndexatie}% per jaar. Over 20 jaar is dat ${fmt(Math.round(huurPerMaand * Math.pow(1 + huurIndexatie / 100, 20)))}/mnd. Dat vreet aan je overbrugging.`, tab: "overbrugging" });
                if (belastingVoordeel > 50)
                  punten.push({ icon: "💰", text: `Je krijgt ~${fmt(belastingVoordeel)}/mnd terug van de belastingdienst. Herbeleggen levert flink extra op.`, tab: "actie" });

                if (punten.length === 0) return null;
                return (
                  <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e", marginBottom: 12, fontFamily: "var(--f)" }}>Aandachtspunten voor jouw situatie</div>
                    {punten.slice(0, 3).map((p, i) => (
                      <button key={i} onClick={() => setTab(p.tab)} style={{
                        display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
                        borderTop: i > 0 ? "1px solid #F0F2F5" : "none", width: "100%",
                        background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--f)",
                        transition: "opacity 0.15s"
                      }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                      >
                        <span style={{ fontSize: 16, marginTop: 1 }}>{p.icon}</span>
                        <div style={{ flex: 1, fontSize: 12, color: "#8B8FA3", lineHeight: 1.6 }}>{p.text}</div>
                        <span style={{ fontSize: 11, color: "#C4C8D0", marginTop: 2 }}>→</span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* QUICK SUMMARY */}
              <div style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e", marginBottom: 10, fontFamily: "var(--f)" }}>Jouw plan in het kort</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { l: "Stoppen op", v: `${stopLeeftijd} jaar`, c: "var(--brand)" },
                    { l: "AOW vanaf", v: `${AOW_LEEFTIJD} jaar`, c: "var(--brand)" },
                    { l: "Pensioen vanaf", v: `${pensioenIngangLeeftijd} jaar${jarenVervroeging > 0 ? ` (${jarenVervroeging}j vervroegd)` : ""}`, c: jarenVervroeging > 0 ? "#D97706" : "var(--brand)" },
                    ...(pbUitkering > 0 ? [{ l: "Lijfrente vanaf", v: `${lijfrenteStartLeeftijd} jaar · ${fmt(pbUitkering)}/mnd · ${lijfrenteUitkeringsDuur}j uitkering`, c: "#D97706" }] : []),
                    { l: "Maandelijkse inleg", v: `${fmt(totaalInleg)} (${100 - pensioenPct}% privé · ${pensioenPct}% pensioen)`, c: "var(--brand)" },
                    { l: "Vermogen nu", v: `${fmt(spaargeld)} spaar + ${fmt(beleggingen)} beleg${pensioenbeleggenPot > 0 ? ` + ${fmt(pensioenbeleggenPot)} pensioenpot` : ""}`, c: "var(--brand)" },
                    { l: "Woonsituatie", v: samenwonend ? `Samenwonend · AOW ${fmt(aowM)}/mnd` : `Alleenstaand · AOW ${fmt(aowM)}/mnd`, c: "var(--brand)" },
                    { l: "Woonlasten", v: woningType === "koop_hypotheek" ? `Koop · ${fmt(hypotheekPerMaand)}/mnd → ${fmt(restKostenNaAflossing)}/mnd na aflossing (${hypotheekEindjaar})` : woningType === "huur" ? `Huur · ${fmt(huurPerMaand)}/mnd (+${huurIndexatie}%/jaar)` : `Koop afgelost · ${fmt(vasteWoonlasten)}/mnd vaste lasten`, c: "var(--brand)" },
                  ].map((r, i) => (
                    <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderTop: i > 0 ? "1px solid #F0F2F5" : "none" }}>
                      <span style={{ fontSize: 12, color: "#8B8FA3", fontFamily: "var(--f)" }}>{r.l}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: r.c, fontFamily: "var(--f)", textAlign: "right" }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>;
          })()}
        </>}

        {/* ═══ OVERBRUGGING TAB ═══ */}
        {tab === "overbrugging" && <>
          {/* HERO METRIC */}
          <Metric hero
            label={overbrugging.tekort > 0 ? (overbrugging.tekort > gewenstUitgaven * 12 ? "Serieus tekort" : "Tekort — maar overbrugbaar") : "Je kunt je plan halen"}
            value={fmt(overbrugging.tekort > 0 ? overbrugging.tekort : vermogenOpStop - overbrugging.totaalNodig)}
            accent={overbrugging.tekort > 0 ? (overbrugging.tekort > gewenstUitgaven * 12 ? "#DC2626" : "#B45309") : "#16A34A"}
            sub={overbrugging.tekort > 0
              ? `Dat is ${Math.round(overbrugging.tekort / Math.max(1, gewenstUitgaven))} maanden aan uitgaven. Je hebt ${fmt(overbrugging.totaalNodig)} nodig maar bouwt ${fmt(vermogenOpStop)} op.`
              : `Je bouwt ${fmt(vermogenOpStop)} op en hebt ${fmt(overbrugging.totaalNodig)} nodig`
            } info="overbrugging" />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="fu">
            <Metric label="Vermogen op stopleeftijd" value={fmt(vermogenOpStop)} sub={`Op je ${stopLeeftijd}e`} />
            <Metric label="Overbrugging nodig" value={fmt(overbrugging.totaalNodig)} sub="Tot al je inkomen loopt" />
          </div>

          {/* PHASE CARDS */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }} className="fu">
            {(() => {
              let resterendVermogen = vermogenOpStop;
              return overbrugging.phases.map((p, i) => {
                const isNoIncome = p.inkomen === 0;
                const totaalFase = p.gat * 12 * p.jaren;
                const vermogenNa = Math.max(0, resterendVermogen - totaalFase);
                const vermogenPct = vermogenOpStop > 0 ? Math.round(totaalFase / vermogenOpStop * 100) : 0;
                const label = isNoIncome ? "Je leeft van eigen vermogen" : `${fmt(p.inkomen)}/mnd inkomen`;
                const color = isNoIncome ? "#DC2626" : p.inkomen < p.uitgaven ? "#D97706" : "#0D6B58";
                const sources = [];
                if (p.start >= lijfrenteStartLeeftijd && pbUitkering > 0) sources.push(`Lijfrente: ${fmt(pbUitkering)}/mnd`);
                if (p.start >= pensioenIngangLeeftijd) sources.push(`Werkgeverspensioen: ${fmt(effectiefPensioen)}/mnd`);
                if (p.start >= AOW_LEEFTIJD) sources.push(`AOW: ${fmt(aowM)}/mnd`);
                const details = isNoIncome
                  ? `Kost ${vermogenPct}% van je vermogen. Na deze fase heb je nog ${fmt(vermogenNa)} over.`
                  : sources.join(" · ");
                const card = <PhaseCard key={i} label={label} color={color} jaren={p.jaren} start={p.start} end={p.end} uitgaven={p.uitgaven} inkomen={p.inkomen} gat={p.gat} details={details} delay={i * 0.08} totaalFase={isNoIncome ? totaalFase : undefined} vermogenDaarna={isNoIncome ? vermogenNa : undefined} vermogenPct={isNoIncome ? vermogenPct : undefined} />;
                resterendVermogen = vermogenNa;
                return card;
              });
            })()}
            <PhaseCard label="Alles loopt" color="#0D6B58" jaren="rest" start={overbrugging.alles.start} end="∞" uitgaven={overbrugging.alles.uitgaven} inkomen={overbrugging.alles.inkomen} gat={overbrugging.alles.gat}
              details={`AOW + werkgeverspensioen${pbUitkering > 0 ? " + lijfrente" : ""}. ${overbrugging.alles.gat > 0 ? "Resteert een maandelijks tekort." : "Je inkomen dekt je uitgaven."}`} delay={overbrugging.phases.length * 0.08} />
          </div>

          {overbrugging.phases.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
              <div style={{ display: "flex", alignItems: "center", fontSize: 12, fontWeight: 800, color: "var(--brand)", marginBottom: 4, fontFamily: "var(--f)" }}>Overbruggingskosten <Info tip="overbrugging" /></div>
              <div style={{ fontSize: 12, color: "#777", fontFamily: "var(--f)", lineHeight: 1.7 }}>
                {overbrugging.phases.map((p, i) => <span key={i}>{i > 0 && <br/>}Fase {i + 1}: {p.jaren} jaar × {fmt(p.gat)}/mnd = <strong>{fmt(p.totaal)}</strong></span>)}
                <br/>Totaal nodig: <strong style={{ color: "#111", fontSize: 14 }}>{fmt(overbrugging.totaalNodig)}</strong>
                <br/>Je hebt op je {stopLeeftijd}e: <strong style={{ color: overbrugging.tekort > 0 ? "#DC2626" : "#16A34A" }}>{fmt(vermogenOpStop)}</strong>
              </div>
            </div>
          )}

          {/* #3: NODIG IN VRIJ VERMOGEN */}
          {overbrugging.phases.length > 0 && (() => {
            // Calculate how much needs to come from private wealth (before lijfrente kicks in)
            const priveFases = overbrugging.phases.filter(p => p.start < lijfrenteStartLeeftijd || pbUitkering === 0);
            const nodigPrive = priveFases.reduce((s, p) => {
              const endCapped = p.end ? Math.min(p.end, pbUitkering > 0 ? lijfrenteStartLeeftijd : 999) : p.start;
              const jaren = Math.max(0, endCapped - p.start);
              return s + (p.gat * 12 * jaren);
            }, 0);
            const nodigTotaal = overbrugging.totaalNodig;
            return (
              <div style={{ background: "var(--brand-light)", borderRadius: 10, padding: "16px 18px" }} className="fu">
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)", marginBottom: 6, fontFamily: "var(--f)" }}>Hoeveel vrij vermogen heb je nodig?</div>
                <div style={{ fontSize: 12, color: "var(--brand-mid)", lineHeight: 1.7, fontFamily: "var(--f)" }}>
                  Je hebt <strong>{fmt(nodigTotaal)}</strong> nodig om de overbrugging te dekken.
                  {pbUitkering > 0 && nodigPrive < nodigTotaal
                    ? ` Daarvan moet <strong>${fmt(nodigPrive)}</strong> uit vrij opneembaar vermogen komen (vóór je lijfrente op ${lijfrenteStartLeeftijd} ingaat). De rest wordt gedekt door je lijfrente-uitkering.`
                    : ` Dit moet volledig uit je vrij opneembare vermogen komen (spaargeld + beleggingen).`
                  }
                  {` Je hebt op je ${stopLeeftijd}e `}<strong style={{ color: vermogenOpStop >= nodigTotaal ? "var(--brand)" : "#DC2626" }}>{fmt(vermogenOpStop)}</strong> aan vrij vermogen.
                </div>
              </div>
            );
          })()}

          {/* #2: ONTTREKKINGSVOLGORDE */}
          {overbrugging.phases.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)", marginBottom: 10, fontFamily: "var(--f)" }}>Aanbevolen volgorde: hoe spreek je je potjes aan?</div>
              {(() => {
                const stappen = [];
                // Phase: before any income
                const eersteInkomenLeeftijd = Math.min(
                  pbUitkering > 0 ? lijfrenteStartLeeftijd : 999,
                  pensioenIngangLeeftijd,
                  AOW_LEEFTIJD
                );
                if (stopLeeftijd < eersteInkomenLeeftijd) {
                  stappen.push({
                    periode: `${stopLeeftijd}–${eersteInkomenLeeftijd}`,
                    titel: "Leef van privé vermogen",
                    uitleg: `Je hebt nog geen pensioeninkomen. Gebruik je spaargeld en beleggingen. Begin met spaargeld (groeit het minst), daarna beleggingen.`,
                    kleur: "var(--brand)"
                  });
                }
                // Phase: lijfrente starts
                if (pbUitkering > 0 && lijfrenteStartLeeftijd < Math.max(pensioenIngangLeeftijd, AOW_LEEFTIJD)) {
                  stappen.push({
                    periode: `Vanaf ${lijfrenteStartLeeftijd}`,
                    titel: `Start lijfrente-uitkering (${fmt(pbUitkering)}/mnd)`,
                    uitleg: `Je lijfrente gaat in. Minimale uitkeringsduur: ${lijfrenteUitkeringsDuur} jaar. Vul aan vanuit privé vermogen als de uitkering niet genoeg is.`,
                    kleur: "#D97706"
                  });
                }
                // Phase: werkgeverspensioen starts (if after lijfrente/stopLeeftijd)
                if (pensioenIngangLeeftijd > stopLeeftijd) {
                  stappen.push({
                    periode: `Vanaf ${pensioenIngangLeeftijd}`,
                    titel: `Werkgeverspensioen gaat in (${fmt(effectiefPensioen)}/mnd)`,
                    uitleg: jarenVervroeging > 0
                      ? `Vervroegd: ${jarenVervroeging} jaar eerder = ~${Math.round(pensioenKorting * 100)}% minder, levenslang.`
                      : `Op de richtleeftijd — geen korting.`,
                    kleur: "#7C3AED"
                  });
                }
                // Phase: AOW
                if (AOW_LEEFTIJD > stopLeeftijd) {
                  stappen.push({
                    periode: `Vanaf ${AOW_LEEFTIJD}`,
                    titel: `AOW gaat in (${fmt(aowM)}/mnd)`,
                    uitleg: `${samenwonend ? "Samenwonend tarief" : "Alleenstaand tarief"}. Vanaf hier betaal je ook minder belasting (~19% ipv ~37%).`,
                    kleur: "#2563EB"
                  });
                }
                return stappen.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: i > 0 ? "1px solid #F0F2F5" : "none" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 28 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: s.kleur, color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--f)" }}>{i + 1}</div>
                      {i < stappen.length - 1 && <div style={{ width: 2, flex: 1, background: "#ECF0EE", marginTop: 4 }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#C4C8D0", fontFamily: "var(--f)", marginBottom: 1 }}>{s.periode}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", fontFamily: "var(--f)", marginBottom: 3 }}>{s.titel}</div>
                      <div style={{ fontSize: 11, color: "#8B8FA3", lineHeight: 1.6, fontFamily: "var(--f)" }}>{s.uitleg}</div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          <div style={{ background: "#FAFAFA", borderRadius: 10, padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ display: "flex", alignItems: "center", fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 4, fontFamily: "var(--f)" }}>Over inflatie <Info tip="inflatie" /></div>
            <div style={{ fontSize: 12, color: "#777", fontFamily: "var(--f)", lineHeight: 1.6 }}>
              Alle bedragen op deze pagina zijn in euro's van vandaag. Op de opbouw-tab kun je de inflatie-toggle aanzetten om te zien wat je vermogen echt waard is.
            </div>
          </div>

          <div style={{ background: "#FAFAFA", borderRadius: 10, padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ display: "flex", alignItems: "center", fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 4, fontFamily: "var(--f)" }}>Belasting: vóór en na AOW <Info tip="belastingverschil" /></div>
            <div style={{ fontSize: 12, color: "#777", fontFamily: "var(--f)", lineHeight: 1.6 }}>
              Vóór je {AOW_LEEFTIJD}e betaal je ~37% belasting op pensioeninkomen. Daarna ~19%. Van hetzelfde bruto-pensioen houd je na je AOW-leeftijd dus meer over.
            </div>
          </div>

          {/* #6: BRUTO/NETTO WARNING */}
          <div style={{ background: "#FFFBF5", borderRadius: 10, padding: "14px 18px", borderLeft: "3px solid #D97706" }} className="fu">
            <div style={{ fontSize: 11, fontWeight: 700, color: "#B45309", marginBottom: 3, fontFamily: "var(--f)" }}>Let op: alle bedragen zijn bruto</div>
            <div style={{ fontSize: 12, color: "#8B8FA3", fontFamily: "var(--f)", lineHeight: 1.6 }}>
              Na belasting houd je minder over. Vóór je AOW-leeftijd betaal je ~37% belasting, daarna ~19%. Houd hier rekening mee bij je planning — je werkelijke besteedbaar inkomen is lager dan de getoonde bedragen.
            </div>
          </div>

          {/* #1: ACTIE NUDGE */}
          <button data-noprint onClick={() => setTab("actie")} style={{
            width: "100%", padding: "16px 20px", borderRadius: 12, border: "none",
            background: "var(--brand-light)", cursor: "pointer", fontFamily: "var(--f)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            transition: "all 0.2s"
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.color = "#fff"; e.currentTarget.querySelector("[data-arrow]").style.color = "#fff"; e.currentTarget.querySelector("[data-title]").style.color = "#fff"; e.currentTarget.querySelector("[data-sub]").style.color = "rgba(255,255,255,0.7)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--brand-light)"; e.currentTarget.querySelector("[data-arrow]").style.color = "var(--brand)"; e.currentTarget.querySelector("[data-title]").style.color = "var(--brand)"; e.currentTarget.querySelector("[data-sub]").style.color = "#8B8FA3"; }}
            className="fu"
          >
            <div>
              <div data-title style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)", textAlign: "left", transition: "color 0.2s" }}>{overbrugging.tekort > gewenstUitgaven * 12 ? "Hoe dicht je dit gat?" : overbrugging.tekort > 0 ? "Dit tekort is overbrugbaar" : "Wil je je voorsprong vergroten?"}</div>
              <div data-sub style={{ fontSize: 11, color: "#8B8FA3", textAlign: "left", marginTop: 2, transition: "color 0.2s" }}>{overbrugging.tekort > 0 ? "Bekijk concrete acties die je nu kunt nemen →" : "Bekijk wat je nog kunt optimaliseren →"}</div>
            </div>
            <span data-arrow style={{ fontSize: 20, color: "var(--brand)", fontWeight: 300, transition: "color 0.2s" }}>→</span>
          </button>
        </>}

        {/* ═══ OPBOUW TAB ═══ */}
        {tab === "opbouw" && <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="fu">
            <Metric label="Spaargeld" value={fmt(spaargeld)} sub="Groeit ~2%/jaar" info="spaargeld" />
            <Metric label="Beleggingen" value={fmt(beleggingen)} sub={`Groeit ~${rendement}%/jaar`} info="beleggingen" />
            <Metric label={`Totaal op ${stopLeeftijd}${toonReeel ? " (reëel)" : ""}`} value={fmt(defleer(vermogenOpStop, defJ(stopLeeftijd)))} accent="var(--brand)" sub={`Over ${Math.max(0, stopLeeftijd - leeftijd)} jaar${toonReeel ? " · in koopkracht van vandaag" : ""}`} />
          </div>

          {/* WOONLASTEN INFO */}
          {(woningType === "koop_hypotheek" ? hypotheekPerMaand > 0 : true) && (
            <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }} className="fu">
              <div>
                <div style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#BBB", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3, fontFamily: "var(--f)" }}>Woonlasten</div>
                {woningType === "koop_hypotheek" && <div style={{ fontSize: 12, color: "#777", fontFamily: "var(--f)" }}>Woonlasten dalen van {fmt(hypotheekPerMaand)} naar <strong style={{ color: "#16A34A" }}>{fmt(restKostenNaAflossing)}</strong>/mnd op leeftijd {hypotheekAflosLeeftijd}</div>}
                {woningType === "huur" && <div style={{ fontSize: 12, color: "#777", fontFamily: "var(--f)" }}>Huur {fmt(huurPerMaand)}/mnd · stijgt {huurIndexatie}%/jaar · op je {stopLeeftijd}e: ~{fmt(Math.round(huurPerMaand * Math.pow(1 + huurIndexatie / 100, Math.max(0, stopLeeftijd - leeftijd))))}/mnd</div>}
                {woningType === "koop_afgelost" && <div style={{ fontSize: 12, color: "#16A34A", fontFamily: "var(--f)" }}>Geen hypotheek — alleen vaste lasten ({fmt(vasteWoonlasten)}/mnd)</div>}
              </div>
            </div>
          )}

          <div style={{ background: "#fff", borderRadius: 10, padding: "18px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", fontSize: 15, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--f)" }}>Vermogensopbouw per bron <Info tip="compound" /></div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: toonReeel ? "var(--brand)" : "#8B8FA3", fontWeight: 600, fontFamily: "var(--f)", transition: "color 0.15s" }}>
                <div onClick={() => setToonReeel(!toonReeel)} style={{ width: 34, height: 18, borderRadius: 9, background: toonReeel ? "var(--brand)" : "#D0D4DC", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                  <div style={{ width: 14, height: 14, borderRadius: 7, background: "#fff", position: "absolute", top: 2, left: toonReeel ? 18 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                </div>
                {toonReeel ? "Gecorrigeerd voor inflatie (2,5%)" : "Nominaal (zonder inflatie)"}
              </label>
            </div>
            <div style={{ fontSize: 11, color: "#C4C8D0", marginBottom: 14, fontFamily: "var(--f)" }}>
              {toonReeel
                ? <span>Bedragen in koopkracht van vandaag · <span style={{ color: "#8B8FA3" }}>door inflatie is je geld later minder waard</span></span>
                : <span>Spaargeld (~2%) · beleggingen (~{rendement}%) · <span style={{ color: "#8B8FA3" }}>gestreepte lijn = pessimistisch scenario (4%)</span></span>
              }
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={groeiData.map(r => {
                const j = defJ(r.leeftijd);
                return toonReeel ? { ...r, spaargeld: defleer(r.spaargeld, j), beleggingen: defleer(r.beleggingen, j), pensioenpot: defleer(r.pensioenpot, j), vermogen: defleer(r.vermogen, j), bandLow: defleer(r.bandLow, j) } : r;
              })}>
                <defs>
                  <linearGradient id="gSp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#94A3B8" stopOpacity={0.35}/><stop offset="100%" stopColor="#94A3B8" stopOpacity={0.05}/></linearGradient>
                  <linearGradient id="gBl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0D6B58" stopOpacity={0.25}/><stop offset="100%" stopColor="#0D6B58" stopOpacity={0.03}/></linearGradient>
                  <linearGradient id="gPb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D97706" stopOpacity={0.3}/><stop offset="100%" stopColor="#D97706" stopOpacity={0.05}/></linearGradient>
                </defs>
                <CartesianGrid stroke="#F5F5F5" vertical={false}/>
                <XAxis dataKey="leeftijd" tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={fmtS} tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--f)" }}/>
                <ReferenceLine x={stopLeeftijd} stroke="var(--brand)" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Stop", position: "top", fontSize: 10, fill: "var(--brand)" }}/>
                <ReferenceLine x={AOW_LEEFTIJD} stroke="#2563EB" strokeDasharray="3 3" label={{ value: "AOW", position: "top", fontSize: 10, fill: "#2563EB" }}/>
                <ReferenceLine x={pensioenIngangLeeftijd} stroke="#7C3AED" strokeDasharray="3 3" label={{ value: "Pensioen", position: "top", fontSize: 9, fill: "#7C3AED" }}/>
                {woningType === "koop_hypotheek" && hypotheekAflosLeeftijd > leeftijd && hypotheekAflosLeeftijd < 85 && <ReferenceLine x={hypotheekAflosLeeftijd} stroke="#16A34A" strokeDasharray="3 3" label={{ value: "Hyp. vrij", position: "top", fontSize: 9, fill: "#16A34A" }}/>}
                <Area type="monotone" dataKey="bandLow" stroke="#0D6B58" strokeWidth={0.8} strokeDasharray="4 4" strokeOpacity={0.3} fill="none" name="4% rendement" dot={false} activeDot={false}/>
                <Area type="monotone" dataKey="spaargeld" stackId="1" stroke="#94A3B8" fill="url(#gSp)" name="Spaargeld" strokeWidth={1.5}/>
                <Area type="monotone" dataKey="beleggingen" stackId="1" stroke="var(--brand)" fill="url(#gBl)" name="Beleggingen" strokeWidth={1.5}/>
                {(pensioenbeleggen > 0 || pensioenbeleggenPot > 0) && <Area type="monotone" dataKey="pensioenpot" stackId="1" stroke="#D97706" fill="url(#gPb)" name="Pensioenbeleggen" strokeWidth={1.5}/>}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* SUMMARY TABLE AT STOP AGE */}
          {(() => {
            const atStop = groeiData.find(d => d.leeftijd === stopLeeftijd) || {};
            const j = defJ(stopLeeftijd);
            const rows = [
              { l: "Spaargeld", now: spaargeld, then: defleer(atStop.spaargeld || 0, j), rente: "2%", c: "#94A3B8" },
              { l: "Beleggingen", now: beleggingen, then: defleer(atStop.beleggingen || 0, j), rente: `${rendement}%`, c: "var(--brand)" },
              ...((pensioenbeleggen > 0 || pensioenbeleggenPot > 0) ? [{ l: "Pensioenbeleggen", now: pensioenbeleggenPot, then: defleer(atStop.pensioenpot || 0, j), rente: `${rendement}%`, c: "#D97706" }] : []),
            ];
            const totNow = rows.reduce((s, r) => s + r.now, 0);
            const totThen = rows.reduce((s, r) => s + r.then, 0);
            return (
              <div style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", marginBottom: 10, fontFamily: "var(--f)" }}>Vermogen op je {stopLeeftijd}e {toonReeel && <span style={{ fontSize: 11, fontWeight: 600, color: "#8B8FA3" }}>(koopkracht vandaag)</span>}</div>
                {rows.map((r, i) => (
                  <div key={r.l} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderTop: i > 0 ? "1px solid #F5F5F5" : "none" }}>
                    <div style={{ width: 3, height: 24, borderRadius: 2, background: r.c, marginRight: 10 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#111", fontFamily: "var(--f)" }}>{r.l}</div>
                      <div style={{ fontSize: 10, color: "#CCC", fontFamily: "var(--f)" }}>~{r.rente}/jaar · was {fmt(r.now)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", fontFamily: "var(--f)" }}>{fmt(r.then)}</div>
                      <div style={{ fontSize: 10, color: r.then > r.now * 1.5 ? "#16A34A" : "#CCC", fontFamily: "var(--f)" }}>+{fmt(r.then - r.now)}</div>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: "2px solid var(--brand)", marginTop: 6, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", fontFamily: "var(--f)" }}>Totaal</span>
                    <span style={{ fontSize: 10, color: "#CCC", fontFamily: "var(--f)", marginLeft: 8 }}>was {fmt(totNow)}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--f)" }}>{fmt(totThen)}</span>
                    <div style={{ fontSize: 10, color: "#16A34A", fontFamily: "var(--f)" }}>+{fmt(totThen - totNow)} groei</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "#FAFBF9", fontSize: 11, color: "#8B8FA3", fontFamily: "var(--f)", lineHeight: 1.5 }}>
                  Pessimistisch scenario (4% rendement): {fmt(defleer(atStop.bandLow || 0, j))}
                </div>
              </div>
            );
          })()}

          <div style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", marginBottom: 10, fontFamily: "var(--f)" }}>Pensioeninkomen per bron</div>
            {[
              { l: "AOW-uitkering", v: aowM, n: `${samenwonend ? "Samenwonend" : "Alleenstaand"} · vanaf ${AOW_LEEFTIJD}`, c: "#2563EB" },
              { l: "Werkgeverspensioen", v: effectiefPensioen, n: `${jarenVervroeging > 0 ? `Vervroegd: ${jarenVervroeging}j × 8% korting` : "Op richtleeftijd"} · vanaf ${pensioenIngangLeeftijd}`, c: "#7C3AED" },
              ...(pbUitkering > 0 ? [{ l: "Eigen pensioenbeleggen", v: pbUitkering, n: `Pot: ${fmtS(pbPot)} · uitkering vanaf ${lijfrenteStartLeeftijd} · minimaal ${lijfrenteUitkeringsDuur}j`, c: "#D97706" }] : []),
              { l: "Eigen vermogen (4% opname)", v: Math.round(vermogenOpStop * 0.04 / 12), n: "Veilige jaarlijkse onttrekking", c: "var(--brand)", info: "vierprocentregel" },
            ].map((r, i) => (
              <div key={r.l} style={{ display: "flex", alignItems: "center", padding: "9px 0", borderTop: i > 0 ? "1px solid #F5F5F5" : "none" }}>
                <div style={{ width: 3, height: 26, borderRadius: 2, background: r.c, marginRight: 10 }} />
                <div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700, color: "#111", fontFamily: "var(--f)" }}>{r.l}{r.info && <Info tip={r.info} />}</div><div style={{ fontSize: 10, color: "#CCC", fontFamily: "var(--f)" }}>{r.n}</div></div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", fontFamily: "var(--f)" }}>{fmt(r.v)}</div>
              </div>
            ))}
            <div style={{ borderTop: "2px solid var(--brand)", marginTop: 6, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", fontFamily: "var(--f)" }}>Totaal (alles loopt)</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--f)" }}>{fmt(aowM + effectiefPensioen + pbUitkering + Math.round(vermogenOpStop * 0.04 / 12))}<span style={{ fontSize: 10, color: "#CCC" }}>/mnd</span></span>
            </div>
            <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "#FFFBF5", borderLeft: "2px solid #D97706", fontSize: 11, color: "#8B8FA3", fontFamily: "var(--f)", lineHeight: 1.5 }}>
              Bedragen zijn bruto. Na belasting houd je minder over (~19% na AOW-leeftijd, ~37% daarvoor).
            </div>
          </div>
        </>}

        {/* ═══ ACTIE TAB ═══ */}
        {tab === "actie" && <>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--f)" }} className="fu">Wat kun je doen om je pensioen te verbeteren?</div>

          {[
            {
              icon: "💰", title: "Meer inleggen per maand",
              desc: `Je legt nu ${fmt(totaalInleg)}/mnd in (${fmt(maandInleg)} privé + ${fmt(pensioenbeleggen)} pensioen). €200 extra per maand levert op je ${stopLeeftijd}e ${fmt(extraInlegImpact)} meer. Dat is ${Math.round(extraInlegImpact / Math.max(1, gewenstUitgaven))} extra maanden overbrugging.`,
              accent: "#16A34A"
            },
            ...(pensioenPct < 100 ? [{
              icon: "🔀", title: "Meer richting pensioenbeleggen schuiven",
              desc: `Je legt nu ${pensioenPct}% in via pensioen. Als je dat naar ${Math.min(100, pensioenPct + 20)}% verschuift, krijg je ~${fmt(Math.round(totaalInleg * Math.min(100, pensioenPct + 20) / 100 * BELASTING_TARIEF))}/mnd terug van de belasting in plaats van ${fmt(belastingVoordeel)}/mnd. Nadeel: je kunt er pas bij rond je pensioen.`,
              accent: "#D97706"
            }] : []),
            ...(belastingVoordeel > 0 ? [{
              icon: "🎁", title: "Belastingvoordeel herbeleggen",
              desc: `Je krijgt ~${fmt(belastingVoordeel)}/mnd terug van de belastingdienst. Als je dat privé herbelegt, levert dat over ${Math.max(1, stopLeeftijd - leeftijd)} jaar ~${fmtS((() => { let v = 0; for (let i = 0; i < Math.max(0, stopLeeftijd - leeftijd); i++) v = v * (1 + rendement / 100) + belastingVoordeel * 12; return v; })())} extra op — vrij opneembaar.`,
              accent: "var(--brand)"
            }] : []),
            {
              icon: "📅", title: "Later stoppen met werken",
              desc: `Elk jaar dat je langer werkt levert dubbel op: je spaart langer én je overbrugging wordt korter. 2 jaar later stoppen scheelt al ${fmt(gewenstUitgaven * 24)} aan overbrugging.`,
              accent: "#2563EB"
            },
            {
              icon: "🏢", title: jarenVervroeging > 0 ? "Pensioen minder vervroegen" : "Pensioen op richtleeftijd houden",
              desc: jarenVervroeging > 0
                ? `Je pensioen gaat nu in op ${pensioenIngangLeeftijd} (${jarenVervroeging}j vervroegd = ${Math.round(pensioenKorting * 100)}% minder). Op richtleeftijd ${PENSIOEN_RICHTLEEFTIJD} krijg je ${fmt(werkgeversPensioen)}/mnd ipv ${fmt(effectiefPensioen)}/mnd. Verschil: ${fmt(werkgeversPensioen - effectiefPensioen)}/mnd, levenslang.`
                : `Je pensioen gaat in op de richtleeftijd (${PENSIOEN_RICHTLEEFTIJD}). Geen korting. Dat is de optimale situatie.`,
              accent: "#7C3AED"
            },
            ...(spaargeld > 10000 ? [{
              icon: "🔄", title: "Spaargeld (deels) gaan beleggen",
              desc: `Je hebt ${fmt(spaargeld)} op een spaarrekening (~2% rente). Als je de helft zou beleggen op ${rendement}% rendement, levert dat op je ${stopLeeftijd}e ~${fmt((() => { const half = spaargeld / 2; const jarenTotStop = Math.max(1, stopLeeftijd - leeftijd); return Math.round(half * Math.pow(1 + rendement / 100, jarenTotStop) - half * Math.pow(1 + SPAARRENTE, jarenTotStop)); })())} extra op. Beleggen kent risico's, maar op de lange termijn groeit het harder dan sparen.`,
              accent: "#DC2626"
            }] : [])
          ].map((a, i) => (
            <div key={a.title} style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: a.accent, marginBottom: 4, fontFamily: "var(--f)" }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: "#777", lineHeight: 1.7, fontFamily: "var(--f)" }}>{a.desc}</div>
                </div>
              </div>
            </div>
          ))}

          {/* CTA TO BELEGGEN GIDS */}
          <button onClick={() => setTab("pro")} style={{
            width: "100%", padding: "16px 20px", borderRadius: 12, border: "none",
            background: "#fff", cursor: "pointer", fontFamily: "var(--f)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)", transition: "all 0.2s"
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(13,107,88,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)"; e.currentTarget.style.transform = "none"; }}
            className="fu"
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)", textAlign: "left" }}>Nieuw in beleggen? Lees mijn tips en aanbevelingen</div>
              <div style={{ fontSize: 11, color: "#8B8FA3", textAlign: "left", marginTop: 2 }}>Wat ik zelf doe, waar je kunt starten, en bronnen om meer te leren →</div>
            </div>
            <span style={{ fontSize: 20, color: "var(--brand)", fontWeight: 300, flexShrink: 0, marginLeft: 12 }}>→</span>
          </button>
        </>}

        {/* ═══ WAT ALS TAB ═══ */}
        {tab === "scenario" && <>
          {/* SLIDERS */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)", marginBottom: 10, fontFamily: "var(--f)" }}>Pas aan en vergelijk met je huidige plan</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 160px" }}><Slider label="Stopleeftijd" value={scenStop} onChange={setScenStop} min={50} max={70} format={v => `${v} jaar`} /></div>
              <div style={{ flex: "1 1 160px" }}><Slider label="Maandelijkse inleg" value={scenInleg} onChange={setScenInleg} min={0} max={2000} step={50} format={v => `€${v}`} /></div>
              <div style={{ flex: "1 1 160px" }}><Slider label="Rendement" value={scenRend} onChange={setScenRend} min={1} max={12} step={0.5} format={v => `${v}%`} /></div>
            </div>
          </div>

          {(() => {
            // Baseline
            const calcV = (sl, il, rend) => { let sp = spaargeld, bl = beleggingen; for (let i = 0; i < Math.max(0, sl - leeftijd); i++) { sp = sp * (1 + SPAARRENTE); bl = bl * (1 + rend / 100) + il * 12; } return Math.round(sp + bl); };
            const calcOB = (sl) => {
              const events = new Set([sl]);
              if (lijfrenteStartLeeftijd > sl && pbUitkering > 0) events.add(lijfrenteStartLeeftijd);
              if (pensioenIngangLeeftijd > sl) events.add(pensioenIngangLeeftijd);
              if (AOW_LEEFTIJD > sl) events.add(AOW_LEEFTIJD);
              const sorted = [...events].sort((a, b) => a - b);
              let total = 0;
              for (let i = 0; i < sorted.length; i++) {
                const s = sorted[i], e = i < sorted.length - 1 ? sorted[i + 1] : null;
                if (!e) continue;
                let ink = 0;
                if (s >= AOW_LEEFTIJD) ink += aowM;
                if (s >= pensioenIngangLeeftijd) ink += effectiefPensioen;
                if (s >= lijfrenteStartLeeftijd && pbUitkering > 0) ink += pbUitkering;
                total += Math.max(0, gewenstUitgaven - ink) * 12 * (e - s);
              }
              return total;
            };

            const baseV = calcV(stopLeeftijd, maandInleg, rendement);
            const baseOB = calcOB(stopLeeftijd);
            const baseTekort = Math.max(0, baseOB - baseV);
            const baseOver = Math.max(0, baseV - baseOB);

            const scenV = calcV(scenStop, scenInleg, scenRend);
            const scenOB = calcOB(scenStop);
            const scenTekort = Math.max(0, scenOB - scenV);
            const scenOver = Math.max(0, scenV - scenOB);

            const verschilV = scenV - baseV;
            const verschilResult = (scenOver - scenTekort) - (baseOver - baseTekort);

            // Chart data — two lines
            const chartData = Array.from({ length: Math.max(1, 86 - leeftijd) }, (_, i) => {
              const a = leeftijd + i;
              let sp1 = spaargeld, bl1 = beleggingen, sp2 = spaargeld, bl2 = beleggingen;
              for (let y = 0; y < i; y++) {
                sp1 *= (1 + SPAARRENTE); bl1 = bl1 * (1 + rendement / 100) + maandInleg * 12;
                sp2 *= (1 + SPAARRENTE); bl2 = bl2 * (1 + scenRend / 100) + scenInleg * 12;
              }
              return { leeftijd: a, huidig: Math.round(sp1 + bl1), scenario: Math.round(sp2 + bl2) };
            });

            return <>
              {/* COMPARISON TABLE */}
              <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", overflow: "auto" }} className="fu">
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--f)", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#8B8FA3", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #F0F2F5" }}></th>
                      <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--brand)", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid var(--brand)" }}>Jouw plan</th>
                      <th style={{ textAlign: "right", padding: "8px 10px", color: "#2563EB", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #2563EB" }}>Scenario</th>
                      <th style={{ textAlign: "right", padding: "8px 10px", color: "#8B8FA3", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #F0F2F5" }}>Verschil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { l: "Stopleeftijd", b: `${stopLeeftijd}`, s: `${scenStop}`, d: scenStop !== stopLeeftijd ? `${scenStop > stopLeeftijd ? "+" : ""}${scenStop - stopLeeftijd}j` : "—" },
                      { l: "Inleg/mnd", b: fmt(maandInleg), s: fmt(scenInleg), d: scenInleg !== maandInleg ? `${scenInleg > maandInleg ? "+" : ""}${fmt(scenInleg - maandInleg)}` : "—" },
                      { l: "Rendement", b: `${rendement}%`, s: `${scenRend}%`, d: scenRend !== rendement ? `${scenRend > rendement ? "+" : ""}${scenRend - rendement}%` : "—" },
                      { l: "Vermogen op stop", b: fmt(baseV), s: fmt(scenV), d: fmt(verschilV), accent: verschilV >= 0 },
                      { l: "Overbrugging nodig", b: fmt(baseOB), s: fmt(scenOB), d: fmt(scenOB - baseOB) },
                      { l: baseTekort > 0 ? "Tekort" : "Overschot", b: fmt(baseTekort > 0 ? baseTekort : baseOver), s: fmt(scenTekort > 0 ? scenTekort : scenOver), d: fmt(verschilResult), accent: verschilResult >= 0, bold: true },
                    ].map((r, i) => (
                      <tr key={r.l} style={{ borderBottom: "1px solid #F0F2F5" }}>
                        <td style={{ padding: "8px 10px", color: "#1a1a2e", fontWeight: r.bold ? 700 : 500 }}>{r.l}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--brand)", fontWeight: r.bold ? 800 : 600 }}>{r.b}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "#2563EB", fontWeight: r.bold ? 800 : 600 }}>{r.s}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: r.accent !== undefined ? (r.accent ? "#16A34A" : "#DC2626") : "#8B8FA3", fontWeight: r.bold ? 800 : 600 }}>{r.d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CHART */}
              <div style={{ background: "#fff", borderRadius: 12, padding: "18px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", marginBottom: 14, fontFamily: "var(--f)" }}>Vermogensgroei: huidig plan vs. scenario</div>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid stroke="#F5F5F5" vertical={false}/>
                    <XAxis dataKey="leeftijd" tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={fmtS} tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<ChartTip/>}/>
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--f)" }}/>
                    <ReferenceLine x={stopLeeftijd} stroke="var(--brand)" strokeDasharray="4 4" strokeWidth={1} label={{ value: `Stop ${stopLeeftijd}`, position: "top", fontSize: 9, fill: "var(--brand)" }}/>
                    {scenStop !== stopLeeftijd && <ReferenceLine x={scenStop} stroke="#2563EB" strokeDasharray="4 4" strokeWidth={1} label={{ value: `Stop ${scenStop}`, position: "top", fontSize: 9, fill: "#2563EB" }}/>}
                    <Line type="monotone" dataKey="huidig" stroke="var(--brand)" name={`Huidig plan (${rendement}%)`} strokeWidth={2.5} dot={false}/>
                    <Line type="monotone" dataKey="scenario" stroke="#2563EB" name={`Scenario (${scenRend}%)`} strokeWidth={2} dot={false} strokeDasharray="8 4"/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>;
          })()}

          {/* RISK INFO CARD */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 20, marginTop: 2 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#B45309", marginBottom: 6, fontFamily: "var(--f)" }}>Risico's om rekening mee te houden</div>
                <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.7, fontFamily: "var(--f)" }}>
                  <strong style={{ color: "#1a1a2e" }}>Rendement is niet gegarandeerd.</strong> De 7% die vaak wordt aangenomen is een langetermijngemiddelde. In slechte jaren kan je portefeuille 20-30% dalen. Gebruik de rendement-slider hierboven om te zien wat een lager rendement doet met je plan.
                </div>
                <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.7, fontFamily: "var(--f)", marginTop: 8 }}>
                  <strong style={{ color: "#1a1a2e" }}>Box 3 kan veranderen.</strong> De overheid werkt aan een nieuw Box 3-stelsel waarin je belasting betaalt over je werkelijke rendement in plaats van een fictief rendement. Dit kan je netto rendement met 1-2 procentpunt verlagen. Wil je hier rekening mee houden? Vul dan een lager rendement in (bijv. 5% in plaats van 7%).
                </div>
                <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.7, fontFamily: "var(--f)", marginTop: 8 }}>
                  <strong style={{ color: "#1a1a2e" }}>Tip:</strong> pensioenbeleggen via een lijfrente valt niet onder Box 3. Hoe meer je via pensioen belegt (via de verdeelslider), hoe minder Box 3-risico je loopt.
                </div>
              </div>
            </div>
          </div>
        </>}

        {/* ═══ PRO / MEER TAB ═══ */}
        {tab === "pro" && <>
          {/* OVER DEZE TOOL */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", marginBottom: 8, fontFamily: "var(--f)" }}>Over Pensioenplanner</div>
            <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.75, fontFamily: "var(--f)" }}>
              Deze tool is gratis en blijft dat ook. Ik heb hem gebouwd omdat ik merkte hoe lastig het is om echt inzicht te krijgen in je pensioensituatie. Mijnpensioenoverzicht.nl laat zien wat je later krijgt, maar niet of dat genoeg is — en al helemaal niet wat je eraan kunt doen. Met deze tool kun je zelf scenario's testen en zien wanneer je mogelijk kunt stoppen met werken en wat je kunt veranderen om er wél te komen.
            </div>
            <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.75, fontFamily: "var(--f)", marginTop: 8 }}>
              Alles draait lokaal in je browser. Er worden geen gegevens opgeslagen. Er zitten geen affiliatelinks in en er is geen betaalde versie.
            </div>
          </div>

          {/* MIJN BELEGGINGSTIPS */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", marginBottom: 8, fontFamily: "var(--f)" }}>Mijn beleggingstips</div>

            <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--brand-light)", borderLeft: "3px solid var(--brand)", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "var(--brand)", lineHeight: 1.75, fontFamily: "var(--f)" }}>
                <strong>Even persoonlijk.</strong> Ik beleg zelf bij <strong>Meesman</strong> — vrij vermogen, pensioen, en ook de rekeningen van mijn kinderen. Alles bij één partij. Breed gespreid wereldwijd indexfonds, lage kosten, volledig geautomatiseerd. Ik kijk er niet naar om.
              </div>
              <div style={{ fontSize: 12, color: "var(--brand)", lineHeight: 1.75, fontFamily: "var(--f)", marginTop: 8 }}>
                Daarnaast gebruik ik <strong>Bux</strong> voor individuele aandelen en sectorspecifieke fondsen — ik doe dit omdat ik het leuk vind, niet omdat het slimmer is. Voor 90% van de mensen is alleen Meesman genoeg.
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <a href="https://www.meesman.nl" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", textDecoration: "none", borderBottom: "1px solid var(--brand)", fontFamily: "var(--f)" }}>→ Meesman</a>
                <a href="https://getbux.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", textDecoration: "none", borderBottom: "1px solid var(--brand)", fontFamily: "var(--f)" }}>→ Bux</a>
                <span style={{ fontSize: 11, color: "#8B8FA3", fontFamily: "var(--f)" }}>Alternatieven: <a href="https://new.brandnewday.nl" target="_blank" rel="noopener noreferrer" style={{ color: "#8B8FA3", textDecoration: "none", borderBottom: "1px dashed #C4C8D0" }}>Brand New Day</a> · <a href="https://www.degiro.nl" target="_blank" rel="noopener noreferrer" style={{ color: "#8B8FA3", textDecoration: "none", borderBottom: "1px dashed #C4C8D0" }}>DeGiro</a></span>
              </div>
            </div>

            <div style={{ fontSize: 10, color: "#C4C8D0", lineHeight: 1.6, fontFamily: "var(--f)" }}>
              Dit is mijn persoonlijke ervaring, geen financieel advies. Beleggen brengt risico's met zich mee. Ik ontvang geen vergoeding van bovenstaande partijen.
            </div>
          </div>

          {/* DE BASIS + GOUDEN COMBI */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 8, fontFamily: "var(--f)" }}>De basis in 4 zinnen</div>
            <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.75, fontFamily: "var(--f)", marginBottom: 16 }}>
              <strong style={{ color: "#1a1a2e" }}>Spreid breed</strong> — koop geen losse aandelen maar een indexfonds dat duizenden bedrijven bevat.
              <strong style={{ color: "#1a1a2e" }}> Denk in jaren</strong> — de beurs gaat op en neer, over 15+ jaar is het gemiddelde ~7% per jaar.
              <strong style={{ color: "#1a1a2e" }}> Houd kosten laag</strong> — elk procent aan kosten vreet over 30 jaar tienduizenden euro's.
              <strong style={{ color: "#1a1a2e" }}> Automatiseer</strong> — elke maand hetzelfde bedrag, niet timen, niet pieken.
            </div>

            <div style={{ background: "#FAFBF9", borderRadius: 12, border: "1.5px solid var(--brand)", padding: "16px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)", marginBottom: 4, fontFamily: "var(--f)" }}>De gouden combi: privé + pensioen</div>
              <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.7, fontFamily: "var(--f)" }}>
                Je hebt twee problemen: de overbrugging (tussen stoppen en pensioen) en de oude dag. Privé beleggen dekt de overbrugging — je kunt er altijd bij. Pensioenbeleggen dekt de oude dag — je krijgt tot ~37% van je inleg terug via je belastingaangifte. Samen zijn ze de gouden combi. Pas de verdeling aan via de verdeelslider in je dashboard.
              </div>
            </div>
          </div>

          {/* ZELF VERDER LEREN */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", marginBottom: 4, fontFamily: "var(--f)" }}>Zelf verder leren</div>
            <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.6, marginBottom: 14, fontFamily: "var(--f)" }}>
              Dit zijn de bronnen waar ik zelf het meest van geleerd heb.
            </div>
            {[
              { name: "Mr. FOB (Financieel Onafhankelijk Blog)", url: "https://www.financieelonafhankelijkblog.nl", desc: "De beste Nederlandse bron over indexbeleggen en financiële onafhankelijkheid. Start hier als je niks weet. Heeft ook een indexfondsen-vergelijker." },
              { name: "r/DutchFIRE", url: "https://www.reddit.com/r/DutchFIRE/", desc: "Actieve community over eerder stoppen met werken. Goed voor specifieke vragen, maar filter op kwaliteit — niet elk advies is goed." },
              { name: "r/geldzaken", url: "https://www.reddit.com/r/geldzaken/", desc: "Breder dan FIRE. Goed voor vragen over belasting, hypotheek, en dagelijkse financiën." },
            ].map((l, i) => (
              <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 0",
                borderTop: i > 0 ? "1px solid #F0F2F5" : "none", textDecoration: "none",
                transition: "opacity 0.15s"
              }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--f)", marginBottom: 2 }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: "#8B8FA3", lineHeight: 1.6, fontFamily: "var(--f)" }}>{l.desc}</div>
                </div>
                <span style={{ fontSize: 14, color: "#C4C8D0", marginTop: 2, flexShrink: 0 }}>↗</span>
              </a>
            ))}

            {/* HANDIGE TOOLS */}
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8B8FA3", marginTop: 14, marginBottom: 8, fontFamily: "var(--f)" }}>Handige tools</div>
            {[
              { name: "Mijnpensioenoverzicht.nl", url: "https://www.mijnpensioenoverzicht.nl", desc: "Zie hoeveel werkgeverspensioen je hebt opgebouwd. Start hier als je dat bedrag niet weet." },
              { name: "Belastingdienst: jaarruimte", url: "https://www.belastingdienst.nl/wps/wcm/connect/nl/aftrek-en-kortingen/content/hoe-bereken-ik-mijn-jaarruimte", desc: "Bereken hoeveel je belastingvrij mag storten in een pensioenproduct. De meeste mensen laten dit liggen." },
            ].map((l, i) => (
              <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
                borderTop: "1px solid #F0F2F5", textDecoration: "none",
                transition: "opacity 0.15s"
              }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--f)", marginBottom: 2 }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: "#8B8FA3", lineHeight: 1.6, fontFamily: "var(--f)" }}>{l.desc}</div>
                </div>
                <span style={{ fontSize: 14, color: "#C4C8D0", marginTop: 2, flexShrink: 0 }}>↗</span>
              </a>
            ))}
          </div>

          {/* WHAT'S NEXT + FEEDBACK — COMBINED */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", marginBottom: 8, fontFamily: "var(--f)" }}>Wat komt er aan?</div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 10, background: "var(--brand-light)", border: "1px solid var(--brand)", marginBottom: 14 }}>
              <span style={{ fontSize: 22, marginTop: 1 }}>👫</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)", fontFamily: "var(--f)" }}>Partner-modus</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "var(--brand)", background: "#fff", padding: "2px 8px", borderRadius: 4 }}>In ontwikkeling</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--brand-mid)", lineHeight: 1.65, fontFamily: "var(--f)" }}>
                  Twee inkomens, twee pensioenen, twee AOW-momenten — één gezamenlijk plan. Inclusief: wat als de ene partner eerder stopt dan de andere?
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.75, fontFamily: "var(--f)" }}>
              Dit is een eenmansproject. Klopt een berekening niet? Mis je iets? Heb je een idee? Laat het me weten — elke reactie lees ik.
            </div>
            <div style={{ marginTop: 12 }}>
              <a href="mailto:feedback@pensioenplanner.nl" style={{ display: "inline-flex", alignItems: "center", padding: "10px 18px", borderRadius: 10, background: "var(--brand)", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", fontFamily: "var(--f)", transition: "opacity 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >Mail me</a>
            </div>
          </div>

          {/* AANNAMES */}
          <details style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", overflow: "hidden" }} className="fu">
            <summary style={{ padding: "18px 22px", cursor: "pointer", fontFamily: "var(--f)", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)" }}>Aannames en vuistregels</div>
              <span style={{ fontSize: 16, color: "#C4C8D0", fontWeight: 300 }}>▼</span>
            </summary>
            <div style={{ padding: "0 22px 20px", borderTop: "1px solid #F0F2F5" }}>
              <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.7, fontFamily: "var(--f)", marginTop: 12, marginBottom: 12 }}>
                Transparantie vind ik belangrijk. Hier zijn alle aannames die de berekeningen gebruiken:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { l: "Spaarrente", v: "2% per jaar", n: "Gemiddelde Nederlandse spaarrente" },
                  { l: "Beleggingsrendement", v: `${rendement}% per jaar (door jou ingesteld)`, n: "Langetermijngemiddelde wereldwijde index ~7%" },
                  { l: "Belastingvoordeel", v: "37% van pensioeninleg", n: "Marginaal tarief schijf 1 (2025/2026)" },
                  { l: "Vervroeging pensioen", v: "~8% minder per jaar", n: "Vuistregel — verschilt per fonds" },
                  { l: "AOW-leeftijd", v: "67 jaar", n: "Vastgesteld t/m 2027" },
                  { l: "Pensioenrichtleeftijd", v: "68 jaar", n: "Standaard in meeste regelingen" },
                  { l: "AOW samenwonend", v: `€${AOW_SAMEN_BRUTO}/mnd bruto p.p.`, n: "2026" },
                  { l: "AOW alleenstaand", v: `€${AOW_ALLEEN_BRUTO}/mnd bruto`, n: "2026" },
                  { l: "Veilige onttrekking", v: "4% per jaar", n: "Trinity-studie" },
                  { l: "Lijfrente-uitkeringsduur", v: `Minimaal ${lijfrenteUitkeringsDuur} jaar (bij start op ${lijfrenteStartLeeftijd})`, n: "Jaren tot AOW + 20 jaar, minimaal 20" },
                  { l: "Inflatie", v: "Niet meegenomen", n: "Bedragen in euro's van vandaag" },
                  { l: "Belasting", v: "Niet berekend", n: "Alle bedragen zijn bruto" },
                ].map((r, i) => (
                  <div key={r.l} style={{ display: "flex", alignItems: "baseline", padding: "5px 0", borderTop: i > 0 ? "1px solid #F0F2F5" : "none" }}>
                    <div style={{ flex: "0 0 180px", fontSize: 12, fontWeight: 600, color: "#1a1a2e", fontFamily: "var(--f)" }}>{r.l}</div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--f)" }}>{r.v}</span>
                      <span style={{ fontSize: 10, color: "#C4C8D0", fontFamily: "var(--f)", marginLeft: 6 }}>{r.n}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </>}
      </div>

      <footer style={{ textAlign: "center", padding: "14px 20px 20px", color: "#CCC", fontSize: 10, fontFamily: "var(--f)", lineHeight: 1.6 }}>
        ⚠️ Indicatieve berekening in euro's van vandaag (exclusief inflatie) — raadpleeg een financieel adviseur voor persoonlijk advies<br/>
        Pensioenberekeningen zijn gebaseerd op vuistregels (~8% korting per jaar vervroeging). Je pensioenfonds hanteert eigen omrekenfactoren.
      </footer>
    </div>
  );
}
