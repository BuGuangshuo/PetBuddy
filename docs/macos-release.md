# macOS Release

## Build outputs

- Local Apple Silicon DMG: `pnpm package`
- Signed + notarized Apple Silicon DMG: `pnpm package:release`

## Required signing prerequisite

Before `pnpm package:release`, import a valid `Developer ID Application` certificate into the local keychain so `electron-builder` can sign the app with a real distribution identity.

## Notarization credentials

`electron-builder` will notarize automatically when one of the following credential sets is present:

### Apple ID + app-specific password

- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

### App Store Connect API key

- `APPLE_API_KEY`
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER`

### Keychain profile

- `APPLE_KEYCHAIN_PROFILE`
- `APPLE_KEYCHAIN` (optional)

## Packaging resources

- App icon source: `build/icon.png`
- App icon bundle: `build/icon.icns`
- Main entitlements: `build/entitlements.mac.plist`
- Inherited entitlements: `build/entitlements.mac.inherit.plist`
