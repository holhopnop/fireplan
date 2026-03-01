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
const AOW_AGE = 67;
const AOW_SAMEN = 948;
const AOW_ALLEEN = 1380;

const TIPS = {
  rendement: "Het historisch gemiddeld jaarlijks rendement van een wereldwijd gespreide aandelenindex ligt rond 7-8% vóór inflatie. Dit is een langetermijngemiddelde — individuele jaren schommelen sterk.",
  inflatie: "Inflatie is de jaarlijkse stijging van prijzen. Gemiddeld ~2% in de eurozone. Dit vermindert de koopkracht van je toekomstige vermogen.",
  fire: "FIRE staat voor Financial Independence, Retire Early. Als je 25× je jaaruitgaven hebt belegd, kun je veilig ~4% per jaar opnemen zonder dat je geld opraakt (de '4%-regel').",
  leanfire: "Lean FIRE = financieel onafhankelijk op 70% van je huidige uitgaven. Comfortabel maar zuiniger — een realistischer eerste doel.",
  savingsrate: "Je savings rate is het % van je netto inkomen dat je spaart/belegt. Boven 50%? FIRE in ~15 jaar. Boven 30% is al sterk.",
  box3: "In Box 3 betaal je belasting over vermogen boven de vrijstelling (€57.000 p.p. in 2025). Gebaseerd op fictief rendement, niet je werkelijke rendement.",
  jaarruimte: "Jaarruimte is het bedrag dat je fiscaal voordelig mag storten in een pensioenproduct (lijfrente). Je betaalt nu minder belasting en bouwt extra pensioen op.",
  aow: "AOW is het basispensioen van de overheid. De uitkering start op je AOW-leeftijd (67) en is afhankelijk van je woonsituatie.",
  compound: "Compound interest = rente op rente. Je rendement groeit niet alleen over je inleg, maar ook over eerder behaald rendement. Hoe langer, hoe krachtiger.",
  vierprocentregel: "De 4%-regel stelt dat je jaarlijks 4% van je vermogen kunt opnemen met >95% kans dat je geld 30+ jaar meegaat.",
  inkomen: "We vragen je inkomen om je savings rate te berekenen en in te schatten hoeveel je kunt beleggen. Dit wordt nergens opgeslagen buiten je eigen browser.",
  hypotheek: "Na aflossing van je hypotheek dalen je maandlasten flink. Dit verandert je pensioenplaatje: je hebt minder nodig per maand.",
  pensioenbeleggen: "Naast je werkgeverspensioen kun je zelf pensioen opbouwen via een lijfrente of pensioenrekening (bijv. Brand New Day, Bright Pensioen).",
  uitgaven: "Je totale maandelijkse uitgaven, inclusief hypotheek/huur. De hypotheek splitsen we er apart uit om de daling na aflossing te berekenen."
};

/* ═══════════════════════════════════════ STORAGE ═══════════════════════════════════════ */
const SKEY = "fireplan-v5";
function load() { try { const r = localStorage.getItem(SKEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function save(d) { try { localStorage.setItem(SKEY, JSON.stringify(d)); } catch {} }

/* ═══════════════════════════════════════ INFO TOOLTIP ═══════════════════════════════════════ */
function Info({ tip }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const text = TIPS[tip] || tip;
  useEffect(() => { if (!show) return; const cl = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); }; document.addEventListener("click", cl); return () => document.removeEventListener("click", cl); }, [show]);
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", marginLeft: 4, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setShow(!show); }}>
      <span style={{ width: 15, height: 15, borderRadius: 8, background: show ? "#111" : "#E5E5E5", color: show ? "#fff" : "#999", fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", fontFamily: "var(--f)" }}>?</span>
      {show && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", width: 260, background: "#111", color: "#E5E5E5", borderRadius: 10, padding: "12px 14px", fontSize: 12, lineHeight: 1.55, fontWeight: 500, fontFamily: "var(--f)", boxShadow: "0 8px 30px rgba(0,0,0,0.2)", zIndex: 100, animation: "tipIn 0.15s ease" }}>
          {text}<div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 10, height: 10, background: "#111" }} />
        </div>
      )}
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
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: compact ? "6px 8px" : "8px 10px", borderRadius: 8, border: `1.5px solid ${focused ? "#111" : "#EBEBEB"}`, background: "#FAFAFA", transition: "border-color 0.15s" }}>
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
        <span style={{ fontSize: 13, fontWeight: 800, color: "#111", fontFamily: "var(--f)" }}>{format ? format(value) : value}</span>
      </div>
      <div style={{ position: "relative", height: 4, background: "#EBEBEB", borderRadius: 2 }}>
        <div style={{ position: "absolute", height: "100%", background: "#111", borderRadius: 2, width: `${pct}%`, transition: "width 0.1s" }} />
        <div style={{ position: "absolute", top: -6, left: `${pct}%`, transform: "translateX(-50%)", width: 14, height: 14, borderRadius: 7, background: "#111", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", transition: "left 0.1s", pointerEvents: "none" }} />
        <input type="range" min={min} max={max} step={step || 1} value={value} onChange={(e) => onChange(Number(e.target.value))}
          style={{ position: "absolute", top: -8, left: 0, width: "100%", height: 20, opacity: 0, cursor: "pointer" }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ METRIC ═══════════════════════════════════════ */
function Metric({ label, value, sub, accent, info }) {
  return (
    <div style={{ flex: "1 1 140px", background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #F0F0F0", transition: "box-shadow 0.2s, transform 0.2s", cursor: "default" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
      <div style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#BBB", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5, fontFamily: "var(--f)" }}>{label}{info && <Info tip={info} />}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent || "#111", letterSpacing: "-0.03em", fontFamily: "var(--f)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#BBB", marginTop: 4, fontFamily: "var(--f)", lineHeight: 1.3 }}>{sub}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════ SAVINGS GRADE ═══════════════════════════════════════ */
function SavingsGrade({ rate }) {
  const g = rate >= 50 ? { l: "Uitmuntend", c: "#16A34A", e: "🏆" } : rate >= 35 ? { l: "Sterk", c: "#111", e: "💪" } : rate >= 20 ? { l: "Goed bezig", c: "#D97706", e: "👍" } : { l: "Start hier", c: "#999", e: "🌱" };
  const dots = Math.min(Math.floor(rate * 0.4), 12);
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #F0F0F0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#BBB", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4, fontFamily: "var(--f)" }}>Savings grade <Info tip="savingsrate" /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 20 }}>{g.e}</span><span style={{ fontSize: 16, fontWeight: 900, color: g.c, fontFamily: "var(--f)" }}>{g.l}</span></div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#111", fontFamily: "var(--f)", lineHeight: 1 }}>{rate.toFixed(0)}%</div>
          <div style={{ fontSize: 10, color: "#CCC", fontFamily: "var(--f)" }}>van inkomen</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 10 }}>
        {Array.from({ length: 12 }).map((_, i) => (<div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < dots ? "#111" : "#F0F0F0", transition: `background 0.3s ${i * 30}ms` }} />))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   COLLAPSIBLE EDIT PANEL (per tab)
   ═══════════════════════════════════════ */
function EditPanel({ title, open, onToggle, children, summary }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #F0F0F0", overflow: "hidden", transition: "box-shadow 0.2s", boxShadow: open ? "0 2px 12px rgba(0,0,0,0.04)" : "none" }}>
      <button onClick={onToggle} style={{
        width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "none", border: "none", cursor: "pointer", fontFamily: "var(--f)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚙</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#111", letterSpacing: "-0.01em" }}>{title}</span>
          {!open && summary && (
            <span style={{ fontSize: 11, color: "#BBB", fontWeight: 500, marginLeft: 4 }}>— {summary}</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "#BBB", fontWeight: 600, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: "4px 16px 16px", borderTop: "1px solid #F5F5F5", animation: "fadeUp 0.2s ease" }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   ONBOARDING (3 steps)
   ═══════════════════════════════════════ */
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    leeftijd: 30, pensioenLeeftijd: 60, samenwonend: true,
    nettoInkomen: 3500, maandUitgaven: 2200,
    hypotheekPerMaand: 900, hypotheekEindjaar: 2045,
    huidigVermogen: 25000, maandInleg: 500,
    pensioenUitkering: 800, pensioenbeleggen: 0,
    rendement: 7, inflatie: 2.5
  });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));

  const steps = [
    {
      title: "Over jou 👋",
      sub: "Een paar basisgegevens om je plan persoonlijk te maken.",
      content: (
        <div>
          <Slider label="Hoe oud ben je?" value={d.leeftijd} onChange={v => set("leeftijd", v)} min={18} max={65} format={v => `${v} jaar`} />
          <Slider label="Wanneer wil je stoppen met werken?" value={d.pensioenLeeftijd} onChange={v => set("pensioenLeeftijd", v)} min={40} max={70} format={v => `${v} jaar`} />
          <div style={{ marginTop: 4, marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6, fontFamily: "var(--f)" }}>Woonsituatie</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ v: true, l: "Samenwonend" }, { v: false, l: "Alleenstaand" }].map(o => (
                <button key={String(o.v)} onClick={() => set("samenwonend", o.v)} style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, border: `1.5px solid ${d.samenwonend === o.v ? "#111" : "#EBEBEB"}`,
                  background: d.samenwonend === o.v ? "#111" : "#fff", color: d.samenwonend === o.v ? "#fff" : "#AAA",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--f)", transition: "all 0.15s"
                }}>{o.l}</button>
              ))}
            </div>
          </div>
          <div style={{ background: "#F6F6F4", borderRadius: 8, padding: "10px 12px", marginTop: 4, fontSize: 11, color: "#999", fontFamily: "var(--f)", lineHeight: 1.5 }}>
            💡 We vragen straks naar je inkomen en uitgaven om te berekenen hoeveel je kunt beleggen en wat je nodig hebt na pensioen. <strong style={{ color: "#777" }}>Alles blijft in je browser.</strong>
          </div>
        </div>
      )
    },
    {
      title: "Geld in & uit 💰",
      sub: "Hiermee berekenen we je besparingspotentieel en pensioendoel.",
      content: (
        <div>
          <Field label="Netto maandinkomen" value={d.nettoInkomen} onChange={v => set("nettoInkomen", v)} prefix="€" info="inkomen" hint="Wat je maandelijks op je rekening krijgt" />
          <Field label="Totale maandelijkse uitgaven" value={d.maandUitgaven} onChange={v => set("maandUitgaven", v)} prefix="€" info="uitgaven" hint="Inclusief hypotheek/huur" />
          <div style={{ borderTop: "1px solid #F0F0F0", marginTop: 8, paddingTop: 12, marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, fontFamily: "var(--f)" }}>Hypotheek <Info tip="hypotheek" /></div>
          </div>
          <Field label="Hypotheeklasten per maand" value={d.hypotheekPerMaand} onChange={v => set("hypotheekPerMaand", v)} prefix="€" />
          <Field label="Hypotheek afgelost in (jaar)" value={d.hypotheekEindjaar} onChange={v => set("hypotheekEindjaar", v)} />
          <div style={{ background: "#F6F6F4", borderRadius: 8, padding: "12px 14px", marginTop: 4 }}>
            <div style={{ fontSize: 11, color: "#999", fontFamily: "var(--f)", marginBottom: 4 }}>Na hypotheek-aflossing dalen je uitgaven naar:</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#111", fontFamily: "var(--f)" }}>{fmt(Math.max(0, d.maandUitgaven - d.hypotheekPerMaand))}<span style={{ fontSize: 12, fontWeight: 500, color: "#BBB" }}> /maand</span></div>
          </div>
        </div>
      )
    },
    {
      title: "Vermogen & pensioen 📊",
      sub: "Wat heb je nu, wat bouw je op, en welke aannames gebruiken we?",
      content: (
        <div>
          <Field label="Huidig totaal vermogen" value={d.huidigVermogen} onChange={v => set("huidigVermogen", v)} prefix="€" hint="Spaargeld + beleggingen + overig" />
          <Field label="Maandelijkse inleg in beleggingen" value={d.maandInleg} onChange={v => set("maandInleg", v)} prefix="€" />
          <div style={{ borderTop: "1px solid #F0F0F0", marginTop: 8, paddingTop: 12, marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, fontFamily: "var(--f)" }}>Pensioenopbouw</div>
          </div>
          <Field label="Werkgeverspensioen (geschat)" value={d.pensioenUitkering} onChange={v => set("pensioenUitkering", v)} prefix="€" suffix="/mnd" hint="Staat op je loonstrook of UPO" />
          <Field label="Eigen pensioenbeleggen" value={d.pensioenbeleggen} onChange={v => set("pensioenbeleggen", v)} prefix="€" suffix="/mnd" info="pensioenbeleggen" hint="Lijfrente, pensioenrekening — 0 als je dit niet doet" />
          <div style={{ borderTop: "1px solid #F0F0F0", marginTop: 12, paddingTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, fontFamily: "var(--f)" }}>Aannames</div>
          </div>
          <Slider label="Verwacht jaarlijks rendement" value={d.rendement} onChange={v => set("rendement", v)} min={1} max={12} step={0.5} format={v => `${v}%`} info="rendement" />
          <Slider label="Verwachte inflatie" value={d.inflatie} onChange={v => set("inflatie", v)} min={0} max={6} step={0.5} format={v => `${v}%`} info="inflatie" />
        </div>
      )
    }
  ];

  const s = steps[step];
  return (
    <div style={{ minHeight: "100vh", background: "#F6F6F4", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "var(--f)" }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 16, padding: "28px 24px", border: "1px solid #F0F0F0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>{steps.map((_, i) => (<div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? "#111" : "#EBEBEB", transition: "background 0.3s" }} />))}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#BBB", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, fontFamily: "var(--f)" }}>Stap {step + 1} van {steps.length}</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#111", marginBottom: 6, letterSpacing: "-0.03em", fontFamily: "var(--f)", margin: "0 0 6px" }}>{s.title}</h2>
        <p style={{ fontSize: 13, color: "#999", lineHeight: 1.5, marginBottom: 20, fontFamily: "var(--f)", margin: "0 0 20px" }}>{s.sub}</p>
        {s.content}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {step > 0 && <button onClick={() => setStep(step - 1)} style={{ padding: "11px 20px", borderRadius: 8, border: "1.5px solid #EBEBEB", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#999", fontFamily: "var(--f)" }}>Terug</button>}
          <button onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete(d)} style={{ flex: 1, padding: "11px 20px", borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--f)" }}>
            {step < steps.length - 1 ? "Volgende →" : "Start mijn plan 🚀"}
          </button>
        </div>
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
  const [tab, setTab] = useState("groei");
  const [editOpen, setEditOpen] = useState(false);

  const [leeftijd, setLeeftijd] = useState(30);
  const [pensioenLeeftijd, setPensioenLeeftijd] = useState(60);
  const [nettoInkomen, setNettoInkomen] = useState(3500);
  const [maandUitgaven, setMaandUitgaven] = useState(2200);
  const [huidigVermogen, setHuidigVermogen] = useState(45000);
  const [maandInleg, setMaandInleg] = useState(800);
  const [rendement, setRendement] = useState(7);
  const [inflatie, setInflatie] = useState(2.5);
  const [pensioenUitkering, setPensioenUitkering] = useState(800);
  const [pensioenbeleggen, setPensioenbeleggen] = useState(0);
  const [samenwonend, setSamenwonend] = useState(true);
  const [hypotheekPerMaand, setHypotheekPerMaand] = useState(900);
  const [hypotheekEindjaar, setHypotheekEindjaar] = useState(2045);
  const [scenExtra, setScenExtra] = useState(200);
  const [scenRend, setScenRend] = useState(5);

  const allState = { leeftijd, pensioenLeeftijd, nettoInkomen, maandUitgaven, huidigVermogen, maandInleg, rendement, inflatie, pensioenUitkering, pensioenbeleggen, samenwonend, hypotheekPerMaand, hypotheekEindjaar };
  const currentYear = new Date().getFullYear();
  const hypotheekAflosLeeftijd = leeftijd + (hypotheekEindjaar - currentYear);
  const uitgavenNaHypotheek = Math.max(0, maandUitgaven - hypotheekPerMaand);

  useEffect(() => {
    const d = load();
    if (d && d.leeftijd) {
      const setters = { leeftijd: setLeeftijd, pensioenLeeftijd: setPensioenLeeftijd, nettoInkomen: setNettoInkomen, maandUitgaven: setMaandUitgaven, huidigVermogen: setHuidigVermogen, maandInleg: setMaandInleg, rendement: setRendement, inflatie: setInflatie, pensioenUitkering: setPensioenUitkering, pensioenbeleggen: setPensioenbeleggen, samenwonend: setSamenwonend, hypotheekPerMaand: setHypotheekPerMaand, hypotheekEindjaar: setHypotheekEindjaar };
      Object.entries(d).forEach(([k, v]) => { if (setters[k] && v !== undefined) setters[k](v); });
      setReady(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (ready) save(allState); }, [leeftijd, pensioenLeeftijd, nettoInkomen, maandUitgaven, huidigVermogen, maandInleg, rendement, inflatie, pensioenUitkering, pensioenbeleggen, samenwonend, hypotheekPerMaand, hypotheekEindjaar]);

  const handleOnboard = useCallback((d) => {
    setLeeftijd(d.leeftijd); setPensioenLeeftijd(d.pensioenLeeftijd);
    setNettoInkomen(d.nettoInkomen); setMaandUitgaven(d.maandUitgaven);
    setHuidigVermogen(d.huidigVermogen); setMaandInleg(d.maandInleg);
    setRendement(d.rendement); setInflatie(d.inflatie);
    setPensioenUitkering(d.pensioenUitkering); setPensioenbeleggen(d.pensioenbeleggen);
    setSamenwonend(d.samenwonend);
    setHypotheekPerMaand(d.hypotheekPerMaand); setHypotheekEindjaar(d.hypotheekEindjaar);
    setReady(true);
  }, []);

  // Close edit panel when switching tabs
  useEffect(() => { setEditOpen(false); }, [tab]);

  const savRate = nettoInkomen > 0 ? ((nettoInkomen - maandUitgaven) / nettoInkomen) * 100 : 0;
  const aowM = samenwonend ? AOW_SAMEN : AOW_ALLEEN;
  const getUitgaven = useCallback((age) => age >= hypotheekAflosLeeftijd ? uitgavenNaHypotheek : maandUitgaven, [hypotheekAflosLeeftijd, uitgavenNaHypotheek, maandUitgaven]);

  const pensioenbeleggenPot = useMemo(() => {
    if (pensioenbeleggen <= 0) return 0;
    let v = 0;
    for (let i = 0; i < Math.max(0, AOW_AGE - leeftijd); i++) v = v * (1 + rendement / 100) + pensioenbeleggen * 12;
    return v;
  }, [pensioenbeleggen, rendement, leeftijd]);
  const pbUitkering = pensioenbeleggenPot > 0 ? Math.round(pensioenbeleggenPot / (20 * 12)) : 0;

  const groeiData = useMemo(() => {
    const d = []; let v = huidigVermogen, inl = huidigVermogen;
    for (let a = leeftijd; a <= 80; a++) {
      d.push({ leeftijd: a, vermogen: Math.round(v), inleg: Math.round(inl), rendement_deel: Math.round(Math.max(0, v - inl)) });
      if (a < pensioenLeeftijd) { v = v * (1 + rendement / 100) + maandInleg * 12; inl += maandInleg * 12; }
      else { const u = getUitgaven(a) * 12; const aow = a >= AOW_AGE ? aowM * 12 : 0; const pen = a >= AOW_AGE ? (pensioenUitkering + pbUitkering) * 12 : 0; v = Math.max(0, v * (1 + rendement / 100 * 0.5) - Math.max(0, u - aow - pen)); }
    }
    return d;
  }, [leeftijd, pensioenLeeftijd, huidigVermogen, maandInleg, rendement, getUitgaven, pensioenUitkering, pbUitkering, aowM]);

  const fireData = useMemo(() => {
    const ltU = uitgavenNaHypotheek * 12; const fn = ltU * 25; const lf = ltU * 0.7 * 25;
    let v = huidigVermogen, fa = null, la = null;
    for (let a = leeftijd; a <= 80; a++) { if (v >= lf && !la) la = a; if (v >= fn && !fa) { fa = a; break; } v = v * (1 + rendement / 100) + maandInleg * 12; }
    return { fn, lf, fa, la, yr: fa ? fa - leeftijd : null };
  }, [uitgavenNaHypotheek, huidigVermogen, maandInleg, rendement, leeftijd]);

  const pensioenGat = useMemo(() => {
    const uitg = getUitgaven(AOW_AGE); const totP = aowM + pensioenUitkering + pbUitkering; const gat = Math.max(0, uitg - totP);
    const vbp = groeiData.find(d => d.leeftijd === pensioenLeeftijd)?.vermogen || 0;
    const obr = pensioenLeeftijd < AOW_AGE ? AOW_AGE - pensioenLeeftijd : 0;
    let v = vbp, jr = 0;
    for (let i = 0; i < 50; i++) { const a = pensioenLeeftijd + i; const u = getUitgaven(a) * 12; const aow = a >= AOW_AGE ? aowM * 12 : 0; const pen = a >= AOW_AGE ? (pensioenUitkering + pbUitkering) * 12 : 0; v = v * (1 + rendement / 100 * 0.4) - Math.max(0, u - aow - pen); if (v <= 0) break; jr++; }
    return { uitg, totP, gat, vbp, obr, jr,
      bars: [{ name: "AOW", bedrag: aowM }, { name: "Werkgever", bedrag: pensioenUitkering }, ...(pbUitkering > 0 ? [{ name: "Eigen pensioen", bedrag: pbUitkering }] : []), { name: "Tekort", bedrag: gat }]
    };
  }, [aowM, pensioenUitkering, pbUitkering, getUitgaven, groeiData, pensioenLeeftijd, rendement]);

  const scenarioData = useMemo(() => {
    let v1 = huidigVermogen, v2 = huidigVermogen, v3 = huidigVermogen;
    return Array.from({ length: Math.max(1, 71 - leeftijd) }, (_, i) => {
      const a = leeftijd + i; const r = { leeftijd: a, basis: Math.round(v1), extra: Math.round(v2), pessimist: Math.round(v3) };
      v1 = v1 * (1 + rendement / 100) + maandInleg * 12; v2 = v2 * (1 + rendement / 100) + (maandInleg + scenExtra) * 12; v3 = v3 * (1 + scenRend / 100) + maandInleg * 12;
      return r;
    });
  }, [huidigVermogen, leeftijd, maandInleg, rendement, scenExtra, scenRend]);

  const box3 = Math.round(Math.max(0, huidigVermogen - 57000) * 0.0624 * 0.36);
  const jaarruimte = Math.min(Math.max(0, nettoInkomen * 12 * 1.35 * 0.3 - pensioenUitkering * 12 * 8 - 14714), 34550);

  if (loading) return <div style={{ minHeight: "100vh", background: "#F6F6F4", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 14, color: "#BBB" }}>Laden...</div></div>;
  if (!ready) return <><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" /><style>{`:root{--f:'Outfit',sans-serif}@keyframes tipIn{from{opacity:0;transform:translateX(-50%) translateY(4px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style><Onboarding onComplete={handleOnboard} /></>;

  const TABS = [
    { id: "groei", l: "Vermogensgroei", s: "📈 Groei" },
    { id: "fire", l: "FIRE Calculator", s: "🔥 FIRE" },
    { id: "pensioen", l: "Pensioen-gat", s: "🏦 Pensioen" },
    { id: "scenario", l: "Scenario's", s: "🔀 Scenario" },
  ];

  /* ═══ CONTEXTUAL EDIT PANELS PER TAB ═══ */
  const editPanels = {
    groei: {
      title: "Gegevens aanpassen",
      summary: `${leeftijd}j · ${fmt(huidigVermogen)} vermogen · ${fmt(maandInleg)}/m inleg`,
      content: (
        <div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Slider compact label="Leeftijd" value={leeftijd} onChange={setLeeftijd} min={18} max={65} format={v => `${v} jaar`} />
            <Slider compact label="Pensioenleeftijd" value={pensioenLeeftijd} onChange={setPensioenLeeftijd} min={40} max={70} format={v => `${v} jaar`} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field compact label="Netto inkomen" value={nettoInkomen} onChange={setNettoInkomen} prefix="€" info="inkomen" />
            <Field compact label="Maanduitgaven" value={maandUitgaven} onChange={setMaandUitgaven} prefix="€" />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field compact label="Huidig vermogen" value={huidigVermogen} onChange={setHuidigVermogen} prefix="€" />
            <Field compact label="Maandelijkse inleg" value={maandInleg} onChange={setMaandInleg} prefix="€" />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Slider compact label="Rendement" value={rendement} onChange={setRendement} min={1} max={12} step={0.5} format={v => `${v}%`} info="rendement" />
            <Slider compact label="Inflatie" value={inflatie} onChange={setInflatie} min={0} max={6} step={0.5} format={v => `${v}%`} info="inflatie" />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", borderTop: "1px solid #F5F5F5", paddingTop: 10, marginTop: 4 }}>
            <Field compact label="Hypotheek" value={hypotheekPerMaand} onChange={setHypotheekPerMaand} prefix="€" suffix="/mnd" info="hypotheek" />
            <Field compact label="Afgelost in" value={hypotheekEindjaar} onChange={setHypotheekEindjaar} />
          </div>
        </div>
      )
    },
    fire: {
      title: "Gegevens aanpassen",
      summary: `${fmt(maandUitgaven)}/m uitgaven · ${fmt(maandInleg)}/m inleg · ${rendement}% rendement`,
      content: (
        <div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field compact label="Maanduitgaven" value={maandUitgaven} onChange={setMaandUitgaven} prefix="€" info="uitgaven" />
            <Field compact label="Huidig vermogen" value={huidigVermogen} onChange={setHuidigVermogen} prefix="€" />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field compact label="Maandelijkse inleg" value={maandInleg} onChange={setMaandInleg} prefix="€" />
            <Field compact label="Netto inkomen" value={nettoInkomen} onChange={setNettoInkomen} prefix="€" info="inkomen" />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Slider compact label="Rendement" value={rendement} onChange={setRendement} min={1} max={12} step={0.5} format={v => `${v}%`} info="rendement" />
            <Field compact label="Hypotheek" value={hypotheekPerMaand} onChange={setHypotheekPerMaand} prefix="€" suffix="/mnd" info="hypotheek" />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field compact label="Hypotheek afgelost in" value={hypotheekEindjaar} onChange={setHypotheekEindjaar} />
            <Slider compact label="Leeftijd" value={leeftijd} onChange={setLeeftijd} min={18} max={65} format={v => `${v} jaar`} />
          </div>
        </div>
      )
    },
    pensioen: {
      title: "Gegevens aanpassen",
      summary: `${fmt(pensioenUitkering)}/m werkgever · ${fmt(pensioenbeleggen)}/m eigen · ${samenwonend ? "samen" : "alleen"}`,
      content: (
        <div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Slider compact label="Leeftijd" value={leeftijd} onChange={setLeeftijd} min={18} max={65} format={v => `${v} jaar`} />
            <Slider compact label="Pensioenleeftijd" value={pensioenLeeftijd} onChange={setPensioenLeeftijd} min={40} max={70} format={v => `${v} jaar`} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field compact label="Maanduitgaven" value={maandUitgaven} onChange={setMaandUitgaven} prefix="€" />
            <Field compact label="Werkgeverspensioen" value={pensioenUitkering} onChange={setPensioenUitkering} prefix="€" suffix="/mnd" />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field compact label="Eigen pensioenbeleggen" value={pensioenbeleggen} onChange={setPensioenbeleggen} prefix="€" suffix="/mnd" info="pensioenbeleggen" />
            <Field compact label="Huidig vermogen" value={huidigVermogen} onChange={setHuidigVermogen} prefix="€" />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field compact label="Hypotheek" value={hypotheekPerMaand} onChange={setHypotheekPerMaand} prefix="€" suffix="/mnd" />
            <Field compact label="Afgelost in" value={hypotheekEindjaar} onChange={setHypotheekEindjaar} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", borderTop: "1px solid #F5F5F5", paddingTop: 10, marginTop: 4 }}>
            <div style={{ flex: "1 1 180px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6, fontFamily: "var(--f)" }}>Situatie</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ v: true, l: "Samen" }, { v: false, l: "Alleen" }].map(o => (
                  <button key={String(o.v)} onClick={() => setSamenwonend(o.v)} style={{
                    flex: 1, padding: "6px 0", borderRadius: 6, border: `1.5px solid ${samenwonend === o.v ? "#111" : "#EBEBEB"}`,
                    background: samenwonend === o.v ? "#111" : "#fff", color: samenwonend === o.v ? "#fff" : "#AAA",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--f)"
                  }}>{o.l}</button>
                ))}
              </div>
            </div>
            <Slider compact label="Rendement" value={rendement} onChange={setRendement} min={1} max={12} step={0.5} format={v => `${v}%`} />
          </div>
        </div>
      )
    },
    scenario: {
      title: "Gegevens aanpassen",
      summary: `${fmt(huidigVermogen)} vermogen · ${fmt(maandInleg)}/m · ${rendement}%`,
      content: (
        <div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field compact label="Huidig vermogen" value={huidigVermogen} onChange={setHuidigVermogen} prefix="€" />
            <Field compact label="Maandelijkse inleg" value={maandInleg} onChange={setMaandInleg} prefix="€" />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Slider compact label="Basis rendement" value={rendement} onChange={setRendement} min={1} max={12} step={0.5} format={v => `${v}%`} />
            <Slider compact label="Leeftijd" value={leeftijd} onChange={setLeeftijd} min={18} max={65} format={v => `${v} jaar`} />
          </div>
        </div>
      )
    }
  };

  const ep = editPanels[tab];

  return (
    <div style={{ "--f": "'Outfit', sans-serif", minHeight: "100vh", background: "#F6F6F4", fontFamily: "var(--f)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        :root{--f:'Outfit',sans-serif}*{box-sizing:border-box;margin:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tipIn{from{opacity:0;transform:translateX(-50%) translateY(4px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .fu{animation:fadeUp 0.35s ease forwards}
        @media(max-width:768px){.dsk{display:none!important}}
        @media(min-width:769px){.mob{display:none!important}}
      `}</style>

      {/* HEADER */}
      <header style={{ background: "#fff", borderBottom: "1px solid #EBEBEB", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 900 }}>F</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#111", letterSpacing: "-0.04em" }}>FirePlan</span>
        </div>
        <nav className="dsk" style={{ display: "flex", gap: 1, background: "#F6F6F4", borderRadius: 8, padding: 3 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "var(--f)", transition: "all 0.15s", color: tab === t.id ? "#111" : "#BBB", background: tab === t.id ? "#fff" : "transparent", boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}>{t.l}</button>
          ))}
        </nav>
        <button onClick={() => setReady(false)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #EBEBEB", background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#CCC", fontFamily: "var(--f)" }}>🔄 Reset</button>
      </header>

      {/* Mobile tabs */}
      <div className="mob" style={{ display: "flex", gap: 4, padding: "8px 12px", overflowX: "auto", background: "#fff", borderBottom: "1px solid #F0F0F0" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: 12, fontWeight: 700, fontFamily: "var(--f)", color: tab === t.id ? "#fff" : "#BBB", background: tab === t.id ? "#111" : "#F6F6F4" }}>{t.s}</button>
        ))}
      </div>

      {/* MAIN CONTENT — single column, no side panel */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* EDIT PANEL — always at top of each tab */}
        <EditPanel title={ep.title} open={editOpen} onToggle={() => setEditOpen(!editOpen)} summary={ep.summary}>
          {ep.content}
        </EditPanel>

        {/* ═══ GROEI TAB ═══ */}
        {tab === "groei" && <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="fu">
            <Metric label="Huidig vermogen" value={fmt(huidigVermogen)} info="compound" />
            <Metric label={`Vermogen op ${pensioenLeeftijd}`} value={fmt(groeiData.find(d => d.leeftijd === pensioenLeeftijd)?.vermogen || 0)} accent="#111" sub={`Over ${pensioenLeeftijd - leeftijd} jaar`} />
            <Metric label="Jaarlijkse inleg" value={fmt(maandInleg * 12)} sub={`${fmt(maandInleg)} × 12`} />
          </div>
          <SavingsGrade rate={savRate} />
          {hypotheekPerMaand > 0 && (
            <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #F0F0F0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }} className="fu">
              <div>
                <div style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 700, color: "#BBB", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3, fontFamily: "var(--f)" }}>Hypotheek impact <Info tip="hypotheek" /></div>
                <div style={{ fontSize: 12, color: "#777", fontFamily: "var(--f)" }}>Uitgaven dalen naar <strong style={{ color: "#111" }}>{fmt(uitgavenNaHypotheek)}</strong>/mnd op leeftijd {hypotheekAflosLeeftijd}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#16A34A", fontFamily: "var(--f)" }}>-{fmt(hypotheekPerMaand)}</div>
                <div style={{ fontSize: 10, color: "#CCC", fontFamily: "var(--f)" }}>/mnd na aflossing</div>
              </div>
            </div>
          )}
          <div style={{ background: "#fff", borderRadius: 10, padding: "18px 14px", border: "1px solid #F0F0F0" }} className="fu">
            <div style={{ display: "flex", alignItems: "center", fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 14, fontFamily: "var(--f)" }}>Vermogensprojectie <Info tip="compound" /></div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={groeiData}>
                <defs>
                  <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4D4D4" stopOpacity={0.4}/><stop offset="100%" stopColor="#D4D4D4" stopOpacity={0.05}/></linearGradient>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#111" stopOpacity={0.12}/><stop offset="100%" stopColor="#111" stopOpacity={0.01}/></linearGradient>
                </defs>
                <CartesianGrid stroke="#F5F5F5" vertical={false}/><XAxis dataKey="leeftijd" tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={fmtS} tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/><Tooltip content={<ChartTip/>}/>
                <ReferenceLine x={pensioenLeeftijd} stroke="#111" strokeDasharray="4 4" strokeWidth={1} label={{ value: "Pensioen", position: "top", fontSize: 10, fill: "#999" }}/>
                <ReferenceLine x={AOW_AGE} stroke="#DDD" strokeDasharray="3 3" label={{ value: "AOW", position: "top", fontSize: 10, fill: "#CCC" }}/>
                {hypotheekAflosLeeftijd > leeftijd && hypotheekAflosLeeftijd < 80 && <ReferenceLine x={hypotheekAflosLeeftijd} stroke="#16A34A" strokeDasharray="3 3" label={{ value: "Hypotheek vrij", position: "top", fontSize: 9, fill: "#16A34A" }}/>}
                <Area type="monotone" dataKey="inleg" stackId="1" stroke="none" fill="url(#gI)" name="Eigen inleg"/>
                <Area type="monotone" dataKey="rendement_deel" stackId="1" stroke="none" fill="url(#gR)" name="Rendement"/>
                <Area type="monotone" dataKey="vermogen" stroke="#111" fill="none" name="Totaal" strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 160px", background: "#FAFAFA", borderRadius: 8, padding: "10px 14px", border: "1px solid #F0F0F0" }}>
              <div style={{ display: "flex", alignItems: "center", fontSize: 9, fontWeight: 700, color: "#BBB", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 2, fontFamily: "var(--f)" }}>Box 3 <Info tip="box3" /></div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111", fontFamily: "var(--f)" }}>{fmt(box3)}<span style={{ fontWeight: 500, color: "#CCC" }}>/jaar</span></div>
            </div>
            <div style={{ flex: "1 1 160px", background: "#FAFAFA", borderRadius: 8, padding: "10px 14px", border: "1px solid #F0F0F0" }}>
              <div style={{ display: "flex", alignItems: "center", fontSize: 9, fontWeight: 700, color: "#BBB", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 2, fontFamily: "var(--f)" }}>Jaarruimte <Info tip="jaarruimte" /></div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111", fontFamily: "var(--f)" }}>{fmt(jaarruimte)}</div>
            </div>
          </div>
        </>}

        {/* ═══ FIRE TAB ═══ */}
        {tab === "fire" && <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="fu">
            <Metric label="FIRE Number" value={fmt(fireData.fn)} sub="25× jaaruitgaven (na hypotheek)" info="vierprocentregel" />
            <Metric label="FIRE Leeftijd" value={fireData.fa ? `${fireData.fa}` : "75+"} accent="#111" sub={fireData.yr ? `Nog ${fireData.yr} jaar` : "Verhoog inleg"} info="fire" />
            <Metric label="Lean FIRE" value={fmt(fireData.lf)} sub={fireData.la ? `Leeftijd ${fireData.la}` : "—"} info="leanfire" />
          </div>
          <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #F0F0F0", fontSize: 11, color: "#999", fontFamily: "var(--f)", lineHeight: 1.6 }} className="fu">
            💡 Je FIRE number is gebaseerd op uitgaven <strong>na hypotheek-aflossing</strong> ({fmt(uitgavenNaHypotheek)}/mnd). Zonder woonlasten is FIRE realistischer dan het lijkt.
          </div>
          <div style={{ background: "#fff", borderRadius: 10, padding: "18px 14px", border: "1px solid #F0F0F0" }} className="fu">
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 14, fontFamily: "var(--f)" }}>Pad naar FIRE</div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={groeiData.filter(d => d.leeftijd <= 75)}>
                <defs><linearGradient id="gF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#111" stopOpacity={0.08}/><stop offset="100%" stopColor="#111" stopOpacity={0.01}/></linearGradient></defs>
                <CartesianGrid stroke="#F5F5F5" vertical={false}/><XAxis dataKey="leeftijd" tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={fmtS} tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/><Tooltip content={<ChartTip/>}/>
                <Area type="monotone" dataKey="vermogen" stroke="#111" fill="url(#gF)" name="Vermogen" strokeWidth={2}/>
                <ReferenceLine y={fireData.lf} stroke="#CCC" strokeDasharray="6 3" label={{ value: `Lean ${fmtS(fireData.lf)}`, position: "right", fontSize: 10, fill: "#CCC" }}/>
                <ReferenceLine y={fireData.fn} stroke="#111" strokeDasharray="6 3" label={{ value: `FIRE ${fmtS(fireData.fn)}`, position: "right", fontSize: 10, fill: "#111" }}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>}

        {/* ═══ PENSIOEN TAB ═══ */}
        {tab === "pensioen" && <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="fu">
            <Metric label="Gewenst inkomen" value={fmt(pensioenGat.uitg)} sub={pensioenGat.uitg < maandUitgaven ? "Na hypotheek" : "Huidig"} />
            <Metric label="Pensioen-gat" value={fmt(pensioenGat.gat)} sub="Maandelijks tekort" accent={pensioenGat.gat > 0 ? "#DC2626" : "#16A34A"} />
            <Metric label={`Vermogen op ${pensioenLeeftijd}`} value={fmt(pensioenGat.vbp)} accent="#111" />
            <Metric label="Reikt tot leeftijd" value={`${pensioenLeeftijd + pensioenGat.jr}`} sub={`${pensioenGat.jr} jaar`} accent={pensioenGat.jr >= 30 ? "#16A34A" : "#D97706"} />
          </div>
          {pensioenGat.obr > 0 && (
            <div style={{ background: "#FFF5F5", borderRadius: 10, padding: "14px 18px", border: "1px solid #FEE2E2" }} className="fu">
              <div style={{ fontSize: 12, fontWeight: 800, color: "#DC2626", marginBottom: 4, fontFamily: "var(--f)" }}>⚠ Overbrugging: {pensioenGat.obr} jaar zonder AOW</div>
              <div style={{ fontSize: 12, color: "#7F1D1D", fontFamily: "var(--f)" }}>Kosten: <strong>{fmt(pensioenGat.obr * getUitgaven(pensioenLeeftijd) * 12)}</strong></div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }} className="fu">
            <div style={{ flex: "1 1 260px", background: "#fff", borderRadius: 10, padding: "18px 14px", border: "1px solid #F0F0F0" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 14, fontFamily: "var(--f)" }}>Inkomen na pensioen</div>
              <ResponsiveContainer width="100%" height={Math.max(180, pensioenGat.bars.length * 50)}>
                <BarChart data={pensioenGat.bars} layout="vertical" barSize={22}>
                  <CartesianGrid stroke="#F5F5F5" horizontal={false}/><XAxis type="number" tickFormatter={v => `€${v}`} tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#999", fontWeight: 600 }} width={90} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v => fmt(v)}/><Bar dataKey="bedrag" radius={[0, 4, 4, 0]} fill="#111">{pensioenGat.bars.map((e, i) => (<rect key={i} fill={e.name === "Tekort" ? "#EBEBEB" : i === 2 && pbUitkering > 0 ? "#777" : "#111"} />))}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: "1 1 260px", background: "#fff", borderRadius: 10, padding: "18px 14px", border: "1px solid #F0F0F0" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 14, fontFamily: "var(--f)" }}>Opbouw maandinkomen</div>
              {[
                { l: "AOW-uitkering", v: aowM, n: samenwonend ? "Samenwonend" : "Alleenstaand", c: "#111" },
                { l: "Werkgeverspensioen", v: pensioenUitkering, n: "Geschat", c: "#777" },
                ...(pbUitkering > 0 ? [{ l: "Eigen pensioenbeleggen", v: pbUitkering, n: `Pot: ${fmtS(pensioenbeleggenPot)}`, c: "#444" }] : []),
                { l: "Eigen vermogen (4%)", v: Math.round(pensioenGat.vbp * 0.04 / 12), n: "Veilige onttrekking", c: "#BBB" },
              ].map((r, i) => (
                <div key={r.l} style={{ display: "flex", alignItems: "center", padding: "9px 0", borderTop: i > 0 ? "1px solid #F5F5F5" : "none" }}>
                  <div style={{ width: 3, height: 26, borderRadius: 2, background: r.c, marginRight: 10 }} />
                  <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#111", fontFamily: "var(--f)" }}>{r.l}</div><div style={{ fontSize: 10, color: "#CCC", fontFamily: "var(--f)" }}>{r.n}</div></div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111", fontFamily: "var(--f)" }}>{fmt(r.v)}</div>
                </div>
              ))}
              <div style={{ borderTop: "2px solid #111", marginTop: 6, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#111", fontFamily: "var(--f)" }}>Totaal</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: "#111", fontFamily: "var(--f)" }}>
                  {fmt(aowM + pensioenUitkering + pbUitkering + Math.round(pensioenGat.vbp * 0.04 / 12))}<span style={{ fontSize: 10, color: "#CCC" }}>/mnd</span>
                </span>
              </div>
            </div>
          </div>
        </>}

        {/* ═══ SCENARIO TAB ═══ */}
        {tab === "scenario" && <>
          <div style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", border: "1px solid #F0F0F0", display: "flex", gap: 20, flexWrap: "wrap" }} className="fu">
            <div style={{ flex: "1 1 200px" }}><Slider label="Extra maandelijkse inleg" value={scenExtra} onChange={setScenExtra} min={0} max={1000} step={50} format={v => `€${v}`} /></div>
            <div style={{ flex: "1 1 200px" }}><Slider label="Pessimistisch rendement" value={scenRend} onChange={setScenRend} min={0} max={10} step={0.5} format={v => `${v}%`} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="fu">
            <Metric label="Basis" value={fmt(scenarioData[scenarioData.length-1]?.basis || 0)} sub={`${rendement}% — €${maandInleg}/m`} />
            <Metric label="Extra inleg" value={fmt(scenarioData[scenarioData.length-1]?.extra || 0)} accent="#16A34A" sub={`+€${scenExtra}/m`} />
            <Metric label="Pessimistisch" value={fmt(scenarioData[scenarioData.length-1]?.pessimist || 0)} accent="#D97706" sub={`${scenRend}%`} />
          </div>
          <div style={{ background: "#fff", borderRadius: 10, padding: "18px 14px", border: "1px solid #F0F0F0" }} className="fu">
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 14, fontFamily: "var(--f)" }}>Scenario vergelijking</div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={scenarioData}>
                <CartesianGrid stroke="#F5F5F5" vertical={false}/><XAxis dataKey="leeftijd" tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={fmtS} tick={{ fontSize: 10, fill: "#CCC" }} axisLine={false} tickLine={false}/><Tooltip content={<ChartTip/>}/>
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--f)" }}/>
                <Line type="monotone" dataKey="pessimist" stroke="#DDD" name="Pessimistisch" strokeWidth={1.5} dot={false} strokeDasharray="6 3"/>
                <Line type="monotone" dataKey="basis" stroke="#111" name="Basis" strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="extra" stroke="#16A34A" name="Extra inleg" strokeWidth={1.5} dot={false} strokeDasharray="6 3"/>
                <ReferenceLine y={fireData.fn} stroke="#EEE" strokeDasharray="4 4" label={{ value: "FIRE", position: "right", fontSize: 10, fill: "#DDD" }}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="fu">
            <div style={{ flex: "1 1 200px", background: "#F6FFF6", borderRadius: 10, padding: "16px 18px", border: "1px solid #D5F5D5" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", marginBottom: 3, fontFamily: "var(--f)" }}>🚀 IMPACT EXTRA INLEG</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#16A34A", fontFamily: "var(--f)" }}>+{fmt((scenarioData[scenarioData.length-1]?.extra||0)-(scenarioData[scenarioData.length-1]?.basis||0))}</div>
            </div>
            <div style={{ flex: "1 1 200px", background: "#FFFBF0", borderRadius: 10, padding: "16px 18px", border: "1px solid #F0E4C0" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#D97706", marginBottom: 3, fontFamily: "var(--f)" }}>📉 DOWNSIDE RISK</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#D97706", fontFamily: "var(--f)" }}>{fmt((scenarioData[scenarioData.length-1]?.pessimist||0)-(scenarioData[scenarioData.length-1]?.basis||0))}</div>
            </div>
          </div>
        </>}
      </div>

      <footer style={{ textAlign: "center", padding: "10px 20px 16px", color: "#DDD", fontSize: 10, fontFamily: "var(--f)" }}>
        ⚠️ Indicatieve berekening — raadpleeg een financieel adviseur · Rendementen bieden geen garantie
      </footer>
    </div>
  );
}
