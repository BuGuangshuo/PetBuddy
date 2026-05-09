import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenDialogOptions } from "electron";

const execFileSyncMock = vi.fn();
const originalPlatform = process.platform;

vi.mock("node:child_process", () => ({
  execFileSync: execFileSyncMock,
}));

const setPlatform = (platform: NodeJS.Platform) => {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value: platform,
  });
};

describe("pickDistractingApp", () => {
  beforeEach(() => {
    vi.resetModules();
    execFileSyncMock.mockReset();
    setPlatform(originalPlatform);
  });

  it("returns the selected app bundle id from the system open panel on macOS", async () => {
    setPlatform("darwin");
    execFileSyncMock
      .mockReturnValueOnce("com.apple.Safari\n")
      .mockReturnValueOnce("Safari\n");
    const openDialog = vi.fn<
      (options: OpenDialogOptions) => Promise<{ canceled: boolean; filePaths: string[] }>
    >().mockResolvedValue({
      canceled: false,
      filePaths: ["/Applications/Safari.app"],
    });

    const { pickDistractingApp } = await import(
      "../src/main/services/distractingAppPicker"
    );

    expect(await pickDistractingApp(openDialog)).toEqual({
      id: "com.apple.Safari",
      label: "Safari",
    });
    expect(openDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "选择要加入分心列表的应用",
        defaultPath: "/Applications",
        buttonLabel: "选择应用",
        properties: ["openFile"],
      }),
    );
    expect(execFileSyncMock).toHaveBeenCalledWith(
      "mdls",
      ["-name", "kMDItemCFBundleIdentifier", "-raw", "/Applications/Safari.app"],
      expect.objectContaining({
        encoding: "utf8",
      }),
    );
    expect(execFileSyncMock).toHaveBeenCalledWith(
      "mdls",
      ["-name", "kMDItemDisplayName", "-raw", "/Applications/Safari.app"],
      expect.objectContaining({
        encoding: "utf8",
      }),
    );
  });

  it("falls back to the app display name when bundle id is unavailable", async () => {
    setPlatform("darwin");
    execFileSyncMock
      .mockReturnValueOnce("(null)\n")
      .mockReturnValueOnce("Google Chrome\n");
    const openDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: ["/Applications/Google Chrome.app"],
    });

    const { pickDistractingApp } = await import(
      "../src/main/services/distractingAppPicker"
    );

    expect(await pickDistractingApp(openDialog)).toEqual({
      id: "Google Chrome",
      label: "Google Chrome",
    });
  });

  it("resolves display labels for stored bundle ids", async () => {
    setPlatform("darwin");
    execFileSyncMock
      .mockReturnValueOnce("/Applications/IQIYI.app\n")
      .mockReturnValueOnce("爱奇艺\n");

    const { resolveDistractingAppLabel } = await import(
      "../src/main/services/distractingAppPicker"
    );

    expect(resolveDistractingAppLabel("com.qiyi.video.mac")).toBe("爱奇艺");
    expect(execFileSyncMock).toHaveBeenCalledWith(
      "mdfind",
      ['kMDItemCFBundleIdentifier == "com.qiyi.video.mac"'],
      expect.objectContaining({
        encoding: "utf8",
      }),
    );
    expect(execFileSyncMock).toHaveBeenCalledWith(
      "mdls",
      ["-name", "kMDItemDisplayName", "-raw", "/Applications/IQIYI.app"],
      expect.objectContaining({
        encoding: "utf8",
      }),
    );
  });

  it("returns null when the picker is cancelled", async () => {
    setPlatform("darwin");
    const openDialog = vi.fn().mockResolvedValue({
      canceled: true,
      filePaths: [],
    });

    const { pickDistractingApp } = await import(
      "../src/main/services/distractingAppPicker"
    );

    expect(await pickDistractingApp(openDialog)).toBeNull();
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it("returns null outside macOS", async () => {
    setPlatform("linux");
    const openDialog = vi.fn();

    const { pickDistractingApp } = await import(
      "../src/main/services/distractingAppPicker"
    );

    expect(await pickDistractingApp(openDialog)).toBeNull();
    expect(openDialog).not.toHaveBeenCalled();
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });
});
