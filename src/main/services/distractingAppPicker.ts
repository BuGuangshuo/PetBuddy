import { execFileSync } from "node:child_process";
import { basename } from "node:path";
import type { OpenDialogOptions, OpenDialogReturnValue } from "electron";

export interface DistractingAppSelection {
  id: string;
  label: string;
}

const APP_PICKER_OPTIONS: OpenDialogOptions = {
  title: "选择要加入分心列表的应用",
  defaultPath: "/Applications",
  buttonLabel: "选择应用",
  properties: ["openFile"],
  filters: [{ name: "应用程序", extensions: ["app"] }],
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
  if (process.platform !== "darwin") {
    return null;
  }

  const selection = await openDialog(APP_PICKER_OPTIONS);
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
};
