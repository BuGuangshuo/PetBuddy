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
  console.log('[Windows] initializeWindowsActiveWindow called, platform:', process.platform)
  
  if (isInitialized) {
    console.log('[Windows] Active window detection already initialized')
    return true
  }

  try {
    console.log('[Windows] Attempting to load @paymoapp/active-window module...')
    // 动态导入native模块，避免在非Windows平台加载
    ActiveWindow = require('@paymoapp/active-window').default
    console.log('[Windows] Module loaded:', typeof ActiveWindow)
    
    console.log('[Windows] Calling ActiveWindow.initialize()...')
    ActiveWindow.initialize()
    
    isInitialized = true
    console.log('[Windows] Active window detection initialized successfully')
    
    // 测试一下是否能获取窗口信息
    try {
      const testWindow = ActiveWindow.getActiveWindow()
      console.log('[Windows] Test getActiveWindow():', testWindow)
    } catch (testError) {
      console.error('[Windows] Test getActiveWindow() failed:', testError)
    }
    
    return true
  } catch (error) {
    console.error('[Windows] Failed to initialize active window detection:', error)
    console.error('[Windows] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
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
  if (!title) {
    console.log('[Windows] extractDomain: empty title')
    return null
  }

  console.log('[Windows] extractDomain: trying to extract from title:', title)

  // 常见浏览器标题格式:
  // "页面标题 - Google Chrome"
  // "页面标题 - domain.com - Google Chrome"
  // "domain.com - 页面标题"
  // "百度一下，你就知道 - Google Chrome"
  
  // 方法1: 尝试匹配完整URL模式
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9])/g
  const matches = title.match(urlPattern)
  
  if (matches && matches.length > 0) {
    console.log('[Windows] extractDomain: found URL pattern:', matches[0])
    try {
      const normalized = normalizeDistractingDomain(matches[0])
      console.log('[Windows] extractDomain: normalized:', normalized)
      return normalized
    } catch (error) {
      console.log('[Windows] extractDomain: normalization failed:', error)
    }
  }

  // 方法2: 尝试从标题中提取域名关键词
  // 例如 "百度一下" -> 检查是否包含 "baidu"
  const titleLower = title.toLowerCase()
  
  // 常见中文网站的关键词映射
  const keywordMap: Record<string, string> = {
    '百度': 'baidu.com',
    'baidu': 'baidu.com',
    '淘宝': 'taobao.com',
    'taobao': 'taobao.com',
    '京东': 'jd.com',
    '知乎': 'zhihu.com',
    'zhihu': 'zhihu.com',
    'bilibili': 'bilibili.com',
    'b站': 'bilibili.com',
    '微博': 'weibo.com',
    'weibo': 'weibo.com',
    'youtube': 'youtube.com',
    'twitter': 'twitter.com',
    'facebook': 'facebook.com',
    'github': 'github.com'
  }

  for (const [keyword, domain] of Object.entries(keywordMap)) {
    if (titleLower.includes(keyword)) {
      console.log('[Windows] extractDomain: found keyword match:', keyword, '->', domain)
      return domain
    }
  }

  console.log('[Windows] extractDomain: no domain found')
  return null
}

/**
 * 获取Windows平台的前台窗口信息
 */
export const getWindowsFrontmostSample = async (): Promise<FrontmostSample> => {
  console.log('[Windows] getWindowsFrontmostSample called, isInitialized:', isInitialized)
  
  if (!isInitialized || !ActiveWindow) {
    console.warn('[Windows] Active window not initialized or module not loaded')
    return { appId: null, domain: null }
  }

  try {
    const windowInfo = ActiveWindow.getActiveWindow()
    
    console.log('[Windows] Raw window info:', windowInfo)
    
    if (!windowInfo) {
      console.warn('[Windows] No active window info returned')
      return { appId: null, domain: null }
    }

    // Windows 使用完整路径作为 appId，这样可以与用户选择的应用路径匹配
    // 如果路径不可用，则使用应用程序名称
    const appId = windowInfo.path || windowInfo.application || extractAppIdFromPath(windowInfo.path)
    
    // 如果是浏览器，尝试从标题中提取域名
    let domain: string | null = null
    const isBrowser = isBrowserApp(windowInfo.application, windowInfo.path)
    if (isBrowser) {
      domain = extractDomainFromBrowserTitle(windowInfo.title)
    }

    console.log('[Windows] Active window:', {
      appId,
      domain,
      isBrowser,
      application: windowInfo.application,
      path: windowInfo.path,
      title: windowInfo.title
    })

    return {
      appId: appId || null,
      domain
    }
  } catch (error) {
    console.error('[Windows] Failed to get active window:', error)
    return { appId: null, domain: null }
  }
}
