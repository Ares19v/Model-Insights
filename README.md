# Model Insights

A browser-based machine learning evaluation dashboard. Upload a predictions CSV and get an instant visual breakdown of your model's performance — confusion matrix, ROC curve, precision-recall analysis, and per-class metrics. No backend, no data leaves your machine.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Deployed_on-Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white)

---

## What It Does

Most model evaluation happens inside notebooks — scattered, hard to share, and tedious to reproduce. Model Insights turns your raw prediction output into a structured, interactive report in seconds.

Drop in a CSV, and the dashboard computes and renders:

- **Confusion Matrix** — cell-intensity heatmap with raw counts
- **ROC Curve** — with AUC score annotated on the chart
- **Precision-Recall Curve** — with live threshold adjustment via slider
- **Per-class Metrics Table** — Accuracy, Precision, Recall, F1, Support, and weighted averages
- **Class Distribution** — bar chart of label frequencies in your dataset
- **Data Preview** — first 10 rows of your uploaded file

All computation runs entirely in the browser using PapaParse for CSV parsing and Recharts for visualization. Nothing is sent to a server.

---

## CSV Format

Your file must contain at minimum:

| Column | Required | Description |
|---|---|---|
| `y_true` | Yes | Ground truth labels |
| `y_pred` | Yes | Model predicted labels |
| `y_prob` | No | Predicted probability (binary classification only) |

If `y_prob` is present, the ROC curve, Precision-Recall curve, and threshold slider are enabled automatically.

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19 + TypeScript 5 |
| Build Tool | Vite 7 |
| Routing | TanStack Router |
| Data Fetching | TanStack Query v5 |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix UI primitives) |
| Charts | Recharts |
| CSV Parsing | PapaParse |
| Forms | React Hook Form + Zod |
| Deployment | Cloudflare (via `@cloudflare/vite-plugin`) |
| Package Manager | Bun |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ or [Bun](https://bun.sh/)

### Install & Run

```bash
git clone https://github.com/Ares19v/Model-Insights.git
cd Model-Insights

bun install       # or: npm install
bun run dev       # or: npm run dev
```

App runs at `http://localhost:5173`

### Other Commands

```bash
bun run build     # Production build
bun run preview   # Preview production build locally
bun run lint      # Lint the codebase
bun run format    # Format with Prettier
```

---

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── charts/       # Confusion matrix, ROC, PR curve
│   └── ui/           # shadcn/ui primitives
├── routes/           # TanStack Router file-based routes
├── lib/
│   ├── metrics.ts    # Core metric computation (F1, AUC, etc.)
│   └── utils.ts      # Helpers
└── main.tsx          # App entry point
```

---

## Motivation

Built as a practical companion to my [PCB defect detection project](https://github.com/Ares19v/Inspection-Engine), where evaluating model outputs beyond accuracy — particularly per-class recall on imbalanced defect categories — was critical. Wanted a clean, shareable way to do that without opening a notebook.

---

## Built By

[Ares19v](https://github.com/Ares19v)
