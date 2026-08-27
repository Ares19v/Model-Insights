<div align="center">

# ?? Model Insights
### Browser-Based Machine Learning Evaluation & Diagnostics Dashboard

[![CI](https://github.com/Ares19v/Model-Insights/actions/workflows/ci.yml/badge.svg)](https://github.com/Ares19v/Model-Insights/actions/workflows/ci.yml)


[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TanStack Router](https://img.shields.io/badge/TanStack_Router-v1-FF4154?style=for-the-badge&logo=react-query)](https://tanstack.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Instant, client-side ML model evaluation. Upload your raw predictions CSV and generate interactive confusion matrices, ROC/PR curves, per-class metrics, and error analysis without your sensitive data ever leaving your machine.</b>
</p>

</div>

---

## ?? Overview

**Model Insights** is a zero-backend, client-side diagnostics workbench for data scientists and ML engineers. Instead of writing repetitive matplotlib or scikit-learn boilerplate to inspect classification runs, drag and drop any predictions CSV file to immediately explore interactive performance charts, threshold sliders, and misclassification deep-dives.

---

## ? Key Features

- **?? 100% Privacy & Security**: All CSV parsing and statistical calculations occur inside your browser using PapaParse and Web Workers. No model outputs or proprietary data are ever sent over the network.
- **?? Interactive Confusion Matrix**: Dynamic normalization (raw count, true-class recall, predicted precision) with clickable cells to inspect specific false positive / false negative prediction sets.
- **?? ROC & Precision-Recall Curves**: Interactive threshold sliders allowing you to calibrate decision boundaries and observe real-time trade-offs between precision and recall.
- **?? Multi-Class & Binary Metrics**: Automatic computation of Macro/Micro F1-Score, Accuracy, Log-Loss, MCC (Matthews Correlation Coefficient), and Balanced Accuracy.
- **?? Slice-Based Error Analysis**: Filter model performance across custom dataset attributes to uncover hidden edge cases and subpopulation bias.
- **?? Blazing Fast & Lightweight**: Powered by React 19, Vite, TanStack Router, and Web Worker multithreading capable of parsing hundred-thousand row prediction sets smoothly.

---

## ??? Tech Stack & Architecture

```
Model-Insights/
??? src/
?   ??? components/         # Metric cards, threshold sliders, UploadZone
?   ??? components/charts/  # ROC, PR curve, Confusion Matrix & Bar charts
?   ??? components/ui/      # Radix UI primitives & Tailwind components
?   ??? routes/             # TanStack Router file-based route tree
?   ??? utils/              # Client-side statistics, metrics calculation & CSV parsers
?   ??? styles.css          # Tailwind CSS styles
??? EVAL.md                 # Evaluation report & benchmark metrics
??? vite.config.ts          # Vite build pipeline
??? package.json            # Dependencies and scripts
```

---

## ?? Quick Start

### Prerequisites
- Node.js 18+ (or Bun)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/Ares19v/Model-Insights.git
cd Model-Insights

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

© 2025 Devansh Tyagi (Ares19v). All Rights Reserved.
