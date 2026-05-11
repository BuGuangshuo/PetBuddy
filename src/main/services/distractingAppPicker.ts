import { execFileSync } from "node:child_process";
import { basename, sep } from "node:path";
import type { OpenDialogOptions, OpenDialogReturnValue } from "electron";

export interface DistractingAppSelection {
  id: string;
  label: string;
}

const MACOS_APP_PICKER_OPTIONS: OpenDialogOptions = {
  title: "选择要加入分心列表的应用",
  defaultPath: "/Applications",
  buttonLabel: "选择应用",
  properties: ["openFile"],
  filters: [{ name: "应用程序", extensions: ["app"] }],
};

const WINDOWS_APP_PICKER_OPTIONS: OpenDialogOptions = {
  title: "选择要加入分心列表的应用",
  defaultPath: "C:\\Program Files",
  buttonLabel: "选择应用",
  properties: ["openFile"],
  filters: [
    { name: "应用程序", extensions: ["exe"] },
    { name: "所有文件", extensions: ["*"] }
  ],
};

const readString = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized || normalized === "(null)") {
    return null;
  }

  return normalized;
};

const readBundleIdentifier = (appPath: string): string | null =>
  readString(
    execFileSync(
      "mdls",
      ["-name", "kMDItemCFBundleIdentifier", "-raw", appPath],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    ),
  );

const readMetadataValue = (name: string, appPath: string): string | null =>
  readString(
    execFileSync("mdls", ["-name", name, "-raw", appPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );

const readAppDisplayName = (appPath: string): string | null => {
  const metadataName = readMetadataValue("kMDItemDisplayName", appPath);
  if (metadataName) {
    return metadataName;
  }

  const appName = basename(appPath, ".app").trim();
  return appName.length > 0 ? appName : null;
};

const findAppPathByBundleIdentifier = (appId: string): string | null => {
  const searchResults = readString(
    execFileSync("mdfind", [`kMDItemCFBundleIdentifier == "${appId}"`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  if (!searchResults) {
    return null;
  }

  const [firstPath] = searchResults
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  return firstPath ?? null;
};

export const resolveDistractingAppLabel = (appId: string): string => {
  if (process.platform === "win32") {
    // Windows: 从路径中提取文件名（不含扩展名）
    // 处理反斜杠和正斜杠
    const normalizedPath = appId.replace(/\\/g, '/');
    const fileName = normalizedPath.split('/').pop() || appId;
    const nameWithoutExt = fileName.replace(/\.exe$/i, '');
    return nameWithoutExt || appId;
  }

  if (process.platform !== "darwin") {
    return appId;
  }

  try {
    const appPath = findAppPathByBundleIdentifier(appId);
    const label = appPath ? readAppDisplayName(appPath) : null;
    return label ?? appId;
  } catch {
    return appId;
  }
};

export const pickDistractingApp = async (
  openDialog: (
    options: OpenDialogOptions,
  ) => Promise<OpenDialogReturnValue>,
): Promise<DistractingAppSelection | null> => {
  // Windows 平台支持
  if (process.platform === "win32") {
    const selection = await openDialog(WINDOWS_APP_PICKER_OPTIONS);
    if (selection.canceled || selection.filePaths.length === 0) {
      return null;
    }

    const appPath = selection.filePaths[0];
    // 使用完整路径作为 ID（Windows 应用没有 bundle identifier）
    const id = appPath;
    // 从路径中提取应用名称
    const normalizedPath = appPath.replace(/\\/g, '/');
    const fileName = normalizedPath.split('/').pop() || '';
    const label = fileName.replace(/\.exe$/i, '');
    
    if (!label) {
      return null;
    }

    return { id, label };
  }

  // macOS 平台支持
  if (process.platform === "darwin") {
    const selection = await openDialog(MACOS_APP_PICKER_OPTIONS);
    if (selection.canceled || selection.filePaths.length === 0) {
      return null;
    }

    const appPath = selection.filePaths[0];
    const id = readBundleIdentifier(appPath);
    const label = readAppDisplayName(appPath);
    const resolvedId = id ?? label;
    if (!resolvedId || !label) {
      return null;
    }

    return { id: resolvedId, label };
  }

  // 其他平台不支持
  return null;
};
