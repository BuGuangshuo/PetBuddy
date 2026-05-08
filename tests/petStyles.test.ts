import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('pet focus bubble styles', () => {
  it('keeps the focus countdown bubble compact', () => {
    const source = readFileSync(join(process.cwd(), 'src/renderer/src/styles.css'), 'utf8')

    expect(source).toContain('.pet-presence {')
    expect(source).toContain('gap: 2px;')
    expect(source).toContain('bottom: 12px;')
    expect(source).toContain('min-height: 24px;')
    expect(source).toContain('padding: 3px 10px 4px;')
    expect(source).toContain('gap: 5px;')
    expect(source).toContain('font-size: 10px;')
    expect(source).toContain('font-size: 12px;')
  })

  it('keeps the reminder message bubble and action button compact', () => {
    const source = readFileSync(join(process.cwd(), 'src/renderer/src/styles.css'), 'utf8')

    expect(source).toContain('min-width: 144px;')
    expect(source).toContain('width: max-content;')
    expect(source).toContain('max-width: none;')
    expect(source).toContain('bottom: 128px;')
    expect(source).toContain('padding: 8px 10px 10px;')
    expect(source).toContain('font-size: 13px;')
    expect(source).toContain('white-space: nowrap;')
    expect(source).toContain('min-width: 50px;')
    expect(source).toContain('min-height: 22px;')
    expect(source).toContain('padding: 5px 10px;')
    expect(source).toContain('font-size: 12px;')
    expect(source).toContain('gap: 8px;')
  })

  it('renders the break reminder as a centered dialog with vertical actions', () => {
    const source = readFileSync(join(process.cwd(), 'src/renderer/src/styles.css'), 'utf8')

    expect(source).toContain('.pet-card-anchor {')
    expect(source).toContain('width: 148px;')
    expect(source).toContain('height: 148px;')
    expect(source).toContain('.pet-dialog {')
    expect(source).toContain('left: 50%;')
    expect(source).toContain('bottom: 120px;')
    expect(source).toContain('transform: translateX(-50%);')
    expect(source).toContain('width: max-content;')
    expect(source).toContain('min-width: 220px;')
    expect(source).toContain('max-width: min(320px, calc(100vw - 24px));')
    expect(source).toContain('.pet-dialog::after {')
    expect(source).toContain('.pet-dialog-text {')
    expect(source).toContain('white-space: nowrap;')
    expect(source).toContain('.pet-dialog-actions {')
    expect(source).toContain('display: flex;')
    expect(source).toContain('justify-content: center;')
    expect(source).toContain('flex-wrap: wrap;')
    expect(source).toContain('.pet-dialog-button {')
    expect(source).toContain('min-width: 0;')
  })

  it('keeps the pet stage footprint tight for hit testing', () => {
    const source = readFileSync(join(process.cwd(), 'src/renderer/src/styles.css'), 'utf8')

    expect(source).toContain('.pet-stage {')
    expect(source).toContain('width: 100%;')
    expect(source).toContain('min-width: 176px;')
    expect(source).toContain('height: 308px;')
  })

  it('prevents horizontal scrollbars in the pet window while allowing the window to grow', () => {
    const source = readFileSync(join(process.cwd(), 'src/renderer/src/styles.css'), 'utf8')

    expect(source).toContain('overflow: hidden;')
  })

  it('gives the settings window its own vertical scroll container', () => {
    const source = readFileSync(join(process.cwd(), 'src/renderer/src/styles.css'), 'utf8')
    const settingsHtml = readFileSync(join(process.cwd(), 'src/renderer/settings.html'), 'utf8')

    expect(settingsHtml).toContain('<body class="settings-window">')
    expect(source).toContain('body.settings-window,')
    expect(source).toContain('body.settings-window #root {')
    expect(source).toContain('height: 100%;')
    expect(source).toContain('overflow: hidden;')
    expect(source).toContain('overflow-y: auto;')
    expect(source).toContain('overflow-x: hidden;')
  })
})
