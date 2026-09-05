---
description: "Produce a project plan as bilingual Markdown docs (English xxx.md + Chinese xxx_cn.md) under plan/. Supports three plan types: code tech stack, design style, and principle feasibility."
name: "Plan"
argument-hint: "<plan-type> <topic> — type is one of: tech-stack | design-style | feasibility"
agent: "agent"
---

# Plan Generation

Create a plan and write it to the `plan/` directory (create the folder if missing) as a **bilingual pair**:

- `plan/<slug>.md` — English (canonical source of truth)
- `plan/<slug>_cn.md` — Chinese (中文), a faithful translation of the English file

Both files MUST have the same structure, headings order, tables, and section count. Only the language of the prose differs. Keep code snippets, identifiers, commands, and library names identical in both files (do not translate code).

## Inputs

- **plan-type**: one of `tech-stack`, `design-style`, `feasibility`.
- **topic**: what the plan is about. If not given, infer it from the current workspace and ask one clarifying question only if the topic is genuinely ambiguous.

Derive `<slug>` from the plan type unless the user gives a name:
- `tech-stack` → `tech-stack`
- `design-style` → `design-style`
- `feasibility` → `feasibility`

If multiple plans of the same type exist, suffix with the topic (e.g. `feasibility-realtime-pose`).

## Rules

- Ground the plan in the actual workspace: read relevant files before writing. Do not invent files, APIs, or versions that do not exist.
- Prefer concrete, decision-ready content over generic advice. State choices AND the reason, not just options.
- Keep it minimal and honest: call out risks, unknowns, and trade-offs explicitly. Never pad with filler.
- Write the English `.md` first, then produce `_cn.md` as a 1:1 translation. Do not add or drop sections between the two.
- Do not touch source code — this prompt only produces planning docs.

## Plan Type Templates

### 1. tech-stack (代码技术栈)

```markdown
# Tech Stack Plan — <topic>

## Goal
One paragraph: what we are building and the core technical constraints.

## Stack Decisions
| Layer | Choice | Why | Alternatives considered |
|-------|--------|-----|-------------------------|
| Language / Runtime | | | |
| Framework | | | |
| Key libraries | | | |
| Data / Storage | | | |
| Build / Tooling | | | |
| Testing | | | |

## Dependencies
Concrete packages with rough version ranges and what each is for.

## Project Structure
Proposed folder layout with a one-line purpose per folder.

## Risks & Open Questions
Bullet list of unknowns, compatibility concerns, and things to validate.

## Next Steps
Ordered, actionable steps to stand up the stack.
```

### 2. design-style (设计风格)

```markdown
# Design Style Plan — <topic>

## Design Direction
The intended look, feel, and mood in 2–3 sentences.

## Principles
3–6 guiding rules (e.g. clarity over decoration).

## Visual System
| Token | Value | Notes |
|-------|-------|-------|
| Color palette | | |
| Typography | | |
| Spacing / Grid | | |
| Radius / Elevation | | |
| Motion | | |

## Components
Key UI components and how the style applies to each.

## References
Inspiration, moodboard notes, or existing patterns in the repo.

## Risks & Open Questions
Accessibility, contrast, responsiveness, and consistency concerns.

## Next Steps
Ordered steps to implement the design system.
```

### 3. feasibility (原理可行性)

```markdown
# Feasibility Plan — <topic>

## Objective
What we want to prove is possible, and the success criteria.

## Core Principle
The underlying mechanism / theory in plain terms, with the key formula(s) if any.

## Approach
How we would actually build/validate it, step by step.

## Assumptions & Constraints
What must hold true; hardware, data, latency, or accuracy limits.

## Evidence
| Claim | Support | Confidence |
|-------|---------|------------|
| | | |

## Risks & Failure Modes
Where it could break and the impact of each.

## Verdict
Feasible / Feasible-with-caveats / Not-feasible — with the deciding reason.

## Next Steps
Smallest experiment or prototype to de-risk the biggest unknown.
```

## Workflow

1. Parse `plan-type` and `topic`. Validate the type is one of the three.
2. Explore the workspace for relevant context.
3. Fill the matching template with concrete, grounded content → write `plan/<slug>.md`.
4. Translate faithfully into Chinese → write `plan/<slug>_cn.md` (code stays untranslated).
5. Report the two file paths and a 1–2 line summary of the key decisions.
