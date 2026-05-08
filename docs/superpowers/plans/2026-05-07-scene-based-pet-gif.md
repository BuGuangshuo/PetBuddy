# Scene-Based Pet GIF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace random pet GIF selection with deterministic scene-based rendering and add per-scene custom GIF upload for each pet appearance.

**Architecture:** Add a shared scene model and persisted `customSceneGifs` settings map, extend the main-process pet catalog to resolve stable built-in scene defaults plus renderer-safe custom asset URLs, and switch the renderer to resolve one concrete scene asset per runtime state instead of randomly sampling broad animation buckets. Upload and clear actions flow from the renderer through preload and IPC into the main process, which persists absolute file paths and rebuilds the settings payload.

**Tech Stack:** TypeScript, Electron, React, electron-store, Vitest

---

### Task 1: Add shared scene types and store normalization

**Files:**
- Modify: `/Users/alanbu/PetBuddy/src/shared/types.ts`
- Modify: `/Users/alanbu/PetBuddy/src/shared/defaults.ts`
- Modify: `/Users/alanbu/PetBuddy/src/shared/storeSchema.ts`
- Test: `/Users/alanbu/PetBuddy/tests/storeSchema.test.ts`

- [ ] **Step 1: Write the failing normalization test**

```ts
it('merges missing custom scene gif settings with defaults', () => {
  const normalized = normalizeStoreShape({
    version: 1,
    settings: {
      selectedPetAppearance: 'line-dog',
      customSceneGifs: {
        'line-dog': {
          default: '/tmp/default.gif'
        }
      }
    },
    stats: {}
  })

  expect(normalized.settings.customSceneGifs['line-dog']?.default).toBe('/tmp/default.gif')
  expect(normalized.settings.customSceneGifs['golden-puppy']).toEqual({})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/storeSchema.test.ts`  
Expected: FAIL because `customSceneGifs` is missing from types/default normalization.

- [ ] **Step 3: Add the minimal shared types and defaults**

```ts
export type PetAppearanceId = 'line-dog' | 'golden-puppy'

export type PetSceneKey =
  | 'default'
  | 'sit'
  | 'happy'
  | 'breakPrompt'
  | 'breakRunning'
  | 'breakDone'
  | 'hydrationPrompt'
  | 'drinking'
  | 'hydrationDone'
  | 'focusGuard'
  | 'focusAlert'
  | 'focusDone'
  | 'sad'
  | 'sleeping'

export type CustomSceneGifMap = Partial<Record<PetAppearanceId, Partial<Record<PetSceneKey, string>>>>
```

```ts
export const defaultSettings: AppSettings = {
  // existing fields...
  customSceneGifs: {
    'line-dog': {},
    'golden-puppy': {}
  }
}
```

```ts
return {
  ...defaultSettings,
  ...(value as Partial<AppSettings>),
  petPosition: {
    ...defaultSettings.petPosition,
    ...((value as Partial<AppSettings>).petPosition ?? {})
  },
  customSceneGifs: {
    ...defaultSettings.customSceneGifs,
    ...((value as Partial<AppSettings>).customSceneGifs ?? {})
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/storeSchema.test.ts`  
Expected: PASS with the new normalization case green.

- [ ] **Step 5: Commit**

```bash
git add tests/storeSchema.test.ts src/shared/types.ts src/shared/defaults.ts src/shared/storeSchema.ts
git commit -m "feat: add shared pet scene settings"
```

### Task 2: Define scene metadata and deterministic scene resolution helpers

**Files:**
- Modify: `/Users/alanbu/PetBuddy/src/shared/pets.ts`
- Create: `/Users/alanbu/PetBuddy/tests/pets.test.ts`

- [ ] **Step 1: Write the failing scene helper tests**

```ts
it('returns stable default scene groups for line dog', () => {
  const appearance = getAppearanceById('line-dog')

  expect(appearance.sceneGroups.default).toEqual(['idle'])
  expect(appearance.sceneGroups.breakPrompt).toEqual(['breakPrompt'])
  expect(appearance.sceneGroups.focusAlert).toEqual(['focusAlert'])
})

it('falls back to default for scenes without a dedicated group', () => {
  const appearance = getAppearanceById('line-dog')

  expect(appearance.sceneGroups.sit).toEqual(['idle'])
  expect(appearance.sceneGroups.happy).toEqual(['happy'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/pets.test.ts`  
Expected: FAIL because `sceneGroups` is not defined.

- [ ] **Step 3: Add scene metadata to appearance definitions**

```ts
sceneGroups: {
  default: ['idle'],
  sit: ['idle'],
  happy: ['happy'],
  breakPrompt: ['breakPrompt'],
  breakRunning: ['breakRunning'],
  breakDone: ['breakDone'],
  hydrationPrompt: ['hydrationPrompt'],
  drinking: ['drinking'],
  hydrationDone: ['hydrationDone'],
  focusGuard: ['focusGuard'],
  focusAlert: ['focusAlert'],
  focusDone: ['focusDone'],
  sad: ['sad'],
  sleeping: ['sleeping']
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/pets.test.ts`  
Expected: PASS with both scene helper tests green.

- [ ] **Step 5: Commit**

```bash
git add tests/pets.test.ts src/shared/pets.ts
git commit -m "feat: add pet scene metadata"
```

### Task 3: Extend API payloads for scene assets and upload actions

**Files:**
- Modify: `/Users/alanbu/PetBuddy/src/shared/api.ts`
- Modify: `/Users/alanbu/PetBuddy/src/preload/index.ts`

- [ ] **Step 1: Add the failing type usage in preload**

```ts
appearanceScenes: {
  uploadCustomGif: (appearanceId, scene) =>
    ipcRenderer.invoke(IPC_CHANNELS.sceneAssetUpload, appearanceId, scene),
  clearCustomGif: (appearanceId, scene) =>
    ipcRenderer.invoke(IPC_CHANNELS.sceneAssetClear, appearanceId, scene)
}
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `pnpm typecheck`  
Expected: FAIL because `appearanceScenes`, `RendererSceneAsset`, and the IPC channel names do not exist yet.

- [ ] **Step 3: Define renderer-facing scene asset types and IPC channels**

```ts
export interface RendererSceneAsset {
  scene: PetSceneKey
  label: string
  description: string
  required: boolean
  defaultAsset: string | null
  customAsset: string | null
}

export interface RendererPetAppearance extends Omit<PetAppearance, 'assets'> {
  assets: Record<PetAnimation, string[]>
  sceneAssets: RendererSceneAsset[]
}
```

```ts
sceneAssetUpload: 'scene-asset:upload',
sceneAssetClear: 'scene-asset:clear'
```

- [ ] **Step 4: Run typecheck to verify it passes**

Run: `pnpm typecheck`  
Expected: PASS for the shared API additions.

- [ ] **Step 5: Commit**

```bash
git add src/shared/api.ts src/preload/index.ts
git commit -m "feat: expose scene asset upload api"
```

### Task 4: Build deterministic scene asset catalog in the main process

**Files:**
- Modify: `/Users/alanbu/PetBuddy/src/main/services/petCatalog.ts`
- Test: `/Users/alanbu/PetBuddy/tests/pets.test.ts`

- [ ] **Step 1: Write the failing catalog test**

```ts
it('uses the first sorted gif as the built-in scene default', () => {
  const files = ['b.gif', 'a.gif']

  expect(pickStableGif(files)).toBe('a.gif')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/pets.test.ts`  
Expected: FAIL because `pickStableGif` and scene catalog resolution are not implemented.

- [ ] **Step 3: Add minimal deterministic scene resolution**

```ts
export const pickStableGif = (files: string[]): string | null =>
  [...files].sort((left, right) => left.localeCompare(right))[0] ?? null
```

```ts
sceneAssets: petSceneDefinitions.map((scene) => ({
  scene: scene.key,
  label: scene.label,
  description: scene.description,
  required: scene.required,
  defaultAsset: pickStableGif(
    appearance.sceneGroups[scene.key].flatMap((group) => listGifFiles(join(assetRoot, appearance.id, group), rendererBaseUrl))
  ),
  customAsset: null
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/pets.test.ts`  
Expected: PASS with deterministic default selection.

- [ ] **Step 5: Commit**

```bash
git add tests/pets.test.ts src/main/services/petCatalog.ts
git commit -m "feat: build deterministic scene asset catalog"
```

### Task 5: Persist custom scene GIF paths in the main store

**Files:**
- Modify: `/Users/alanbu/PetBuddy/src/main/services/store.ts`
- Create: `/Users/alanbu/PetBuddy/tests/store.test.ts`

- [ ] **Step 1: Write the failing store behavior tests**

```ts
it('stores a custom scene gif path for an appearance', () => {
  const store = new PetBuddyStore()

  store.setCustomSceneGif('line-dog', 'default', '/tmp/default.gif')

  expect(store.getSettings().customSceneGifs['line-dog']?.default).toBe('/tmp/default.gif')
})

it('clears a custom scene gif path for an appearance', () => {
  const store = new PetBuddyStore()

  store.setCustomSceneGif('line-dog', 'default', '/tmp/default.gif')
  store.clearCustomSceneGif('line-dog', 'default')

  expect(store.getSettings().customSceneGifs['line-dog']?.default).toBeUndefined()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/store.test.ts`  
Expected: FAIL because the new store methods do not exist.

- [ ] **Step 3: Add minimal store helpers**

```ts
setCustomSceneGif(appearanceId: PetAppearanceId, scene: PetSceneKey, absolutePath: string): AppSettings {
  const settings = this.getSettings()
  return this.updateSettings({
    customSceneGifs: {
      ...settings.customSceneGifs,
      [appearanceId]: {
        ...(settings.customSceneGifs[appearanceId] ?? {}),
        [scene]: absolutePath
      }
    }
  })
}

clearCustomSceneGif(appearanceId: PetAppearanceId, scene: PetSceneKey): AppSettings {
  const settings = this.getSettings()
  const nextAppearance = { ...(settings.customSceneGifs[appearanceId] ?? {}) }
  delete nextAppearance[scene]

  return this.updateSettings({
    customSceneGifs: {
      ...settings.customSceneGifs,
      [appearanceId]: nextAppearance
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/store.test.ts`  
Expected: PASS with both new store method tests green.

- [ ] **Step 5: Commit**

```bash
git add tests/store.test.ts src/main/services/store.ts
git commit -m "feat: persist custom scene gifs"
```

### Task 6: Wire upload and clear IPC handlers in the main process

**Files:**
- Modify: `/Users/alanbu/PetBuddy/src/main/ipc/registerIpc.ts`
- Modify: `/Users/alanbu/PetBuddy/src/main/index.ts`
- Modify: `/Users/alanbu/PetBuddy/src/shared/api.ts`

- [ ] **Step 1: Write the failing typecheck usage in IPC registration**

```ts
uploadCustomSceneGif: (appearanceId, scene) => options.uploadCustomSceneGif(appearanceId, scene),
clearCustomSceneGif: (appearanceId, scene) => options.clearCustomSceneGif(appearanceId, scene)
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `pnpm typecheck`  
Expected: FAIL because `RegisterIpcOptions` and `registerIpc` do not define the new handlers.

- [ ] **Step 3: Implement the upload and clear handlers**

```ts
ipcMain.handle(IPC_CHANNELS.sceneAssetUpload, (_event, appearanceId, scene) =>
  options.uploadCustomSceneGif(appearanceId, scene)
)
ipcMain.handle(IPC_CHANNELS.sceneAssetClear, (_event, appearanceId, scene) =>
  options.clearCustomSceneGif(appearanceId, scene)
)
```

```ts
uploadCustomSceneGif: async (appearanceId, scene) => {
  const selection = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'GIF', extensions: ['gif'] }]
  })

  if (selection.canceled || selection.filePaths.length === 0) {
    return buildSettingsPayload()
  }

  store.setCustomSceneGif(appearanceId, scene, selection.filePaths[0])
  appearances = createPetCatalog(assetRoot, process.env.ELECTRON_RENDERER_URL, store.getSettings().customSceneGifs)
  return buildSettingsPayload()
}
```

- [ ] **Step 4: Run typecheck to verify it passes**

Run: `pnpm typecheck`  
Expected: PASS with the new IPC contract wired through main and preload.

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc/registerIpc.ts src/main/index.ts src/shared/api.ts
git commit -m "feat: wire custom scene gif ipc"
```

### Task 7: Resolve runtime scene assets in the pet renderer

**Files:**
- Modify: `/Users/alanbu/PetBuddy/src/renderer/src/pet-main.tsx`
- Create: `/Users/alanbu/PetBuddy/tests/petSceneResolution.test.ts`

- [ ] **Step 1: Write the failing resolution tests**

```ts
it('prefers a custom scene gif over the built-in default', () => {
  expect(
    resolveSceneAsset(
      'breakPrompt',
      [
        { scene: 'default', defaultAsset: 'default.gif', customAsset: null, label: '', description: '', required: true },
        { scene: 'breakPrompt', defaultAsset: 'break.gif', customAsset: 'custom-break.gif', label: '', description: '', required: false }
      ]
    )
  ).toBe('custom-break.gif')
})

it('falls back to the default scene asset when a scene has no gif', () => {
  expect(
    resolveSceneAsset(
      'focusDone',
      [
        { scene: 'default', defaultAsset: 'default.gif', customAsset: null, label: '', description: '', required: true },
        { scene: 'focusDone', defaultAsset: null, customAsset: null, label: '', description: '', required: false }
      ]
    )
  ).toBe('default.gif')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/petSceneResolution.test.ts`  
Expected: FAIL because `resolveSceneAsset` does not exist and pet rendering still uses random selection.

- [ ] **Step 3: Implement minimal scene resolution and runtime mapping**

```ts
export const resolveSceneAsset = (scene: PetSceneKey, sceneAssets: RendererSceneAsset[]): string | undefined => {
  const current = sceneAssets.find((item) => item.scene === scene)
  if (current?.customAsset) return current.customAsset
  if (current?.defaultAsset) return current.defaultAsset
  const fallback = sceneAssets.find((item) => item.scene === 'default')
  return fallback?.customAsset ?? fallback?.defaultAsset ?? undefined
}
```

```ts
const scene = activeEvent?.kind === 'break'
  ? 'breakPrompt'
  : activeEvent?.kind === 'water'
    ? 'hydrationPrompt'
    : activeEvent?.kind === 'focusNudge'
      ? 'focusAlert'
      : 'default'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/petSceneResolution.test.ts`  
Expected: PASS with deterministic scene resolution.

- [ ] **Step 5: Commit**

```bash
git add tests/petSceneResolution.test.ts src/renderer/src/pet-main.tsx
git commit -m "feat: resolve pet gifs by scene"
```

### Task 8: Build the scene upload UI in settings

**Files:**
- Modify: `/Users/alanbu/PetBuddy/src/renderer/src/settings-main.tsx`
- Modify: `/Users/alanbu/PetBuddy/src/renderer/src/styles.css`

- [ ] **Step 1: Add the failing renderer usage**

```tsx
{selectedAppearance?.sceneAssets.map((scene) => (
  <button key={scene.scene} onClick={() => void window.petBuddy.appearanceScenes.uploadCustomGif(selectedAppearance.id, scene.scene)}>
    上传 GIF
  </button>
))}
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `pnpm typecheck`  
Expected: FAIL because the settings UI does not yet render `sceneAssets` or the new preload API.

- [ ] **Step 3: Implement the scene list UI and refresh behavior**

```tsx
const refreshPayload = async (nextPromise: Promise<SettingsPayload>) => {
  const next = await nextPromise
  setPayload(next)
}
```

```tsx
<section className="section">
  <div className="section-title">自定义素材</div>
  <div className="scene-list">
    {selectedAppearance?.sceneAssets.map((scene) => (
      <div className="scene-row" key={scene.scene}>
        <div className="scene-copy">
          <div className="field-label">{scene.label}</div>
          <div className="field-hint">{scene.description}</div>
        </div>
        <div className="scene-preview">
          {scene.defaultAsset ? <img src={scene.defaultAsset} alt="" /> : null}
        </div>
        <div className="scene-upload">
          {scene.customAsset ? <img src={scene.customAsset} alt="" /> : null}
          <button onClick={() => void refreshPayload(window.petBuddy.appearanceScenes.uploadCustomGif(selectedAppearance.id, scene.scene))}>
            {scene.customAsset ? '替换 GIF' : '上传 GIF'}
          </button>
          {scene.customAsset ? (
            <button onClick={() => void refreshPayload(window.petBuddy.appearanceScenes.clearCustomGif(selectedAppearance.id, scene.scene))}>
              清除
            </button>
          ) : null}
        </div>
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step 4: Run typecheck to verify it passes**

Run: `pnpm typecheck`  
Expected: PASS with the scene upload UI rendering cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/settings-main.tsx src/renderer/src/styles.css
git commit -m "feat: add scene gif upload settings"
```

### Task 9: Verify end-to-end behavior

**Files:**
- Verify only

- [ ] **Step 1: Run the focused test suite**

Run: `pnpm test tests/storeSchema.test.ts tests/pets.test.ts tests/store.test.ts tests/petSceneResolution.test.ts`  
Expected: PASS for all new and updated tests.

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`  
Expected: PASS for the complete Vitest suite.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`  
Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Start the dev app for manual validation**

Run: `pnpm dev`  
Expected: Electron app launches, settings page shows scene upload rows, uploading a GIF updates the row preview, and break/water/focus reminders display deterministic scene GIFs instead of random animation changes.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add scene-based pet gif customization"
```
