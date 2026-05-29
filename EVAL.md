# EVAL — Model Insights

> **Evaluation Date:** 2026-05-29  
> **Evaluator:** Automated Portfolio Review  
> **Maturity Level:** Production-Ready

---

## 1. Project Purpose & Problem Statement

Model Insights solves a practical developer workflow problem: ML evaluation happens inside Jupyter notebooks, which are hard to share, hard to reproduce, and visually inconsistent. The project provides a browser-based alternative — drop in a predictions CSV and instantly get a confusion matrix, ROC curve, precision-recall curve, per-class metrics table, and class distribution chart, all computed in-browser with no backend, no data upload, and no installation.

The motivation section of the README is honest: it was built as a companion tool to the PCB defect detection project (Inspection Engine), where per-class recall on imbalanced defect categories was the critical metric that aggregate accuracy hid. This makes it a practical tool born from a real need, not an exercise.

---

## 2. Technical Architecture

The architecture is deliberately and correctly frontend-only:

- **Framework:** React 19 + TypeScript 5 (strict type safety throughout)
- **Build:** Vite 7 with `@cloudflare/vite-plugin` for Cloudflare Workers deployment
- **Routing:** TanStack Router (file-based routing)
- **Data Fetching:** TanStack Query v5 (for potential async operations)
- **Styling:** Tailwind CSS v4 + shadcn/ui (Radix UI primitives)
- **CSV Parsing:** PapaParse (streaming CSV parser, handles large files without blocking)
- **Charts:** Recharts (React-native charting, responsive)
- **Metrics Computation:** `lib/metrics.ts` — pure TypeScript functions for F1, AUC, confusion matrix, precision, recall, per-class metrics. All computation runs in the browser.
- **Forms:** React Hook Form + Zod for CSV format validation
- **Deployment:** Cloudflare Workers + Pages via `@cloudflare/vite-plugin`
- **Package Manager:** Bun

**Data flow:** User uploads CSV → PapaParse parses in-browser → `metrics.ts` computes all metrics → Recharts renders charts → No data leaves the machine.

The zero-backend architecture is the correct design choice: ML evaluation data is often sensitive (model performance on proprietary datasets), and a backend that receives predictions CSVs creates both a privacy risk and an infrastructure cost.

---

## 3. Strengths

- **Privacy-by-design** — all computation client-side; no data transmission is a genuine differentiator vs cloud-based ML evaluation tools.
- **Deployed on Cloudflare** — the app is publicly accessible without any server infrastructure; edge deployment via Workers is a modern, cost-effective choice.
- **Comprehensive metric suite** — confusion matrix, ROC curve, PR curve with live threshold slider, per-class F1/precision/recall/support, class distribution, and data preview covers the full standard ML evaluation toolkit.
- **Live threshold adjustment** — the `y_prob` slider that updates the PR curve and threshold metrics in real time is a genuinely useful feature for threshold calibration.
- **TypeScript throughout** — strict typing in `metrics.ts` makes the computation logic auditable and testable.
- **shadcn/ui component library** — Radix UI primitives provide accessible, production-grade UI components out of the box.
- **TanStack Router + Query** — modern, type-safe routing and async state management that scales well.
- **Bun as package manager** — faster installs and runs; reflects awareness of modern tooling.
- **Multi-class and binary support** — `y_prob` column activates ROC/PR curves only for binary classification; multi-class falls back gracefully.

---

## 4. Limitations & Known Gaps

- **No multi-class ROC support.** ROC/PR curves are binary-only (single `y_prob` column). Multi-class ROC requires one-vs-rest probability columns (e.g., `y_prob_class_0`, `y_prob_class_1`...). This is a meaningful gap for models with >2 classes.
- **No multi-label support.** Models that predict multiple labels per sample are not handled.
- **No CSV format validation beyond required column names.** A file with the right headers but incorrect data types (e.g., string labels vs integers) will likely produce silent errors or NaN metrics rather than a clear error message.
- **No export functionality.** Charts and metrics cannot be exported as PNG images or PDF without a browser screenshot. A "Download PNG" button on each chart would make the tool immediately shareable.
- **No sample CSV file or demo dataset.** A first-time user must know the exact format before the tool is useful. An included sample.csv or a "Load demo data" button would dramatically reduce time-to-value.
- **No model comparison mode.** Comparing metrics across two models side-by-side (which is the primary use case when iterating) requires opening two browser tabs and mentally comparing numbers.
- **No persistence.** Refreshing the page loses the loaded dataset; browser `localStorage` caching would make the tool more practical for iterative use.

---

## 5. Code Quality Assessment

**Structure:** Clean `src/` layout with `components/charts/`, `components/ui/`, `routes/`, and `lib/`. The separation of metric computation into `lib/metrics.ts` makes the math testable independently of the UI.

**Documentation:** README is concise and accurate — covers what it does, the CSV format spec, tech stack, and getting started. Honest about its motivation. Not over-documented.

**TypeScript:** React 19 + TypeScript 5 with TanStack Router provides strong compile-time safety. The `lib/metrics.ts` module is the core logic and should be the most carefully typed component.

**Test Coverage:** Linting is configured (`bun run lint`, `bun run format`). No unit tests for `metrics.ts` computation logic. Given that this is a pure computation module with known-correct outputs (confusion matrix, AUC-ROC, F1), it is well-suited for property-based testing.

**Deployment:** Cloudflare Workers deployment via `@cloudflare/vite-plugin` is production-grade edge deployment. No server costs, global edge distribution.

---

## 6. Maturity Breakdown

| Dimension | Score | Notes |
|-----------|-------|-------|
| Functionality | 7/10 | Core metric suite complete; missing multi-class ROC, export, comparison mode |
| Code Quality | 8/10 | TypeScript throughout; clean structure; thin test coverage |
| Documentation | 7/10 | Concise and accurate; needs a sample CSV and demo button |
| Scalability | 9/10 | Cloudflare edge deployment; client-side compute scales infinitely |
| Security | 10/10 | Zero backend; no data transmission; privacy-by-design |
| **Overall** | **8.2/10** | Most deployment-mature frontend project in the portfolio |

---

## 7. Suggested Next Steps

1. **Add a "Load demo data" button** with a bundled sample CSV covering a multi-class scenario. This eliminates the format-discovery friction for new users and makes the live Cloudflare deployment immediately self-explanatory.
2. **Implement multi-class ROC (one-vs-rest).** Accept `y_prob_<class>` columns and plot per-class ROC curves — this is the most impactful functionality gap for the primary use case (multi-class model evaluation).
3. **Add chart export.** A "Download PNG" button on each Recharts chart (using `html2canvas` or `recharts` SVG export) would make the tool shareable for reports and slides without a screenshot.

---

## 9. Verdict

Model Insights is the most deployment-mature frontend project in the portfolio. The privacy-by-design, zero-backend architecture is the right call for an evaluation tool that handles potentially sensitive prediction data, and the Cloudflare Workers deployment means it is genuinely live and accessible without any server infrastructure cost. The metric suite is comprehensive for binary classification, and the live threshold slider on the PR curve is a thoughtful UX touch. The main gaps are multi-class ROC support, chart export, and the absence of demo data — all achievable additions that would make the tool immediately self-explanatory to any ML practitioner who lands on the Cloudflare URL.
