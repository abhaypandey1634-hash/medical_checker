import { useState, useRef, useEffect } from "react";

const BODY_SYSTEMS = [
  { id: "head", label: "Head & Neck", icon: "ti-brain" },
  { id: "chest", label: "Chest & Heart", icon: "ti-heartbeat" },
  { id: "abdomen", label: "Abdomen & Gut", icon: "ti-circle" },
  { id: "limbs", label: "Limbs & Joints", icon: "ti-run" },
  { id: "skin", label: "Skin & Hair", icon: "ti-user" },
  { id: "general", label: "General / Whole Body", icon: "ti-thermometer" },
];

const DURATION_OPTIONS = ["< 24 hours", "1–3 days", "4–7 days", "1–4 weeks", "> 1 month"];
const SEVERITY_LABELS = ["Mild", "Moderate", "Significant", "Severe", "Extreme"];

function Badge({ color, children }) {
  const colors = {
    green: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" },
    amber: { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27" },
    red: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" },
    blue: { bg: "#E6F1FB", text: "#185FA5", border: "#85B7EB" },
    gray: { bg: "#F1EFE8", text: "#5F5E5A", border: "#B4B2A9" },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 500,
      background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
    }}>{children}</span>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
      <div style={{
        width: 32, height: 32, border: "2.5px solid #D3D1C7",
        borderTop: "2.5px solid #185FA5", borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function UrgencyBanner({ level }) {
  const config = {
    emergency: { bg: "#FCEBEB", border: "#E24B4A", text: "#A32D2D", icon: "ti-alert-triangle", label: "Seek emergency care immediately (call 112 / go to ER)" },
    urgent: { bg: "#FAEEDA", border: "#EF9F27", text: "#854F0B", icon: "ti-clock-exclamation", label: "See a doctor within 24 hours" },
    routine: { bg: "#EAF3DE", border: "#97C459", text: "#3B6D11", icon: "ti-calendar", label: "Schedule a routine appointment" },
    monitor: { bg: "#E6F1FB", border: "#85B7EB", text: "#185FA5", icon: "ti-eye", label: "Monitor symptoms, rest & hydrate" },
  };
  const c = config[level] || config.monitor;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "12px 14px", borderRadius: 10,
      background: c.bg, border: `1px solid ${c.border}`,
      color: c.text, marginBottom: 16
    }}>
      <i className={`ti ${c.icon}`} style={{ fontSize: 18, marginTop: 1 }} aria-hidden="true" />
      <span style={{ fontSize: 14, fontWeight: 500 }}>{c.label}</span>
    </div>
  );
}

export default function SymptomChecker() {
  const [step, setStep] = useState("intake"); // intake | results
  const [selectedSystems, setSelectedSystems] = useState([]);
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState(3);
  const [age, setAge] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const resultsRef = useRef(null);

  useEffect(() => {
    if (step === "results" && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

  const toggleSystem = (id) => {
    setSelectedSystems(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const canSubmit = symptoms.trim().length > 5 && duration && selectedSystems.length > 0;

  const analyze = async () => {
    setLoading(true);
    setError("");
    setStep("results");

    const systemLabels = selectedSystems.map(id => BODY_SYSTEMS.find(s => s.id === id)?.label).join(", ");
    const prompt = `You are a knowledgeable medical triage assistant. Analyze the following symptoms and provide a structured assessment. Respond ONLY with valid JSON — no markdown, no preamble.

Patient info:
- Age: ${age || "not provided"}
- Body systems affected: ${systemLabels}
- Symptoms: ${symptoms}
- Duration: ${duration}
- Severity (1–5): ${severity} (${SEVERITY_LABELS[severity - 1]})
- Additional info: ${extraInfo || "none"}

Return exactly this JSON structure:
{
  "urgency": "emergency|urgent|routine|monitor",
  "summary": "2–3 sentence plain-language summary of what might be happening",
  "possible_conditions": [
    { "name": "Condition Name", "likelihood": "high|moderate|low", "description": "brief explanation" }
  ],
  "red_flags": ["list of serious warning signs to watch for, or empty array if none"],
  "self_care": ["list of self-care tips if applicable"],
  "questions_for_doctor": ["3–5 specific questions to ask when seeing a doctor"],
  "disclaimer": "Brief reminder this is not a substitute for professional medical advice"
}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch (e) {
      setError("Unable to analyze symptoms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("intake");
    setSelectedSystems([]);
    setSymptoms("");
    setDuration("");
    setSeverity(3);
    setAge("");
    setExtraInfo("");
    setResult(null);
    setError("");
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 0", fontFamily: "var(--font-sans)" }}>
      <h2 className="sr-only">AI Medical Symptom Checker</h2>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <i className="ti ti-stethoscope" style={{ fontSize: 20, color: "#185FA5" }} aria-hidden="true" />
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>
            Symptom Checker
          </h1>
          <Badge color="blue">AI-Powered</Badge>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          Describe your symptoms for an AI-assisted triage assessment. This does not replace professional medical advice.
        </p>
      </div>

      {/* Intake Form */}
      {step === "intake" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Body Systems */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Which areas are affected? <span style={{ color: "#E24B4A" }}>*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {BODY_SYSTEMS.map(sys => {
                const selected = selectedSystems.includes(sys.id);
                return (
                  <button key={sys.id} onClick={() => toggleSystem(sys.id)}
                    style={{
                      padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 13, fontWeight: selected ? 500 : 400,
                      textAlign: "left", transition: "all 0.15s",
                      background: selected ? "#E6F1FB" : "var(--color-background-primary)",
                      border: selected ? "1.5px solid #378ADD" : "0.5px solid var(--color-border-tertiary)",
                      color: selected ? "#185FA5" : "var(--color-text-primary)",
                    }}>
                    <i className={`ti ${sys.icon}`} style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
                    {sys.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Describe your symptoms <span style={{ color: "#E24B4A" }}>*</span>
            </label>
            <textarea
              value={symptoms}
              onChange={e => setSymptoms(e.target.value)}
              placeholder="e.g. sharp pain in the right side of my chest when breathing in, started this morning, worse when lying down..."
              rows={4}
              style={{
                width: "100%", resize: "vertical", fontSize: 14,
                padding: "10px 12px", borderRadius: 10, boxSizing: "border-box",
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                color: "var(--color-text-primary)", lineHeight: 1.6,
                fontFamily: "var(--font-sans)",
              }}
            />
          </div>

          {/* Duration + Age row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Duration <span style={{ color: "#E24B4A" }}>*</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {DURATION_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setDuration(opt)}
                    style={{
                      padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                      fontSize: 13, textAlign: "left",
                      background: duration === opt ? "#E6F1FB" : "var(--color-background-primary)",
                      border: duration === opt ? "1.5px solid #378ADD" : "0.5px solid var(--color-border-tertiary)",
                      color: duration === opt ? "#185FA5" : "var(--color-text-primary)",
                      fontWeight: duration === opt ? 500 : 400,
                      transition: "all 0.15s",
                    }}>{opt}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Age (optional)
                </label>
                <input
                  type="number" min="0" max="120" placeholder="e.g. 35"
                  value={age} onChange={e => setAge(e.target.value)}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14,
                    boxSizing: "border-box",
                    background: "var(--color-background-primary)",
                    border: "0.5px solid var(--color-border-tertiary)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Severity: {SEVERITY_LABELS[severity - 1]}
                </label>
                <input type="range" min="1" max="5" step="1" value={severity}
                  onChange={e => setSeverity(Number(e.target.value))}
                  style={{ width: "100%" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                  <span>Mild</span><span>Extreme</span>
                </div>
              </div>
            </div>
          </div>

          {/* Extra info */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Other relevant info (medications, conditions, allergies)
            </label>
            <input
              type="text" value={extraInfo} onChange={e => setExtraInfo(e.target.value)}
              placeholder="e.g. taking ibuprofen, asthma, no known allergies..."
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14,
                boxSizing: "border-box",
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          <button onClick={analyze} disabled={!canSubmit}
            style={{
              padding: "12px 24px", borderRadius: 10, fontSize: 15, fontWeight: 500,
              cursor: canSubmit ? "pointer" : "not-allowed", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 8,
              background: canSubmit ? "#185FA5" : "var(--color-background-secondary)",
              color: canSubmit ? "#fff" : "var(--color-text-tertiary)",
              border: "none", transition: "background 0.15s",
            }}>
            <i className="ti ti-search" aria-hidden="true" />
            Analyze Symptoms
          </button>
        </div>
      )}

      {/* Results */}
      {step === "results" && (
        <div ref={resultsRef}>
          {loading && (
            <div style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 12, padding: "2rem 1.5rem", textAlign: "center"
            }}>
              <Spinner />
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 12 }}>
                Analyzing your symptoms…
              </p>
            </div>
          )}

          {error && (
            <div style={{ padding: 16, borderRadius: 10, background: "#FCEBEB", border: "1px solid #F09595", color: "#A32D2D", fontSize: 14 }}>
              <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}
            </div>
          )}

          {result && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <UrgencyBanner level={result.urgency} />

              {/* Summary card */}
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1rem 1.25rem" }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--color-text-primary)" }}>
                  {result.summary}
                </p>
              </div>

              {/* Possible conditions */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Possible conditions
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.possible_conditions?.map((c, i) => (
                    <div key={i} style={{
                      background: "var(--color-background-primary)",
                      border: "0.5px solid var(--color-border-tertiary)",
                      borderRadius: 10, padding: "12px 14px",
                      display: "flex", alignItems: "flex-start", gap: 12
                    }}>
                      <div style={{ flexShrink: 0, marginTop: 2 }}>
                        <Badge color={c.likelihood === "high" ? "amber" : c.likelihood === "moderate" ? "blue" : "gray"}>
                          {c.likelihood}
                        </Badge>
                      </div>
                      <div>
                        <p style={{ margin: "0 0 3px", fontWeight: 500, fontSize: 14 }}>{c.name}</p>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{c.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Red flags */}
              {result.red_flags?.length > 0 && (
                <div style={{ background: "#FCEBEB", border: "1px solid #F09595", borderRadius: 10, padding: "12px 14px" }}>
                  <p style={{ margin: "0 0 8px", fontWeight: 500, fontSize: 13, color: "#A32D2D", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="ti ti-alert-triangle" aria-hidden="true" /> Warning signs — seek help if you notice:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {result.red_flags.map((f, i) => (
                      <li key={i} style={{ fontSize: 13, color: "#791F1F", marginBottom: 3, lineHeight: 1.5 }}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Self-care + Questions grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {result.self_care?.length > 0 && (
                  <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ margin: "0 0 8px", fontWeight: 500, fontSize: 13, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                      <i className="ti ti-heart" aria-hidden="true" /> Self-care tips
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {result.self_care.map((t, i) => (
                        <li key={i} style={{ fontSize: 13, color: "var(--color-text-primary)", marginBottom: 4, lineHeight: 1.5 }}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.questions_for_doctor?.length > 0 && (
                  <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ margin: "0 0 8px", fontWeight: 500, fontSize: 13, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                      <i className="ti ti-stethoscope" aria-hidden="true" /> Ask your doctor
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {result.questions_for_doctor.map((q, i) => (
                        <li key={i} style={{ fontSize: 13, color: "var(--color-text-primary)", marginBottom: 4, lineHeight: 1.5 }}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              {result.disclaimer && (
                <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.6, margin: 0, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 12 }}>
                  <i className="ti ti-info-circle" style={{ marginRight: 4 }} aria-hidden="true" />
                  {result.disclaimer}
                </p>
              )}

              <button onClick={reset} style={{
                padding: "10px 20px", borderRadius: 10, fontSize: 14,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-secondary)",
                color: "var(--color-text-primary)", fontWeight: 500,
              }}>
                <i className="ti ti-refresh" aria-hidden="true" /> Check new symptoms
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
