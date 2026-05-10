import { shell, systemPreferences } from 'electron'
import type { PermissionState } from '@shared/types'

export const getAccessibilityStatus = (): PermissionState => {
  if (process.platform !== 'darwin') {
    // On Windows and other platforms, accessibility features don't require special permissions
    return 'granted'
  }

  try {
    return systemPreferences.isTrustedAccessibilityClient(false) ? 'granted' : 'denied'
  } catch {
    return 'unknown'
  }
}

export const promptForAccessibilityIfNeeded = (): PermissionState => {
  if (process.platform !== 'darwin') {
    return 'granted'
  }

  return systemPreferences.isTrustedAccessibilityClient(true) ? 'granted' : 'denied'
}

export const openAccessibilitySettings = async (): Promise<void> => {
  if (process.platform === 'darwin') {
    await shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
    )
  }
  // On Windows, there's no equivalent accessibility settings to open
}
