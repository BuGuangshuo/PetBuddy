# Windows 设备信息显示修复

## 问题描述

在 Windows 环境下，系统面板的设备信息只显示 "Windows"，没有展示详细的系统版本信息（如 "Windows 11 专业版"）。

## 根本原因

原代码使用 `wmic` 命令来获取 Windows 系统版本信息：

```typescript
const raw = execFileSync("wmic", ["os", "get", "Caption", "/value"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});
```

但是在较新的 Windows 11 系统中，`wmic` 命令已被弃用，导致命令执行失败，返回 `null`。

## 解决方案

使用 PowerShell 的 `Get-CimInstance` 命令替代 `wmic`，并设置 UTF-8 编码以正确显示中文字符：

```typescript
const raw = execFileSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-Command",
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-CimInstance Win32_OperatingSystem).Caption"
  ],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }
);
```

### 关键改进

1. **使用 PowerShell Get-CimInstance**：微软推荐的现代方法，替代已弃用的 `wmic`
2. **设置 UTF-8 编码**：通过 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` 确保中文字符正确显示
3. **Fallback 机制**：如果 PowerShell 失败，尝试使用 `wmic`（向后兼容旧系统）

### 实现细节

1. **优先使用 PowerShell**：首先尝试使用 `Get-CimInstance` 命令，并设置 UTF-8 编码
2. **Fallback 到 wmic**：如果 PowerShell 失败，尝试使用 `wmic`（向后兼容旧系统）
3. **错误处理**：如果两种方法都失败，返回 `null`
4. **UTF-8 编码**：确保中文字符（如"专业版"）正确显示，而不是显示为 `???`

### 代码变更

**文件**: `src/main/services/deviceInfo.ts`

```typescript
const readWindowsVersion = (): string | null => {
  try {
    // Try PowerShell Get-CimInstance (modern approach)
    // Set UTF-8 encoding to properly display Chinese characters
    const raw = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-CimInstance Win32_OperatingSystem).Caption"
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }
    );
    
    const version = raw.trim();
    if (version) {
      return version;
    }
    
    // Fallback to OS release version
    return `Windows ${release()}`;
  } catch {
    // If PowerShell fails, try wmic (legacy)
    try {
      const raw = execFileSync("wmic", ["os", "get", "Caption", "/value"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      
      const match = raw.match(/Caption=(.+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    } catch {
      // Both methods failed
    }
    
    return null;
  }
};
```

## 测试验证

### 单元测试

更新了 `tests/deviceInfo.test.ts` 中的测试用例，确保：

1. PowerShell 方法能正确解析输出
2. 测试覆盖了新的命令格式
3. 所有测试通过 ✅

### 手动测试

在 Windows 11 专业版环境下测试：

```bash
# 测试 PowerShell 命令（带 UTF-8 编码）
powershell.exe -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-CimInstance Win32_OperatingSystem).Caption"
# 输出: Microsoft Windows 11 专业版
```

应用启动后，设置页面正确显示：
- **设备信息**: Microsoft Windows 11 专业版 ✅（中文字符正确显示）

### 编码问题修复

之前的实现没有设置 UTF-8 编码，导致中文字符显示为 `???`：
- ❌ 修复前: `Microsoft Windows 11 ???`
- ✅ 修复后: `Microsoft Windows 11 专业版`

## 影响范围

- ✅ Windows 10/11 用户现在能看到详细的系统版本信息
- ✅ 向后兼容：旧系统仍可使用 wmic fallback
- ✅ 不影响 macOS 和其他平台的功能

## 相关文件

- `src/main/services/deviceInfo.ts` - 主要修改
- `tests/deviceInfo.test.ts` - 测试更新
- `CHANGELOG.md` - 技术变更日志
- `USER_CHANGELOG.md` - 用户友好的更新说明

## 参考资料

- [Microsoft: WMI vs CIM cmdlets](https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/07-working-with-wmi)
- [Get-CimInstance Documentation](https://learn.microsoft.com/en-us/powershell/module/cimcmdlets/get-ciminstance)
