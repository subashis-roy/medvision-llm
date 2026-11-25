const API_BASE = "https://medvision-api.subashis.com";

let samplesList = [];
let activeFile = null;
let activeSample = null;
let lastDiagnosisResult = null;
let liveApiOnline = false;

async function init() {
  initTheme();
  setupDropzone();
  checkApiHealth();
  await loadSamples();
}

function initTheme() {
  const saved = localStorage.getItem("medvision_theme") || "light";
  applyTheme(saved);
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains("light-theme");
  const next = isLight ? "dark" : "light";
  localStorage.setItem("medvision_theme", next);
  applyTheme(next);
}

function applyTheme(mode) {
  const html = document.documentElement;
  const icon = document.getElementById("theme-icon");
  const label = document.getElementById("theme-label");
  if (mode === "light") {
    html.classList.add("light-theme");
    html.classList.remove("dark");
    if (icon) icon.innerText = "🌙";
    if (label) label.innerText = "Dark Mode";
  } else {
    html.classList.remove("light-theme");
    html.classList.add("dark");
    if (icon) icon.innerText = "☀️";
    if (label) label.innerText = "Light Mode";
  }
}

async function checkApiHealth() {
  const badge = document.getElementById("api-health-badge");
  const dot = document.getElementById("api-health-dot");
  const text = document.getElementById("api-health-text");
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: "GET" });
    if (res.ok) {
      liveApiOnline = true;
      text.innerText = "Live Upload API: Online";
      badge.className = "px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-emerald-300 flex items-center gap-2";
      dot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
      return;
    }
  } catch (e) {
    // Fallback to static sample mode
  }
  liveApiOnline = false;
  text.innerText = "Curated Samples Mode";
  badge.className = "px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/30 text-amber-300 flex items-center gap-2";
  dot.className = "w-2 h-2 rounded-full bg-amber-400";
}

function setupDropzone() {
  const dropzone = document.getElementById("dropzone");

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });
}

function handleFileSelect(event) {
  const files = event.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFile(file) {
  activeFile = file;
  activeSample = null;

  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById("scan-preview");
    preview.src = e.target.result;
    preview.classList.remove("hidden");
    document.getElementById("drop-placeholder").classList.add("hidden");
    const badge = document.getElementById("scan-status-badge");
    badge.innerText = `Uploaded (${file.name})`;
    badge.className = "text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-400/30";
    // Auto-run live inference immediately upon upload
    runDiagnosis();
  };
  reader.readAsDataURL(file);
}

async function loadSamples() {
  try {
    const res = await fetch("samples/precomputed_results.json");
    const data = await res.json();
    samplesList = data.samples || [];

    const container = document.getElementById("samples-container");
    container.innerHTML = "";

    const colorMap = {
      glioma_tumor: "border-pink-500/30 hover:border-pink-400 text-pink-300 bg-pink-500/10",
      meningioma_tumor: "border-violet-500/30 hover:border-violet-400 text-violet-300 bg-violet-500/10",
      pituitary_tumor: "border-amber-500/30 hover:border-amber-400 text-amber-300 bg-amber-500/10",
      no_tumor: "border-emerald-500/30 hover:border-emerald-400 text-emerald-300 bg-emerald-500/10",
    };

    samplesList.forEach((sample) => {
      const card = document.createElement("div");
      const cStyle = colorMap[sample.category] || "border-white/10 text-white bg-slate-900";
      card.className = `p-2.5 rounded-xl border ${cStyle} cursor-pointer transition flex items-center gap-2.5`;
      card.onclick = () => selectSample(sample, true);

      card.innerHTML = `
        <img src="${sample.url}" class="w-10 h-10 rounded-lg object-cover bg-black shrink-0" alt="${sample.label}" />
        <div class="flex-1 min-w-0">
          <div class="text-[11px] font-bold truncate">${sample.label.split("(")[0]}</div>
          <div class="text-[10px] font-mono text-slate-400">${sample.severity}</div>
        </div>
      `;
      container.appendChild(card);
    });

    if (samplesList.length > 0) {
      selectSample(samplesList[0], true);
    }
  } catch (err) {
    console.error("Failed to load precomputed samples:", err);
  }
}

function selectSample(sample, autoRun = false) {
  activeFile = null;
  activeSample = sample;

  const preview = document.getElementById("scan-preview");
  preview.src = sample.url;
  preview.classList.remove("hidden");
  document.getElementById("drop-placeholder").classList.add("hidden");

  const badge = document.getElementById("scan-status-badge");
  badge.innerText = `Sample: ${sample.category}`;
  badge.className = "text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-400/30";

  if (autoRun) {
    runDiagnosis();
  }
}

function setPrompt(promptText) {
  document.getElementById("prompt-input").value = promptText;
  if (activeSample || activeFile) {
    runDiagnosis();
  }
}

async function runDiagnosis() {
  if (!activeFile && !activeSample) {
    alert("Please upload an MRI scan or select a verified sample first.");
    return;
  }

  const promptVal = document.getElementById("prompt-input").value;
  const tempVal = parseFloat(document.getElementById("temp-slider").value) / 100.0;

  if (activeSample && !activeFile) {
    const byPrompt = activeSample.predictions_by_prompt || {};
    const result = byPrompt[promptVal] || activeSample.default_prediction;
    if (result) {
      lastDiagnosisResult = result;
      renderDiagnosis(result);
      return;
    }
  }

  const btn = document.getElementById("btn-analyze");
  const btnIcon = document.getElementById("btn-icon");
  const btnText = document.getElementById("btn-text");

  btn.disabled = true;
  btnIcon.innerText = "🌀";
  btnIcon.classList.add("animate-spin");
  btnText.innerText = "Diagnosing...";

  const formData = new FormData();
  formData.append("file", activeFile);
  formData.append("prompt", promptVal);
  formData.append("temperature", tempVal);

  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`HTTP ${res.status}: ${errBody}`);
    }
    const data = await res.json();
    lastDiagnosisResult = data;
    renderDiagnosis(data);
  } catch (err) {
    alert("Live inference error: " + err.message);
  } finally {
    btn.disabled = false;
    btnIcon.innerText = "⚡";
    btnIcon.classList.remove("animate-spin");
    btnText.innerText = "Run Diagnosis";
  }
}

function renderDiagnosis(data) {
  document.getElementById("res-diagnosis").innerText = data.diagnosis || "Unspecified";
  document.getElementById("res-severity").innerText = data.severity || "Moderate";
  document.getElementById("res-modality").innerText = data.modality || "Brain MRI";
  document.getElementById("res-case").innerText = data.clinical_case || data.raw_output || "--";
  document.getElementById("res-finding").innerText = data.finding || "--";
  document.getElementById("res-rec").innerText = data.recommendations || "--";

  if (data.class_probabilities) {
    document.getElementById("prob-glioma").innerText = data.class_probabilities["Glioma"] || "--";
    document.getElementById("prob-meningioma").innerText = data.class_probabilities["Meningioma"] || "--";
    document.getElementById("prob-pituitary").innerText = data.class_probabilities["Pituitary Adenoma"] || "--";
    document.getElementById("prob-notumor").innerText = data.class_probabilities["Normal Brain MRI"] || "--";
  }
  if (data.visual_confidence) {
    document.getElementById("res-confidence").innerText = "Visual Confidence: " + data.visual_confidence;
  }

  const sevEl = document.getElementById("res-severity");
  const s = (data.severity || "").toLowerCase();
  if (s.includes("critical") || s.includes("high")) {
    sevEl.className = "text-sm font-bold text-rose-400 truncate";
  } else if (s.includes("moderate")) {
    sevEl.className = "text-sm font-bold text-amber-300 truncate";
  } else {
    sevEl.className = "text-sm font-bold text-emerald-300 truncate";
  }
}

function exportDossier(fmt) {
  if (!lastDiagnosisResult) {
    alert("Please run a diagnosis first to export the dossier.");
    return;
  }

  const d = lastDiagnosisResult;
  const dateTag = new Date().toISOString().slice(0, 10);
  let content = "";
  let mime = "text/plain";
  let ext = "txt";

  if (fmt === "json") {
    content = JSON.stringify({ exported_at: new Date().toISOString(), result: d }, null, 2);
    mime = "application/json";
    ext = "json";
  } else {
    const lines = [
      "============================================================",
      "  MEDVISION-LLM — CLINICAL NEUROLOGICAL DOSSIER",
      `  Generated: ${new Date().toLocaleString()}`,
      "  Model    : 6.4M ConvNeXt + Multimodal Causal Transformer",
      "============================================================",
      "",
      `PRIMARY DIAGNOSIS : ${d.diagnosis}`,
      `SEVERITY LEVEL    : ${d.severity}`,
      `MODALITY          : ${d.modality}`,
      "",
      "--- CLINICAL CASE NARRATIVE (WHAT HAPPENED) ---",
      d.clinical_case,
      "",
      "--- VISUAL PATHOLOGY FINDINGS ---",
      d.finding,
      "",
      "--- ACTIONABLE CLINICAL RECOMMENDATIONS ---",
      d.recommendations,
      "",
      "--- RAW AUTOREGRESSIVE TOKENS ---",
      d.raw_output,
    ];
    content = lines.join("\n");
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `MedVision_Report_${dateTag}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

window.addEventListener("DOMContentLoaded", init);
