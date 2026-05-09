# Browser Domain Focus Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add distracting-domain detection for the current frontmost browser tab while preserving existing distracting-app detection for non-browser apps.

**Architecture:** Extend shared focus data and store settings with a normalized `distractingDomains` list plus shared host-matching helpers. The main process will keep reading the frontmost app, but supported browsers will also provide the active tab URL so focus-session logic can classify distraction by domain instead of browser app identity. The settings renderer will expose a second chip editor for domain rules and reuse shared normalization semantics in focused tests.

**Tech Stack:** Electron, React, TypeScript, Vitest, AppleScript via `osascript`

---

### Task 1: Add Shared Domain Rules And Store Contracts

**Files:**
- Create: `src/shared/distractingDomains.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/defaults.ts`
- Modify: `src/shared/storeSchema.ts`
- Test: `tests/storeSchema.test.ts`
- Test: `tests/focusSession.test.ts`
- Test: `tests/focusSessionTimer.test.ts`

- [ ] **Step 1: Write the failing tests**

Add focused assertions for the new settings field and host matching behavior.

```ts
import {
  domainMatchesRule,
  normalizeDistractingDomainValue,
  normalizeDistractingDomainValues
} from '../src/shared/distractingDomains'

test('normalizes distracting domain values from raw hosts and full URLs', () => {
  expect(normalizeDistractingDomainValue(' https://www.YouTube.com/watch?v=1 ')).toBe('youtube.com')
  expect(normalizeDistractingDomainValue('reddit.com/r/all')).toBe('reddit.com')
  expect(normalizeDistractingDomainValue('')).toBeNull()
})

test('deduplicates normalized distracting domain values', () => {
  expect(
    normalizeDistractingDomainValues([
      'youtube.com',
      'https://www.youtube.com/watch?v=1',
      'YOUTUBE.COM'
    ])
  ).toEqual(['youtube.com'])
})

test('matches exact domains and subdomains but not suffix collisions', () => {
  expect(domainMatchesRule('youtube.com', 'youtube.com')).toBe(true)
  expect(domainMatchesRule('www.youtube.com', 'youtube.com')).toBe(true)
  expect(domainMatchesRule('notyoutube.com', 'youtube.com')).toBe(false)
})
```

Extend store-schema tests with assertions like:

```ts
expect(store.settings.distractingDomains).toEqual(['youtube.com'])
expect(store.settings.distractingDomains).not.toBe(defaultSettings.distractingDomains)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run tests/storeSchema.test.ts tests/focusSession.test.ts tests/focusSessionTimer.test.ts`

Expected: FAIL because `distractingDomains` and shared domain helpers do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Create `src/shared/distractingDomains.ts` with a narrow helper surface:

```ts
const stripCommonSubdomainPrefix = (host: string): string =>
  host.startsWith('www.') ? host.slice(4) : host

const parseHost = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const candidate = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    const host = url.hostname.trim().toLowerCase().replace(/^\.+|\.+$/g, '')
    return host || null
  } catch {
    return null
  }
}

export const normalizeDistractingDomainValue = (value: string): string | null => {
  const host = parseHost(value)
  if (!host) {
    return null
  }

  return stripCommonSubdomainPrefix(host)
}

export const normalizeDistractingDomainValues = (values: string[]): string[] => {
  const seen = new Set<string>()
  const next: string[] = []

  for (const value of values) {
    const normalized = normalizeDistractingDomainValue(value)
    if (!normalized || seen.has(normalized)) {
      continue
    }

    seen.add(normalized)
    next.push(normalized)
  }

  return next
}

export const domainMatchesRule = (domain: string, rule: string): boolean =>
  domain === rule || domain.endsWith(`.${rule}`)
```

Update shared contracts with:

```ts
export interface AppSettings {
  // ...
  distractingApps: string[]
  distractingDomains: string[]
  onboardingCompleted: boolean
}

export interface FocusSample {
  appId: string | null
  domain: string | null
  timestamp: number
}
```

Update defaults/store normalization to clone and normalize `distractingDomains` alongside `distractingApps`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run tests/storeSchema.test.ts tests/focusSession.test.ts tests/focusSessionTimer.test.ts`

Expected: PASS for the new shared helper and store assertions, or fail only where browser-aware focus logic is still missing.

- [ ] **Step 5: Commit**

```bash
git add src/shared/distractingDomains.ts src/shared/types.ts src/shared/defaults.ts src/shared/storeSchema.ts tests/storeSchema.test.ts tests/focusSession.test.ts tests/focusSessionTimer.test.ts
git commit -m "feat: add distracting domain settings contracts"
```

### Task 2: Teach Focus Logic To Classify Browser Samples By Domain

**Files:**
- Modify: `src/shared/focusSession.ts`
- Modify: `tests/focusSession.test.ts`
- Modify: `tests/focusSessionCompletion.test.ts`

- [ ] **Step 1: Write the failing tests**

Add browser-specific focus-session tests that show supported browser samples ignore `distractingApps` and instead use `distractingDomains`.

```ts
test('treats a browser sample as distracting when its domain matches a configured rule', () => {
  const state = stepFocusMonitor(
    createInitialFocusState(),
    { appId: 'com.google.Chrome', domain: 'www.youtube.com', timestamp: 30_000 },
    {
      distractingApps: ['com.google.Chrome'],
      distractingDomains: ['youtube.com'],
      focusGraceSeconds: 20
    }
  )

  expect(state.currentDistractingApp).toBe('com.google.Chrome')
  expect(state.shouldNudge).toBe(false)
})

test('does not treat a browser sample as distracting when only the browser app matches', () => {
  const state = stepFocusMonitor(
    createInitialFocusState(),
    { appId: 'com.google.Chrome', domain: 'calendar.google.com', timestamp: 30_000 },
    {
      distractingApps: ['com.google.Chrome'],
      distractingDomains: ['youtube.com'],
      focusGraceSeconds: 20
    }
  )

  expect(state.currentDistractingApp).toBeNull()
  expect(state.shouldNudge).toBe(false)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run tests/focusSession.test.ts tests/focusSessionCompletion.test.ts`

Expected: FAIL because `stepFocusMonitor()` still only checks `distractingApps`.

- [ ] **Step 3: Write the minimal implementation**

Refactor `src/shared/focusSession.ts` to classify distraction through one helper:

```ts
import { domainMatchesRule } from './distractingDomains'

interface FocusOptions {
  distractingApps: string[]
  distractingDomains: string[]
  focusGraceSeconds: number
}

const BROWSER_APP_IDS = new Set([
  'com.apple.Safari',
  'com.google.Chrome',
  'company.thebrowser.Browser',
  'com.microsoft.edgemac'
])

const isDistractingSample = (sample: FocusSample, options: FocusOptions): boolean => {
  if (sample.appId && BROWSER_APP_IDS.has(sample.appId)) {
    return (
      sample.domain !== null &&
      options.distractingDomains.some((rule) => domainMatchesRule(sample.domain as string, rule))
    )
  }

  return sample.appId !== null && options.distractingApps.includes(sample.appId)
}
```

Use that helper inside `stepFocusMonitor()` and leave streak/nudge bookkeeping unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run tests/focusSession.test.ts tests/focusSessionCompletion.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/focusSession.ts tests/focusSession.test.ts tests/focusSessionCompletion.test.ts
git commit -m "feat: classify browser distraction by domain"
```

### Task 3: Sample Frontmost Browser Tab URLs In The Main Process

**Files:**
- Modify: `src/main/services/focusMonitor.ts`
- Modify: `tests/focusMonitor.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the current narrow mock of `getFrontmostApp()` with tests that cover browser URL sampling and fallback behavior.

```ts
test('reads the frontmost browser tab url and nudges only when its domain matches', async () => {
  const onNudge = vi.fn()
  const onDistractedDelta = vi.fn()
  const onFocusStreak = vi.fn()

  const service = new FocusMonitorService({
    getSettings: () => ({
      ...baseSettings,
      focusModeEnabled: true,
      focusGraceSeconds: 5,
      distractingApps: ['com.apple.MobileSMS'],
      distractingDomains: ['youtube.com']
    }),
    shouldMonitor: () => true,
    hasPermission: () => true,
    onDistractedDelta,
    onFocusStreak,
    onNudge,
    getFrontmostSample: async () => ({
      appId: 'com.google.Chrome',
      domain: 'www.youtube.com'
    })
  })

  service.start()
  await vi.advanceTimersByTimeAsync(10_000)

  expect(onDistractedDelta).toHaveBeenCalled()
  expect(onNudge).toHaveBeenCalledTimes(1)
})

test('ignores browser url lookup failures without throwing', async () => {
  const onNudge = vi.fn()
  const onDistractedDelta = vi.fn()
  const onFocusStreak = vi.fn()

  const service = new FocusMonitorService({
    getSettings: () => ({
      ...baseSettings,
      focusModeEnabled: true,
      focusGraceSeconds: 5,
      distractingApps: ['com.apple.MobileSMS'],
      distractingDomains: ['youtube.com']
    }),
    shouldMonitor: () => true,
    hasPermission: () => true,
    onDistractedDelta,
    onFocusStreak,
    onNudge,
    getFrontmostSample: async () => ({
      appId: 'com.google.Chrome',
      domain: null
    })
  })

  service.start()
  await expect(vi.advanceTimersByTimeAsync(10_000)).resolves.toBeUndefined()

  expect(onDistractedDelta).not.toHaveBeenCalled()
  expect(onNudge).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run tests/focusMonitor.test.ts`

Expected: FAIL because the service still expects `getFrontmostApp()` and never produces browser domain samples.

- [ ] **Step 3: Write the minimal implementation**

Refactor the service contract from `getFrontmostApp?: () => Promise<string | null>` to:

```ts
interface FrontmostSample {
  appId: string | null
  domain: string | null
}

interface FocusMonitorOptions {
  // ...
  getFrontmostSample?: () => Promise<FrontmostSample>
}
```

Update the timer tick to call `readFrontmostSample()` and pass the full sample into `stepFocusMonitor()`.

Implement helpers in `src/main/services/focusMonitor.ts` for:

```ts
const BROWSER_SCRIPTS: Record<string, string[]> = {
  'com.apple.Safari': [
    'tell application "Safari"',
    'if not (exists front window) then return ""',
    'return URL of current tab of front window',
    'end tell'
  ],
  'com.google.Chrome': [
    'tell application "Google Chrome"',
    'if not (exists front window) then return ""',
    'return URL of active tab of front window',
    'end tell'
  ],
  'company.thebrowser.Browser': [
    'tell application "Arc"',
    'if not (exists front window) then return ""',
    'return URL of active tab of front window',
    'end tell'
  ],
  'com.microsoft.edgemac': [
    'tell application "Microsoft Edge"',
    'if not (exists front window) then return ""',
    'return URL of active tab of front window',
    'end tell'
  ]
}
```

Use `normalizeDistractingDomainValue()` on the returned URL to derive `domain`, and return `null` on any AppleScript failure.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run tests/focusMonitor.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/services/focusMonitor.ts tests/focusMonitor.test.ts
git commit -m "feat: read browser domains in focus monitor"
```

### Task 4: Expose Distracting Domains In Settings

**Files:**
- Modify: `src/renderer/src/settings-main.tsx`
- Modify: `tests/settingsMain.test.ts`

- [ ] **Step 1: Write the failing tests**

Add source-level assertions for the new field and normalization path.

```ts
it('shows a distracting domain field alongside distracting apps', () => {
  const source = readNormalizedSource('src/renderer/src/settings-main.tsx')

  expect(source).toContain("<div className='field-label'>分心域名</div>")
  expect(source).toContain('payload.settings.distractingDomains')
  expect(source).toContain('normalizeDistractingDomainValue')
})

it('normalizes and deduplicates distracting domain entries before saving', () => {
  const source = readNormalizedSource('src/renderer/src/settings-main.tsx')

  expect(source).toContain('const mergeDistractingDomains = (values: string[], additions: string[]) =>')
  expect(source).toContain("https://www.youtube.com/watch?v=1")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run tests/settingsMain.test.ts`

Expected: FAIL because the settings renderer has no distracting-domain UI or helpers.

- [ ] **Step 3: Write the minimal implementation**

Import and use shared normalization helpers in `src/renderer/src/settings-main.tsx`:

```ts
import { normalizeDistractingDomainValue } from '@shared/distractingDomains'

const mergeNormalizedValues = (
  values: string[],
  additions: string[],
  normalize: (value: string) => string | null
): string[] => {
  const seen = new Set<string>()
  const next: string[] = []

  for (const value of [...values, ...additions]) {
    const normalized = normalize(value)
    if (!normalized || seen.has(normalized.toLocaleLowerCase())) {
      continue
    }

    seen.add(normalized.toLocaleLowerCase())
    next.push(normalized)
  }

  return next
}
```

Render a second `ChipEditor`:

```tsx
<div className="field-row">
  <div>
    <div className="field-label">分心域名</div>
    <div className="field-hint">只检查当前前台浏览器标签页的域名。</div>
  </div>
  <div className="field-control">
    <ChipEditor
      values={payload.settings.distractingDomains}
      onChange={(next) =>
        void updateSettings({
          distractingDomains: mergeDistractingDomains([], next)
        })
      }
      placeholder="例如 youtube.com 或 https://x.com/home"
    />
  </div>
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run tests/settingsMain.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/settings-main.tsx tests/settingsMain.test.ts
git commit -m "feat: add distracting domain settings"
```

### Task 5: Verify Integrated Behavior

**Files:**
- Verify: `src/shared/distractingDomains.ts`
- Verify: `src/shared/types.ts`
- Verify: `src/shared/defaults.ts`
- Verify: `src/shared/storeSchema.ts`
- Verify: `src/shared/focusSession.ts`
- Verify: `src/main/services/focusMonitor.ts`
- Verify: `src/renderer/src/settings-main.tsx`
- Verify: `tests/storeSchema.test.ts`
- Verify: `tests/focusSession.test.ts`
- Verify: `tests/focusSessionCompletion.test.ts`
- Verify: `tests/focusMonitor.test.ts`
- Verify: `tests/settingsMain.test.ts`

- [ ] **Step 1: Run targeted verification**

Run: `pnpm test -- --run tests/storeSchema.test.ts tests/focusSession.test.ts tests/focusSessionCompletion.test.ts tests/focusMonitor.test.ts tests/settingsMain.test.ts`

Expected: PASS.

- [ ] **Step 2: Run broader regression coverage**

Run: `pnpm test -- --run tests/reminderService.test.ts tests/mainIndex.test.ts`

Expected: PASS.

- [ ] **Step 3: Run static validation**

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 4: Review the diff against the spec**

Confirm in the resulting diff that:

- `distractingDomains` is persisted and normalized
- browser samples classify distraction by frontmost-tab domain only
- non-browser apps still use `distractingApps`
- supported browsers are Safari, Google Chrome, Arc, and Microsoft Edge
- settings explain the frontmost-tab-only scope
