/**
 * Windows平台活动窗口检测模块
 * 使用 @paymoapp/active-window 库来获取当前活动窗口信息
 */

import type { FrontmostSample } from './focusMonitor'
import { normalizeDistractingDomain } from '@shared/distractingDomains'

let ActiveWindow: any = null
let isInitialized = false

/**
 * 初始化Windows活动窗口检测
 */
export const initializeWindowsActiveWindow = (): boolean => {
  if (isInitialized) {
    return true
  }

  try {
    // 动态导入native模块，避免在非Windows平台加载
    ActiveWindow = require('@paymoapp/active-window').default
    ActiveWindow.initialize()
    isInitialized = true
    console.log('[Windows] Active window detection initialized')
    return true
  } catch (error) {
    console.error('[Windows] Failed to initialize active window detection:', error)
    return false
  }
}

/**
 * 从应用程序路径提取可执行文件名作为appId
 */
const extractAppIdFromPath = (path: string): string => {
  if (!path) return ''
  
  // 提取文件名（不含扩展名）
  const fileName = path.split('\\').pop() || path.split('/').pop() || ''
  return fileName.replace(/\.exe$/i, '')
}

/**
 * 支持的浏览器应用名称列表（Windows）
 */
const WINDOWS_BROWSERS = new Set([
  'chrome',
  'msedge',
  'firefox',
  'opera',
  'brave',
  'vivaldi',
  'iexplore',
  'microsoftedge'
])

/**
 * 检查应用是否为浏览器
 */
const isBrowserApp = (appName: string, path: string): boolean => {
  const appNameLower = appName.toLowerCase()
  const pathLower = path.toLowerCase()
  
  return Array.from(WINDOWS_BROWSERS).some(browser => 
    appNameLower.includes(browser) || pathLower.includes(browser)
  )
}

/**
 * 从浏览器窗口标题中提取域名
 * 支持常见浏览器的标题格式
 */
const extractDomainFromBrowserTitle = (title: string): string | null => {
  if (!title) return null

  // 常见浏览器标题格式:
  // "页面标题 - Google Chrome"
  // "页面标题 - domain.com - Google Chrome"
  // "domain.com - 页面标题"
  
  // 尝试匹配URL模式
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9])/g
  const matches = title.match(urlPattern)
  
  if (matches && matches.length > 0) {
    // 使用第一个匹配的域名
    try {
      return normalizeDistractingDomain(matches[0])
    } catch {
      return null
    }
  }

  return null
}

/**
 * 获取Windows平台的前台窗口信息
 */
export const getWindowsFrontmostSample = async (): Promise<FrontmostSample> => {
  if (!isInitialized || !ActiveWindow) {
    return { appId: null, domain: null }
  }

  try {
    const windowInfo = ActiveWindow.getActiveWindow()
    
    if (!windowInfo) {
      return { appId: null, domain: null }
    }

    // Windows 使用完整路径作为 appId，这样可以与用户选择的应用路径匹配
    // 如果路径不可用，则使用应用程序名称
    const appId = windowInfo.path || windowInfo.application || extractAppIdFromPath(windowInfo.path)
    
    // 如果是浏览器，尝试从标题中提取域名
    let domain: string | null = null
    if (isBrowserApp(windowInfo.application, windowInfo.path)) {
      domain = extractDomainFromBrowserTitle(windowInfo.title)
    }

    return {
      appId: appId || null,
      domain
    }
  } catch (error) {
    // 静默失败，返回空结果
    return { appId: null, domain: null }
  }
}
