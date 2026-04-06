# Data Dictionary

Schema reference for the JSON and CSV exports produced by the Code Review Study app.

---

## Export formats

| Format | Filename                              | Structure         |
|--------|---------------------------------------|-------------------|
| JSON   | `code-review-study-{sessionId}.json`  | Nested object     |
| CSV    | `code-review-study-{sessionId}.csv`   | One header row + one data row |

The JSON and CSV exports contain the same data. JSON preserves nested structure (arrays, objects); CSV flattens everything to a single row.

---

## Top-level JSON structure

```
{
  meta:             { … }   session metadata
  participant:      { … }   background questionnaire answers
  session:          { … }   question + language + solution order
  ratings:          { … }   per-slot review scores
  finalAssessment:  { … }   best choice + ranking + explanation
}
```

---

## `meta`

| Field          | Type   | Description                                    | Example                       |
|----------------|--------|------------------------------------------------|-------------------------------|
| `sessionId`    | string | Unique session identifier. Also the participant ID used as the randomization seed. | `s-lc3k7-x9q2r` |
| `exportedAt`   | string | ISO-8601 timestamp of when the export was triggered. | `2026-04-05T14:22:31.000Z` |
| `studyVersion` | string | Study app schema version.                      | `1.0`                         |

---

## `participant`

All values come from the Background questionnaire (Step 1 of the study).

| Field                | Type     | Values / range                                                    |
|----------------------|----------|-------------------------------------------------------------------|
| `id`                 | string   | Same as `meta.sessionId`.                                         |
| `skillLevel`         | string   | `beginner` \| `intermediate` \| `advanced` \| `expert`           |
| `yearsExperience`    | string   | `< 1 year` \| `1–2 years` \| `3–5 years` \| `6–10 years` \| `10+ years` |
| `primaryLanguages`   | string[] | One or more of: `Python`, `Java`, `C`, `C++`, `JavaScript`, `TypeScript`, `Go`, `Rust`, `Swift`, `Kotlin`, `Other` |
| `role`               | string   | `student` \| `junior` \| `mid` \| `senior` \| `staff` \| `researcher` \| `other` |
| `reviewFrequency`    | string   | `never` \| `rarely` \| `monthly` \| `weekly` \| `daily`          |
| `aiFamiliarity`      | string   | `never` \| `aware` \| `occasional` \| `regular` \| `heavy`       |
| `languageConfidence` | integer  | 1–5. Self-rated confidence reviewing the chosen language.         |

---

## `session`

Information about the specific question and language the participant reviewed.

| Field           | Type     | Description                                                                   |
|-----------------|----------|-------------------------------------------------------------------------------|
| `category`      | string   | Problem category chosen: `Arrays`, `Strings`, or `Hashes`                    |
| `questionId`    | string   | Dataset question identifier (e.g. `arr-001`)                                  |
| `questionTitle` | string   | Human-readable question title                                                 |
| `language`      | string   | Programming language selected for review                                      |
| `startedAt`     | string   | ISO-8601 timestamp of when the review session started                         |
| `solutionOrder` | string[] | Array of 4 solutionIds, indexed by slot position. Index 0 = slot A, 1 = B, 2 = C, 3 = D. |
| `slotMapping`   | object   | Map from slot label to solutionId: `{ "A": "arr-001-h-a", "B": "arr-001-ai-r", … }` |

### Decoding `solutionOrder` / `slotMapping`

The slot labels (A, B, C, D) are positional only and carry no information about origin. To determine whether a given slot was human-written or AI-generated, join `solutionId` against the `_hidden` metadata in `study-dataset.json` using the `solutionId` as key:

```
solutionId → study-dataset.json → questions[*].solutionsByLanguage[lang].solutions[*]
                                      where solutionId matches → ._hidden.origin
```

`_hidden.origin` values: `human` | `ai`

This join is performed by the researcher **after** data collection. It is never exposed to participants.

---

## `ratings`

A map from slot label (`A`, `B`, `C`, `D`) to the participant's review of that slot.

```json
{
  "A": { … },
  "B": { … },
  "C": { … },
  "D": { … }
}
```

Each slot entry:

| Field                   | Type    | Description                                              | Range |
|-------------------------|---------|----------------------------------------------------------|-------|
| `solutionId`            | string  | The solutionId that was shown in this slot               | —     |
| `trustScore`            | integer | "How much do you trust this solution is correct?"        | 1–5   |
| `readability`           | integer | "How easy is this to read and follow?"                   | 1–5   |
| `correctnessConfidence` | integer | "Does it handle all edge cases?"                         | 1–5   |
| `averageScore`          | float   | Mean of trust + readability + correctnessConfidence      | 1.00–5.00 |
| `bugConcern`            | string  | `none` \| `minor` \| `major`                            | —     |
| `notes`                 | string  | Free-text reviewer notes (may be empty)                  | —     |

---

## `finalAssessment`

Submitted only after all 4 slots have been rated. Will be `null` if the participant did not complete the final assessment step.

| Field                    | Type       | Description                                                    |
|--------------------------|------------|----------------------------------------------------------------|
| `bestChoice`             | string     | Slot label the participant would approve in a real review (A–D) |
| `bestChoiceSolutionId`   | string     | solutionId corresponding to `bestChoice`                       |
| `ranking`                | string[]   | 4-element array from best to worst, e.g. `["C","A","D","B"]`   |
| `rankingSolutionIds`     | string[]   | solutionIds in ranking order (same index as `ranking`)          |
| `rankingSummary`         | string     | Human-readable ranking string, e.g. `C > A > D > B`            |
| `explanation`            | string     | Free-text explanation of what influenced judgment (may be empty) |

---

## CSV column list

The CSV export flattens the above into one row. Columns in order:

| Column                          | Source path                                    |
|---------------------------------|------------------------------------------------|
| `sessionId`                     | `meta.sessionId`                               |
| `exportedAt`                    | `meta.exportedAt`                              |
| `studyVersion`                  | `meta.studyVersion`                            |
| `skillLevel`                    | `participant.skillLevel`                       |
| `yearsExperience`               | `participant.yearsExperience`                  |
| `primaryLanguages`              | `participant.primaryLanguages` (semicolon-separated) |
| `role`                          | `participant.role`                             |
| `reviewFrequency`               | `participant.reviewFrequency`                  |
| `aiFamiliarity`                 | `participant.aiFamiliarity`                    |
| `languageConfidence`            | `participant.languageConfidence`               |
| `category`                      | `session.category`                             |
| `questionId`                    | `session.questionId`                           |
| `language`                      | `session.language`                             |
| `startedAt`                     | `session.startedAt`                            |
| `solutionOrder`                 | `session.solutionOrder` (semicolon-separated)  |
| `slotA_solutionId`              | `ratings.A.solutionId`                         |
| `slotA_trustScore`              | `ratings.A.trustScore`                         |
| `slotA_readability`             | `ratings.A.readability`                        |
| `slotA_correctnessConfidence`   | `ratings.A.correctnessConfidence`              |
| `slotA_averageScore`            | `ratings.A.averageScore`                       |
| `slotA_bugConcern`              | `ratings.A.bugConcern`                         |
| `slotA_notes`                   | `ratings.A.notes`                              |
| `slotB_solutionId` … `slotB_notes` | (same pattern for B)                       |
| `slotC_solutionId` … `slotC_notes` | (same pattern for C)                       |
| `slotD_solutionId` … `slotD_notes` | (same pattern for D)                       |
| `bestChoice`                    | `finalAssessment.bestChoice`                   |
| `bestChoiceSolutionId`          | `finalAssessment.bestChoiceSolutionId`         |
| `rankingSummary`                | `finalAssessment.rankingSummary`               |
| `rankingSolutionIds`            | `finalAssessment.rankingSolutionIds` (semicolon-separated) |
| `explanation`                   | `finalAssessment.explanation`                  |

Total: **43 columns** per participant row.

---

## Merging multiple participants

Each export file contains one participant's data. To aggregate across participants:

**JSON approach** — write a script that loads all `*.json` files and maps each `meta.sessionId` to the fields of interest.

**CSV approach** — open all `*.csv` files and concatenate them. All files share identical headers, so a simple row-append merge is sufficient. Verify row count matches participant count.

---

## Linking to the dataset

To analyse ratings by solution origin (human vs AI), join each `solutionId` to the `_hidden` block in `study-dataset.json`:

```python
import json

with open("study-dataset.json") as f:
    dataset = json.load(f)

# Build index: solutionId → hidden metadata
hidden_index = {}
for q in dataset["questions"]:
    for lang_block in q["solutionsByLanguage"].values():
        for sol in lang_block["solutions"]:
            hidden_index[sol["solutionId"]] = sol["_hidden"]

# Example: get origin for a slot
origin = hidden_index["arr-001-h-a"]["origin"]  # "human" or "ai"
```

Keep `study-dataset.json` on the researcher's machine only. Do not share it with participants.
