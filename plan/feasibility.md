# Feasibility Plan — AI Dance Choreography Simulator (music + lyrics → three.js)

> Plan type: feasibility (原理可行性). Canonical language: English.
> Bilingual pair: `plan/feasibility.md` (this file) + `plan/feasibility_cn.md` (Chinese).

## Objective

Build a fully browser-side HTML / three.js app that takes a music track (and optional
lyrics), analyzes it against six choreography review criteria, produces a criteria report
(audio analysis fine-tuned by lyrics), then a professional-choreographer agent turns the
report plus three random creative seeds into three distinct motion-control scripts that
drive a rigged virtual character to dance in sync with the music.

**Success criteria**: one song yields ≥3 beat-synced, section-appropriate dance takes
playable on a character, with measurable on-beat accuracy and section/energy alignment,
covering multiple body states (standing, sitting, floor/lying, jumps).

## Confirmed Decisions

- Playback = three.js in an HTML page (real-time, no game engine).
- Fully client-side: MIR + LLM + render all run in the browser. No mandatory backend.
- LLM called from the browser via a user-provided API key (BYO-key). See Security Review.
- LLM provider = **openDev** (small model proxy). Assumed OpenAI-compatible
  `/chat/completions`; base URL + model IDs are runtime config (confirm exact endpoint).
- Seed → creative direction = deterministic **hash table** (reproducible).
- Move library = **pose/body-state categorized clips + transition state machine +
  parametric variation**, delivering high freedom incl. stand / sit / floor(lie) / air(jump).

## Core Principle

MIR (Music Information Retrieval) features map to choreographic decisions:
beat/tempo → step timing; structure (verse/chorus/bridge) → phrasing & signature moves;
RMS/loudness energy → movement amplitude/level; valence-arousal → movement quality;
timbre → texture/accents; genre → movement vocabulary (which clip subset).

An LLM acting as a "choreographer" reasons over the structured report to compose a symbolic
timeline = the **motion control script**. Motion is realized clip-based: tagged Mixamo/glTF
clips are time-warped to the beat grid and crossfaded on a humanoid rig via three.js
`AnimationMixer`. Generative motion (EDGE / Bailando) is a later upgrade, not the MVP.

## Six Review Criteria — Concrete Taxonomies

Each criterion = definition + allowed value set + how measured (browser JS) + how it drives
the dance.

1. **Rhythm (节奏)**
   - `tempo_bpm`: number; `tempo_class`: {very_slow <70, slow 70-95, medium 95-115,
     upbeat 115-135, fast 135-160, very_fast >160}
   - `meter`: {4/4, 3/4, 6/8, 2/4, irregular}; `groove`: {straight, swing, shuffle, syncopated}
   - `rhythmic_density`: {sparse, moderate, busy}
   - Measured: essentia.js `RhythmExtractor2013` / `PercivalBpmEstimator`, aubio.js onset.
   - Drives: step timing, moves-per-bar switch rate, syncopation accents.

2. **Emotion (情绪)**
   - `valence`: 0-1 {negative, neutral, positive}; `arousal`: 0-1 {calm, moderate, high}
   - `mood_label`: {happy, joyful, energetic, triumphant, romantic, tender, dreamy,
     melancholic, sad, nostalgic, tense, dark, aggressive, playful}
   - Measured: essentia.js TFJS MusiCNN mood/arousal-valence models; refined by lyrics LLM.
   - Drives: movement quality (sharp vs smooth), gesture dynamics, expression tag.

3. **Music Structure (音乐结构)**
   - `sections[]`: {label ∈ [intro, verse, pre_chorus, chorus, drop, bridge, breakdown,
     instrumental, outro], start_s, end_s, bars}; `repetition_map`: e.g. "A B A B C B"
   - Measured: chroma/MFCC self-similarity matrix + novelty peak-picking in JS (medium
     confidence); fallback = fixed bar phrasing from the beat grid.
   - Drives: phrasing, energy resets, signature move on chorus/drop.

4. **Energy Change (能量变化)**
   - `per_section_energy`: {low, medium, high}; `contour`: curve; `events`: {build_up, drop,
     sustain, decay}; `transition_type`: {sudden, gradual}
   - Measured: Meyda RMS/loudness per frame → per-section aggregation + delta detection.
   - Drives: amplitude, jumps/level changes, intensity ramps synced to build-ups/drops.

5. **Timbre (音色)**
   - `brightness`: {dark, warm, neutral, bright} (spectral centroid);
     `texture`: {smooth, rough, percussive, harmonic} (spectral contrast + HPSS)
   - `dominant_instruments` (multi-label): {vocal, piano, guitar_acoustic, guitar_electric,
     synth, strings, brass, drums_acoustic, drums_electronic, bass, orchestral}
   - Measured: Meyda `spectralCentroid`/`spectralContrast`/`mfcc`; essentia.js timbre descriptors.
   - Drives: fluid vs staccato texture, isolation vs full-body, accent hits on percussive timbres.

6. **Music Style / Genre (音乐风格)**
   - `genre`: {pop, rock, hiphop, rap, rnb, reggae, dancehall, edm, house, techno, dubstep,
     trap, jazz, funk, disco, soul, blues, latin, reggaeton, salsa, kpop, jpop, classical,
     folk, country, metal, ballad, afrobeat, ambient}
   - `dance_genre` (derived): {street_hiphop, breaking, popping, locking, house_dance,
     shuffle, jazz_funk, commercial_kpop, contemporary, lyrical, salsa, reggaeton, dancehall,
     waltz, ballet, freestyle}
   - Measured: essentia.js TFJS genre classifier (MusiCNN / Discogs).
   - genre → dance map: reggae/dancehall → dancehall; hiphop/rap/trap → street/popping;
     edm/house → shuffle/house_dance; pop/kpop → commercial/jazz_funk;
     ballad/slow-rnb → contemporary/lyrical; latin/reggaeton → reggaeton/salsa;
     rock/metal → energetic freestyle; classical → ballet/contemporary.
   - Drives: which clip subset the choreographer draws from.

## Choreographer Agent Workflow (browser, BYO-key)

Deterministic JS and LLM reasoning are strictly separated. Only two steps use the LLM.

- **[JS] S0 Ingest**: decode audio (`AudioContext.decodeAudioData`) + optional lyrics (text/LRC).
- **[JS] S1 Feature extraction**: essentia.js (WASM) + Meyda + aubio.js → raw features.
- **[JS] S2 Report builder**: map raw features into the six-criteria taxonomy →
  `CriteriaReport` JSON (label + confidence + evidence per criterion).
- **[LLM #1] S3 Lyrics Analyst**: input {lyrics, CriteriaReport} → output {per-section
  emotion/energy adjustments, theme, narrative arc, keywords}. Merge → `RefinedReport`.
  Skipped for instrumental tracks.
- **[JS] S4 Seed generation**: `crypto` RNG → 3 random strings. Deterministic
  `hash(seed)` → `CreativeBrief` {dance_genre, energy_bias, complexity, spatial_style,
  body_state_bias, signature_moves[]} (reproducible; guarantees diversity across the 3).
- **[LLM #2 ×3] S5 Choreographer**: per seed, input {RefinedReport, CreativeBrief,
  MoveLibraryManifest} → `MotionControlScript` JSON. 3 seeds → 3 scripts.
- **[JS] S6 Validation**: JSON-schema check, clip IDs exist, beats align, no gaps/overlaps,
  AND body-state machine legal (every state change has a transition clip); repair or
  re-prompt on failure. The script is **data, not code** — never `eval`.
- **[JS] S7 Sequencer + render**: three.js `GLTFLoader` clips, `AnimationMixer` crossfade,
  `action.timeScale = clip_native_bpm / target_bpm`, start aligned to audio `currentTime`
  beat grid.

## JSON Schemas (outline)

- `CriteriaReport`: {rhythm, emotion, structure, energy, timbre, style} — each object per
  the taxonomy above.
- `CreativeBrief`: {seed, dance_genre, energy_bias, complexity, spatial_style,
  body_state_bias, signature_moves[]}
- `MoveLibraryManifest`: [{clipId, name, type:{dance|transition|idle},
  bodyState:{stand|sit|floor|air}, fromState, toState (for transitions), danceGenres[],
  energy, mood[], beats, loopable, mirrorable}]
- `MotionControlScript`: {bpm, beatGrid, timeline:[{sectionLabel, startBeat, endBeat,
  moves:[{clipId, startBeat, durationBeats, intensity, facingDeg, mirror, ampScale, travel,
  transitionIn}]}]}

## Move Library & Body-State Machine (high-freedom design)

Goal: high apparent freedom and many locomotion/pose types (stand / sit / floor-lie /
air-jump) while staying controllable and beat-syncable.

- Clips tagged by `bodyState`: STAND, SIT, FLOOR (lie/kneel), AIR (jump/leap).
- Two clip kinds: **dance** clips (occur within a state) + **transition** clips (change state).
- State machine (each transition needs a matching transition clip):
  STAND↔SIT, STAND↔FLOOR, SIT↔FLOOR, STAND→AIR→STAND (air only via jump, returns to stand).
- The choreographer sequences dance clips within a state and MUST insert a transition clip
  whenever `bodyState` changes. S6 rejects any state jump lacking a transition clip.
- Freedom multipliers WITHOUT new clips (parametric variation in the script): `mirror` (L/R),
  `facingDeg` rotation, `ampScale` (amplitude), `travel` (spatial displacement),
  `timeScale` within ±15% BPM for beat-lock.
- Source: Mixamo packs cover idle / sit / get-up / floor / jump / dance; supplement gaps.
  Keep one consistent Mixamo humanoid rig to avoid retarget / foot-slide.
- The choreographer prompt receives the manifest grouped by `bodyState` plus the transition
  map, so it composes valid, varied, cross-state routines.

## Architecture Review

- **Principle**: sound. MIR → structured report → LLM composition → beat-locked clip
  playback is a proven decomposition. The weakest assumption is subjective quality; mitigated
  by a curated clip library + hard beat-lock + schema validation.
- **Logic**: a clean DAG — Audio → Features → Report → (lyrics) → RefinedReport → (×3 seeds)
  → 3 Scripts → Playback. Determinism everywhere except the two reasoning/creative points
  (lyrics interpretation, choreography composition). Testable, controllable, reproducible seeds.
- **Tech stack** (all browser/JS): Web Audio API (decode); essentia.js WASM
  (rhythm/tonal/timbre + TFJS MusiCNN genre/mood/valence-arousal), Meyda
  (RMS/centroid/contrast/MFCC), aubio.js (onset/tempo backup); JS self-similarity + novelty
  for structure (medium confidence, with bar-phrasing fallback); browser `fetch` to openDev
  (OpenAI-compatible) with BYO-key and JSON-schema output; three.js
  `GLTFLoader`/`FBXLoader`, `AnimationMixer`, `crossFadeTo`, `SkeletonUtils`, Mixamo
  character + clips; static HTML + CDN libs, optional serverless proxy for key security.
- **Verdict**: coherent, minimal, and fits the HTML output target.

## Security Review (OWASP)

- API key in the browser = exposed secret (A02 / A07). Mitigation: BYO-key entered at
  runtime, kept in-memory/`localStorage` only, never committed; warn the user; recommend an
  optional serverless proxy for production; scope and rate-limit the key.
- Prompt injection via lyrics (untrusted text → LLM): constrain the agent to a strict JSON
  schema and validate all output; lyrics content cannot trigger actions beyond schema fields.
- LLM output is treated as data (a motion script), schema-validated before it reaches
  three.js. Never `eval`.
- Remote glTF/audio assets: enforce CORS and validate assets before use.

## Evidence

| Claim | Support | Confidence |
|-------|---------|------------|
| In-browser beat/BPM/onset | essentia.js, aubio.js, Meyda | High |
| In-browser RMS/energy/timbre | Meyda, essentia.js | High |
| In-browser genre/mood/valence-arousal | essentia.js TFJS MusiCNN models | Medium-High |
| In-browser structure segmentation | JS self-similarity + novelty (custom) | Medium (weakest) |
| Lyrics analysis + choreo composition | LLM via BYO-key, JSON schema | Medium-High |
| Beat-synced clip playback + retarget | three.js AnimationMixer, Mixamo | High |
| Reproducible seed → creative direction | hash decode table | High |

## Risks & Failure Modes

- Structure segmentation in pure JS is the weakest link (fallback: fixed bar-phrasing).
- essentia.js TFJS models add MB-scale downloads + compute; slow on low-end devices.
- LLM latency/cost: 1 lyrics call + 3 choreography calls; large prompts (the manifest).
- Retargeting: use one consistent Mixamo rig to avoid skeleton mismatch / foot-sliding.
- Clip time-warp beyond ~±15% BPM looks unnatural → keep clips near the target tempo.
- 3 seeds must be diverse yet all good (diversity vs quality trade-off).
- API key exposure if not proxied.

## Verdict

**Feasible-with-caveats**, fully browser-side with three.js. Every component maps to real
browser libraries; there is no fundamental blocker. The hardest parts are JS structure
segmentation and choreography aesthetic quality — engineering/curation problems, not
physics. Ship the MVP clip-based; keep generative motion as an upgrade. Deciding reason:
controllability + real-time playback + no GPU requirement make the clip-based approach
shippable, while the generative path raises the realism ceiling later.

## Next Steps (smallest de-risking experiment)

A static HTML slice on one 20–30 s song: Web Audio decode → essentia.js beat + energy →
minimal `CriteriaReport` → 1 LLM choreography call over a ~10-clip Mixamo manifest →
schema-validate → three.js `AnimationMixer` beat-synced playback on one glTF character.
De-risks: in-browser MIR + LLM script generation + synced three.js playback.

## Open Items (confirm at implementation)

- openDev exact base URL + model IDs (assumed OpenAI-compatible `chat/completions`).
- Which Mixamo packs to bulk-import for full body-state coverage.
