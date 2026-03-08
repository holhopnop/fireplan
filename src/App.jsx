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
  return (
    <div style={{ marginBottom: compact ? 10 : 14, flex: compact ? "1 1 180px" : undefined }}>
      <label style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3, fontFamily: "var(--f)" }}>{label}{info && <Info tip={info} />}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: compact ? "6px 8px" : "8px 10px", borderRadius: 8, border: `1.5px solid ${focused ? "var(--brand)" : "#EBEBEB"}`, background: "#FAFAFA", transition: "border-color 0.15s" }}>
        {prefix && <span style={{ color: "#BBB", fontSize: 13, fontWeight: 600, fontFamily: "var(--f)" }}>{prefix}</span>}
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
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
  return (
    <div style={{ marginBottom: compact ? 10 : 16 }}>
      <div style={{ marginBottom: compact ? 10 : 14 }}>
        <Field label="Totaal beschikbaar per maand" value={total} onChange={onTotalChange} prefix="€" compact={compact} hint="Hoeveel kun je maandelijks beleggen?" />
      </div>
      {total > 0 && <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#8B8FA3", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--f)" }}>Verdeling <Info tip="verdeling" /></span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#8B8FA3", fontFamily: "var(--f)" }}>{100 - pct}% privé · {pct}% pensioen</span>
        </div>
        <div style={{ fontSize: 10, color: "#C4C8D0", marginBottom: 6, fontFamily: "var(--f)" }}>Privé = overbruggen tot je pensioen ingaat · pensioen = oude dag + belastingvoordeel</div>
        <div style={{ position: "relative", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ position: "absolute", inset: 0, display: "flex" }}>
            <div style={{ flex: 100 - pct, background: "var(--brand)", transition: "flex 0.15s", borderRadius: pct === 0 ? 4 : "4px 0 0 4px" }} />
            <div style={{ flex: pct, background: "#D97706", transition: "flex 0.15s", borderRadius: pct === 100 ? 4 : "0 4px 4px 0" }} />
          </div>
          <input type="range" min={0} max={100} step={5} value={pct} onChange={e => onPctChange(Number(e.target.value))}
            style={{ position: "absolute", top: -4, left: 0, width: "100%", height: 16, opacity: 0, cursor: "pointer" }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: taxBack > 0 ? 10 : 0 }}>
          <div style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "#FAFBF9", borderLeft: "3px solid var(--brand)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#8B8FA3", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 1 }}>Privé</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--brand)", fontFamily: "var(--f)" }}>{fmt(priv)}<span style={{ fontSize: 10, fontWeight: 500, color: "#C4C8D0" }}>/m</span></div>
            <div style={{ fontSize: 9, color: "#C4C8D0" }}>Vrij opneembaar</div>
          </div>
          <div style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "#FFFBF5", borderLeft: "3px solid #D97706" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#8B8FA3", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 1 }}>Pensioen</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#D97706", fontFamily: "var(--f)" }}>{fmt(pens)}<span style={{ fontSize: 10, fontWeight: 500, color: "#C4C8D0" }}>/m</span></div>
            <div style={{ fontSize: 9, color: "#C4C8D0" }}>Vergrendeld tot pensioen</div>
          </div>
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
    hypotheekPerMaand: 900, hypotheekEindjaar: 2042,
    werkgeversPensioen: 800, pensioenIngangLeeftijd: 68,
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
            <div style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, fontFamily: "var(--f)" }}>Hypotheek <Info tip="hypotheek" /></div>
          </div>
          <Field label="Hypotheeklasten per maand" value={d.hypotheekPerMaand} onChange={v => set("hypotheekPerMaand", v)} prefix="€" />
          <Field label="Hypotheek afgelost in (jaar)" value={d.hypotheekEindjaar} onChange={v => set("hypotheekEindjaar", v)} hint="Na dit jaar dalen je woonlasten" />

          {d.hypotheekPerMaand > 0 && (
            <div style={{ background: "#F0FFF4", borderRadius: 8, padding: "12px 14px", marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "#16A34A", fontFamily: "var(--f)" }}>
                Na aflossing dalen je uitgaven met <strong>{fmt(d.hypotheekPerMaand)}</strong>/mnd. Dat scheelt enorm voor je pensioenplan.
              </div>
            </div>
          )}
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
  const [hypotheekPerMaand, setHypotheekPerMaand] = useState(900);
  const [hypotheekEindjaar, setHypotheekEindjaar] = useState(2042);
  const [werkgeversPensioen, setWerkgeversPensioen] = useState(800);
  const [pensioenIngangLeeftijd, setPensioenIngangLeeftijd] = useState(68);
  const [pensioenbeleggenPot, setPensioenbeleggenPot] = useState(0);
  const [spaargeld, setSpaargeld] = useState(15000);
  const [beleggingen, setBeleggingen] = useState(15000);
  const [totaalInleg, setTotaalInleg] = useState(500);
  const [pensioenPct, setPensioenPct] = useState(40);
  const [rendement, setRendement] = useState(7);
  const [scenStop, setScenStop] = useState(65);
  const [scenInleg, setScenInleg] = useState(700);
  const [scenRend, setScenRend] = useState(4);

  const maandInleg = Math.round(totaalInleg * (1 - pensioenPct / 100));
  const pensioenbeleggen = Math.round(totaalInleg * pensioenPct / 100);
  const belastingVoordeel = Math.round(pensioenbeleggen * BELASTING_TARIEF);
  const huidigVermogen = spaargeld + beleggingen;
  const allState = { leeftijd, stopLeeftijd, samenwonend, gewenstUitgaven, uitgavenNaAOW, hypotheekPerMaand, hypotheekEindjaar, werkgeversPensioen, pensioenIngangLeeftijd, pensioenbeleggenPot, spaargeld, beleggingen, totaalInleg, pensioenPct, rendement };
  const currentYear = new Date().getFullYear();
  const hypotheekAflosLeeftijd = leeftijd + (hypotheekEindjaar - currentYear);

  useEffect(() => {
    const d = load();
    if (d && d.leeftijd) {
      const S = { leeftijd: setLeeftijd, stopLeeftijd: setStopLeeftijd, samenwonend: setSamenwonend, gewenstUitgaven: setGewenstUitgaven, uitgavenNaAOW: setUitgavenNaAOW, hypotheekPerMaand: setHypotheekPerMaand, hypotheekEindjaar: setHypotheekEindjaar, werkgeversPensioen: setWerkgeversPensioen, pensioenIngangLeeftijd: setPensioenIngangLeeftijd, pensioenbeleggenPot: setPensioenbeleggenPot, spaargeld: setSpaargeld, beleggingen: setBeleggingen, totaalInleg: setTotaalInleg, pensioenPct: setPensioenPct, rendement: setRendement };
      Object.entries(d).forEach(([k, v]) => { if (S[k] && v !== undefined) S[k](v); });
      setReady(true);
      setPage("dashboard");
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (ready) save(allState); }, [leeftijd, stopLeeftijd, samenwonend, gewenstUitgaven, uitgavenNaAOW, hypotheekPerMaand, hypotheekEindjaar, werkgeversPensioen, pensioenIngangLeeftijd, pensioenbeleggenPot, spaargeld, beleggingen, totaalInleg, pensioenPct, rendement]);
  useEffect(() => { setEditOpen(false); }, [tab]);

  const handleOnboard = useCallback((d) => {
    setLeeftijd(d.leeftijd); setStopLeeftijd(d.stopLeeftijd); setSamenwonend(d.samenwonend);
    setGewenstUitgaven(d.gewenstUitgaven); setUitgavenNaAOW(d.uitgavenNaAOW);
    setHypotheekPerMaand(d.hypotheekPerMaand); setHypotheekEindjaar(d.hypotheekEindjaar);
    setWerkgeversPensioen(d.werkgeversPensioen); setPensioenIngangLeeftijd(d.pensioenIngangLeeftijd);
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

  // Pensioenbeleggen pot
  const pbPot = useMemo(() => {
    if (pensioenbeleggen <= 0 && pensioenbeleggenPot <= 0) return 0;
    let v = pensioenbeleggenPot;
    for (let i = 0; i < Math.max(0, pensioenIngangLeeftijd - leeftijd); i++) v = v * (1 + rendement / 100) + pensioenbeleggen * 12;
    return v;
  }, [pensioenbeleggen, pensioenbeleggenPot, rendement, leeftijd, pensioenIngangLeeftijd]);
  const pbUitkering = pbPot > 0 ? Math.round(pbPot / (20 * 12)) : 0;

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
        const uitg = (a >= AOW_LEEFTIJD ? uitgavenNaAOW : gewenstUitgaven) * 12;
        const aow = a >= AOW_LEEFTIJD ? aowM * 12 : 0;
        const pen = a >= pensioenIngangLeeftijd ? (effectiefPensioen + pbUitkering) * 12 : 0;
        const hypotheekAfgelost = a >= hypotheekAflosLeeftijd ? hypotheekPerMaand * 12 : 0;
        const onttrekking = Math.max(0, uitg - aow - pen - hypotheekAfgelost);
        const fromSp = Math.min(Math.max(0, sp), onttrekking);
        sp = sp * (1 + SPAARRENTE) - fromSp;
        bl = Math.max(0, bl * (1 + rendement / 100 * 0.4) - Math.max(0, onttrekking - fromSp));
        blLow = Math.max(0, blLow * (1 + rLow / 100 * 0.4) - Math.max(0, onttrekking - fromSp));
        blHigh = Math.max(0, blHigh * (1 + rHigh / 100 * 0.4) - Math.max(0, onttrekking - fromSp));
        if (sp < 0) sp = 0;
        if (a < pensioenIngangLeeftijd) pb = pb * (1 + rendement / 100) + pensioenbeleggen * 12;
      }
    }
    return d;
  }, [leeftijd, stopLeeftijd, spaargeld, beleggingen, pensioenbeleggenPot, pensioenbeleggen, maandInleg, rendement, gewenstUitgaven, uitgavenNaAOW, aowM, effectiefPensioen, pbUitkering, pensioenIngangLeeftijd, hypotheekAflosLeeftijd, hypotheekPerMaand]);

  // Overbrugging phases
  const overbrugging = useMemo(() => {
    const fase1Start = stopLeeftijd;
    const fase1End = Math.min(pensioenIngangLeeftijd, AOW_LEEFTIJD);
    const fase1Jaren = Math.max(0, fase1End - fase1Start);
    const fase1UitgavenMnd = fase1Start >= hypotheekAflosLeeftijd ? Math.max(0, gewenstUitgaven - hypotheekPerMaand) : gewenstUitgaven;
    const fase1Inkomen = 0; // geen inkomen in fase 1
    const fase1Gat = fase1UitgavenMnd - fase1Inkomen;
    const fase1Totaal = fase1Gat * 12 * fase1Jaren;

    // Fase 2: between pension start and AOW (or vice versa)
    const fase2Start = Math.min(pensioenIngangLeeftijd, AOW_LEEFTIJD);
    const fase2End = Math.max(pensioenIngangLeeftijd, AOW_LEEFTIJD);
    const fase2Jaren = Math.max(0, fase2End - fase2Start);
    const fase2HeeftPensioen = pensioenIngangLeeftijd <= fase2Start;
    const fase2HeeftAOW = AOW_LEEFTIJD <= fase2Start;
    const fase2Inkomen = (fase2HeeftPensioen ? effectiefPensioen + pbUitkering : 0) + (fase2HeeftAOW ? aowM : 0);
    const fase2UitgavenMnd = fase2Start >= hypotheekAflosLeeftijd ? Math.max(0, gewenstUitgaven - hypotheekPerMaand) : gewenstUitgaven;
    const fase2Gat = Math.max(0, fase2UitgavenMnd - fase2Inkomen);
    const fase2Totaal = fase2Gat * 12 * fase2Jaren;

    // Fase 3: everything running
    const fase3Start = Math.max(pensioenIngangLeeftijd, AOW_LEEFTIJD);
    const fase3Inkomen = effectiefPensioen + pbUitkering + aowM;
    const fase3UitgavenMnd = fase3Start >= hypotheekAflosLeeftijd ? Math.max(0, uitgavenNaAOW - hypotheekPerMaand) : uitgavenNaAOW;
    const fase3Gat = Math.max(0, fase3UitgavenMnd - fase3Inkomen);

    const totaalNodig = fase1Totaal + fase2Totaal;
    const tekort = Math.max(0, totaalNodig - vermogenOpStop);

    return {
      fase1: { start: fase1Start, end: fase1End, jaren: fase1Jaren, uitgaven: fase1UitgavenMnd, inkomen: fase1Inkomen, gat: fase1Gat, totaal: fase1Totaal },
      fase2: { start: fase2Start, end: fase2End, jaren: fase2Jaren, uitgaven: fase2UitgavenMnd, inkomen: fase2Inkomen, gat: fase2Gat, totaal: fase2Totaal, heeftPensioen: fase2HeeftPensioen, heeftAOW: fase2HeeftAOW },
      fase3: { start: fase3Start, uitgaven: fase3UitgavenMnd, inkomen: fase3Inkomen, gat: fase3Gat },
      totaalNodig, tekort, vermogenOpStop
    };
  }, [stopLeeftijd, pensioenIngangLeeftijd, effectiefPensioen, pbUitkering, aowM, gewenstUitgaven, uitgavenNaAOW, hypotheekPerMaand, hypotheekAflosLeeftijd, vermogenOpStop]);

  // Scenario: impact extra inleg
  const extraInlegImpact = useMemo(() => {
    const extra = 200;
    let sp = spaargeld, bl = beleggingen;
    for (let i = 0; i < Math.max(0, stopLeeftijd - leeftijd); i++) { sp = sp * (1 + SPAARRENTE); bl = bl * (1 + rendement / 100) + (maandInleg + extra) * 12; }
    return Math.round(sp + bl) - vermogenOpStop;
  }, [spaargeld, beleggingen, maandInleg, rendement, leeftijd, stopLeeftijd, vermogenOpStop]);

  const fonts = <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />;
  const baseStyles = <style>{`:root{--f:'Outfit',sans-serif;--brand:#0D6B58;--brand-light:#EBF5F3;--brand-mid:#0A8C72;--bg:#FAFBF9;--card:#fff;--border:#ECF0EE;--text:#1a1a2e;--muted:#8B8FA3;--shadow:rgba(13,107,88,0.06)}*{box-sizing:border-box;margin:0}@keyframes tipIn{from{opacity:0;transform:translateX(-50%) translateY(4px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}.fu{animation:fadeUp 0.4s ease forwards}.si{animation:slideIn 0.4s ease forwards}@media(max-width:768px){.dsk{display:none!important}}@media(min-width:769px){.mob{display:none!important}}`}</style>;

  if (loading) return <div style={{ minHeight: "100vh", background: "#FAFBF9", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 14, color: "#BBB" }}>Laden...</div></div>;

  if (page === "landing") return <>{fonts}{baseStyles}<GlobalTooltip /><Landing onBegeleid={() => setPage("onboarding")} onDirect={handleDirectStart} /></>;
  if (page === "onboarding") return <>{fonts}{baseStyles}<GlobalTooltip /><Onboarding onComplete={handleOnboard} /></>;

  const TABS = [
    { id: "overzicht", l: "Overzicht", s: "🏠 Overzicht" },
    { id: "overbrugging", l: "Overbrugging", s: "📊 Overbrugging" },
    { id: "opbouw", l: "Mijn opbouw", s: "📈 Opbouw" },
    { id: "actie", l: "Wat kan ik doen?", s: "💡 Acties" },
    { id: "scenario", l: "Wat als?", s: "🔀 Wat als?" },
    { id: "pro", l: "Meer →", s: "⭐ Meer" },
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
          <Field compact label="Hypotheek" value={hypotheekPerMaand} onChange={setHypotheekPerMaand} prefix="€" suffix="/mnd" />
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
  const PhaseCard = ({ label, color, jaren, start, end, uitgaven, inkomen, gat, details, delay }) => (
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
        {[
          { l: "Nodig", v: fmt(uitgaven), c: "#1a1a2e" },
          { l: "Inkomen", v: fmt(inkomen), c: inkomen > 0 ? "#0D6B58" : "#C4C8D0" },
          { l: gat > 0 ? "Tekort" : "OK", v: fmt(gat > 0 ? gat : Math.max(0, inkomen - uitgaven)), c: gat > 0 ? "#DC2626" : "#0D6B58" },
        ].map((r, i) => (
          <div key={r.l} style={{ flex: 1, padding: "8px 0", borderTop: "1px solid #F0F2F5", textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#C4C8D0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{r.l}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: r.c }}>{r.v}<span style={{ fontSize: 10, fontWeight: 500, color: "#D0D4DC" }}>/m</span></div>
          </div>
        ))}
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
        <button onClick={() => { try { localStorage.removeItem(SKEY); } catch {} setReady(false); setPage("landing"); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #ECF0EE", background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#C4C8D0", fontFamily: "var(--f)", transition: "all 0.15s" }}
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
        {ep && <EditPanel title={ep.title} open={editOpen} onToggle={() => { setEditOpen(!editOpen); if (firstVisit) setFirstVisit(false); }} summary={ep.summary} showHint={firstVisit}>{ep.content}</EditPanel>}

        {/* ═══ OVERZICHT TAB ═══ */}
        {tab === "overzicht" && <>
          {/* SCORE */}
          {(() => {
            const score = overbrugging.tekort <= 0 ? "goed" : overbrugging.tekort < gewenstUitgaven * 24 ? "krap" : "tekort";
            const topActie = extraInlegImpact > 0 ? `€200/mnd extra beleggen levert ${fmt(extraInlegImpact)} op` : "Bekijk je opties";
            return <>
              <div style={{ background: score === "goed" ? "#EBF5F3" : score === "krap" ? "#FFFBF5" : "#FFF5F5", borderRadius: 16, padding: "28px 26px", borderLeft: `4px solid ${score === "goed" ? "var(--brand)" : score === "krap" ? "#D97706" : "#DC2626"}` }} className="fu">
                <div style={{ fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 800, color: score === "goed" ? "var(--brand)" : score === "krap" ? "#B45309" : "#DC2626", lineHeight: 1.3, marginBottom: 6, fontFamily: "var(--f)" }}>
                  {score === "goed" && `Je kunt op je ${stopLeeftijd}e stoppen met werken`}
                  {score === "krap" && `Stoppen op je ${stopLeeftijd}e kan, maar het wordt krap`}
                  {score === "tekort" && `Op je ${stopLeeftijd}e stoppen lukt nog niet`}
                </div>
                <div style={{ fontSize: 13, color: "#8B8FA3", lineHeight: 1.6, fontFamily: "var(--f)" }}>
                  {score === "goed" && `Je bouwt ${fmt(vermogenOpStop)} op en hebt ${fmt(overbrugging.totaalNodig)} nodig. Je houdt ${fmt(vermogenOpStop - overbrugging.totaalNodig)} over als buffer.`}
                  {score === "krap" && `Je bouwt ${fmt(vermogenOpStop)} op en hebt ${fmt(overbrugging.totaalNodig)} nodig. Je tekort van ${fmt(overbrugging.tekort)} is overbrugbaar met kleine aanpassingen.`}
                  {score === "tekort" && `Je hebt ${fmt(overbrugging.totaalNodig)} nodig maar bouwt ${fmt(vermogenOpStop)} op. Er ontbreekt ${fmt(overbrugging.tekort)}.`}
                </div>
              </div>

              {/* FOUR CARDS */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }} className="fu">
                {[
                  { tab: "overbrugging", icon: "📊", q: "Heb ik genoeg om te overbruggen?",
                    value: overbrugging.tekort > 0 ? fmt(overbrugging.tekort) + " tekort" : fmt(vermogenOpStop - overbrugging.totaalNodig) + " over",
                    accent: overbrugging.tekort > 0 ? "#DC2626" : "var(--brand)",
                    sub: `${overbrugging.fase1.jaren > 0 ? overbrugging.fase1.jaren + "j zonder inkomen" : ""} ${overbrugging.fase1.jaren > 0 && overbrugging.fase2.jaren > 0 ? " · " : ""}${overbrugging.fase2.jaren > 0 ? overbrugging.fase2.jaren + "j deels inkomen" : ""}`.trim() || "Alles gedekt"
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
                if (overbrugging.fase1.jaren >= 5)
                  punten.push({ icon: "🔴", text: `Je hebt ${overbrugging.fase1.jaren} jaar zonder enig inkomen. Dat is een lange periode om te overbruggen met eigen vermogen.`, tab: "overbrugging" });
                if (hypotheekPerMaand > 0 && hypotheekAflosLeeftijd > stopLeeftijd)
                  punten.push({ icon: "🏠", text: `Je hypotheek is pas afgelost op ${hypotheekAflosLeeftijd}. Tot die tijd zijn je uitgaven ${fmt(hypotheekPerMaand)}/mnd hoger.`, tab: "overbrugging" });
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
                    { l: "Maandelijkse inleg", v: `${fmt(totaalInleg)} (${100 - pensioenPct}% privé · ${pensioenPct}% pensioen)`, c: "var(--brand)" },
                    { l: "Vermogen nu", v: `${fmt(spaargeld)} spaar + ${fmt(beleggingen)} beleg${pensioenbeleggenPot > 0 ? ` + ${fmt(pensioenbeleggenPot)} pensioenpot` : ""}`, c: "var(--brand)" },
                    { l: "Woonsituatie", v: samenwonend ? `Samenwonend · AOW ${fmt(aowM)}/mnd` : `Alleenstaand · AOW ${fmt(aowM)}/mnd`, c: "var(--brand)" },
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
          <Metric hero label={overbrugging.tekort > 0 ? "Je hebt een tekort" : "Je kunt je plan halen"} value={fmt(overbrugging.tekort > 0 ? overbrugging.tekort : vermogenOpStop - overbrugging.totaalNodig)} accent={overbrugging.tekort > 0 ? "#DC2626" : "#16A34A"} sub={overbrugging.tekort > 0 ? `Je hebt ${fmt(overbrugging.totaalNodig)} nodig maar bouwt ${fmt(vermogenOpStop)} op` : `Je bouwt ${fmt(vermogenOpStop)} op en hebt ${fmt(overbrugging.totaalNodig)} nodig`} info="overbrugging" />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="fu">
            <Metric label="Vermogen op stopleeftijd" value={fmt(vermogenOpStop)} sub={`Op je ${stopLeeftijd}e`} />
            <Metric label="Overbrugging nodig" value={fmt(overbrugging.totaalNodig)} sub="Tot al je inkomen loopt" />
          </div>

          {/* PHASE CARDS */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }} className="fu">
            {overbrugging.fase1.jaren > 0 && (
              <PhaseCard label="Geen inkomen" color="#DC2626" jaren={overbrugging.fase1.jaren} start={overbrugging.fase1.start} end={overbrugging.fase1.end} uitgaven={overbrugging.fase1.uitgaven} inkomen={0} gat={overbrugging.fase1.gat}
                details="Geen salaris, geen pensioen, geen AOW. Je leeft van eigen vermogen." delay={0} />
            )}
            {overbrugging.fase2.jaren > 0 && (
              <PhaseCard label={overbrugging.fase2.heeftPensioen ? "Pensioen loopt" : "AOW loopt"} color="#D97706" jaren={overbrugging.fase2.jaren} start={overbrugging.fase2.start} end={overbrugging.fase2.end} uitgaven={overbrugging.fase2.uitgaven} inkomen={overbrugging.fase2.inkomen} gat={overbrugging.fase2.gat}
                details={overbrugging.fase2.heeftPensioen ? `Werkgeverspensioen: ${fmt(effectiefPensioen)}/mnd. Nog geen AOW.` : `AOW: ${fmt(aowM)}/mnd. Nog geen werkgeverspensioen.`} delay={0.08} />
            )}
            <PhaseCard label="Alles loopt" color="#0D6B58" jaren="rest" start={overbrugging.fase3.start} end="∞" uitgaven={overbrugging.fase3.uitgaven} inkomen={overbrugging.fase3.inkomen} gat={overbrugging.fase3.gat}
              details={`AOW + werkgeverspensioen${pbUitkering > 0 ? " + eigen pensioen" : ""}. ${overbrugging.fase3.gat > 0 ? "Resteert een maandelijks tekort." : "Je inkomen dekt je uitgaven."}`} delay={0.16} />
          </div>

          {overbrugging.fase1.jaren > 0 && (
            <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
              <div style={{ display: "flex", alignItems: "center", fontSize: 12, fontWeight: 800, color: "var(--brand)", marginBottom: 4, fontFamily: "var(--f)" }}>Overbruggingskosten <Info tip="overbrugging" /></div>
              <div style={{ fontSize: 12, color: "#777", fontFamily: "var(--f)", lineHeight: 1.7 }}>
                Fase 1: {overbrugging.fase1.jaren} jaar × {fmt(overbrugging.fase1.gat)}/mnd = <strong>{fmt(overbrugging.fase1.totaal)}</strong>
                {overbrugging.fase2.jaren > 0 && <><br/>Fase 2: {overbrugging.fase2.jaren} jaar × {fmt(overbrugging.fase2.gat)}/mnd = <strong>{fmt(overbrugging.fase2.totaal)}</strong></>}
                <br/>Totaal nodig: <strong style={{ color: "#111", fontSize: 14 }}>{fmt(overbrugging.totaalNodig)}</strong>
                <br/>Je hebt op je {stopLeeftijd}e: <strong style={{ color: overbrugging.tekort > 0 ? "#DC2626" : "#16A34A" }}>{fmt(vermogenOpStop)}</strong>
              </div>
            </div>
          )}

          <div style={{ background: "#FAFAFA", borderRadius: 10, padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ display: "flex", alignItems: "center", fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 4, fontFamily: "var(--f)" }}>Over inflatie <Info tip="inflatie" /></div>
            <div style={{ fontSize: 12, color: "#777", fontFamily: "var(--f)", lineHeight: 1.6 }}>
              Alle bedragen in deze tool zijn in euro's van vandaag. Door inflatie (~2-3%/jaar) zal je koopkracht lager zijn. Spaargeld wordt hierdoor minder waard, beleggingsrendement compenseert dit deels. Houd een marge aan.
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
          <button onClick={() => setTab("actie")} style={{
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
              <div data-title style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)", textAlign: "left", transition: "color 0.2s" }}>{overbrugging.tekort > 0 ? "Wil je dit tekort verkleinen?" : "Wil je je voorsprong vergroten?"}</div>
              <div data-sub style={{ fontSize: 11, color: "#8B8FA3", textAlign: "left", marginTop: 2, transition: "color 0.2s" }}>Bekijk concrete acties die je nu kunt nemen →</div>
            </div>
            <span data-arrow style={{ fontSize: 20, color: "var(--brand)", fontWeight: 300, transition: "color 0.2s" }}>→</span>
          </button>
        </>}

        {/* ═══ OPBOUW TAB ═══ */}
        {tab === "opbouw" && <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="fu">
            <Metric label="Spaargeld" value={fmt(spaargeld)} sub="Groeit ~2%/jaar" info="spaargeld" />
            <Metric label="Beleggingen" value={fmt(beleggingen)} sub={`Groeit ~${rendement}%/jaar`} info="beleggingen" />
            <Metric label={`Totaal op ${stopLeeftijd}`} value={fmt(vermogenOpStop)} accent="var(--brand)" sub={`Over ${Math.max(0, stopLeeftijd - leeftijd)} jaar`} />
          </div>

          {hypotheekPerMaand > 0 && (
            <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }} className="fu">
              <div>
                <div style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#BBB", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3, fontFamily: "var(--f)" }}>Hypotheek impact <Info tip="hypotheek" /></div>
                <div style={{ fontSize: 12, color: "#777", fontFamily: "var(--f)" }}>Woonlasten dalen met <strong style={{ color: "#16A34A" }}>{fmt(hypotheekPerMaand)}</strong>/mnd op leeftijd {hypotheekAflosLeeftijd}</div>
              </div>
            </div>
          )}

          <div style={{ background: "#fff", borderRadius: 10, padding: "18px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ display: "flex", alignItems: "center", fontSize: 15, fontWeight: 700, color: "var(--brand)", marginBottom: 4, fontFamily: "var(--f)" }}>Vermogensopbouw per bron <Info tip="compound" /></div>
            <div style={{ fontSize: 11, color: "#C4C8D0", marginBottom: 14, fontFamily: "var(--f)" }}>Spaargeld (~2%) · beleggingen (~{rendement}%) · <span style={{ color: "#8B8FA3" }}>gestreepte lijn = pessimistisch scenario (4%)</span></div>
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={groeiData}>
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
                {hypotheekAflosLeeftijd > leeftijd && hypotheekAflosLeeftijd < 85 && <ReferenceLine x={hypotheekAflosLeeftijd} stroke="#16A34A" strokeDasharray="3 3" label={{ value: "Hyp. vrij", position: "top", fontSize: 9, fill: "#16A34A" }}/>}
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
            const atNow = groeiData.find(d => d.leeftijd === leeftijd) || {};
            const rows = [
              { l: "Spaargeld", now: spaargeld, then: atStop.spaargeld || 0, rente: "2%", c: "#94A3B8" },
              { l: "Beleggingen", now: beleggingen, then: atStop.beleggingen || 0, rente: `${rendement}%`, c: "var(--brand)" },
              ...((pensioenbeleggen > 0 || pensioenbeleggenPot > 0) ? [{ l: "Pensioenbeleggen", now: pensioenbeleggenPot, then: atStop.pensioenpot || 0, rente: `${rendement}%`, c: "#D97706" }] : []),
            ];
            const totNow = rows.reduce((s, r) => s + r.now, 0);
            const totThen = rows.reduce((s, r) => s + r.then, 0);
            return (
              <div style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", marginBottom: 10, fontFamily: "var(--f)" }}>Vermogen op je {stopLeeftijd}e</div>
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
                  Pessimistisch scenario (4% rendement): {fmt(atStop.bandLow || 0)}
                </div>
              </div>
            );
          })()}

          <div style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", marginBottom: 10, fontFamily: "var(--f)" }}>Pensioeninkomen per bron</div>
            {[
              { l: "AOW-uitkering", v: aowM, n: `${samenwonend ? "Samenwonend" : "Alleenstaand"} · vanaf ${AOW_LEEFTIJD}`, c: "#2563EB" },
              { l: "Werkgeverspensioen", v: effectiefPensioen, n: `${jarenVervroeging > 0 ? `Vervroegd: ${jarenVervroeging}j × 8% korting` : "Op richtleeftijd"} · vanaf ${pensioenIngangLeeftijd}`, c: "#7C3AED" },
              ...(pbUitkering > 0 ? [{ l: "Eigen pensioenbeleggen", v: pbUitkering, n: `Huidig: ${fmtS(pensioenbeleggenPot)} · Pot op ${pensioenIngangLeeftijd}: ${fmtS(pbPot)} · 20j uitkering`, c: "#D97706" }] : []),
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

          {/* BELEGGEN — INKLAPBAAR */}
          <details style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", overflow: "hidden" }} className="fu">
            <summary style={{ padding: "18px 22px", cursor: "pointer", fontFamily: "var(--f)", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--brand)" }}>Nieuw in beleggen? Lees mijn gids →</div>
                <div style={{ fontSize: 11, color: "#8B8FA3", marginTop: 2 }}>Wat ik zelf doe, waarom, en waar je kunt starten</div>
              </div>
              <span style={{ fontSize: 16, color: "#C4C8D0", fontWeight: 300, flexShrink: 0, marginLeft: 12 }}>▼</span>
            </summary>
            <div style={{ padding: "0 22px 22px", borderTop: "1px solid #F0F2F5" }}>

              {/* PERSOONLIJK INTRO */}
              <div style={{ margin: "16px 0", padding: "16px 18px", borderRadius: 10, background: "var(--brand-light)", borderLeft: "3px solid var(--brand)" }}>
                <div style={{ fontSize: 12, color: "var(--brand)", lineHeight: 1.75, fontFamily: "var(--f)" }}>
                  <strong>Even persoonlijk.</strong> Ik beleg zelf bij <strong>Meesman</strong> — zowel mijn pensioen als mijn vrije vermogen. Waarom? Omdat ik niet wil nadenken over fondskeuze. Ik zet elke maand automatisch een bedrag in, Meesman belegt het in een wereldwijd indexfonds, en ik kijk er verder niet naar om. Dat is het.
                </div>
                <div style={{ fontSize: 12, color: "var(--brand)", lineHeight: 1.75, fontFamily: "var(--f)", marginTop: 8 }}>
                  Daarnaast gebruik ik <strong>Bux</strong> voor een klein deel individuele aandelen — puur omdat ik dat leuk vind, niet omdat het slimmer is. Voor 90% van de mensen is alleen Meesman genoeg.
                </div>
              </div>

              {/* DE BASIS */}
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 8, marginTop: 16, fontFamily: "var(--f)" }}>De basis in 4 zinnen</div>
              <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.75, fontFamily: "var(--f)", marginBottom: 16 }}>
                <strong style={{ color: "#1a1a2e" }}>Spreid breed</strong> — koop geen losse aandelen maar een indexfonds dat duizenden bedrijven bevat.
                <strong style={{ color: "#1a1a2e" }}> Denk in jaren</strong> — de beurs gaat op en neer, over 15+ jaar is het gemiddelde ~7% per jaar.
                <strong style={{ color: "#1a1a2e" }}> Houd kosten laag</strong> — elk procent aan kosten vreet over 30 jaar tienduizenden euro's.
                <strong style={{ color: "#1a1a2e" }}> Automatiseer</strong> — elke maand hetzelfde bedrag, niet timen, niet pieken.
              </div>

              {/* DE GOUDEN COMBI */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid var(--brand)", padding: "16px 18px", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--brand)", marginBottom: 4, fontFamily: "var(--f)" }}>De gouden combi: privé + pensioen</div>
                <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.7, marginBottom: 12, fontFamily: "var(--f)" }}>
                  Je hebt twee problemen die elk een eigen oplossing vragen:
                </div>

                {/* TIMELINE */}
                <div style={{ display: "flex", alignItems: "stretch", gap: 0, marginBottom: 12, borderRadius: 8, overflow: "hidden", height: 48 }}>
                  {stopLeeftijd < pensioenIngangLeeftijd && (
                    <div style={{ flex: Math.max(1, pensioenIngangLeeftijd - stopLeeftijd), background: "var(--brand)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 8px", minWidth: 80 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Privé vermogen</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{stopLeeftijd}–{pensioenIngangLeeftijd}</div>
                    </div>
                  )}
                  <div style={{ flex: Math.max(1, 15), background: "#D97706", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 8px", minWidth: 80 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pensioenbeleggen</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{pensioenIngangLeeftijd}+</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 200px", padding: "12px 14px", borderRadius: 10, borderLeft: "3px solid var(--brand)", background: "#FAFBF9" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--brand)", marginBottom: 3, fontFamily: "var(--f)" }}>Privé → overbruggen</div>
                    <div style={{ fontSize: 11, color: "#8B8FA3", lineHeight: 1.6, fontFamily: "var(--f)" }}>
                      {stopLeeftijd < pensioenIngangLeeftijd
                        ? `Tussen je ${stopLeeftijd}e en ${pensioenIngangLeeftijd}e heb je geen salaris en nog geen pensioenuitkering. Die ${pensioenIngangLeeftijd - stopLeeftijd} jaar overbruggen doe je met privé vermogen.`
                        : `Vrij opneembaar vermogen voor de overbrugging en als buffer.`
                      }
                    </div>
                  </div>
                  <div style={{ flex: "1 1 200px", padding: "12px 14px", borderRadius: 10, borderLeft: "3px solid #D97706", background: "#FFFBF5" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#B45309", marginBottom: 3, fontFamily: "var(--f)" }}>Pensioen → oude dag</div>
                    <div style={{ fontSize: 11, color: "#8B8FA3", lineHeight: 1.6, fontFamily: "var(--f)" }}>
                      Vanaf je {pensioenIngangLeeftijd}e krijg je maandelijks uitgekeerd. Plus: ~37% belastingvoordeel nu.{belastingVoordeel > 0 ? ` Bij jou: ${fmt(belastingVoordeel)}/mnd terug.` : ""}
                    </div>
                  </div>
                </div>

                {pensioenPct === 0 && totaalInleg > 0 && (
                  <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#FFF5F5", fontSize: 11, color: "#DC2626", fontFamily: "var(--f)", lineHeight: 1.6 }}>
                    <strong>Je mist het pensioen-deel.</strong> Je belegt {fmt(totaalInleg)}/mnd, maar alles privé. Schuif een deel richting pensioen en je krijgt ~{fmt(Math.round(totaalInleg * 0.4 * BELASTING_TARIEF))}/mnd terug.
                  </div>
                )}
                {pensioenPct === 100 && totaalInleg > 0 && (
                  <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#FFF5F5", fontSize: 11, color: "#DC2626", fontFamily: "var(--f)", lineHeight: 1.6 }}>
                    <strong>Je mist het privé-deel.</strong> Je kunt pas bij je pensioengeld op je {pensioenIngangLeeftijd}e.{stopLeeftijd < pensioenIngangLeeftijd ? ` Wie betaalt de ${pensioenIngangLeeftijd - stopLeeftijd} jaar daarvoor?` : ""} Schuif een deel naar privé.
                  </div>
                )}
              </div>

              {/* MIJN AANBEVELINGEN */}
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 10, fontFamily: "var(--f)" }}>Wat ik aanraad</div>

              {/* MEESMAN */}
              <div style={{ background: "var(--brand-light)", borderRadius: 12, padding: "16px 18px", marginBottom: 10, border: "1px solid var(--brand)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--brand)", fontFamily: "var(--f)" }}>Meesman</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#fff", color: "var(--brand)" }}>Mijn keuze</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#fff", color: "var(--brand)" }}>Overbruggen</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#FFFBF5", color: "#B45309" }}>Oude dag</span>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--brand)", fontFamily: "var(--f)" }}>0,5% per jaar</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--brand-mid)", lineHeight: 1.7, marginBottom: 8, fontFamily: "var(--f)" }}>
                  De simpelste en beste optie voor de meeste mensen. Eén wereldwijd indexfonds, volledig geautomatiseerd. Je kiest een risicoprofiel, zet een automatische inleg in, en je hoeft er nooit meer naar om te kijken. Biedt zowel een vrije beleggingsrekening (voor overbruggen) als een pensioenrekening (voor je oude dag). Alles bij één partij, twee rekeningen — precies de gouden combi.
                </div>
                <a href="https://www.meesman.nl" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", textDecoration: "none", borderBottom: "1px solid var(--brand)", fontFamily: "var(--f)" }}>→ Bekijk Meesman</a>
              </div>

              {/* BUX */}
              <div style={{ background: "var(--brand-light)", borderRadius: 12, padding: "16px 18px", marginBottom: 10, border: "1px solid var(--brand)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--brand)", fontFamily: "var(--f)" }}>Bux</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#fff", color: "var(--brand)" }}>Mijn keuze</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#fff", color: "var(--brand)" }}>Overbruggen</span>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--brand)", fontFamily: "var(--f)" }}>€0 transactiekosten</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--brand-mid)", lineHeight: 1.7, marginBottom: 8, fontFamily: "var(--f)" }}>
                  Ik gebruik Bux naast Meesman voor een klein deel individuele aandelen. Puur omdat ik dat leuk vind — niet omdat het slimmer is. Mooie app, lage instap (vanaf €10), en je kunt ook automatisch in indexfondsen beleggen. Geen pensioenrekening — alleen voor vrij vermogen. Als je wilt spelen met losse aandelen naast je serieuze indexbelegging, is Bux daar geschikt voor.
                </div>
                <a href="https://getbux.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", textDecoration: "none", borderBottom: "1px solid var(--brand)", fontFamily: "var(--f)" }}>→ Bekijk Bux</a>
              </div>

              {/* ALTERNATIEVEN */}
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8B8FA3", marginTop: 14, marginBottom: 8, fontFamily: "var(--f)" }}>Alternatieven</div>

              {[
                {
                  name: "Brand New Day", url: "https://new.brandnewday.nl",
                  tags: [{ l: "Oude dag", c: "#B45309", bg: "#FFFBF5" }],
                  kosten: "0,16%–0,59%",
                  desc: "Specialist in pensioenbeleggen via lijfrente. Lage kosten, lang trackrecord. Als je puur een pensioenrekening wilt en Meesman niet aanspreekt, is dit het beste alternatief. Geen vrije beleggingsrekening — alleen pensioen."
                },
                {
                  name: "DeGiro", url: "https://www.degiro.nl",
                  tags: [{ l: "Overbruggen", c: "var(--brand)", bg: "var(--brand-light)" }],
                  kosten: "€0 kernselectie",
                  desc: "De goedkoopste broker voor wie zelf wil kiezen. Enorme fondskeuze, gratis kernselectie ETF's. Maar je moet zelf weten wat je koopt, er is geen automatische inleg, en geen pensioenrekening. Voor beginners raad ik het niet aan als eerste stap — ga eerst naar Meesman, en als je later meer controle wilt, kun je altijd overstappen."
                },
              ].map(a => (
                <div key={a.name} style={{ background: "#FAFBF9", borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e", fontFamily: "var(--f)" }}>{a.name}</span>
                      {a.tags.map(t => <span key={t.l} style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: t.bg, color: t.c }}>{t.l}</span>)}
                    </div>
                    <span style={{ fontSize: 10, color: "#C4C8D0", fontFamily: "var(--f)" }}>{a.kosten}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#8B8FA3", lineHeight: 1.65, marginBottom: 6, fontFamily: "var(--f)" }}>{a.desc}</div>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", textDecoration: "none", borderBottom: "1px dashed var(--brand)", fontFamily: "var(--f)" }}>→ Bekijk {a.name}</a>
                </div>
              ))}

              {/* CONCREET ADVIES */}
              <div style={{ background: "var(--brand-light)", borderRadius: 10, padding: "14px 16px", marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--brand)", marginBottom: 4, fontFamily: "var(--f)" }}>Mijn advies voor jouw situatie</div>
                <div style={{ fontSize: 11, color: "var(--brand-mid)", lineHeight: 1.7, fontFamily: "var(--f)" }}>
                  {pensioenPct > 0 && pensioenPct < 100
                    ? `Open twee rekeningen bij Meesman: een pensioenrekening voor je ${pensioenPct}% pensioen-deel (${fmt(pensioenbeleggen)}/mnd) en een beleggingsrekening voor je ${100 - pensioenPct}% privé-deel (${fmt(maandInleg)}/mnd). Wil je daarnaast spelen met losse aandelen? Dan is Bux leuk voor een klein bedrag erbij.`
                    : pensioenPct === 0
                    ? `Start met een beleggingsrekening bij Meesman voor je privé vermogen. Maar denk serieus na over ook een pensioenrekening erbij — je laat nu belastingvoordeel liggen. Beide kan bij Meesman.`
                    : `Open een pensioenrekening bij Meesman voor je pensioen-deel. Maar voeg ook een beleggingsrekening toe voor vrij vermogen — je hebt dat nodig voor de overbrugging. Beide kan bij Meesman.`
                  }
                </div>
              </div>

              {/* MEER LEREN */}
              <div style={{ marginTop: 12, fontSize: 11, color: "#8B8FA3", lineHeight: 1.6, fontFamily: "var(--f)" }}>
                Meer leren over indexbeleggen? Ik raad deze bronnen aan: <a href="https://www.financieelonafhankelijkblog.nl" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", textDecoration: "none", borderBottom: "1px dashed var(--brand)" }}>Mr. FOB</a> en <a href="https://www.indexfondsenvergelijken.nl" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)", textDecoration: "none", borderBottom: "1px dashed var(--brand)" }}>Indexfondsen Vergelijken</a>.
              </div>

              <div style={{ marginTop: 10, fontSize: 10, color: "#C4C8D0", lineHeight: 1.6, fontFamily: "var(--f)" }}>
                Dit is mijn persoonlijke ervaring, geen financieel advies. Beleggen brengt risico's met zich mee. We ontvangen geen vergoeding van bovenstaande partijen.
              </div>
            </div>
          </details>
        </>}

        {/* ═══ WAT ALS TAB ═══ */}
        {tab === "scenario" && <>
          <div style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", display: "flex", gap: 20, flexWrap: "wrap" }} className="fu">
            <div style={{ flex: "1 1 180px" }}><Slider label="Scenario: stopleeftijd" value={scenStop} onChange={setScenStop} min={50} max={70} format={v => `${v} jaar`} /></div>
            <div style={{ flex: "1 1 180px" }}><Slider label="Scenario: inleg" value={scenInleg} onChange={setScenInleg} min={0} max={2000} step={50} format={v => `€${v}`} /></div>
            <div style={{ flex: "1 1 180px" }}><Slider label="Scenario: rendement" value={scenRend} onChange={setScenRend} min={1} max={12} step={0.5} format={v => `${v}%`} /></div>
          </div>

          {(() => {
            const calcV = (sl, il, rend) => { let sp = spaargeld, bl = beleggingen; for (let i = 0; i < Math.max(0, sl - leeftijd); i++) { sp = sp * (1 + SPAARRENTE); bl = bl * (1 + rend / 100) + il * 12; } return Math.round(sp + bl); };
            const calcOB = (sl) => {
              const f1j = Math.max(0, Math.min(pensioenIngangLeeftijd, AOW_LEEFTIJD) - sl);
              const f2s = Math.min(pensioenIngangLeeftijd, AOW_LEEFTIJD);
              const f2e = Math.max(pensioenIngangLeeftijd, AOW_LEEFTIJD);
              const f2j = Math.max(0, f2e - f2s);
              const f2ink = (pensioenIngangLeeftijd <= f2s ? effectiefPensioen + pbUitkering : 0) + (AOW_LEEFTIJD <= f2s ? aowM : 0);
              return f1j * gewenstUitgaven * 12 + Math.max(0, gewenstUitgaven - f2ink) * 12 * f2j;
            };
            const scenarios = [
              { label: `Jouw plan (${rendement}%)`, sl: stopLeeftijd, il: maandInleg, rend: rendement, highlight: true },
              { label: `Stop op ${scenStop}`, sl: scenStop, il: maandInleg, rend: rendement, highlight: false },
              { label: `${fmt(scenInleg)}/mnd inleg`, sl: stopLeeftijd, il: scenInleg, rend: rendement, highlight: false },
              { label: `Rendement ${scenRend}%`, sl: stopLeeftijd, il: maandInleg, rend: scenRend, highlight: false },
            ];
            return <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="fu">
                {scenarios.map((sc) => {
                  const v = calcV(sc.sl, sc.il, sc.rend);
                  const ob = calcOB(sc.sl);
                  const tekort = Math.max(0, ob - v);
                  return (
                    <div key={sc.label} style={{ flex: "1 1 200px", background: "#fff", borderRadius: 10, padding: "14px 16px", border: `1px solid ${sc.highlight ? "var(--brand)" : "#F0F0F0"}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: sc.highlight ? "var(--brand)" : "#999", marginBottom: 8, fontFamily: "var(--f)" }}>{sc.label}</div>
                      <div style={{ fontSize: 10, color: "#BBB", fontFamily: "var(--f)", marginBottom: 2 }}>Vermogen op stop</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--f)", marginBottom: 6 }}>{fmt(v)}</div>
                      <div style={{ fontSize: 10, color: "#BBB", fontFamily: "var(--f)", marginBottom: 2 }}>Overbrugging nodig</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#777", fontFamily: "var(--f)", marginBottom: 6 }}>{fmt(ob)}</div>
                      <div style={{ fontSize: 10, color: "#BBB", fontFamily: "var(--f)", marginBottom: 2 }}>{tekort > 0 ? "Tekort" : "Overschot"}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: tekort > 0 ? "#DC2626" : "#16A34A", fontFamily: "var(--f)" }}>{fmt(tekort > 0 ? tekort : v - ob)}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: "#fff", borderRadius: 10, padding: "18px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", marginBottom: 14, fontFamily: "var(--f)" }}>Vermogensgroei per scenario</div>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={Array.from({ length: Math.max(1, 76 - leeftijd) }, (_, i) => {
                    const a = leeftijd + i;
                    const r = { leeftijd: a };
                    scenarios.forEach((sc, j) => {
                      let sp = spaargeld, bl = beleggingen;
                      for (let y = 0; y < i; y++) { sp = sp * (1 + SPAARRENTE); bl = bl * (1 + sc.rend / 100) + sc.il * 12; }
                      r[`s${j}`] = Math.round(sp + bl);
                    });
                    return r;
                  })}>
                    <CartesianGrid stroke="#F5F5F5" vertical={false}/><XAxis dataKey="leeftijd" tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={fmtS} tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/><Tooltip content={<ChartTip/>}/>
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--f)" }}/>
                    <Line type="monotone" dataKey="s0" stroke="var(--brand)" name={scenarios[0].label} strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="s1" stroke="#2563EB" name={scenarios[1].label} strokeWidth={1.5} dot={false} strokeDasharray="6 3"/>
                    <Line type="monotone" dataKey="s2" stroke="#16A34A" name={scenarios[2].label} strokeWidth={1.5} dot={false} strokeDasharray="6 3"/>
                    <Line type="monotone" dataKey="s3" stroke="#D97706" name={scenarios[3].label} strokeWidth={1.5} dot={false} strokeDasharray="6 3"/>
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
          {/* AANNAMES (#11) */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", marginBottom: 14, fontFamily: "var(--f)" }}>Aannames in deze berekening</div>
            <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.7, fontFamily: "var(--f)" }}>
              Transparantie is belangrijk. Hier zijn de aannames en vuistregels die we gebruiken:
            </div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { l: "Spaarrente", v: "2% per jaar", n: "Gemiddelde Nederlandse spaarrente" },
                { l: "Beleggingsrendement", v: `${rendement}% per jaar (door jou ingesteld)`, n: "Langetermijngemiddelde wereldwijde index ~7%" },
                { l: "Belastingvoordeel pensioenbeleggen", v: "37% van inleg", n: "Marginaal tarief schijf 1 (2025/2026)" },
                { l: "Vervroeging werkgeverspensioen", v: "~8% minder per jaar", n: "Vuistregel — verschilt per pensioenfonds" },
                { l: "AOW-leeftijd", v: "67 jaar", n: "Vastgesteld t/m 2027. Vanaf 2028: 67j + 3mnd" },
                { l: "Pensioenrichtleeftijd", v: "68 jaar", n: "Standaard in de meeste pensioenregelingen" },
                { l: "AOW samenwonend", v: `€${AOW_SAMEN_BRUTO}/mnd bruto p.p.`, n: "2026 bedragen" },
                { l: "AOW alleenstaand", v: `€${AOW_ALLEEN_BRUTO}/mnd bruto`, n: "2026 bedragen" },
                { l: "Veilige onttrekking", v: "4% per jaar", n: "Trinity-studie, 30+ jaar horizon" },
                { l: "Inflatie", v: "Niet meegenomen", n: "Bedragen zijn in euro's van vandaag" },
                { l: "Belasting over uitkeringen", v: "Niet berekend", n: "Bedragen zijn bruto — netto is lager" },
              ].map((r, i) => (
                <div key={r.l} style={{ display: "flex", alignItems: "baseline", padding: "6px 0", borderTop: i > 0 ? "1px solid #F0F2F5" : "none" }}>
                  <div style={{ flex: "0 0 220px", fontSize: 12, fontWeight: 600, color: "#1a1a2e", fontFamily: "var(--f)" }}>{r.l}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--f)" }}>{r.v}</div>
                    <div style={{ fontSize: 10, color: "#C4C8D0", fontFamily: "var(--f)" }}>{r.n}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* UPCOMING FEATURES */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="fu">
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--brand)", marginBottom: 4, fontFamily: "var(--f)" }}>Binnenkort beschikbaar</div>
            <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.6, marginBottom: 16, fontFamily: "var(--f)" }}>
              We werken aan nieuwe functies om je pensioenplan completer te maken. Hieronder een overzicht van wat eraan komt.
            </div>
            {[
              { icon: "👫", title: "Partner-modus", desc: "Twee inkomens, twee pensioenen, één plan. Essentieel als je samenwoont.", status: "In ontwikkeling" },
              { icon: "📄", title: "PDF export", desc: "Sla je pensioenplan op als PDF om te delen met je financieel adviseur of partner.", status: "In ontwikkeling" },
              { icon: "📊", title: "Netto berekening", desc: "Zie niet alleen bruto maar ook netto bedragen per fase. Inclusief belastingschijven en heffingskortingen.", status: "Gepland" },
              { icon: "📈", title: "Reëel vs. nominaal", desc: "Toggle tussen bedragen in euro's van vandaag en toekomstige euro's. Zodat je weet wat je geld echt waard is.", status: "Gepland" },
              { icon: "🏦", title: "Meerdere pensioenproducten", desc: "Voeg meerdere lijfrentes of pensioenrekeningen apart toe met eigen inleg en rendement.", status: "Gepland" },
              { icon: "🔀", title: "Gecombineerde scenario's", desc: "Speel met stopleeftijd, inleg én rendement tegelijk in één scenario. Vergelijk tot 5 scenario's naast elkaar.", status: "Gepland" },
              { icon: "📉", title: "Benchmarks", desc: "Vergelijk je situatie met het CBS-gemiddelde voor jouw leeftijdscategorie. Sta je boven of onder de norm?", status: "Gepland" },
              { icon: "🔔", title: "Maandelijkse check-in", desc: "Krijg een herinnering om je cijfers bij te werken. Zie hoe je plan zich ontwikkelt over tijd.", status: "Op de roadmap" },
            ].map((f, i) => (
              <div key={f.title} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 0", borderTop: i > 0 ? "1px solid #F0F2F5" : "none" }}>
                <span style={{ fontSize: 24, marginTop: 2 }}>{f.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e", fontFamily: "var(--f)" }}>{f.title}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: f.status === "In ontwikkeling" ? "var(--brand)" : "#8B8FA3", background: f.status === "In ontwikkeling" ? "var(--brand-light)" : "#F5F7F6", padding: "2px 8px", borderRadius: 4, letterSpacing: "0.03em" }}>{f.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.6, fontFamily: "var(--f)" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* FEEDBACK CTA */}
          <div style={{ background: "var(--brand-light)", borderRadius: 14, padding: "22px 24px", textAlign: "center" }} className="fu">
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--brand)", marginBottom: 6, fontFamily: "var(--f)" }}>Welke feature wil jij het liefst?</div>
            <div style={{ fontSize: 12, color: "#8B8FA3", lineHeight: 1.6, marginBottom: 14, fontFamily: "var(--f)" }}>
              We bouwen wat jullie het hardst nodig hebben. Laat het ons weten — je feedback bepaalt de volgorde.
            </div>
            <div style={{ fontSize: 12, color: "var(--brand)", fontWeight: 600, fontFamily: "var(--f)" }}>Feedback? Mail naar feedback@pensioenplanner.nl</div>
          </div>
        </>}
      </div>

      <footer style={{ textAlign: "center", padding: "14px 20px 20px", color: "#CCC", fontSize: 10, fontFamily: "var(--f)", lineHeight: 1.6 }}>
        ⚠️ Indicatieve berekening in euro's van vandaag (exclusief inflatie) — raadpleeg een financieel adviseur voor persoonlijk advies<br/>
        Pensioenberekeningen zijn gebaseerd op vuistregels (~8% korting per jaar vervroeging). Je pensioenfonds hanteert eigen omrekenfactoren.
      </footer>
    </div>
  );
}
