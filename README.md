# Code Review Study

A research web app for the **Trust in AI-Generated Code** study.
Participants perform blind code reviews of 4 unlabeled solutions — without knowing which were written by humans and which by AI.

---

## Running Locally

**Requirements:** Node.js 18+ and npm.

```bash
# 1. Install dependencies
cd study-app
npm install

# 2. Start the development server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Production Preview

```bash
npm run build      # compile TypeScript + bundle to dist/
npm run preview    # serve the production build locally
```

The production preview runs at **http://localhost:4173**.

---

## No Backend Required

- All state lives in React context (in-memory — cleared on tab close or refresh).
- The dataset is a static JSON file: `public/data/study-dataset.json`.
- No database, no server, no environment variables needed.
- Responses are exported as a JSON or CSV file downloaded to the participant's device.

---

## Participant Flow

```
Landing page
  → Background survey (skill level, languages, role, review habits, AI familiarity)
  → Category selection (String Processing · Data Structures · Parsing & Conversion · Math & Numeric · Encoding & Checksums · Date & Time)
  → Question list (question count varies per category)
  → Question review
      ├─ Question is single-language (Python or Java)
      ├─ Solutions A / B  (order randomised per participant)
      ├─ Code viewer (syntax-highlighted)
      ├─ Rate each solution across several dimensions (see src/types/session.ts for the current fields)
      └─ Final assessment: best choice + ranking + explanation (unlocked after both rated)
  → Completion — download JSON or CSV, or copy to clipboard
```

---

## Dataset

The app reads `public/data/study-dataset.json`. This file contains 60 questions (30 Python + 30 Java, sourced from CodeSearchNet), each with 2 solutions — 1 human, 1 AI (120 solutions total).

If you regenerate the dataset, copy the output here:

```bash
# From the repo root
cp dataset/study-dataset.json study-app/public/data/study-dataset.json
```

---

## Export Format

Each completed session can be downloaded as:

- **JSON** — full structured export (nested, all fields)
- **CSV** — single flat row per participant (43 columns, suitable for spreadsheets)

Both formats include: session ID, participant background, category, question, language, solution order shown, per-slot ratings, best choice, ranking, and free-text explanation.

See `docs/data-dictionary.md` for the full field reference and `docs/qualtrics-setup.md` for Qualtrics Embedded Data integration.
