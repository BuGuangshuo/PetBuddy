# Windows 安装程序指南

## 📦 安装程序说明

PetBuddy 使用 NSIS (Nullsoft Scriptable Install System) 创建 Windows 安装程序。

### 安装程序特性

- ✅ 用户可选择安装目录
- ✅ 自动创建桌面快捷方式
- ✅ 自动创建开始菜单快捷方式
- ✅ 支持 32位和64位系统
- ✅ 完整的卸载支持

## 📂 默认安装目录

### 默认行为

NSIS 安装程序的默认安装路径为：

**当前用户安装** (`perMachine: false`):
```
C:\Users\<用户名>\AppData\Local\Programs\PetBuddy
```

**所有用户安装** (`perMachine: true`):
```
C:\Program Files\PetBuddy
```

### 安装目录结构

无论用户选择哪个目录作为基础路径，安装程序都会自动创建 `PetBuddy` 子文件夹。

**示例**：

| 用户选择的目录 | 实际安装位置 |
|---------------|-------------|
| `C:\Program Files` | `C:\Program Files\PetBuddy` |
| `D:\Apps` | `D:\Apps\PetBuddy` |
| `C:\` | `C:\PetBuddy` |

这是 electron-builder 的默认行为，使用 `${productName}` 作为最终的安装文件夹名称。

## 🔧 配置说明

### package.json 配置

```json
{
  "build": {
    "productName": "PetBuddy",
    "win": {
      "icon": "build/icon.ico",
      "signAndEditExecutable": false,
      "artifactName": "${productName}-Setup-${version}.${ext}"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowElevation": true,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "PetBuddy",
      "installerIcon": "build/icon.ico",
      "uninstallerIcon": "build/icon.ico",
      "installerHeaderIcon": "build/icon.ico",
      "deleteAppDataOnUninstall": false
    }
  }
}
```

### 配置项说明

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `oneClick` | `false` | 非单击安装，显示安装向导 |
| `perMachine` | `false` | 为当前用户安装（不需要管理员权限） |
| `allowElevation` | `true` | 允许用户选择以管理员身份安装 |
| `allowToChangeInstallationDirectory` | `true` | 允许用户更改安装目录 |
| `createDesktopShortcut` | `true` | 创建桌面快捷方式 |
| `createStartMenuShortcut` | `true` | 创建开始菜单快捷方式 |
| `shortcutName` | `"PetBuddy"` | 快捷方式名称 |
| `deleteAppDataOnUninstall` | `false` | 卸载时保留用户数据 |

## 📝 安装流程

### 1. 欢迎页面
- 显示应用名称和版本
- 显示应用图标

### 2. 许可协议
- 显示 MIT 许可证（如果配置）
- 用户需要接受才能继续

### 3. 选择安装目录
- **默认目录**: `C:\Users\<用户名>\AppData\Local\Programs\PetBuddy`
- **用户可以更改**: 点击"浏览"选择其他目录
- **自动创建子文件夹**: 无论选择哪个目录，都会在其下创建 `PetBuddy` 文件夹

### 4. 选择组件（可选）
- 桌面快捷方式
- 开始菜单快捷方式

### 5. 安装进度
- 显示安装进度条
- 显示正在安装的文件

### 6. 完成
- 选项：立即运行 PetBuddy
- 点击"完成"退出安装程序

## 🗑️ 卸载

### 卸载方式

**方式 1: 通过开始菜单**
1. 打开开始菜单
2. 找到 PetBuddy
3. 右键 → 卸载

**方式 2: 通过设置**
1. 打开 Windows 设置
2. 应用 → 应用和功能
3. 找到 PetBuddy
4. 点击"卸载"

**方式 3: 通过安装目录**
1. 打开安装目录
2. 运行 `Uninstall PetBuddy.exe`

### 卸载后保留的数据

卸载程序**不会**删除以下数据（`deleteAppDataOnUninstall: false`）：

- 用户设置
- 每日统计数据
- 自定义 GIF 配置

这些数据位于：
```
C:\Users\<用户名>\AppData\Roaming\petbuddy
```

如果需要完全删除，请手动删除此文件夹。

## 🎨 自定义安装程序

### 自定义 NSIS 脚本

项目包含 `build/installer.nsh` 文件，可以添加自定义 NSIS 脚本：

```nsis
; 自定义安装操作
!macro customInstall
  DetailPrint "Installing PetBuddy..."
  ; 在这里添加自定义安装步骤
!macroend

; 自定义卸载操作
!macro customUnInstall
  DetailPrint "Uninstalling PetBuddy..."
  ; 在这里添加自定义卸载步骤
!macroend
```

### 常见自定义需求

#### 1. 添加自定义安装页面

```nsis
!macro customInstallPage
  Page custom MyCustomPage
!macroend

Function MyCustomPage
  ; 自定义页面代码
FunctionEnd
```

#### 2. 检查系统要求

```nsis
!macro preInit
  ; 检查 Windows 版本
  ${If} ${AtLeastWin10}
    ; Windows 10 或更高版本
  ${Else}
    MessageBox MB_OK "需要 Windows 10 或更高版本"
    Quit
  ${EndIf}
!macroend
```

#### 3. 创建额外的快捷方式

```nsis
!macro customInstall
  CreateShortcut "$DESKTOP\PetBuddy.lnk" "$INSTDIR\PetBuddy.exe"
!macroend
```

## 🔍 故障排除

### 问题 1: 安装程序被 Windows Defender 阻止

**原因**: 应用未签名

**解决方案**:
1. 点击"更多信息"
2. 点击"仍要运行"

**长期解决方案**: 购买代码签名证书

### 问题 2: 无法安装到 Program Files

**原因**: 需要管理员权限

**解决方案**:
1. 右键安装程序
2. 选择"以管理员身份运行"

或者选择用户目录安装（不需要管理员权限）

### 问题 3: 安装后找不到应用

**检查**:
1. 查看桌面是否有快捷方式
2. 查看开始菜单
3. 检查安装目录

### 问题 4: 卸载不完整

**手动清理**:
```powershell
# 删除安装目录
Remove-Item -Recurse "C:\Users\<用户名>\AppData\Local\Programs\PetBuddy"

# 删除用户数据（可选）
Remove-Item -Recurse "C:\Users\<用户名>\AppData\Roaming\petbuddy"

# 删除快捷方式
Remove-Item "$env:USERPROFILE\Desktop\PetBuddy.lnk"
Remove-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\PetBuddy.lnk"
```

## 📊 安装程序信息

| 项目 | 值 |
|------|-----|
| 安装程序类型 | NSIS |
| 安装程序大小 | ~101 MB |
| 压缩格式 | LZMA |
| 支持架构 | x64, ia32 |
| 需要管理员权限 | 否（默认） |
| 支持静默安装 | 是 |

### 静默安装

```powershell
# 静默安装到默认目录
PetBuddy-Setup-0.1.2.exe /S

# 静默安装到指定目录
PetBuddy-Setup-0.1.2.exe /S /D=C:\MyApps\PetBuddy

# 静默卸载
"C:\Users\<用户名>\AppData\Local\Programs\PetBuddy\Uninstall PetBuddy.exe" /S
```

## 🚀 构建安装程序

```bash
# 构建 Windows 安装程序
pnpm package:win

# 生成的文件
dist/PetBuddy-Setup-0.1.2.exe
```

## 📚 相关资源

- [NSIS 官方文档](https://nsis.sourceforge.io/Docs/)
- [electron-builder NSIS 配置](https://www.electron.build/configuration/nsis)
- [Windows 代码签名指南](https://www.electron.build/code-signing)

## 💡 最佳实践

1. **测试安装程序**
   - 在干净的 Windows 系统上测试
   - 测试不同的安装目录
   - 测试卸载流程

2. **代码签名**
   - 正式发布前购买代码签名证书
   - 避免 Windows Defender 警告
   - 提升用户信任度

3. **版本管理**
   - 每次发布更新版本号
   - 测试升级安装
   - 保留用户数据

4. **用户体验**
   - 提供清晰的安装说明
   - 创建便捷的快捷方式
   - 保留用户数据选项

---

**最后更新**: 2026-05-10  
**适用版本**: 0.1.2+
