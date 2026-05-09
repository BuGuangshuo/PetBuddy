# Settings In-App Update Design

## Goal

Add a manual update flow inside the settings panel for the macOS arm64 build:

1. User clicks `检查更新`.
2. App checks GitHub Releases for a newer version than the current app version.
3. If a newer version exists, the settings panel shows the new version and an `立即更新` action.
4. App downloads the update package inside the settings panel and shows progress.
5. After download completes, the app installs the update and reopens into the new version automatically.

## Scope

In scope:

- macOS arm64 only
- GitHub Releases as the update source
- Settings-panel UI for check, prompt, progress, and install state
- Main-process update orchestration with `electron-updater`
- Build/release config changes required for auto-update assets
- Focused tests for state mapping, IPC surface, and settings UI behavior

Out of scope:

- Windows or Intel macOS update support
- Background auto-download on startup
- Forced updates
- Changelog rendering
- Rollback UX

## Current State

- The project already uses `electron-updater` in [src/main/services/updateService.ts](/Users/alanbu/PetBuddy/src/main/services/updateService.ts).
- The current implementation supports:
  - checking for updates
  - exposing a simple `UpdateState`
  - opening the GitHub Releases page
- The settings payload already includes `updateState` and `version`.
- The current release doc only describes `dmg` output, which is not sufficient for macOS in-app auto-update.

## Chosen Approach

Use `electron-updater` as the single update engine.

Reasoning:

- It already exists in the codebase and matches the current packaging flow.
- It provides the exact lifecycle needed here: `checkForUpdates()`, `downloadUpdate()`, download progress events, and `quitAndInstall()`.
- A manual GitHub API implementation would still struggle to deliver a reliable “download, replace, relaunch” experience on macOS.

## Product Behavior

### Eligibility

The in-app update controls are active only when:

- platform is macOS
- architecture is arm64
- app is packaged in a mode where `electron-updater` can operate

If those conditions are not met, the update section remains visible but shows an unavailable message instead of actionable download/install controls.

### Settings Panel UX

The settings panel gets an `检查更新` section that shows:

- current app version
- current update status text
- primary action button based on state
- progress indicator during download

State-driven UI:

- `idle`: show `检查更新`
- `checking`: disable actions and show checking text
- `available`: show `发现新版本 vX.Y.Z` and `立即更新`
- `downloading`: disable other actions and show progress percent
- `downloaded`: show `准备安装，应用将重新打开`
- `not-available`: show `已经是最新版本`
- `error`: show failure text and allow retry with `检查更新`
- `unavailable`: show why in-app update cannot run in the current build

There is no modal. All feedback stays inline inside the settings panel.

### Install Behavior

After the update package finishes downloading:

- app moves to `downloaded`
- app immediately calls `quitAndInstall()`
- app exits, installs the update, and relaunches

No extra confirmation step is added after download completes.

## Technical Design

### Shared Types

Expand the update model in [src/shared/types.ts](/Users/alanbu/PetBuddy/src/shared/types.ts):

- add statuses:
  - `downloading`
  - `downloaded`
  - `unavailable`
- extend `UpdateState` with:
  - `currentVersion: string`
  - `availableVersion: string | null`
  - `downloadPercent: number | null`
  - `canCheck: boolean`

The state object remains the single renderer-facing source of truth.

### Main Process Update Service

Extend [src/main/services/updateService.ts](/Users/alanbu/PetBuddy/src/main/services/updateService.ts) into a proper stateful service.

Responsibilities:

- determine whether in-app update is supported for the current runtime
- initialize `autoUpdater` event listeners once
- map updater events into `UpdateState`
- expose:
  - `getState()`
  - `checkNow()`
  - `downloadUpdate()`
- emit state changes to renderer subscribers

Expected event handling:

- `checking-for-update` -> `checking`
- `update-available` -> `available` with `availableVersion`
- `update-not-available` -> `not-available`
- `download-progress` -> `downloading` with percent
- `update-downloaded` -> `downloaded`, then trigger install
- `error` -> `error`

Implementation constraints:

- `autoDownload` stays `false`
- version comparison is delegated to `electron-updater`
- `quitAndInstall()` is called only after `update-downloaded`
- repeated button clicks while `checking` or `downloading` are ignored

### IPC and Preload Surface

Extend [src/shared/api.ts](/Users/alanbu/PetBuddy/src/shared/api.ts), [src/main/ipc/registerIpc.ts](/Users/alanbu/PetBuddy/src/main/ipc/registerIpc.ts), and [src/preload/index.ts](/Users/alanbu/PetBuddy/src/preload/index.ts):

- add `updates.download()`
- add `updates.onStateChanged(listener)`
- add corresponding IPC channels:
  - `updates:download`
  - `updates:state-changed`

Reasoning:

- polling is acceptable for initial load
- progress updates need push delivery

### Settings Data Flow

`settings.get()` still returns the current `updateState` snapshot for initial render.

After mount, the settings renderer also subscribes to update-state change events so the UI reflects:

- transition from checking to available/not-available
- live download percentage
- pre-install message

### Renderer UI

Update [src/renderer/src/settings-main.tsx](/Users/alanbu/PetBuddy/src/renderer/src/settings-main.tsx) to add an update section with:

- version label
- status text
- action button
- progress bar or textual progress

Behavior:

- `检查更新` calls `window.petBuddy.updates.checkNow()`
- `立即更新` calls `window.petBuddy.updates.download()`
- UI state is derived from `payload.updateState` plus subscription updates

Minimal CSS adjustments go into [src/renderer/src/styles.css](/Users/alanbu/PetBuddy/src/renderer/src/styles.css).

## Release Packaging Requirements

Update [package.json](/Users/alanbu/PetBuddy/package.json) build config so GitHub Releases include macOS auto-update assets.

Required outputs for macOS auto-update:

- `.zip`
- `.dmg`
- `latest-mac.yml`

The release process must publish those assets to the matching GitHub Release for the app version.

Keep:

- code signing
- notarization
- GitHub publish provider

Update [docs/macos-release.md](/Users/alanbu/PetBuddy/docs/macos-release.md) to describe the new required assets and release expectations.

## Testing Strategy

### Unit Tests

Add or update tests for:

- update-state transitions in the main update service
- IPC registration for download/update-state subscription
- settings panel rendering for:
  - idle
  - available
  - downloading
  - error

### Manual Verification

Manual release validation on a packaged macOS arm64 app:

1. Install an older signed build.
2. Publish a newer GitHub Release containing `.zip`, `.dmg`, and `latest-mac.yml`.
3. Open settings and click `检查更新`.
4. Verify `立即更新` appears.
5. Start download and verify progress updates.
6. Verify app quits, installs, and relaunches into the new version.

## Risks

- Auto-update on macOS will fail if release assets are incomplete or mismatched.
- Unsigned or improperly notarized builds may download but fail to install cleanly.
- Dev-mode testing cannot fully prove install/relaunch behavior; packaged testing is required.

## Open Decisions Resolved

- Platform target: macOS arm64 only
- UX shape: inline settings-panel status and actions, no modal
- Update engine: `electron-updater`
- Post-download behavior: install immediately and relaunch automatically
