import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('main process activation behavior', () => {
  it('does not open settings on app activation', () => {
    const source = readFileSync(join(process.cwd(), 'src/main/index.ts'), 'utf8')

    expect(source).not.toContain("app.on('activate'")
    expect(source).not.toContain('windows.shouldShowSettingsOnActivate()')
  })
})
