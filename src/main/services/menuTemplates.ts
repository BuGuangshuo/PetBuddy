import type { MenuItemConstructorOptions } from 'electron'

interface MacApplicationMenuOptions {
  appName: string
  isPetVisible: boolean
  onOpenSettings: () => void
  onTogglePet: () => void
  onQuit: () => void
}

export const buildMacApplicationMenuTemplate = ({
  appName,
  isPetVisible,
  onOpenSettings,
  onTogglePet,
  onQuit
}: MacApplicationMenuOptions): MenuItemConstructorOptions[] => [
  {
    label: appName,
    submenu: [
      { label: '打开设置', click: onOpenSettings },
      { label: isPetVisible ? '隐藏小狗' : '显示小狗', click: onTogglePet },
      { type: 'separator' },
      { label: '服务', role: 'services' },
      { type: 'separator' },
      { label: `隐藏 ${appName}`, role: 'hide' },
      { label: '隐藏其他', role: 'hideOthers' },
      { label: '全部显示', role: 'unhide' },
      { type: 'separator' },
      { label: `退出 ${appName}`, click: onQuit }
    ]
  },
  {
    label: '编辑',
    submenu: [
      { label: '撤销', role: 'undo' },
      { label: '重做', role: 'redo' },
      { type: 'separator' },
      { label: '剪切', role: 'cut' },
      { label: '复制', role: 'copy' },
      { label: '粘贴', role: 'paste' },
      { label: '全选', role: 'selectAll' }
    ]
  },
  {
    label: '窗口',
    submenu: [
      { label: '最小化', role: 'minimize' },
      { label: '缩放', role: 'zoom' },
      { type: 'separator' },
      { label: '置于最前', role: 'front' }
    ]
  }
]
