let samplesList = [];
let activeSample = null;
let lastDiagnosisResult = null;

async function init() {
  await loadSamples();
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
    document.getElementById("scan-status-badge").innerText = "Load Error";
  }
}

function selectSample(sample, autoRun = false) {
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
  if (activeSample) {
    runDiagnosis();
  }
}

function runDiagnosis() {
  if (!activeSample) {
    alert("Please select a verified sample scan first.");
    return;
  }

  const promptVal = document.getElementById("prompt-input").value;
  const byPrompt = activeSample.predictions_by_prompt || {};
  const result = byPrompt[promptVal] || activeSample.default_prediction;

  if (!result) return;
  lastDiagnosisResult = result;
  renderDiagnosis(result);
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
    alert("Please select a scan first to export the dossier.");
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
