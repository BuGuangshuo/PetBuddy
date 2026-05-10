import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");
const readNormalizedSource = (path: string) =>
  readSource(path).replaceAll('"', "'").replace(/\s+/g, " ");

describe("settings-main actions", () => {
  it("renders a dedicated drag region above the settings content", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");
    const styles = readSource("src/renderer/src/styles.css");

    expect(source).toContain("className='settings-root'");
    expect(source).toContain("className='settings-drag-region'");
    expect(source).toContain("className='settings-shell'");
    expect(styles).toContain(".settings-drag-region {");
    expect(styles).toContain(".settings-root {");
    expect(styles).toContain("-webkit-app-region: drag;");
    expect(styles).toContain(".settings-shell {");
    expect(styles).toContain("flex: 1;");
    expect(styles).toContain("overflow-y: auto;");
    expect(styles).toContain(".settings-shell * {");
    expect(styles).toContain("-webkit-app-region: no-drag;");
  });

  it("does not expose pause reminders actions", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).not.toContain("pauseReminders");
    expect(source).not.toContain("暂停 1 小时");
  });

  it("uses the built-in appearance preview instead of the custom scene resolver for settings chrome", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("resolveAppearancePreviewAsset");
  });

  it("shows scene assets only after entering customize mode from the appearance section", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "const [isAppearanceCustomizing, setIsAppearanceCustomizing] = useState(false)",
    );
    expect(source).toContain(
      "onClick={() => setIsAppearanceCustomizing(true)}",
    );
    expect(source).toContain(
      "{selectedAppearance && isAppearanceCustomizing ? (",
    );
  });

  it("clears the pet-card active state while customize mode is active", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "active={ !isAppearanceCustomizing && appearance.id === payload.settings.selectedPetAppearance }",
    );
  });

  it("uses the customize preview resolver for the custom appearance card", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("resolveAppearanceCustomizePreviewAsset");
    expect(source).toContain(
      "const customizePreviewAsset = selectedAppearance",
    );
    expect(source).toContain("{customizePreviewAsset ? (");
  });

  it("pins built-in scene reference previews to the line-dog appearance", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("const referenceAppearance = useMemo(");
    expect(source).toContain("item.id === 'line-dog'");
    expect(source).toContain(
      "const referenceSceneAsset = referenceAppearance?.sceneAssets.find( (item) => item.scene === sceneAsset.scene, )",
    );
    expect(source).toContain("referenceSceneAsset?.defaultAssets[0]");
  });

  it("omits the sit example from customize scene rows", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      ".filter((sceneAsset) => sceneAsset.scene !== 'sit')",
    );
  });

  it("allows 1-minute increments for break and water reminder intervals", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "value={payload.settings.breakIntervalMinutes} unit='分钟' min={1} max={120} step={1}",
    );
    expect(source).toContain(
      "value={payload.settings.waterIntervalMinutes} unit='分钟' min={1} max={180} step={1}",
    );
  });

  it("allows custom numeric input for break, water, and focus minute settings", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");
    const styles = readSource("src/renderer/src/styles.css");

    expect(source).toContain("inputMode='numeric'");
    expect(source).toContain("value={draft}");
    expect(source).toContain("setDraft(String(value))");
    expect(source).toContain(
      "const normalized = Number.parseInt(draft.trim(), 10)",
    );
    expect(source).toContain("onBlur={commitDraft}");
    expect(source).toContain("if (event.key === 'Enter') {");
    expect(source).toContain(
      "void updateSettings({ breakIntervalMinutes: next })",
    );
    expect(source).toContain(
      "void updateSettings({ waterIntervalMinutes: next })",
    );
    expect(source).toContain(
      "void updateSettings({ focusSessionMinutes: next })",
    );
    expect(styles).toContain(".stepper-input {");
  });

  it("shows the water interval control only when hydration reminders are enabled", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "const isWaterReminderEnabled = isReminderEnabled( payload.settings.waterIntervalMinutes, )",
    );
    expect(source).toContain("{isWaterReminderEnabled ? (");
    expect(source).toContain("<div className='field-label'>喝水间隔</div>");
  });

  it("shows the break interval control only when break reminders are enabled", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "const isBreakReminderEnabled = isReminderEnabled( payload.settings.breakIntervalMinutes, )",
    );
    expect(source).toContain("{isBreakReminderEnabled ? (");
    expect(source).toContain("<div className='field-label'>休息间隔</div>");
  });

  it("shows focus detection settings only when focus mode is enabled and accessibility access is granted", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "const isFocusModeEnabled = payload.settings.focusModeEnabled",
    );
    expect(source).toContain(
      "const canConfigureFocusDetection = isFocusModeEnabled && payload.permissionState === 'granted'",
    );
    expect(source).toContain("{canConfigureFocusDetection ? (");
    expect(source).toContain("<div className='field-label'>检测宽限时间</div>");
    expect(source).toContain("<div className='field-label'>分心应用</div>");
    expect(source).toContain("<div className='field-label'>分心域名</div>");
  });

  it("offers a system app picker for distracting apps without exposing manual entry", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");
    const styles = readSource("src/renderer/src/styles.css");

    expect(source).toContain("window.petBuddy.apps.pickDistractingApp()");
    expect(source).toContain("picked ? [picked.id] : []");
    expect(source).toContain(
      "getLabel={(value) => payload.distractingAppLabels[value] ?? value }",
    );
    expect(source).toContain("选择应用");
    expect(source).toContain("chip-toolbar");
    expect(source).toContain("allowCustomInput = true");
    expect(source).toContain("allowCustomInput={false}");
    expect(styles).toContain(".chip-toolbar {");
  });

  it("normalizes and deduplicates distracting app entries before saving", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "const normalizeDistractingAppValue = (value: string) =>",
    );
    expect(source).toContain("value.trim().replace(/\\s+/g, ' ')");
    expect(source).toContain(
      "const mergeDistractingApps = (values: string[], additions: string[]) =>",
    );
    expect(source).toContain(
      "const normalizedKey = normalized.toLocaleLowerCase()",
    );
    expect(source).toContain("if (!next.length) {");
  });

  it("filters supported browser apps out of distracting app saves and picked additions", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("const SUPPORTED_BROWSER_APP_KEYS = new Set([");
    expect(source).toContain("'com.apple.safari'");
    expect(source).toContain("'safari'");
    expect(source).toContain("'com.google.chrome'");
    expect(source).toContain("'google chrome'");
    expect(source).toContain("'company.thebrowser.browser'");
    expect(source).toContain("'arc'");
    expect(source).toContain("'com.microsoft.edgemac'");
    expect(source).toContain("'microsoft edge'");
    expect(source).toContain(
      "if (SUPPORTED_BROWSER_APP_KEYS.has(normalizedKey)) {",
    );
    expect(source).toContain("await updateSettings({ distractingApps: next })");
    expect(source).toContain("void updateSettings({ distractingApps: next })");
  });

  it("uses the chip editor pattern for distracting domains and explains that it only checks the current frontmost browser tab", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("<div className='field-label'>分心域名</div>");
    expect(source).toContain("仅对当前最前面的浏览器标签页生效");
    expect(source).toContain("payload.settings.distractingDomains");
    expect(source).toContain(
      "placeholder='例如 youtube.com 或 https://x.com/home'",
    );
  });

  it("normalizes and deduplicates distracting domain entries with shared domain semantics before saving", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "import { normalizeDistractingDomains } from '@shared/distractingDomains'",
    );
    expect(source).toContain(
      "const mergeDistractingDomains = (values: string[], additions: string[]) =>",
    );
    expect(source).toContain(
      "normalizeDistractingDomains([...values, ...additions])",
    );
    expect(source).toContain(
      "void updateSettings({ distractingDomains: next })",
    );
  });

  it("positions the distracting app list as non-browser apps and sends browsers to the domain list", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("<div className='field-label'>分心应用</div>");
    expect(source).toContain("浏览器请添加到下面的分心域名");
    expect(source).toContain("仅用于非浏览器 App");
  });

  it("auto-enables focus mode only after permission polling observes granted access for a pending request", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("current?.settings.focusModePendingEnable");
    expect(source).toContain("permissionState === 'granted'");
    expect(source).toContain(
      "window.petBuddy.app.toggleFocusMode(true, false)",
    );
  });

  it("re-enables focus mode without re-prompting once the settings view already knows accessibility access is granted", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("payload.permissionState !== 'granted'");
    expect(source).toContain(
      "window.petBuddy.app.toggleFocusMode( checked, payload.permissionState !== 'granted', )",
    );
  });

  it("refreshes today stats on an interval while the settings view is open", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("const syncTimer = window.setInterval(() => {");
    expect(source).toContain("window.petBuddy.stats.getToday()");
    expect(source).toContain("setStats(today)");
    expect(source).toContain("window.clearInterval(syncTimer)");
  });

  it("refreshes today stats immediately when pet events that affect stats arrive", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "const unsubscribe = window.petBuddy.pet.onEvent((event) => {",
    );
    expect(source).toContain("event.type === 'reminder'");
    expect(source).toContain("event.type === 'hydration-completed'");
    expect(source).toContain("event.type === 'focus-session-updated'");
    expect(source).toContain("void syncTodayStats()");
    expect(source).toContain("unsubscribe()");
  });

  it("refreshes permission state when the settings window regains focus after system changes", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "window.petBuddy.permissions.getAccessibilityStatus()",
    );
    expect(source).toContain(
      "window.addEventListener('focus', syncPermissionState)",
    );
    expect(source).toContain(
      "document.addEventListener('visibilitychange', handleVisibilityChange)",
    );
    expect(source).toContain("document.visibilityState === 'visible'");
    expect(source).toContain(
      "window.removeEventListener('focus', syncPermissionState)",
    );
    expect(source).toContain(
      "document.removeEventListener('visibilitychange', handleVisibilityChange)",
    );
  });

  it("polls permission state while the settings window stays open so revoked access reappears", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "const permissionSyncTimer = window.setInterval(() => {",
    );
    expect(source).toContain("void syncPermissionState()");
    expect(source).toContain("window.clearInterval(permissionSyncTimer)");
  });

  it("shows focus stats from accumulated completed time plus the active session elapsed time", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("getElapsedFocusSessionSeconds");
    expect(source).toContain("stats.focusDurationSeconds");
    expect(source).toContain("payload.focusSession.status === 'active'");
  });

  it("treats a paused focus session as still visible in the settings focus stats surface", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("payload.focusSession.status === 'paused'");
  });

  it("shows water stats from acknowledged completions instead of shown reminders", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("value={stats.acknowledged.water}");
  });

  it("does not show a language selector in the settings panel", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).not.toContain('<div className="field-label">语言</div>');
    expect(source).not.toContain(
      '<select className="select" defaultValue="zh-CN">',
    );
  });

  it("shows an inline update panel in the about section", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("<div className='about-title'>更新</div>");
    expect(source).toContain("{payload.updateState.message}");
    expect(source).toContain("window.petBuddy.updates.checkNow()");
    expect(source).toContain("window.petBuddy.updates.download()");
    expect(source).toContain("检查更新");
  });

  it("shows the current device model name in the about device info row when available", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "const getDeviceInfoText = (payload: SettingsPayload): string => {",
    );
    expect(source).toContain(
      "if (payload.deviceModelName && payload.deviceChipName)",
    );
    expect(source).toContain(
      "`${payload.deviceModelName}（${payload.deviceChipName}） ${platformLabel}`",
    );
    expect(source).toContain("if (payload.deviceChipName)");
    expect(source).toContain("{getDeviceInfoText(payload)}");
  });

  it("keeps the startup update toggle hidden from the system panel", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).not.toContain(
      '<div className="field-label">启动时检查更新</div>',
    );
    expect(source).not.toContain("payload.settings.checkUpdatesOnStartup");
    expect(source).not.toContain(
      "updateSettings({ checkUpdatesOnStartup: checked })",
    );
  });

  it("subscribes to pushed update state changes for download progress", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain("window.petBuddy.updates.onStateChanged");
    expect(source).toContain("setPayload((current) =>");
    expect(source).toContain("updateState: nextUpdateState");
    expect(source).toContain("unsubscribeUpdateState()");
  });

  it("shows the onboarding notice only until the user dismisses it once", () => {
    const rawSource = readSource("src/renderer/src/settings-main.tsx");
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");

    expect(source).toContain(
      "const showOnboarding = !payload.settings.onboardingCompleted",
    );
    expect(source).toContain("{showOnboarding ? (");
    expect(rawSource).not.toContain("{/* {showOnboarding ? (");
    expect(source).not.toContain(
      "showOnboarding || payload.permissionState !== 'granted'",
    );
    expect(source).toContain(
      "void updateSettings({ onboardingCompleted: true })",
    );
  });

  it("renders a fixed two-button onboarding action row with the updated permission copy", () => {
    const rawSource = readSource("src/renderer/src/settings-main.tsx");
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");
    const styles = readSource("src/renderer/src/styles.css");

    expect(source).toContain(
      "PetBuddy 会定时提醒你休息、喝水和保持节奏。分心检测功能需打开系统辅助功能权限。",
    );
    expect(source).toContain("className='notice-actions'");
    expect(rawSource).not.toContain("{/* {showOnboarding ? (");
    expect(source).toContain("打开权限设置");
    expect(source).toContain("GET!");
    expect(source).not.toContain(
      '? " 当前还没有辅助功能权限，专注检测暂时不会生效。"',
    );
    expect(styles).toContain(".notice-actions {");
    expect(styles).toContain("flex-wrap: nowrap;");
    expect(styles).toContain("white-space: nowrap;");
  });

  it("hides the distraction stat card on Windows platform", () => {
    const source = readNormalizedSource("src/renderer/src/settings-main.tsx");
    const styles = readSource("src/renderer/src/styles.css");

    expect(source).toContain("{!payload.isWindows && (");
    expect(source).toContain("<StatCard label='分心'");
    expect(source).toContain("value={stats.shown.focusNudge}");
    expect(source).toContain("className={`stats-grid ${payload.isWindows ? 'stats-grid-3' : ''}`}");
    expect(styles).toContain(".stats-grid-3 {");
    expect(styles).toContain("grid-template-columns: repeat(3, minmax(0, 1fr));");
  });
});
