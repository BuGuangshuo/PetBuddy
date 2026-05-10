# NSIS 安装目录自动添加 PetBuddy 文件夹

## 问题描述

用户希望在安装程序的目录选择页面中，无论用户选择哪个目录，都自动在该目录下添加 `\PetBuddy` 子文件夹。

**期望行为**：
- 用户选择 `F:\` → 安装路径显示为 `F:\PetBuddy\`
- 用户选择 `D:\Apps` → 安装路径显示为 `D:\Apps\PetBuddy\`

## 当前状态

electron-builder 的默认行为已经会在安装时创建 `PetBuddy` 文件夹，但在安装向导的目录选择页面中，显示的路径可能不包含 `\PetBuddy`。

## 解决方案

### 方案 1: 使用 customInstallMode 宏（已实现）

在 `build/installer.nsh` 中添加了 `customInstallMode` 宏：

```nsis
!macro customInstallMode
  ; 检查 $INSTDIR 是否以 PetBuddy 结尾
  ${GetFileName} $INSTDIR $R0
  
  ; 如果不是 PetBuddy，则添加它
  ${If} $R0 != "PetBuddy"
    ; 移除末尾的反斜杠（如果有）
    StrCpy $R1 $INSTDIR 1 -1
    ${If} $R1 == "\"
      StrCpy $INSTDIR $INSTDIR -1
    ${EndIf}
    ; 添加 \PetBuddy
    StrCpy $INSTDIR "$INSTDIR\PetBuddy"
  ${EndIf}
!macroend
```

**限制**: 这个宏在安装模式选择时调用，可能不会在用户每次更改目录时都触发。

### 方案 2: 完全自定义 NSIS 脚本（高级）

如果方案 1 不够完美，可以使用完全自定义的 NSIS 脚本。

#### 步骤 1: 创建自定义脚本

创建 `build/installer-custom.nsi`：

```nsis
!include "MUI2.nsh"
!include "FileFunc.nsh"

; 应用信息
Name "PetBuddy"
OutFile "..\..\dist\PetBuddy-Setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\PetBuddy"

; 页面
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; 语言
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "SimpChinese"

; 目录页面离开时的回调
Function .onVerifyInstDir
  ; 获取最后一个文件夹名
  ${GetFileName} $INSTDIR $R0
  
  ; 如果不是 PetBuddy，添加它
  ${If} $R0 != "PetBuddy"
    StrCpy $R1 $INSTDIR 1 -1
    ${If} $R1 == "\"
      StrCpy $INSTDIR $INSTDIR -1
    ${EndIf}
    StrCpy $INSTDIR "$INSTDIR\PetBuddy"
  ${EndIf}
FunctionEnd

; 安装部分
Section "Install"
  SetOutPath $INSTDIR
  ; 复制文件...
SectionEnd
```

#### 步骤 2: 配置 package.json

```json
{
  "build": {
    "nsis": {
      "script": "build/installer-custom.nsi"
    }
  }
}
```

**注意**: 使用自定义脚本需要手动处理所有安装逻辑，比较复杂。

### 方案 3: 修改默认安装目录（推荐）

最简单的方法是确保默认安装目录已经包含 `PetBuddy`，这样用户在选择其他目录时，路径会自动包含 `\PetBuddy`。

electron-builder 默认已经这样做了：
- 默认路径: `C:\Users\<用户名>\AppData\Local\Programs\PetBuddy`

当用户点击"浏览"并选择新目录时，NSIS 会保留最后一个文件夹名（`PetBuddy`）。

## 测试方法

### 测试步骤

1. 运行 `PetBuddy-Setup-0.2.0.exe`
2. 在安装向导中，点击"浏览"按钮
3. 选择一个目录（如 `F:\`）
4. 观察"目标文件夹"文本框中的路径

**期望结果**: 应该显示 `F:\PetBuddy\`

### 如果测试失败

如果路径显示为 `F:\` 而不是 `F:\PetBuddy\`，说明 `customInstallMode` 宏没有在正确的时机调用。

**临时解决方案**: 
- 用户可以手动在路径末尾添加 `\PetBuddy`
- 或者在选择目录后，手动修改路径

**长期解决方案**:
- 实现方案 2（完全自定义 NSIS 脚本）
- 或者接受 electron-builder 的默认行为

## 当前实现状态

✅ 已添加 `customInstallMode` 宏到 `build/installer.nsh`  
✅ 已重新构建安装程序  
🔲 需要实际测试验证行为  

## 备注

electron-builder 的 NSIS 模板有一定的限制，不是所有的 NSIS 功能都能完美支持。如果需要完全自定义的行为，可能需要使用完全自定义的 NSIS 脚本（方案 2）。

但是，根据 electron-builder 的默认行为，当用户选择目录时，应该会保留原有的应用名称文件夹。例如：
- 默认: `C:\Users\xxx\AppData\Local\Programs\PetBuddy`
- 用户选择 `F:\`
- 结果应该是: `F:\PetBuddy`（保留了 `PetBuddy` 部分）

这是 NSIS 的标准行为，应该已经满足需求。

## 下一步

1. **测试当前版本**: 运行 `PetBuddy-Setup-0.2.0.exe` 并测试目录选择行为
2. **如果不满足需求**: 考虑实现方案 2（完全自定义 NSIS 脚本）
3. **如果满足需求**: 更新文档说明此行为

---

**创建日期**: 2026-05-10  
**状态**: 待测试
