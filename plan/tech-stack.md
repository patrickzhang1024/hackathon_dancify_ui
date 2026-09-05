# Tech-Stack Plan — AI Dance Choreography Simulator (targets `plan/feasibility.md`)

> Plan type: tech-stack. Canonical language: English.
> Bilingual pair: `plan/tech-stack.md` (canonical) + `plan/tech-stack_cn.md`.
> Greenfield: no `package.json` / HTML / build config yet. Organized around 3 themes.

## Goal

Define the concrete browser-side stack that realizes `plan/feasibility.md`: audio analysis →
result report; choreographer agent (with API key handling, security, memory module); and
three.js human-model playback driven by a control script. Fits the HTML output target, is
static-deployable, and needs no mandatory backend. **The project will go live after local
tuning**, so this plan adds production hardening and a licensing review.

## Confirmed Decisions (final)

- **Build tooling** = Vite 5.
- **Character / clips** = Mixamo (FBX → glTF).
- **Memory** = IndexedDB + localStorage.
- **Language** = vanilla JS for the MVP (TypeScript optional later).
- **Go-live** confirmed → production hardening + licensing swap plan included below.

## Build Tooling

- **Vite 5** (ESM dev server + static build). Handles WASM assets (essentia / TFJS) and Web
  Workers cleanly; build output is static HTML + JS deployable anywhere. A single-file CDN
  approach is possible for a tiny MVP slice but becomes unwieldy with WASM, so Vite is
  recommended.
- **Vanilla JS** (optional TS). No React needed for the MVP — plain DOM plus a tiny state store.

## Stack Decisions (summary)

| Layer | Choice | Why | License | Alternatives |
|-------|--------|-----|---------|--------------|
| Bundler | Vite 5 | WASM/worker handling, static build | MIT | Parcel, esbuild, raw CDN |
| Audio decode | Web Audio API | native, no dependency | — | ffmpeg.wasm (overkill) |
| MIR features | essentia.js (WASM) + Meyda | rhythm/tonal/timbre + fast spectral | AGPL-3.0 / MIT | aubio.js (backup), custom DSP |
| MIR models | essentia.js-model + TFJS | pretrained genre/mood/valence-arousal | AGPL-3.0 / Apache-2.0 | CLAP/MERT (heavy) |
| Structure seg | custom SSM + novelty (JS) | no good lib; controllable | own code | fixed bar-phrasing fallback |
| LLM client | `fetch` → openDev (OpenAI-compatible) | BYO-key, JSON schema | own code | vendor SDKs (extra weight) |
| Schema validate | Ajv 8 | strict JSON Schema for LLM output | MIT | zod, hand-rolled |
| Memory store | IndexedDB via idb + localStorage | project/prefs persistence | ISC | none / in-memory |
| 3D render | three.js 0.160+ | mature, AnimationMixer, Mixamo | MIT | Babylon.js |
| Character/clips | Mixamo (FBX → glTF) | large humanoid + clip library | Adobe free terms | VRM, custom mocap |

## Theme 1 — Audio Analysis → Result Report

- **Decode**: `AudioContext.decodeAudioData` → Float32 PCM (mono downmix for analysis).
- **Off-main-thread**: run heavy MIR in a **Web Worker** (essentia WASM + TFJS) to keep the UI
  responsive; TFJS backend `wasm` or `webgl`.
- **essentia.js**: `RhythmExtractor2013` / `PercivalBpmEstimator` (BPM / beats / downbeats),
  onset detection, key/scale, spectral descriptors, HPSS for percussive/harmonic split.
- **Meyda**: per-frame RMS/energy, `spectralCentroid`, `spectralContrast`, `spectralFlatness`,
  MFCC, chroma, ZCR (energy + timbre + chroma feeding structure analysis).
- **aubio.js**: onset/tempo backup + BPM cross-check.
- **essentia.js-model (TFJS)**: MusiCNN / Discogs genre, mood (happy/sad/aggressive/relaxed),
  danceability, arousal/valence.
- **Structure**: chroma/MFCC → self-similarity matrix → checkerboard-kernel novelty →
  peak-pick boundaries → cluster segments for `repetition_map`. **Fallback** = fixed 8-bar
  phrases from the beat grid (medium confidence, weakest link).
- **reportBuilder.js** (deterministic): raw features → `CriteriaReport` JSON per the 6-criteria
  taxonomy (label + confidence + evidence).
- **Deps**: essentia.js `^0.1.3`, @tensorflow/tfjs `^4.17`, meyda `^5.6`, aubiojs `^0.1`.

## Theme 2 — API Key + Security + Memory + Choreographer Agent

**LLM client (`agent/openaiClient.js`)**

- `fetch` POST to openDev `/v1/chat/completions` (assume OpenAI-compatible; confirm base URL).
- Structured output: prefer `response_format: { type: 'json_schema' }`; fallback to
  `json_object` + Ajv validation. Retry-with-repair loop on invalid JSON (max N).

**API key handling / SECURITY (theme emphasis)**

- **BYO-key** entered at runtime in the UI; stored in `localStorage` — NEVER hardcode or
  commit (`.gitignore` present). Offer a stricter `sessionStorage`-only mode.
- **Warn the user**: a browser-held key is exposed (OWASP A02 / A07). Production mitigation =
  serverless proxy (Cloudflare Worker / Vercel Edge) holding the key + rate-limit +
  allowed-origins.
- **CSP**: `connect-src` limited to the openDev endpoint. Never log the key; redact it in errors.
- Set spend / scope limits at openDev.
- **Prompt-injection defense** (lyrics are untrusted): strict JSON schema, validate all output,
  lyrics cannot trigger actions beyond schema fields; output treated as **DATA** (no `eval`).

**Memory module (`agent/memory.js`)**

- **Session / short-term**: current report, seeds, 3 scripts, user edits → app state +
  `localStorage` (project autosave).
- **Long-term**: `AgentMemory { preferences: { likedGenres[], dislikedMoves[], intensityBias },
  projects: [{ songId, report, scripts, ratings }], styleProfiles[] }` in **IndexedDB** (idb).
- **Retrieval (MVP)**: tag/key lookup (by genre/mood) → inject relevant prefs + liked past
  routines into the choreographer prompt. No vector DB for the MVP (add later if needed).

**Choreographer agent definition + workflow**

- Two LLM roles: **Lyrics Analyst** (call #1) + **Choreographer** (call #2 ×3). Both openDev.
- **System prompt** = professional-choreographer persona + 6-criteria definitions +
  genre → dance map + move-library manifest (grouped by `bodyState`) + body-state-machine rules
  + output schema.
- **Orchestration** = a small JS state machine (no agent framework): S3 lyrics → S4 seeds
  (crypto RNG + `hash → CreativeBrief` table) → S5 choreographer ×3 → S6 Ajv + state-machine
  validation/repair.
- **Output** = `MotionControlScript` JSON (data), Ajv-validated before render.
- **Deps**: ajv `^8.12`, idb `^8.0` (RNG via `crypto.getRandomValues`).

## Theme 3 — three.js Human Model + Script Control

- **three.js `^0.160`** (ESM) + examples: `GLTFLoader` / `FBXLoader`, `OrbitControls`,
  `SkeletonUtils`.
- **Character**: one consistent Mixamo humanoid rig; animation clips share that skeleton so
  NO retarget is needed (avoids foot-slide). On mismatch, `retargetClip` or a one-rig policy.
- **Playback core (`render/sequencer.js`)**: `AnimationMixer` + `clipAction`; `crossFadeTo` /
  `crossFadeFrom` for transitions; `setEffectiveTimeScale`, `setEffectiveWeight`,
  `action.time`, `play`.
- **Script → control mapping**:
  - Parse `MotionControlScript.timeline`; beats → seconds via `bpm` and `beatGrid`.
  - **Scheduler** in the render loop keyed to **audio `currentTime`** (`AudioBufferSourceNode` /
    `<audio>`) to avoid drift: `expectedBeat = audioTime * bpm / 60`; trigger the next move
    action at its `startBeat`; crossfade from the previous move (insert a transition clip on
    `bodyState` change).
  - **Beat-lock**: `timeScale = clipNativeBpm / targetBpm`, clamp ±15%.
  - **Parametric variation**: `mirror` (pre-baked mirrored clip or root flip), `facingDeg`
    (root `rotation.y`), `travel` (root position offset). `ampScale` = additive / weight-blend
    approximation, or DEFER for the MVP.
  - **Re-sync** if drift > threshold (reset active `action.time` to expected).
- **Scene**: `WebGLRenderer`, ground plane, lights (key + ambient), camera + `OrbitControls`,
  optional shadows. Timeline UI shows sections + current beat.

## Project Structure (Vite)

```
index.html; package.json; vite.config.js
src/
  main.js
  audio/{decode.js, features.js, structure.js, reportBuilder.js, worker.js}
  agent/{openaiClient.js, lyricsAgent.js, choreographer.js, seeds.js, schemas.js, validate.js, memory.js}
  moves/{manifest.json, clips/*.glb}
  render/{scene.js, character.js, sequencer.js, params.js}
  state/store.js
  config/{constants.js  // taxonomies, genre->dance map, state machine}
public/{models/*.glb, wasm assets}
```

## Dependencies (rough versions)

three `^0.160` · essentia.js `^0.1.3` · @tensorflow/tfjs `^4.17` · meyda `^5.6` ·
aubiojs `^0.1` · ajv `^8.12` · idb `^8.0` · vite `^5` (dev). RNG via Web Crypto.

## Production / Go-Live Hardening

- **Hosting**: Vite static build → Cloudflare Pages / Netlify / Vercel (HTTPS, global CDN).
- **Cross-origin isolation**: set COOP `same-origin` + COEP `require-corp` headers if essentia
  WASM uses threads / `SharedArrayBuffer`; otherwise use a single-thread build.
- **Asset delivery**: brotli/gzip, content-hashed filenames + long-cache `max-age`, code-split,
  lazy-load TFJS models + glTF, `preconnect` to CDN + openDev; loading UI + low-end fallback.
- **Security headers**: strict CSP (`connect-src` = openDev + asset CDN only), HSTS,
  `X-Content-Type-Options`.
- **API key at scale**: (a) **BYO-key** = each visitor uses THEIR OWN openDev key (exposed only
  to themselves, acceptable), OR (b) **Managed proxy** = a serverless function holds the OWNER
  key + auth + rate-limit + origin allowlist (needed if users should NOT bring keys). Never ship
  a shared key in client JS.
- **Robustness**: graceful degradation (no lyrics / decode fail / LLM fail / model-load fail),
  retry + repair on LLM JSON, error redaction (no key in logs), optional privacy-aware telemetry.
- **CI/CD**: build on push → deploy to the static host.

## Licensing Review (CRITICAL for going live)

- **essentia.js = AGPL-3.0** and **aubiojs = GPL-3.0** → strong copyleft; a **network-served**
  proprietary product would have to open-source. Meyda (MIT), three.js (MIT),
  @tensorflow/tfjs (Apache-2.0), Ajv (MIT), idb (ISC), Vite (MIT) are safe. Mixamo is free per
  Adobe terms; verify redistribution of clips inside a hosted product.
- **Decision for go-live**: EITHER (a) release the app under an AGPL-compatible license, OR
  (b) swap the copyleft libs for an MIT stack:
  - beat / tempo → `web-audio-beat-detector` (MIT) / `realtime-bpm-analyzer` (MIT);
  - energy / timbre / MFCC / chroma → Meyda (MIT);
  - genre / mood / valence-arousal → self-hosted permissive model (CLAP / own TFJS) OR let the
    LLM infer genre/mood from the extracted features (MIT-safe).
  - Keep essentia / aubio for LOCAL prototyping only if the product will be proprietary.

## Risks & Open Questions

- essentia WASM + TFJS models = MB downloads + compute; use a worker + lazy-load; slow on
  low-end devices.
- JS structure segmentation is the weakest link; ship the fallback bar-phrasing.
- openDev structured-output support (`json_schema` vs `json_object`) is unknown → Ajv fallback.
- Mixamo skeleton consistency is required; `ampScale` is hard in `AnimationMixer` (defer).
- Audio / clip CORS; large glTF load times.
- Browser API key exposure unless proxied.

## Next Steps

1. Scaffold the Vite project + deps + `index.html` shell.
2. Theme 1 worker: decode → essentia beat + energy → minimal `CriteriaReport` (log JSON).
3. Theme 3: load a Mixamo rig, play one clip beat-synced to audio in three.js.
4. Theme 2: `openaiClient` + Ajv schema + one choreographer call over a ~10-clip manifest.
5. Wire the end-to-end thin slice (matches feasibility Next Steps), then expand criteria + memory.

## Final Review Verdict

The stack is coherent, browser-side, static-deployable, and matches `plan/feasibility.md`. Two
go-live blockers were surfaced and addressed: (1) API key exposure → BYO-key or a managed
serverless proxy; (2) AGPL/GPL of essentia/aubio → an MIT-swap path or an AGPL release. With
those handled, the stack is production-ready for an MVP.
