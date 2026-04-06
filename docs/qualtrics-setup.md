# Qualtrics Setup Guide

How to link the Code Review Study app to a Qualtrics survey using Embedded Data URL parameters.

---

## Overview

This study app is **static and self-contained**. All data lives in the participant's browser memory and is exported as JSON or CSV. For studies that require a follow-up Qualtrics survey (e.g. debrief, additional questions, institutional consent forms), session metadata can be forwarded to Qualtrics by appending URL query parameters to the survey link.

Qualtrics reads these parameters from the URL and stores them automatically as **Embedded Data** — no backend required.

---

## How Qualtrics Embedded Data works

1. A participant clicks a survey link of the form:
   ```
   https://your-institution.qualtrics.com/jfe/form/SV_XXXX?sessionId=s-abc123&category=Arrays&...
   ```
2. Qualtrics parses each `key=value` pair in the URL query string.
3. If you have declared those field names in the **Survey Flow → Embedded Data** block, Qualtrics stores them alongside the survey response.
4. The fields appear in your downloaded data exports alongside all survey question responses.

---

## Step-by-step Qualtrics configuration

### 1. Open Survey Flow

In your Qualtrics survey editor, click **Survey Flow** in the left sidebar.

### 2. Add an Embedded Data block

Click **Add a New Element Here** → **Embedded Data**.

Place this block **before** any survey questions (at the top of the flow).

### 3. Declare the seven fields

Add each field name exactly as listed below (case-sensitive):

| Field name              | Description                                                    |
|-------------------------|----------------------------------------------------------------|
| `sessionId`             | Unique participant session ID (e.g. `s-lc3k7-x9q2r`)          |
| `category`              | Problem category reviewed (e.g. `Arrays`, `Strings`, `Hashes`) |
| `questionId`            | Dataset question ID (e.g. `arr-001`)                          |
| `language`              | Programming language used (e.g. `Python`, `Java`)             |
| `solutionOrder`         | Comma-separated solutionIds in slot order A,B,C,D             |
| `selectedBestSolution`  | Slot label the participant chose as best (A, B, C, or D)       |
| `rankingSummary`        | Full ranking string (e.g. `A > C > B > D`)                    |

For each field, leave the **Value** column blank — Qualtrics will populate it from the URL.

### 4. Get the survey link

Go to **Distributions → Anonymous Link** and copy the base URL. It will look like:

```
https://your-institution.qualtrics.com/jfe/form/SV_XXXX
```

### 5. Construct the handoff URL

On the **Completion Page** of this app, expand **Qualtrics Handoff (Researcher)** and click **Copy** next to the URL Parameters block. This copies a pre-built query string containing the 7 fields with the current session's live values, for example:

```
sessionId=s-lc3k7-x9q2r&category=Arrays&questionId=arr-001&language=Python&solutionOrder=arr-001-h-a%2Carr-001-ai-r%2Carr-001-h-b%2Carr-001-ai-c&selectedBestSolution=C&rankingSummary=C+%3E+A+%3E+D+%3E+B
```

Append it to your base survey URL with a `?`:

```
https://your-institution.qualtrics.com/jfe/form/SV_XXXX?<paste here>
```

### 6. Deliver the link to the participant

Options:
- **Display the full URL on the completion page** — add a "Continue to Qualtrics →" button in `CompletionPage.tsx` that opens `QUALTRICS_BASE_URL + "?" + buildQualtricsParams(payload)`. Store the base URL as a Vite env variable (`VITE_QUALTRICS_URL`).
- **Researcher-mediated** — researcher manually constructs and shares the link for each participant session.
- **Batch upload** — collect JSON/CSV exports from multiple participants, then use Qualtrics Data Import to upload responses in bulk.

---

## Adding a "Continue to Qualtrics" button (optional)

In `vite.config.ts` or a `.env` file:

```env
VITE_QUALTRICS_URL=https://your-institution.qualtrics.com/jfe/form/SV_XXXX
```

In `CompletionPage.tsx`, after the export section:

```tsx
const qualtricsBase = import.meta.env.VITE_QUALTRICS_URL;
const qualtricsUrl  = qualtricsBase
  ? `${qualtricsBase}?${buildQualtricsParams(payload)}`
  : null;

{qualtricsUrl && (
  <a href={qualtricsUrl} target="_blank" rel="noopener noreferrer">
    <Button size="lg">Continue to Qualtrics Survey →</Button>
  </a>
)}
```

This requires no backend — the URL is constructed entirely in the browser.

---

## Data validation

After data collection, verify that embedded data imported correctly by checking your Qualtrics **Data & Analysis** tab. Each embedded field should appear as a column. Cross-reference:

- `sessionId` matches the `meta.sessionId` in the participant's downloaded JSON file.
- `questionId` matches the question they reviewed.
- `solutionOrder` is a comma-separated list of 4 solutionIds — decode it to recover the A/B/C/D → solutionId mapping.

---

## Batch CSV workflow (alternative to URL params)

1. Collect `.json` or `.csv` exports from all participants.
2. Merge into a single spreadsheet (the CSV export is already one row per participant).
3. Use Qualtrics **Data Import** (under Data & Analysis → Import Data) to upload.
4. Map CSV columns to Qualtrics question fields.

This approach works if participants cannot self-direct to Qualtrics after the study session.

---

## Security notes

- The 7 Qualtrics fields contain **no sensitive personal data** — only study metadata.
- The `solutionOrder` field reveals which solutionIds were shown, but solutionIds alone do not disclose whether a solution is human-written or AI-generated. That mapping exists only in `study-dataset.json` on the researcher's machine.
- Do not include `_hidden` metadata from the dataset in any participant-facing URL.
