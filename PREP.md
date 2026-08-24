# 📊 Model Insights Study Guide (From-Scratch)

Welcome to the beginner's learning guide for **Model Insights**, a serverless, privacy-focused machine learning model evaluation dashboard. This guide will walk you through how client-side data parsing, statistical metrics computation (Precision, Recall, F1, ROC/PR Curves), and serverless edge deployments work together.

---

## 🗺️ Architectural Map

Model Insights uses a **Zero-Backend Architecture** to ensure 100% data privacy. No data ever leaves your computer!

```
                  ┌────────────────────────────────────────┐
                  │          Vite + React 19 Frontend      │
                  │  - Renders dashboard components        │
                  │  - Upload area with CSV validation     │
                  └──────────────────▲─────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────┐
│                        Local Browser                     │
├──────────────────────────────────────────────────────────┤
│ 1. CSV File Drop                                         │
│ 2. PapaParse (Streaming parser converts CSV to JSON)     │
│ 3. lib/metrics.ts (Pure JS/TS computing all metrics)     │
│    - Accuracy, Precision, Recall, F1, Support            │
│    - Confusion Matrix & AUC-ROC / Precision-Recall curves│
│ 4. Recharts (Draws dynamic visual chart layers)          │
└──────────────────────────────────────────────────────────┘
```

---

## ⚙️ Key Concepts & Math

Let's break down the core machine learning metrics computed inside `lib/metrics.ts`:

### 1. The Confusion Matrix
A tabular layout mapping the model's predictions against the actual ground-truth labels.
*   **True Positive (TP)**: Model predicted positive, truth was positive.
*   **False Positive (FP)**: Model predicted positive, truth was negative (Type I error).
*   **False Negative (FN)**: Model predicted negative, truth was positive (Type II error).
*   **True Negative (TN)**: Model predicted negative, truth was negative.

### 2. Core Metrics Formulas
*   **Accuracy**: The overall percentage of correct predictions:
    $$\text{Accuracy} = \frac{\text{TP} + \text{TN}}{\text{TP} + \text{TN} + \text{FP} + \text{FN}}$$
*   **Precision**: Out of everything the model predicted as positive, how much was actually positive?
    $$\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}}$$
*   **Recall (Sensitivity)**: Out of all positive cases in the dataset, how many did the model find?
    $$\text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}}$$
*   **F1-Score**: The harmonic mean of Precision and Recall (excellent for imbalanced datasets):
    $$\text{F1} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$

### 3. Threshold Calibration & Curves
For models that output prediction probabilities (like a number from `0.0` to `1.0` indicating confidence):
*   **ROC Curve (Receiver Operating Characteristic)**: Plots True Positive Rate (Recall) vs False Positive Rate ($FP / (TN+FP)$) at different decision thresholds.
*   **PR Curve (Precision-Recall)**: Plots Precision vs Recall across thresholds. The **Threshold Slider** in the UI allows you to dynamically shift the classification cutoff (e.g. from `0.5` to `0.7`) and watch the Precision, Recall, and Confusion Matrix recalculate instantly!

---

## 🛠️ Step-by-Step Local Deployment

Model Insights uses **Bun** as its primary package manager and runtime engine for blazing-fast setups.

### 1. Build and Run via Bun (Recommended)
1.  **Install Bun**: Install Bun on your system (e.g. `powershell -c "irm bun.sh/install.ps1 | iex"` on Windows).
2.  **Install dependencies**:
    ```bash
    bun install
    ```
3.  **Launch local dev workspace**:
    ```bash
    bun run dev
    ```
    Open `http://localhost:5173` to view the dashboard.

### 2. Standard NPM Command Fallback
If you don't have Bun:
```bash
npm install
npm run dev
```

### 3. Test File Format (CSV Structure)
To evaluate your model, prepare a CSV file with the following headers:
*   `y_true` (the ground truth label, e.g., `0` or `1`)
*   `y_pred` (the model's hard prediction, e.g., `0` or `1`)
*   `y_prob` (optional, the prediction probability confidence float from `0.0` to `1.0`)
