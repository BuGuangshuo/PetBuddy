# Settings In-App Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a settings-panel update flow that checks GitHub Releases, downloads a newer macOS arm64 build in-app, and installs it with automatic relaunch.

**Architecture:** Extend the existing `electron-updater` service into a stateful update pipeline with renderer subscriptions. The settings window renders inline update controls from shared update state, while packaging config and release docs are updated so GitHub Releases publish usable auto-update assets.

**Tech Stack:** Electron, electron-updater, React, TypeScript, Vitest, electron-builder

---

### Task 1: Expand Update Contracts

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/api.ts`
- Modify: `src/preload/index.ts`
- Test: `tests/settingsMain.test.ts`

- [ ] Add failing assertions for the new update API surface and visible update section markers.
- [ ] Run `pnpm test -- --run tests/settingsMain.test.ts` and verify the new assertions fail for missing update UI/API strings.
- [ ] Add shared update statuses, extra update metadata, new IPC channels, and preload helpers for `download()` and `onStateChanged()`.
- [ ] Re-run `pnpm test -- --run tests/settingsMain.test.ts` and verify the contract assertions pass or fail only on still-missing renderer UI.

### Task 2: Implement Main-Process Update State Machine

**Files:**
- Modify: `src/main/services/updateService.ts`
- Modify: `src/main/ipc/registerIpc.ts`
- Modify: `src/main/index.ts`
- Test: `tests/updateService.test.ts`

- [ ] Write a new failing `tests/updateService.test.ts` covering supported/unsupported states, available-version mapping, download progress, and install trigger behavior.
- [ ] Run `pnpm test -- --run tests/updateService.test.ts` and verify it fails for the missing service behavior.
- [ ] Implement the update service event mapping, download action, listener subscription, and IPC wiring needed for renderer push updates.
- [ ] Re-run `pnpm test -- --run tests/updateService.test.ts` until the new service tests pass.

### Task 3: Render Settings Update Controls

**Files:**
- Modify: `src/renderer/src/settings-main.tsx`
- Modify: `src/renderer/src/styles.css`
- Test: `tests/settingsMain.test.ts`

- [ ] Add failing settings tests for inline update status, update actions, progress rendering, and subscription wiring.
- [ ] Run `pnpm test -- --run tests/settingsMain.test.ts` and verify the new UI assertions fail for the current settings renderer.
- [ ] Implement the settings update section and state-driven action handling with inline progress/status messaging.
- [ ] Re-run `pnpm test -- --run tests/settingsMain.test.ts` and verify the settings update assertions pass.

### Task 4: Package and Release Support

**Files:**
- Modify: `package.json`
- Modify: `docs/macos-release.md`
- Test: `tests/buildConfig.test.ts`

- [ ] Add failing packaging assertions for macOS update assets and release expectations.
- [ ] Run `pnpm test -- --run tests/buildConfig.test.ts` and verify they fail against the current DMG-only configuration.
- [ ] Update Electron Builder targets and release docs to require `.zip`, `.dmg`, and `latest-mac.yml`.
- [ ] Re-run `pnpm test -- --run tests/buildConfig.test.ts` and verify the packaging checks pass.

### Task 5: Full Verification

**Files:**
- Verify: `src/main/services/updateService.ts`
- Verify: `src/main/ipc/registerIpc.ts`
- Verify: `src/preload/index.ts`
- Verify: `src/shared/api.ts`
- Verify: `src/shared/types.ts`
- Verify: `src/renderer/src/settings-main.tsx`
- Verify: `src/renderer/src/styles.css`
- Verify: `package.json`
- Verify: `docs/macos-release.md`
- Verify: `tests/updateService.test.ts`
- Verify: `tests/settingsMain.test.ts`
- Verify: `tests/buildConfig.test.ts`

- [ ] Run targeted verification: `pnpm test -- --run tests/updateService.test.ts tests/settingsMain.test.ts tests/buildConfig.test.ts`
- [ ] Run broader safety checks: `pnpm test -- --run tests/mainIndex.test.ts`
- [ ] Run static validation: `pnpm typecheck`
- [ ] Review the diff against the spec and confirm every required behavior is represented in code or docs.
