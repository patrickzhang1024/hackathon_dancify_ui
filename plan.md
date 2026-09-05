# Dancify UI Plan

## Product Goal

Build a browser-based dance creation workspace that guides a user through one complete task:

1. Import a music file and optional lyrics.
2. Review the detected rhythm, mood, structure, energy, timbre, and style.
3. Choose a male or female humanoid model.
4. Generate three distinct choreography takes.
5. Compare, play, inspect, and export the preferred result.

The UI owns orchestration and presentation. Music decoding and analysis come from the `music`
module, choreography generation comes from the agent layer, and humanoid playback comes from
the `rig` module. The UI must not duplicate their analysis, validation, or pose logic.

## Experience Direction

This is a creative production tool, not a landing page. The first screen is the usable studio.
The visual hierarchy is stage-first: a large 3D preview, a compact control rail, and a music
timeline. Use a neutral light or near-black workspace with one high-contrast accent color;
avoid decorative cards, nested panels, gradients, and marketing copy.

- Desktop: three-column workspace with setup controls, stage, and take inspector.
- Tablet: stage above a two-column control/inspector area.
- Mobile: stage first, then a bottom-sheet workflow with Import, Takes, and Details tabs.
- Prefer an expressive sans-serif typeface, compact labels, and familiar icon controls.
- Motion in the interface should explain state changes: upload progress, analysis progress,
  take generation, selection, and playback. Respect `prefers-reduced-motion`.

## Main Screen Layout

```text
+-----------------------------------------------------------------------+
| Dancify | Project name                  Save status | Settings | Help |
+-------------------+--------------------------------+------------------+
| Setup rail        | 3D stage                       | Take inspector   |
|                   |                                |                  |
| Music             | selected male/female model     | Take 1 / 2 / 3  |
| Lyrics            | current choreography           | name + seed      |
| Character         | loading/error overlay          | style summary    |
| Generate          |                                | regenerate       |
+-------------------+--------------------------------+------------------+
| waveform + sections + beats + playhead + transport controls           |
+-----------------------------------------------------------------------+
```

The stage remains visible during setup, generation, comparison, and playback. Panels may
resize around it, but the character should never disappear behind a separate results page.

## Core Components

### 1. App Shell

- Product mark and editable project name.
- Save state: `Unsaved`, `Saving`, `Saved locally`, or actionable error.
- Settings button for API provider, API key storage mode, rendering quality, and reduced motion.
- Help button for supported file formats, privacy, and troubleshooting.
- No global navigation is needed for the MVP.

### 2. Music Import

The import control supports drag-and-drop and a standard file picker. It must be keyboard
accessible and use a real `<input type="file">` behind the drop target.

- Accept common browser-decodable audio types: MP3, WAV, M4A/AAC, and OGG where supported.
- Show filename, duration, file size, and an audio preview after decoding.
- Validate empty, oversized, corrupt, and unsupported files before starting analysis.
- Keep the audio local. Explain that the track is decoded in the browser and is not uploaded
  unless a future remote service explicitly requires it.
- Replacing a track warns that the current analysis and generated takes will be cleared.
- A compact `Replace music` command remains available after import.

Import states:

| State | UI response |
|---|---|
| Empty | Drop target plus `Choose music` button |
| Reading | Determinate bytes-read progress when available |
| Decoding | Filename and decoding status; cancel remains available |
| Ready | Waveform preview, metadata, play button, replace/remove commands |
| Error | Inline reason and retry/choose-another actions |

### 3. Lyrics Import

- Optional `.lrc` or `.txt` file picker plus a paste-text mode.
- For LRC, preview timed lines against the music playhead.
- For plain text, show an editable lyrics field and label it as untimed.
- Allow `Instrumental / no lyrics`; generation must not be blocked when lyrics are absent.
- Lyrics are untrusted input and are displayed as text only, never rendered as HTML.

### 4. Analysis Summary

After import, show the six music criteria in one compact inspector rather than six equal cards:

- Rhythm: BPM, meter, groove, and confidence.
- Emotion: mood, valence, and arousal.
- Structure: labeled sections aligned to the waveform.
- Energy: contour and build/drop events.
- Timbre: brightness, texture, and likely instruments.
- Style: music genre and derived dance genre.

Each result shows confidence and expandable evidence. `Unknown` or low-confidence values must
be visibly honest. Users can correct categorical labels before generation; measured values
such as BPM remain visible alongside an override so the original evidence is not lost.

Analysis interaction:

- `Analyze music` starts the Worker pipeline.
- A phase indicator reports Decode, Features, Rhythm, Structure, and Report.
- Cancel stops the Worker and returns to the ready state without deleting the source file.
- A warning banner identifies fallback sectioning or low-confidence tempo.
- `Use analysis` advances to generation; re-analysis invalidates existing takes only after
  confirmation.

### 5. Character Selector

Provide a two-option segmented control labeled `Character`, with `Female` and `Male` choices.
Do not use gender stereotypes, color coding, or body-shape descriptions as labels.

- Each option displays a real rendered thumbnail of the available VRM model, not an abstract
  avatar icon.
- Selecting an option updates the stage immediately while preserving camera and current pose.
- Show a skeleton/neutral loading state while the VRM asset loads.
- If the selected model fails, explain the failure and offer retry or the primitive fallback.
- Remember the user's last choice locally.
- The MVP requires one licensed female-presenting model and one licensed male-presenting model
  with the same normalized humanoid bone coverage. The UI must not expose an option until its
  actual model asset, license, finger mapping, and rig calibration are verified.

Architecture note: the current rig contains one VRM asset. Male/female selection therefore has
an upstream dependency on adding and validating a second VRM model in `rig`; the UI can define
the selector and states now but must not fake the missing model by scaling or reshaping one rig.

### 6. API Configuration

Generation uses the user-provided openDev API key.

- A settings dialog contains base URL, model ID, API key, and storage mode.
- Storage choices are `This session` (recommended) and `This device` with a browser-exposure
  warning. Never display the full key after entry or write it to logs/errors.
- `Test connection` validates configuration without starting a generation.
- The primary flow requests configuration only when generation first needs it.
- Provider errors are redacted and provide retry, edit settings, or continue with local demo
  choreography when that fallback is available.

### 7. Generate Control

The setup rail ends with one primary command: `Generate 3 takes`.

Enable it only when:

- Music decoding and analysis have completed.
- A valid character model is ready, or the user explicitly accepted fallback rendering.
- API configuration is valid, unless local demo generation is selected.

During generation, show meaningful stages rather than an indeterminate spinner:

1. Refine report from lyrics, skipped for instrumental tracks.
2. Create three deterministic creative briefs from three seeds.
3. Generate and validate Take 1, Take 2, and Take 3 independently.
4. Prepare rig previews.

Completed takes should become inspectable while later takes are still running. One failed take
does not discard successful takes; expose `Retry failed take`. Cancel keeps completed results.

### 8. Three-Take Results

Always reserve three stable result slots so loading content does not shift the layout. On
desktop they appear as three compact take rows or thumbnails in the inspector; on mobile they
form a horizontally scrollable snap list with visible `1 of 3` position text.

Each take contains:

- Take number and a short generated title.
- Creative seed and reproducibility action.
- Dance genre, energy bias, complexity, and body-state mix.
- Duration and validation status.
- A real stage thumbnail captured from a representative pose.
- `Play` command and a single selection control.

Selecting a take loads it into the same main stage and timeline. Only one take plays at a time.
Playback switching stops the previous take, seeks to the current audio time when compatible,
and updates the timeline without restarting the entire app.

Result actions:

- `Play / Pause`, `Stop`, loop toggle, volume, and scrub.
- `Compare` cycles the same 8- or 16-beat section across all successful takes.
- `Regenerate` opens a small menu: same seed, new seed, or adjust direction.
- `Use this take` marks the preferred result and persists the choice.
- `Export script` downloads validated JSON. Video rendering is explicitly deferred.

Do not rank one result as “best” automatically. The three takes are alternatives, not scores.

### 9. Stage and Playback Controls

- Full-width/unframed three.js canvas with orbit controls and a grounded camera preset.
- Character loading, fallback, WebGL error, and script-validation messages appear over the
  stage without covering the transport controls.
- Icon buttons for play/pause, stop, loop, mute, reset camera, and fullscreen; every icon has
  an accessible name and tooltip.
- Current time, total time, current beat, section label, and active move are visible.
- Keyboard: Space toggles play only when focus is not in an input; arrow keys seek; Escape exits
  fullscreen/dialogs. All actions remain available without shortcuts.
- Pause animation when the tab is hidden, then resynchronize from the audio clock on return.

### 10. Timeline

The persistent bottom timeline aligns all output to one horizontal time scale:

- Audio waveform.
- Beat and bar markers.
- Color-coded music sections with text labels.
- Energy contour.
- Move blocks for the selected take.
- Draggable playhead with current-time tooltip.
- Optional timed lyric line indicator.

Users may scrub and select a section, but direct move editing is deferred. At narrow widths,
the timeline remains horizontally zoomable and the labels collapse before overlapping.

## Workflow State Model

```text
EMPTY
  -> IMPORTING -> READY
  -> ANALYZING -> REVIEW
  -> GENERATING -> RESULTS
  -> PLAYING <-> PAUSED

Any async state -> recoverable ERROR -> previous stable state
READY/REVIEW/RESULTS -> REPLACE_CONFIRM -> IMPORTING
RESULTS -> REGENERATING_ONE -> RESULTS
```

State transitions are explicit. Async jobs use cancellation tokens, and stale analysis or
generation responses are ignored after the music changes. Persist only serializable project
metadata, report, scripts, preferences, and selected model; retain the user audio file only for
the current browser session unless the user explicitly opts into local project persistence.

## Module Interfaces

The UI integrates through narrow adapters:

```js
music.analyze(file, { lyrics, signal, onProgress })
  -> Promise<CriteriaReport>

agent.generateTakes({ report, lyrics, count: 3, signal, onTake })
  -> Promise<MotionControlScript[]>

rig.loadCharacter({ presentation: "female" | "male" })
rig.loadScript(validatedScript)
rig.attachClock(audioClock)
rig.play() / rig.pause() / rig.stop() / rig.seek(seconds)
```

Schema versions are checked at every boundary. The UI displays validation failures but never
attempts to repair malformed scripts itself.

## Responsive Behavior

- **Desktop, 1200 px and above:** setup rail 280-320 px, flexible stage, inspector 300-360 px,
  persistent 160-220 px timeline.
- **Tablet, 768-1199 px:** stage spans the top; setup and takes share the lower row; timeline
  remains full width.
- **Mobile, below 768 px:** stage uses a stable 4:5 or 1:1 area below the compact header;
  transport stays directly beneath it; Import, Takes, and Details live in bottom tabs. The
  waveform scrolls horizontally and no control relies on hover.
- All labels wrap without covering controls. Icon-button hit targets are at least 44 by 44 px.

## Accessibility and Privacy

- Meet WCAG 2.2 AA contrast, focus visibility, keyboard order, and semantic labeling.
- Use an `aria-live="polite"` region for analysis/generation progress and a focused alert for
  blocking errors; avoid announcing per-frame playback updates.
- Canvas controls have DOM equivalents. Important state is never communicated by color alone.
- Respect reduced motion and reduced transparency preferences.
- Audio, lyrics, reports, and API credentials remain local except for the explicitly disclosed
  content sent to openDev. Show that disclosure before the first LLM request.

## Delivery Phases

### Phase 1: Static workflow shell

- Build the responsive studio layout and all empty, loading, success, partial, and error states.
- Use fixture reports/scripts to exercise music import, character selection, three result slots,
  stage selection, and timeline navigation.

**Exit:** the full workflow is keyboard navigable on desktop and mobile without live services.

### Phase 2: Music integration

- Connect file/LRC import, decode preview, analysis progress, cancellation, and report review to
  the `music` module.

**Exit:** replacing a song safely invalidates dependent state, and a valid report reaches the
generation boundary without UI-specific conversion.

### Phase 3: Rig and model integration

- Embed the rig stage, audio clock, timeline, playback controls, and verified female/male VRMs.

**Exit:** either character can play the same fixture script; switching preserves camera state,
and play/pause/seek remain synchronized with audio.

### Phase 4: Three-take generation

- Add API configuration, lyrics refinement, progressive three-take generation, per-take retry,
  comparison loop, selection persistence, and JSON export.

**Exit:** one imported song reliably produces three independently validated, visibly distinct,
beat-synchronized takes; partial provider failure remains recoverable.

### Phase 5: Release hardening

- Add local project restore, security headers, performance budgets, browser compatibility,
  analytics consent if telemetry is introduced, and deployment checks.

**Exit:** production build passes accessibility, keyboard, responsive, slow-network, corrupt
file, API failure, WebGL failure, and low-memory tests without losing user work.

## Acceptance Checklist

- A user can import music by drop, picker, and keyboard and can replace/remove it safely.
- Lyrics are optional and support LRC, text file, and paste modes.
- Analysis reports progress and exposes six criteria with confidence and evidence.
- Female and male options correspond to two real, licensed, calibrated VRM assets.
- Exactly three result slots are shown; successful takes remain usable if another fails.
- Each result can be selected and played with synchronized audio, stage, and timeline.
- The preferred take persists locally and its validated script can be exported.
- No API key appears in source, logs, errors, persisted project data, or exported scripts.
- Desktop, tablet, and mobile layouts avoid overlap and preserve a usable stage.
- All core actions work with keyboard and screen-reader labels.

## Deferred Features

- Detailed timeline editing, move replacement, and keyframe authoring.
- Video/GIF rendering and cloud sharing.
- More body types, custom VRM upload, outfits, and scene customization.
- Multi-track audio, collaborative projects, and account-based cloud sync.
- Automatic “best take” ranking; user choice remains authoritative for the MVP.