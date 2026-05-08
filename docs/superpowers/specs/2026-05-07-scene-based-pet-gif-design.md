# Scene-Based Pet GIF Mapping And Custom Upload Design

## Goal

Replace the current random pet GIF selection with deterministic scene-based rendering, and add per-scene custom GIF upload so a specific runtime scene always displays a specific GIF.

This design targets the current PetBuddy desktop app and covers:

- scene-level GIF mapping shared by settings and runtime rendering
- per-scene custom GIF upload for each pet appearance
- deterministic fallback to built-in scene defaults
- first-pass runtime mapping for scenes already supported by current reminder and focus events

This design does not attempt to fully implement every fine-grained runtime scene trigger in one step.

## Current State

The renderer currently chooses GIFs by broad animation buckets:

- `idle`
- `run`
- `nudge`
- `drink`
- `rest`

In the pet window, [src/renderer/src/pet-main.tsx](/Users/alanbu/PetBuddy/src/renderer/src/pet-main.tsx) calls `randomPick(...)` against these buckets. This causes the visible GIF to change randomly within a bucket, rather than showing a fixed GIF for a specific scene.

The asset catalog generated in [src/main/services/petCatalog.ts](/Users/alanbu/PetBuddy/src/main/services/petCatalog.ts) also groups files by those broad animation buckets. The settings page currently has no persistent scene-level upload model.

## Product Rules

The user validated the following rules:

1. Each scene binds to exactly one GIF.
2. If a scene has no custom GIF, it falls back to that same scene's built-in default GIF.
3. The system should support the fine-grained scene list shown in the settings UI rather than only the five legacy animation buckets.

## Scene Model

Introduce a shared `PetSceneKey` union used by store, IPC payloads, settings UI, and runtime asset resolution.

First-pass scene keys:

- `default`
- `sit`
- `happy`
- `breakPrompt`
- `breakRunning`
- `breakDone`
- `hydrationPrompt`
- `drinking`
- `hydrationDone`
- `focusGuard`
- `focusAlert`
- `focusDone`
- `sad`
- `sleeping`

These keys represent business scenes. They do not replace reminder kinds, but they do replace direct renderer selection from the five legacy animation buckets.

## Data Model

Add a new store-backed structure under `AppSettings`:

```ts
customSceneGifs: Partial<Record<PetAppearanceId, Partial<Record<PetSceneKey, string>>>>
```

Semantics:

- one pet appearance contains zero or more custom scene bindings
- one scene binding stores at most one custom GIF path
- the stored value is the absolute local file path chosen by the user
- the main process converts file paths into renderer-safe URLs before sending payloads to the renderer

The existing settings normalization should merge this field safely so old stores continue to load.

## Default Asset Catalog

The pet catalog service should be extended to build two related outputs for each appearance:

1. existing legacy animation buckets, preserved temporarily for compatibility where still needed
2. a new scene-default map:

```ts
defaultSceneAssets: Partial<Record<PetSceneKey, string>>
```

Rules for built-in scene defaults:

- each scene key maps to a dedicated source directory or explicit asset group
- if multiple GIFs exist for the scene directory, choose one stable default instead of randomizing
- stability rule: sort file names and use the first GIF

This removes random scene rendering even when the user has not uploaded any custom GIF.

## Runtime Resolution

The pet renderer should stop calling `randomPick(...)` for visible scene selection.

Instead, runtime rendering should use:

1. resolve current `PetSceneKey`
2. use custom scene GIF for the selected appearance if present
3. else use built-in default GIF for that same scene
4. else fall back to built-in `default`

This guarantees deterministic scene rendering.

## Runtime Scene Mapping

The app already has runtime signals for a smaller set of states than the full settings list. First-pass automatic scene mapping should cover the states the app can already identify clearly:

- no active reminder and no higher-priority scene -> `default`
- break reminder active -> `breakPrompt`
- water reminder active -> `hydrationPrompt`
- focus nudge reminder active -> `focusAlert`

The following scenes should be made configurable in settings and supported by the data model immediately, but their automatic runtime triggers may remain partial or absent in the first implementation:

- `sit`
- `happy`
- `breakRunning`
- `breakDone`
- `drinking`
- `hydrationDone`
- `focusGuard`
- `focusDone`
- `sad`
- `sleeping`

This keeps the first iteration scoped while putting the durable model in place.

## Settings UI

The settings page should expose a scene configuration panel matching the validated user mental model:

- one row per scene
- scene name and short description
- built-in reference GIF preview
- one upload slot for a custom GIF
- preview of the current custom GIF when present
- replace action
- clear action

Behavior:

- `default` remains visually marked as important, but not technically required because the built-in default asset still exists
- uploads are per appearance, so switching the selected pet appearance should show and edit that appearance's scene bindings
- unsupported scenes in first-pass runtime still remain editable in the UI

## Upload Flow

Add a renderer-to-main IPC flow for selecting and storing custom GIF files.

Recommended behavior:

- renderer requests file selection for a specific `appearanceId` and `sceneKey`
- main process opens a file picker restricted to `.gif`
- when the user selects a file, main process stores the absolute path in settings
- updated settings payload is returned immediately
- renderer re-renders the scene row with the new preview URL

Also add removal support:

- renderer requests clear for `appearanceId` and `sceneKey`
- main process removes that stored path
- updated settings payload is returned

## Types And Payloads

Expected shared additions:

- `PetSceneKey`
- `PetAppearanceId` helper type if needed
- `customSceneGifs` in `AppSettings`
- renderer-facing scene asset metadata, likely something shaped like:

```ts
interface RendererSceneAsset {
  scene: PetSceneKey
  defaultAsset: string | null
  customAsset: string | null
}
```

Renderer appearance payload can then expose either:

- a `sceneAssets` map, or
- a `scenes` array with metadata for the settings screen

The chosen shape should favor simple indexed lookup in the pet renderer and straightforward iteration in the settings screen.

## File Responsibilities

Expected file touch points:

- [src/shared/types.ts](/Users/alanbu/PetBuddy/src/shared/types.ts)
  - scene keys
  - settings shape additions
- [src/shared/defaults.ts](/Users/alanbu/PetBuddy/src/shared/defaults.ts)
  - default empty `customSceneGifs`
- [src/shared/storeSchema.ts](/Users/alanbu/PetBuddy/src/shared/storeSchema.ts)
  - store normalization for new nested field
- [src/shared/pets.ts](/Users/alanbu/PetBuddy/src/shared/pets.ts)
  - static scene metadata and scene definitions
- [src/shared/api.ts](/Users/alanbu/PetBuddy/src/shared/api.ts)
  - renderer payload shape and new IPC channels
- [src/main/services/petCatalog.ts](/Users/alanbu/PetBuddy/src/main/services/petCatalog.ts)
  - scene-default asset resolution
- [src/main/services/store.ts](/Users/alanbu/PetBuddy/src/main/services/store.ts)
  - helpers to save and clear custom scene GIF paths
- [src/main/ipc/registerIpc.ts](/Users/alanbu/PetBuddy/src/main/ipc/registerIpc.ts)
  - new upload and clear handlers
- [src/main/index.ts](/Users/alanbu/PetBuddy/src/main/index.ts)
  - payload assembly and dialog-backed upload handlers
- [src/preload/index.ts](/Users/alanbu/PetBuddy/src/preload/index.ts)
  - exposed renderer API methods
- [src/renderer/src/settings-main.tsx](/Users/alanbu/PetBuddy/src/renderer/src/settings-main.tsx)
  - scene asset settings UI
- [src/renderer/src/pet-main.tsx](/Users/alanbu/PetBuddy/src/renderer/src/pet-main.tsx)
  - deterministic scene resolution

## Migration

No explicit migration step is required beyond store normalization because:

- existing users do not have `customSceneGifs`
- the new field can default to an empty object
- built-in scene defaults ensure the app still renders without user action

## Testing

Targeted tests should cover:

- store normalization for old payloads and partial `customSceneGifs`
- stable default scene resolution from asset directories
- save and clear behavior for per-appearance scene paths
- runtime scene resolution order: custom -> scene default -> built-in default

Renderer interaction tests are optional if the current project does not already use renderer component tests, but the runtime resolution logic should be extracted enough to make unit testing practical.

## Delivery Scope

Step 1:

- deterministic scene asset model
- per-scene upload and clear
- settings UI wired to persisted scene bindings
- runtime mapping for currently supported active reminder scenes
- fallback behavior implemented end to end

Step 2:

- additional automatic scene triggers for `focusGuard`, completion scenes, `sleeping`, and other nuanced states

## Open Constraints

- The workspace is not currently a git repository, so this spec cannot be committed as part of the brainstorming workflow.
- Some scene rows may be configurable before the runtime has a native trigger for them. This is intentional and should be called out in the UI copy only if necessary.
