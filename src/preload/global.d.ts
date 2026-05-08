import type { PetBuddyApi } from '@shared/api'

declare global {
  interface Window {
    petBuddy: PetBuddyApi
  }
}

export {}
