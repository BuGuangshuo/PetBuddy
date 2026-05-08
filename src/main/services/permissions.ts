import { shell, systemPreferences } from 'electron'
import type { PermissionState } from '@shared/types'

export const getAccessibilityStatus = (): PermissionState => {
  if (process.platform !== 'darwin') {
    return 'denied'
  }

  try {
    return systemPreferences.isTrustedAccessibilityClient(false) ? 'granted' : 'denied'
  } catch {
    return 'unknown'
  }
}

export const promptForAccessibilityIfNeeded = (): PermissionState => {
  if (process.platform !== 'darwin') {
    return 'denied'
  }

  return systemPreferences.isTrustedAccessibilityClient(true) ? 'granted' : 'denied'
}

export const openAccessibilitySettings = async (): Promise<void> => {
  await shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
  )
}
