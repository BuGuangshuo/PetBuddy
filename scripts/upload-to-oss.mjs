import OSS from 'ali-oss'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载 .env 文件
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
  console.log('✅ 已加载 .env 配置文件\n')
}

// 从环境变量读取配置
const config = {
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET || 'petbuddy-releases'
}

// 验证配置
if (!config.accessKeyId || !config.accessKeySecret) {
  console.error('❌ 错误：请设置 OSS 访问凭证')
  console.log('\n方法 1：编辑 .env 文件')
  console.log('  打开项目根目录的 .env 文件，填写：')
  console.log('    OSS_ACCESS_KEY_ID=你的AccessKeyId')
  console.log('    OSS_ACCESS_KEY_SECRET=你的AccessKeySecret')
  console.log('    OSS_REGION=oss-cn-hangzhou')
  console.log('    OSS_BUCKET=petbuddy-releases')
  console.log('\n方法 2：使用环境变量')
  console.log('  Windows PowerShell:')
  console.log('    $env:OSS_ACCESS_KEY_ID="your-key-id"')
  console.log('    $env:OSS_ACCESS_KEY_SECRET="your-key-secret"')
  console.log('    node scripts/upload-to-oss.mjs v0.2.0')
  process.exit(1)
}

const client = new OSS(config)

async function uploadFile(localPath, remotePath) {
  try {
    const result = await client.put(remotePath, localPath)
    console.log(`✅ 上传成功: ${remotePath}`)
    return result
  } catch (error) {
    console.error(`❌ 上传失败: ${remotePath}`, error.message)
    throw error
  }
}

async function uploadRelease(version) {
  const releaseDir = path.join(__dirname, '..', 'release')
  
  if (!fs.existsSync(releaseDir)) {
    console.error(`❌ 错误：release 目录不存在: ${releaseDir}`)
    process.exit(1)
  }

  console.log(`\n📦 开始上传版本: ${version}`)
  console.log(`📁 本地目录: ${releaseDir}`)
  console.log(`☁️  OSS Bucket: ${config.bucket}`)
  console.log(`🌍 区域: ${config.region}\n`)

  const files = fs.readdirSync(releaseDir)
  const uploadTasks = []

  for (const file of files) {
    const localPath = path.join(releaseDir, file)
    const stat = fs.statSync(localPath)
    
    if (!stat.isFile()) continue

    // 安装包文件上传到版本目录和根目录
    if (file.endsWith('.exe') || file.endsWith('.dmg') || file.endsWith('.zip')) {
      // 上传到版本目录（归档）
      const versionPath = `${version}/${file}`
      uploadTasks.push(uploadFile(localPath, versionPath))
      
      // 上传到根目录（供 electron-updater 使用）
      uploadTasks.push(uploadFile(localPath, file))
    }
    
    // yml 和 blockmap 文件上传到根目录（最新版本信息）
    if (file.endsWith('.yml') || file.endsWith('.blockmap')) {
      uploadTasks.push(uploadFile(localPath, file))
    }
  }

  try {
    await Promise.all(uploadTasks)
    console.log(`\n✨ 所有文件上传完成！`)
    console.log(`\n🔗 访问地址：`)
    console.log(`   https://${config.bucket}.${config.region}.aliyuncs.com/latest.yml`)
    console.log(`   https://${config.bucket}.${config.region}.aliyuncs.com/${version}/ (归档)`)
    console.log(`\n📝 说明：`)
    console.log(`   - 安装包同时上传到根目录和版本目录`)
    console.log(`   - 根目录文件供 electron-updater 自动更新使用`)
    console.log(`   - 版本目录文件用于归档和手动下载`)
  } catch (error) {
    console.error('\n❌ 上传过程中出现错误')
    process.exit(1)
  }
}

// 获取版本号参数
const version = process.argv[2]

if (!version) {
  console.error('❌ 错误：请提供版本号')
  console.log('\n使用方法：')
  console.log('  node scripts/upload-to-oss.mjs v0.2.0')
  process.exit(1)
}

uploadRelease(version)
