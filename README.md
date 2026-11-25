# 🧠 MedVision-LLM: Sovereign Medical Vision-Language Model

[![Live Demo](https://img.shields.io/badge/Live_Web_Demo-GitHub_Pages-00f3ff?style=for-the-badge)](https://subashis-dev.github.io/medvision-llm/)
[![Parameters](https://img.shields.io/badge/Parameters-6.4M_Multimodal_VLM-8b5cf6?style=for-the-badge)](#)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.6%2B_CUDA_12.4-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)](LICENSE)

**MedVision-LLM** is a lightweight, sovereign **Medical Vision-Language Model (Med-VLM)** engineered and trained from scratch on 10,287 Brain MRI scans. It analyses MRI slices, predicts 4-class pathology probabilities, and generates structured neurological case reports (*primary diagnosis, severity level, visual pathology findings, and clinical recommendations*).

---

## 🌐 Live Interactive Web Showcase (No Download Required)

Explore the model outputs directly in your browser—no cloning, installation, or dataset downloads needed:

👉 **[Launch MedVision-LLM Live Showcase](https://subashis-dev.github.io/medvision-llm/)**

* 🔴 **Glioma Tumour** — intra-axial brain parenchymal lesion
* 🟠 **Meningioma** — extra-axial dural-based lesion
* 🔵 **Pituitary Macroadenoma** — sellar / suprasellar lesion
* 🟢 **Normal Brain MRI** — healthy brain control

---

## 🧬 Multimodal Architecture

MedVision-LLM combines an inverted-bottleneck **ConvNeXt Visual Feature Extractor** with an **Auxiliary Visual Classifier Head** and a unified **Causal Multimodal Transformer Decoder (SLM)**:

```text
       Medical Scan (Brain MRI Axial / Sagittal Slice)
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 1. ConvNeXt Visual Feature Backbone                    │
 │    • 7x7 Depthwise Conv + GroupNorm                    │
 │    • Inverted Bottleneck (4x Expansion with GELU)      │
 │    • 2-Stage Downsampling -> 4x4 Spatial Pooling       │
 └────────────────────────────────────────────────────────┘
            │                               │
            ▼ (Pooled Feats)                ▼ (16 Visual Tokens)
 ┌───────────────────────┐   [ <vis_0> ... <vis_15>, Prompt Tokens... ]
 │ Auxiliary Classifier  │                  │
 │ • Direct Cross-Entropy│                  ▼
 │ • 4 Pathology Classes │   ┌────────────────────────────────────────┐
 └───────────────────────┘   │ 2. Multimodal Transformer Decoder (SLM)│
            │                │    • 6 Layers, 8 Attention Heads       │
            │                │    • Pre-RMSNorm Normalisation         │
            │                │    • Scaled Dot-Product Attention      │
            │                │    • Tied Linear LM Projection Head    │
            │                └────────────────────────────────────────┘
            │                               │
            └───────────────┬───────────────┘
                            ▼ (Autoregressive Clinical Report)
 {
   "diagnosis": "Pituitary Adenoma",
   "severity": "Moderate",
   "finding": "expanded sella turcica with homogeneous suprasellar mass extending toward chiasm",
   "modality": "Brain MRI",
   "clinical_case": "Patient presented with bitemporal hemianopsia and endocrine screening irregularities.",
   "recommendations": "Endocrine hormone panel and neurosurgical consultation for transsphenoidal resection."
 }
```

---

## 📊 Training & Dataset Summary

* **Total Scans:** 10,287 Brain MRI scans (8,582 train / 1,705 validation)
* **Dataset Sources:** Multi-source merged benchmarks (`sartajbhuvaji/Brain-Tumor-Classification-DataSet` + `Brandon-Kee/NeuroScan`)
* **Augmentation:** Dynamic online medical augmentation (rotation $\pm 14^\circ$, scaling, gamma shift $\gamma \in [0.85, 1.20]$, blur)
* **Model Parameters:** 6,429,956 (6.4M)
* **Inference Speed:** ~15 ms vision encoding, ~120 ms total generation on an RTX 3060 Laptop GPU

---

## 🔒 Code & Model Weights Availability (Upon Request)

This public repository hosts the **live interactive web showcase only** so visitors can inspect model behaviour directly in the browser without downloading code or datasets.

Full training scripts, inference source code, and model checkpoints are kept private during ongoing academic research and manuscript preparation, and **will be revealed upon reasonable request** from PhD admissions committees, academic supervisors, or peer reviewers.

* To request code or weight access, please open an access request via [GitHub Issues](https://github.com/subashis-dev/medvision-llm/issues/new?title=Code%20Access%20Request%20-%20MedVision-LLM).

---

## 🛡️ Research Notice & License

* **Scope:** Engineered for academic research and educational demonstration only; not intended for clinical diagnosis, screening, or treatment decisions.
* **License:** See [LICENSE](LICENSE).
