import { describe, expect, it, vi } from 'vitest'
import { buildMacApplicationMenuTemplate } from '../src/main/services/menuTemplates'

describe('buildMacApplicationMenuTemplate', () => {
  it('shows 显示小狗 when the pet is hidden', () => {
    const onOpenSettings = vi.fn()
    const onTogglePet = vi.fn()
    const onQuit = vi.fn()

    const template = buildMacApplicationMenuTemplate({
      appName: 'PetBuddy',
      isPetVisible: false,
      onOpenSettings,
      onTogglePet,
      onQuit
    })

    const appMenu = template[0]
    expect(appMenu?.label).toBe('PetBuddy')

    const submenu = Array.isArray(appMenu?.submenu) ? appMenu.submenu : []
    const toggleItem = submenu.find((item) => 'label' in item && item.label === '显示小狗')

    expect(toggleItem).toMatchObject({
      label: '显示小狗'
    })

    if (toggleItem && 'click' in toggleItem && typeof toggleItem.click === 'function') {
      toggleItem.click(undefined as never, undefined as never, undefined as never)
    }

    expect(onTogglePet).toHaveBeenCalledTimes(1)
  })

  it('shows 隐藏小狗 when the pet is visible and uses Chinese top-level labels', () => {
    const template = buildMacApplicationMenuTemplate({
      appName: 'PetBuddy',
      isPetVisible: true,
      onOpenSettings: vi.fn(),
      onTogglePet: vi.fn(),
      onQuit: vi.fn()
    })

    expect(template[1]?.label).toBe('编辑')
    expect(template[2]?.label).toBe('窗口')

    const appMenu = template[0]
    const submenu = Array.isArray(appMenu?.submenu) ? appMenu.submenu : []

    expect(submenu.some((item) => 'label' in item && item.label === '隐藏小狗')).toBe(true)
    expect(submenu.some((item) => 'label' in item && item.label === '显示小狗')).toBe(false)
  })
})
