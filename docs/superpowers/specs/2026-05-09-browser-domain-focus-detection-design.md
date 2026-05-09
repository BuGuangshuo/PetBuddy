# Browser Domain Focus Detection Design

## Goal

Add browser-domain distraction detection without removing the existing app-based focus monitoring:

1. Non-browser apps keep using the current `distractingApps` list.
2. Supported browsers use the current frontmost tab URL instead of the browser app identity alone.
3. If the frontmost browser tab's domain matches a configured distracting domain, the focus monitor treats it as distraction and can trigger the existing nudge flow.

## Scope

In scope:

- domain-based distraction matching for the frontmost active tab only
- first-pass browser support for Safari, Google Chrome, Arc, and Microsoft Edge
- a new settings field for distracting domains
- normalization of user-entered domains before persistence
- focused tests for domain normalization, matching, monitor behavior, and settings persistence

Out of scope:

- path-level URL matching
- matching background tabs or tabs in non-frontmost browser windows
- Firefox support
- replacing the existing app-based distraction list
- a general rule engine for mixed app/domain policies

## Current State

- [src/main/services/focusMonitor.ts](/Users/alanbu/PetBuddy/src/main/services/focusMonitor.ts) samples only the frontmost macOS app, using AppleScript to read the frontmost process bundle identifier or app name.
- [src/shared/focusSession.ts](/Users/alanbu/PetBuddy/src/shared/focusSession.ts) decides distraction from a single `appId` string and a `distractingApps` array.
- [src/renderer/src/settings-main.tsx](/Users/alanbu/PetBuddy/src/renderer/src/settings-main.tsx) exposes only app-based distraction configuration.
- Store defaults and normalization currently know nothing about browser domains.

## Chosen Approach

Keep the existing app-based flow for non-browser apps, and add a browser-specific path that resolves the frontmost tab URL and matches its domain.

Reasoning:

- It preserves current behavior for apps like Messages or Slack.
- It keeps the change set local to focus monitoring, shared matching logic, settings, and store normalization.
- It avoids forcing a broader policy abstraction that the current codebase does not need yet.

## Product Behavior

### Detection Rules

The monitor evaluates distraction in this order:

1. Read the frontmost app identity.
2. If that app is a supported browser, read the active tab URL for the frontmost browser window.
3. Normalize the URL host into a comparable domain value.
4. If the domain matches `distractingDomains`, treat the sample as distracting.
5. If the frontmost app is not a supported browser, fall back to the existing `distractingApps` check.

Supported browsers for this version:

- Safari
- Google Chrome
- Arc
- Microsoft Edge

### Matching Rules

Configured domains are stored as normalized hosts, for example:

- `youtube.com`
- `x.com`
- `reddit.com`

Match semantics:

- exact domain matches count
- subdomains also count
- unrelated suffix collisions do not count

Examples:

- `youtube.com` matches `youtube.com` and `www.youtube.com`
- `youtube.com` does not match `notyoutube.com`

This version ignores URL path, query string, and fragment.

### Settings UX

The focus section gets a new `分心域名` field under `分心应用`.

The UI continues to use the existing chip-editor pattern:

- user types a value and presses Enter
- duplicate entries are removed
- persisted values are normalized before saving

Accepted input can be either a raw domain or a full URL, for example:

- `youtube.com`
- `https://www.youtube.com/watch?v=123`

Both persist as `youtube.com`.

### Failure Handling

If browser tab URL lookup fails for a supported browser:

- no error UI is shown
- the sampling tick continues
- that sample is treated as a non-matching browser-domain sample

This keeps the focus monitor resilient to browser script failures or transient missing tabs.

## Technical Design

### Shared Types And Store

Extend [src/shared/types.ts](/Users/alanbu/PetBuddy/src/shared/types.ts):

- add `distractingDomains: string[]` to `AppSettings`
- expand `FocusSample` to carry the information needed for browser-aware matching:
  - `appId: string | null`
  - `domain: string | null`

Update [src/shared/defaults.ts](/Users/alanbu/PetBuddy/src/shared/defaults.ts) and [src/shared/storeSchema.ts](/Users/alanbu/PetBuddy/src/shared/storeSchema.ts):

- add a default empty `distractingDomains` array
- clone it when building default stores
- normalize persisted values into a string array

### Domain Utilities

Add a shared utility module for browser-domain matching responsibilities:

- normalize user input into a host-only domain rule
- extract a comparable host from a browser URL
- perform domain/subdomain matching

Expected normalization behavior:

- trim whitespace
- lowercase
- accept full URLs by parsing host
- accept bare hosts by parsing with an implied scheme
- remove leading and trailing dots
- drop trailing slash and other URL parts by storing only the host
- reject invalid or empty values

Examples:

- ` HTTPS://WWW.YouTube.COM/watch ` -> `youtube.com`
- `youtube.com/shorts` -> `youtube.com`

Persistence policy for this feature:

- persist the registrable host form used as the matching rule whenever normalization can derive it safely
- matching logic, not persistence, is what grants subdomain coverage

This means:

- `youtube.com` stays `youtube.com`
- `www.youtube.com` becomes `youtube.com`

This keeps pasted browser URLs and raw host entries converging onto the same stored rule in the common cases this feature targets.

### Focus Session Matching

Update [src/shared/focusSession.ts](/Users/alanbu/PetBuddy/src/shared/focusSession.ts) so distraction is derived from either:

- app match for non-browser samples
- domain match for browser samples

The session state shape can remain centered on a single current distraction label. The stored `currentDistractingApp` field may continue to hold the app identifier for compatibility, or it can be renamed to a more neutral field if the refactor stays contained. If renamed, all dependent tests and types must move with it in the same change.

Behavioral requirement:

- supported browser samples should not trigger distraction solely because the browser app name appears in `distractingApps`
- they trigger only when the frontmost tab domain matches `distractingDomains`

### Main Process Browser Sampling

Extend [src/main/services/focusMonitor.ts](/Users/alanbu/PetBuddy/src/main/services/focusMonitor.ts):

- keep the existing frontmost-app lookup
- detect whether the frontmost app is one of the supported browsers
- if yes, run browser-specific AppleScript to get the active tab URL
- build a `FocusSample` with both `appId` and normalized `domain`

Implementation shape:

- add a small browser metadata map keyed by app identifier or app name
- add a helper that returns `string | null` for the current tab URL of the detected browser
- parse the returned URL before passing the sample into shared logic

Browser scripting expectations:

- Safari: read the current tab URL of the front window
- Chrome-family browsers: read the active tab URL of the front window

Any AppleScript exception returns `null`.

### Settings Renderer

Update [src/renderer/src/settings-main.tsx](/Users/alanbu/PetBuddy/src/renderer/src/settings-main.tsx):

- add a `分心域名` chip editor field
- wire it to `payload.settings.distractingDomains`
- normalize and deduplicate values before saving, using the same helper pattern as the current distracting-app input

Minimal supporting copy should explain that this field applies to the current frontmost browser tab.

## Testing Strategy

### Shared Tests

Add tests for:

- domain normalization from raw domains and full URLs
- invalid values being ignored
- exact-domain match
- subdomain match
- suffix non-match (`notyoutube.com`)

### Focus Logic Tests

Update or add tests for:

- non-browser app samples still use `distractingApps`
- supported browser samples with matching domain trigger distraction
- supported browser samples with non-matching domain do not trigger distraction
- supported browser samples ignore `distractingApps`

### Main Process Tests

Add focused tests around [src/main/services/focusMonitor.ts](/Users/alanbu/PetBuddy/src/main/services/focusMonitor.ts):

- supported browser app plus tab URL yields a domain sample
- browser URL lookup failure yields a sample without a domain and does not throw
- non-browser apps skip browser URL lookup

### Renderer Tests

Update [tests/settingsMain.test.ts](/Users/alanbu/PetBuddy/tests/settingsMain.test.ts) and related helpers for:

- the new `分心域名` field being present
- normalization and deduplication before saving
- supporting pasted URLs in that field

## Risks And Constraints

- AppleScript support differs by browser and can fail when no window or tab is available.
- Arc and Edge follow Chrome-family scripting closely, but their application names must match what AppleScript expects on the target system.
- Domain-only rules mean users cannot target a single path such as `/shorts`; that is an explicit non-goal for this version.

## Implementation Notes

- Keep new domain logic in shared helpers rather than embedding string parsing in the renderer and main process separately.
- Prefer minimal shape changes in focus-session state unless the current naming becomes actively misleading during implementation.
- Preserve current nudge timing, streak tracking, and stats behavior; only the distraction classification input changes.
