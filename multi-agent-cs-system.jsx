import { useState, useRef, useEffect } from "react";

const AGENTS = [
  {
    id: "orchestrator",
    name: "Orchestrator",
    role: "Planning & Koordinasi",
    color: "#7F77DD",
    bg: "#EEEDFE",
    darkBg: "#26215C",
    icon: "🎯",
    description: "Menerima query, membuat rencana eksekusi, mendelegasikan ke agent lain",
  },
  {
    id: "analyzer",
    name: "Analyzer",
    role: "Intent & Sentiment",
    color: "#1D9E75",
    bg: "#E1F5EE",
    darkBg: "#04342C",
    icon: "🔍",
    description: "Menganalisis intent, sentimen, urgensi, dan kategorisasi masalah",
  },
  {
    id: "knowledge",
    name: "Knowledge",
    role: "Solution Retrieval",
    color: "#BA7517",
    bg: "#FAEEDA",
    darkBg: "#412402",
    icon: "📚",
    description: "Mencari dan menghasilkan solusi relevan dari knowledge base",
  },
  {
    id: "writer",
    name: "Writer",
    role: "Response Generation",
    color: "#D85A30",
    bg: "#FAECE7",
    darkBg: "#4A1B0C",
    icon: "✍️",
    description: "Menulis respons profesional berdasarkan analisis dan knowledge",
  },
  {
    id: "qa",
    name: "QA Agent",
    role: "Quality Assurance",
    color: "#185FA5",
    bg: "#E6F1FB",
    darkBg: "#042C53",
    icon: "✅",
    description: "Mengevaluasi kualitas respons dan memberikan skor objektif",
  },
];

const EXAMPLE_QUERIES = [
  "Saya sudah bayar tapi langganan saya belum aktif selama 3 hari. Ini sangat mengecewakan!",
  "Bagaimana cara mengubah metode pembayaran di akun saya?",
  "Aplikasi saya sering crash saat membuka halaman dashboard. Tolong bantu!",
  "Minta refund untuk pembelian yang saya lakukan kemarin karena fiturnya tidak sesuai iklan.",
];

async function callAgent(systemPrompt, userMessage) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.content.map((b) => b.text || "").join("");
}

function safeParseJSON(text) {
  try {
    return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    return null;
  }
}

function AgentCard({ agent, state }) {
  const stateConfig = {
    idle: { label: "Idle", dot: "#9ca3af" },
    running: { label: "Running...", dot: "#f59e0b" },
    done: { label: "Done", dot: "#10b981" },
  };
  const s = stateConfig[state] || stateConfig.idle;
  const isRunning = state === "running";

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: state === "done" ? agent.bg : state === "running" ? agent.bg : "var(--color-background-secondary)",
        border: `1.5px solid ${state !== "idle" ? agent.color : "var(--color-border-tertiary)"}`,
        borderRadius: 10,
        padding: "10px 12px",
        transition: "all 0.3s ease",
        opacity: state === "idle" ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{agent.icon}</span>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: s.dot,
            boxShadow: isRunning ? `0 0 0 3px ${s.dot}40` : "none",
            animation: isRunning ? "pulse 1s infinite" : "none",
          }}
        />
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: state !== "idle" ? agent.color : "var(--color-text-secondary)" }}>
        {agent.name}
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{agent.role}</div>
      <div style={{ fontSize: 10, color: s.dot, marginTop: 4, fontWeight: 500 }}>{s.label}</div>
    </div>
  );
}

function LogEntry({ log }) {
  const agent = AGENTS.find((a) => a.id === log.agentId);
  const [expanded, setExpanded] = useState(log.type !== "output");

  let content = log.content;
  let isJSON = false;
  if (log.type === "output") {
    const parsed = safeParseJSON(log.content);
    if (parsed) {
      isJSON = true;
      content = JSON.stringify(parsed, null, 2);
    }
  }

  return (
    <div
      style={{
        marginBottom: 10,
        borderLeft: `3px solid ${agent?.color || "#888"}`,
        paddingLeft: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
          cursor: isJSON ? "pointer" : "default",
        }}
        onClick={() => isJSON && setExpanded((e) => !e)}
      >
        <span style={{ fontSize: 13 }}>{agent?.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: agent?.color }}>{agent?.name}</span>
        <span
          style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 4,
            background: log.type === "input" ? "#E6F1FB" : log.type === "response" ? "#E1F5EE" : log.type === "error" ? "#FCEBEB" : "#FAEEDA",
            color: log.type === "input" ? "#185FA5" : log.type === "response" ? "#1D9E75" : log.type === "error" ? "#A32D2D" : "#BA7517",
            fontWeight: 500,
          }}
        >
          {log.type === "input" ? "INPUT" : log.type === "response" ? "RESPONSE" : log.type === "error" ? "ERROR" : "OUTPUT JSON"}
        </span>
        <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginLeft: "auto" }}>{log.timestamp}</span>
        {isJSON && (
          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{expanded ? "▲" : "▼"}</span>
        )}
      </div>
      {expanded && (
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: "var(--color-text-secondary)",
            background: isJSON ? "var(--color-background-secondary)" : "transparent",
            borderRadius: 6,
            padding: isJSON ? "8px 10px" : "0",
            fontFamily: isJSON ? "var(--font-mono)" : "var(--font-sans)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

function MetricsBadge({ label, value, color }) {
  return (
    <div
      style={{
        background: "var(--color-background-secondary)",
        borderRadius: 8,
        padding: "8px 12px",
        textAlign: "center",
        flex: 1,
        minWidth: 80,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: color || "var(--color-text-primary)" }}>{value}</div>
    </div>
  );
}

export default function MultiAgentSystem() {
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);
  const [agentStates, setAgentStates] = useState({
    orchestrator: "idle",
    analyzer: "idle",
    knowledge: "idle",
    writer: "idle",
    qa: "idle",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState("logs");
  const logsEndRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentLogs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const addLog = (agentId, content, type = "output") => {
    setAgentLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), agentId, content, type, timestamp: new Date().toLocaleTimeString() },
    ]);
  };

  const setAgentState = (agentId, state) => {
    setAgentStates((prev) => ({ ...prev, [agentId]: state }));
  };

  const resetAgents = () => {
    setAgentStates({ orchestrator: "idle", analyzer: "idle", knowledge: "idle", writer: "idle", qa: "idle" });
  };

  const processQuery = async (userQuery) => {
    setIsProcessing(true);
    setAgentLogs([]);
    setMetrics(null);
    resetAgents();
    setActiveTab("logs");
    const startTime = Date.now();

    try {
      // AGENT 1: Orchestrator
      setAgentState("orchestrator", "running");
      addLog("orchestrator", `Menerima query pelanggan: "${userQuery}"`, "input");

      const orchRaw = await callAgent(
        `Kamu adalah Orchestrator Agent dalam sistem multi-agent customer support.
Tugasmu: analisis query pelanggan, buat rencana eksekusi, dan delegasikan tugas ke agent lain.
WAJIB respond HANYA dengan JSON valid (tanpa teks lain, tanpa markdown):
{
  "plan": "deskripsi singkat rencana eksekusi",
  "priority": "high|medium|low",
  "category": "billing|technical|account|complaint|general",
  "estimated_complexity": "simple|moderate|complex",
  "delegation": {
    "analyzer": "instruksi spesifik untuk Analyzer Agent",
    "knowledge": "topik yang harus dicari Knowledge Agent",
    "writer": "panduan tone dan gaya penulisan untuk Writer Agent",
    "qa": "standar kualitas yang harus dicek QA Agent"
  },
  "reasoning": "alasan mengapa kategori dan prioritas ini dipilih"
}`,
        `Query pelanggan: ${userQuery}`
      );

      const orchData = safeParseJSON(orchRaw) || {
        plan: "Proses query pelanggan secara standar",
        priority: "medium",
        category: "general",
        estimated_complexity: "moderate",
        delegation: {
          analyzer: "Analisis intent dan sentimen",
          knowledge: "Cari solusi relevan",
          writer: "Tulis respons profesional dan empatis",
          qa: "Pastikan respons akurat dan membantu",
        },
        reasoning: "Query umum yang membutuhkan penanganan standar",
      };

      addLog("orchestrator", JSON.stringify(orchData, null, 2), "output");
      setAgentState("orchestrator", "done");

      // AGENT 2: Analyzer
      setAgentState("analyzer", "running");
      addLog("analyzer", `Tugas dari Orchestrator: ${orchData.delegation?.analyzer || "Analisis query"}`, "input");

      const analyzerRaw = await callAgent(
        `Kamu adalah Analyzer Agent dalam sistem multi-agent customer support.
Tugasmu: analisis mendalam terhadap query pelanggan dari sisi intent, sentimen, emosi, dan urgensi.
WAJIB respond HANYA dengan JSON valid:
{
  "primary_intent": "intent utama pelanggan",
  "secondary_intents": ["intent tambahan jika ada"],
  "sentiment": "positive|neutral|negative|frustrated|angry",
  "sentiment_score": 0.0,
  "urgency": "high|medium|low",
  "customer_emotion": "deskripsi emosi pelanggan",
  "key_issues": ["isu utama 1", "isu utama 2"],
  "recommended_tone": "empathetic|professional|friendly|apologetic|urgent",
  "escalation_risk": "high|medium|low",
  "language_quality": "formal|informal|mixed",
  "reasoning": "penjelasan singkat analisis"
}`,
        `Query: ${userQuery}\nKonteks dari Orchestrator: ${JSON.stringify(orchData)}`
      );

      const analyzerData = safeParseJSON(analyzerRaw) || {
        primary_intent: "Meminta bantuan",
        sentiment: "neutral",
        sentiment_score: 0.5,
        urgency: "medium",
        customer_emotion: "Pelanggan membutuhkan bantuan",
        key_issues: ["Masalah utama pelanggan"],
        recommended_tone: "professional",
        escalation_risk: "low",
        reasoning: "Analisis standar",
      };

      addLog("analyzer", JSON.stringify(analyzerData, null, 2), "output");
      setAgentState("analyzer", "done");

      // AGENT 3: Knowledge Agent
      setAgentState("knowledge", "running");
      addLog(
        "knowledge",
        `Mencari solusi untuk kategori: ${orchData.category} | Urgensi: ${analyzerData.urgency}`,
        "input"
      );

      const knowledgeRaw = await callAgent(
        `Kamu adalah Knowledge Agent dalam sistem multi-agent customer support.
Tugasmu: generate solusi dan pengetahuan relevan berdasarkan query dan analisis yang diberikan.
WAJIB respond HANYA dengan JSON valid:
{
  "solutions": [
    {"step": 1, "action": "langkah pertama yang harus dilakukan", "detail": "detail langkah"},
    {"step": 2, "action": "langkah kedua", "detail": "detail langkah"}
  ],
  "relevant_policies": ["kebijakan relevan jika ada"],
  "sla_info": "informasi SLA atau waktu penyelesaian standar",
  "escalation_needed": false,
  "confidence_score": 0.9,
  "alternative_solutions": ["solusi alternatif jika solusi utama tidak berhasil"],
  "preventive_tips": ["tips untuk mencegah masalah serupa"],
  "references": ["dokumen atau halaman referensi"]
}`,
        `Query: ${userQuery}\nKategori: ${orchData.category}\nAnalisis: ${JSON.stringify(analyzerData)}\nInstruksi: ${orchData.delegation?.knowledge}`
      );

      const knowledgeData = safeParseJSON(knowledgeRaw) || {
        solutions: [{ step: 1, action: "Cek status akun", detail: "Masuk ke halaman akun dan verifikasi status" }],
        relevant_policies: [],
        escalation_needed: false,
        confidence_score: 0.8,
        alternative_solutions: ["Hubungi tim support langsung"],
        preventive_tips: [],
        references: [],
      };

      addLog("knowledge", JSON.stringify(knowledgeData, null, 2), "output");
      setAgentState("knowledge", "done");

      // AGENT 4: Writer Agent
      setAgentState("writer", "running");
      addLog(
        "writer",
        `Menulis respons dengan tone: ${analyzerData.recommended_tone} | Kompleksitas: ${orchData.estimated_complexity}`,
        "input"
      );

      const writerRaw = await callAgent(
        `Kamu adalah Writer Agent dalam sistem multi-agent customer support.
Tugasmu: tulis respons customer support yang profesional, empatis, dan actionable dalam Bahasa Indonesia.
Panduan:
- Sapa pelanggan dengan ramah
- Tunjukkan empati sesuai sentimen yang terdeteksi
- Berikan solusi yang jelas dan terstruktur (gunakan nomor/poin jika perlu)
- Akhiri dengan tawaran bantuan lanjutan
- Jangan lebay atau terlalu formal
- JANGAN respond dalam JSON — tulis respons natural yang akan dikirim ke pelanggan`,
        `Query pelanggan: "${userQuery}"
Analisis sentimen: ${analyzerData.sentiment} (${analyzerData.customer_emotion})
Tone yang disarankan: ${analyzerData.recommended_tone}
Solusi dari Knowledge Agent: ${JSON.stringify(knowledgeData.solutions)}
Kebijakan relevan: ${knowledgeData.relevant_policies?.join(", ") || "tidak ada"}
SLA: ${knowledgeData.sla_info || "tidak spesifik"}
Panduan dari Orchestrator: ${orchData.delegation?.writer}`
      );

      addLog("writer", writerRaw, "response");
      setAgentState("writer", "done");

      // AGENT 5: QA Agent
      setAgentState("qa", "running");
      addLog("qa", `Mengevaluasi kualitas respons berdasarkan standar: ${orchData.delegation?.qa}`, "input");

      const qaRaw = await callAgent(
        `Kamu adalah QA Agent dalam sistem multi-agent customer support.
Tugasmu: evaluasi kualitas respons yang akan dikirim ke pelanggan.
WAJIB respond HANYA dengan JSON valid:
{
  "overall_score": 8.5,
  "criteria_scores": {
    "accuracy": 9.0,
    "empathy": 8.5,
    "clarity": 9.0,
    "completeness": 8.0,
    "tone_appropriateness": 9.0,
    "actionability": 8.5
  },
  "approved": true,
  "strengths": ["kekuatan respons 1", "kekuatan 2"],
  "improvements": ["saran perbaikan jika ada"],
  "risk_flags": [],
  "compliance_check": "passed|warning|failed",
  "reasoning": "penjelasan evaluasi keseluruhan"
}`,
        `Query asli: "${userQuery}"
Respons yang akan dievaluasi: ${writerRaw}
Analisis pelanggan: ${JSON.stringify(analyzerData)}
Standar dari Orchestrator: ${orchData.delegation?.qa}`
      );

      const qaData = safeParseJSON(qaRaw) || {
        overall_score: 8.0,
        criteria_scores: { accuracy: 8, empathy: 8, clarity: 8, completeness: 8, tone_appropriateness: 8 },
        approved: true,
        strengths: ["Respons membantu"],
        improvements: [],
        compliance_check: "passed",
        reasoning: "Respons memenuhi standar kualitas",
      };

      addLog("qa", JSON.stringify(qaData, null, 2), "output");
      setAgentState("qa", "done");

      // Final metrics
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
      setMetrics({
        quality: (qaData.overall_score || 8.0).toFixed(1),
        confidence: Math.round((knowledgeData.confidence_score || 0.85) * 100),
        processingTime,
        category: orchData.category,
        sentiment: analyzerData.sentiment,
        urgency: analyzerData.urgency,
        approved: qaData.approved,
        criteria: qaData.criteria_scores || {},
        escalation: knowledgeData.escalation_needed,
        strengths: qaData.strengths || [],
      });

      setChatHistory((prev) => [
        ...prev,
        { role: "user", content: userQuery },
        {
          role: "assistant",
          content: writerRaw,
          meta: {
            quality: (qaData.overall_score || 8.0).toFixed(1),
            time: processingTime,
            category: orchData.category,
          },
        },
      ]);
    } catch (err) {
      addLog("orchestrator", `Error: ${err.message}`, "error");
      resetAgents();
    }

    setIsProcessing(false);
  };

  const handleSubmit = async () => {
    if (!query.trim() || isProcessing) return;
    const q = query.trim();
    setQuery("");
    await processQuery(q);
  };

  const sentimentColor = (s) => {
    if (!s) return "var(--color-text-secondary)";
    if (s === "positive") return "#1D9E75";
    if (s === "neutral") return "#185FA5";
    if (s === "negative" || s === "frustrated") return "#D85A30";
    if (s === "angry") return "#A32D2D";
    return "var(--color-text-secondary)";
  };

  const urgencyColor = (u) => {
    if (u === "high") return "#D85A30";
    if (u === "medium") return "#BA7517";
    return "#1D9E75";
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", height: "100vh", display: "flex", flexDirection: "column", background: "var(--color-background-tertiary)" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .tab-btn { padding: 6px 14px; border: 0.5px solid var(--color-border-tertiary); border-radius: 6px; cursor: pointer; font-size: 13px; background: transparent; color: var(--color-text-secondary); transition: all 0.2s; }
        .tab-btn.active { background: var(--color-background-primary); color: var(--color-text-primary); border-color: var(--color-border-primary); font-weight: 500; }
        .send-btn { padding: 10px 18px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 500; background: #7F77DD; color: white; transition: opacity 0.2s; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .send-btn:not(:disabled):hover { opacity: 0.85; }
        .example-btn { padding: 6px 10px; border: 0.5px solid var(--color-border-tertiary); border-radius: 6px; cursor: pointer; font-size: 11px; background: var(--color-background-primary); color: var(--color-text-secondary); text-align: left; line-height: 1.4; transition: all 0.15s; }
        .example-btn:hover { border-color: #7F77DD; color: var(--color-text-primary); }
        .chat-bubble-user { background: #7F77DD; color: white; border-radius: 12px 12px 4px 12px; padding: 10px 14px; max-width: 85%; margin-left: auto; font-size: 13px; line-height: 1.5; }
        .chat-bubble-ai { background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); border-radius: 12px 12px 12px 4px; padding: 10px 14px; max-width: 90%; font-size: 13px; line-height: 1.6; color: var(--color-text-primary); white-space: pre-wrap; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--color-border-tertiary); border-radius: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ fontSize: 20 }}>🤖</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>Multi-Agent Customer Support System</div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>AI Agent Competition 2026 · 5 Specialized Agents · Real-time Interaction Logs</div>
        </div>
        {isProcessing && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#f59e0b" }}>
            <div style={{ width: 10, height: 10, border: "2px solid #f59e0b", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Sistem sedang bekerja...
          </div>
        )}
      </div>

      {/* Agent Pipeline */}
      <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "10px 20px", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8, fontWeight: 500, letterSpacing: "0.05em" }}>AGENT PIPELINE</div>
        <div style={{ display: "flex", gap: 8 }}>
          {AGENTS.map((agent, i) => (
            <div key={agent.id} style={{ display: "flex", alignItems: "center", flex: 1, gap: 4, minWidth: 0 }}>
              <AgentCard agent={agent} state={agentStates[agent.id]} />
              {i < AGENTS.length - 1 && (
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", flexShrink: 0 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", gap: 0 }}>
        {/* Left: Chat */}
        <div style={{ width: "42%", display: "flex", flexDirection: "column", borderRight: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
          <div style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>💬 Customer Chat Interface</div>
          </div>

          {/* Chat messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {chatHistory.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 8 }}>Coba salah satu contoh query:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {EXAMPLE_QUERIES.map((q, i) => (
                    <button
                      key={i}
                      className="example-btn"
                      onClick={() => { setQuery(q); }}
                      disabled={isProcessing}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ marginBottom: 16, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 4 }}>
                  {msg.role === "user" ? "👤 Pelanggan" : "🤖 Customer Support AI"}
                </div>
                {msg.role === "user" ? (
                  <div className="chat-bubble-user">{msg.content}</div>
                ) : (
                  <div>
                    <div className="chat-bubble-ai">{msg.content}</div>
                    {msg.meta && (
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#E1F5EE", color: "#1D9E75", fontWeight: 500 }}>
                          ⭐ QA Score: {msg.meta.quality}/10
                        </span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#E6F1FB", color: "#185FA5", fontWeight: 500 }}>
                          ⚡ {msg.meta.time}s
                        </span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#FAEEDA", color: "#BA7517", fontWeight: 500 }}>
                          📂 {msg.meta.category}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder="Ketik pertanyaan pelanggan... (Enter untuk kirim)"
                disabled={isProcessing}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, resize: "none", height: 64, fontFamily: "var(--font-sans)", outline: "none" }}
              />
              <button className="send-btn" onClick={handleSubmit} disabled={isProcessing || !query.trim()}>
                {isProcessing ? "⏳" : "Kirim ↗"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Logs & Metrics */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--color-background-secondary)", minWidth: 0 }}>
          <div style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 8, alignItems: "center", background: "var(--color-background-primary)", flexShrink: 0 }}>
            <button className={`tab-btn ${activeTab === "logs" ? "active" : ""}`} onClick={() => setActiveTab("logs")}>
              📋 Interaction Logs {agentLogs.length > 0 && `(${agentLogs.length})`}
            </button>
            <button className={`tab-btn ${activeTab === "metrics" ? "active" : ""}`} onClick={() => setActiveTab("metrics")} disabled={!metrics}>
              📊 Metrics & Output
            </button>
            <button className={`tab-btn ${activeTab === "arch" ? "active" : ""}`} onClick={() => setActiveTab("arch")}>
              🏗️ Arsitektur
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {activeTab === "logs" && (
              <div>
                {agentLogs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--color-text-tertiary)", fontSize: 13 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                    Interaction logs antar agent akan muncul di sini saat sistem dijalankan
                  </div>
                ) : (
                  agentLogs.map((log) => <LogEntry key={log.id} log={log} />)
                )}
                <div ref={logsEndRef} />
              </div>
            )}

            {activeTab === "metrics" && metrics && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 12 }}>
                  Structured Output & Quality Metrics
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  <MetricsBadge label="QA Score" value={`${metrics.quality}/10`} color={parseFloat(metrics.quality) >= 8 ? "#1D9E75" : "#D85A30"} />
                  <MetricsBadge label="Confidence" value={`${metrics.confidence}%`} color="#185FA5" />
                  <MetricsBadge label="Waktu Proses" value={`${metrics.processingTime}s`} color="#BA7517" />
                  <MetricsBadge label="Status" value={metrics.approved ? "✅ Approved" : "⚠️ Review"} color={metrics.approved ? "#1D9E75" : "#D85A30"} />
                </div>

                <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 10 }}>Breakdown Criteria Scores</div>
                  {Object.entries(metrics.criteria).map(([key, val]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", width: 140, textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</div>
                      <div style={{ flex: 1, height: 6, background: "var(--color-background-secondary)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(val / 10) * 100}%`, background: val >= 8 ? "#1D9E75" : val >= 6 ? "#BA7517" : "#D85A30", borderRadius: 3, transition: "width 0.5s ease" }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", width: 24, textAlign: "right" }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 6, fontWeight: 500 }}>KLASIFIKASI</div>
                    <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div>📂 Kategori: <strong>{metrics.category}</strong></div>
                      <div style={{ color: sentimentColor(metrics.sentiment) }}>😊 Sentimen: {metrics.sentiment}</div>
                      <div style={{ color: urgencyColor(metrics.urgency) }}>⚡ Urgensi: {metrics.urgency}</div>
                      <div style={{ color: metrics.escalation ? "#D85A30" : "#1D9E75" }}>
                        {metrics.escalation ? "🔺 Perlu Eskalasi" : "✅ Tidak Perlu Eskalasi"}
                      </div>
                    </div>
                  </div>
                  <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 6, fontWeight: 500 }}>KEKUATAN RESPONS</div>
                    <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                      {(metrics.strengths || []).map((s, i) => (
                        <div key={i} style={{ color: "var(--color-text-secondary)" }}>✓ {s}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "arch" && (
              <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 12 }}>Arsitektur Sistem Multi-Agent</div>

                {AGENTS.map((agent) => (
                  <div key={agent.id} style={{ background: "var(--color-background-primary)", border: `0.5px solid ${agent.color}40`, borderLeft: `3px solid ${agent.color}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>{agent.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: agent.color }}>{agent.name} Agent</span>
                      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>— {agent.role}</span>
                    </div>
                    <div style={{ fontSize: 12 }}>{agent.description}</div>
                  </div>
                ))}

                <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: 12, marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 8 }}>Spesifikasi Teknis</div>
                  <div style={{ fontSize: 12, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                    <span style={{ color: "var(--color-text-tertiary)" }}>LLM</span><span>Claude Sonnet 4 (Anthropic API)</span>
                    <span style={{ color: "var(--color-text-tertiary)" }}>Pattern</span><span>Sequential Multi-Agent Pipeline</span>
                    <span style={{ color: "var(--color-text-tertiary)" }}>Communication</span><span>Structured JSON message passing</span>
                    <span style={{ color: "var(--color-text-tertiary)" }}>Logging</span><span>Real-time interaction log per agent</span>
                    <span style={{ color: "var(--color-text-tertiary)" }}>Output</span><span>Structured JSON + Quality Score</span>
                    <span style={{ color: "var(--color-text-tertiary)" }}>Framework</span><span>React + Anthropic API (modular)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
