import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("readDeviceInfo", () => {
  beforeEach(() => {
    vi.resetModules();
    execFileSyncMock.mockReset();
    setPlatform(originalPlatform);
  });

  it("returns the machine name and chip name from system_profiler on macOS", async () => {
    setPlatform("darwin");
    execFileSyncMock.mockReturnValue(
      JSON.stringify({
        SPHardwareDataType: [
          {
            chip_type: "Apple M1 Pro",
            machine_name: "MacBook Pro",
            model_identifier: "Mac16,5",
          },
        ],
      }),
    );

    const { readDeviceInfo } = await import(
      "../src/main/services/deviceInfo"
    );

    expect(readDeviceInfo()).toEqual({
      chipName: "Apple M1 Pro",
      modelName: "MacBook Pro",
    });
    expect(execFileSyncMock).toHaveBeenCalledWith(
      "system_profiler",
      ["SPHardwareDataType", "-json"],
      expect.objectContaining({
        encoding: "utf8",
      }),
    );
  });

  it("falls back to the model identifier when the marketing name is missing", async () => {
    setPlatform("darwin");
    execFileSyncMock.mockReturnValue(
      JSON.stringify({
        SPHardwareDataType: [
          {
            chip_type: "Apple M1 Pro",
            machine_name: "  ",
            model_identifier: "Mac16,5",
          },
        ],
      }),
    );

    const { readDeviceInfo } = await import(
      "../src/main/services/deviceInfo"
    );

    expect(readDeviceInfo()).toEqual({
      chipName: "Apple M1 Pro",
      modelName: "Mac16,5",
    });
  });

  it("returns null outside macOS", async () => {
    setPlatform("linux");

    const { readDeviceInfo } = await import(
      "../src/main/services/deviceInfo"
    );

    expect(readDeviceInfo()).toEqual({
      chipName: null,
      modelName: null,
    });
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it("returns Windows version on Windows platform", async () => {
    setPlatform("win32");
    execFileSyncMock.mockReturnValue(
      "Microsoft Windows 11 专业版\r\n",
    );

    const { readDeviceInfo } = await import(
      "../src/main/services/deviceInfo"
    );

    expect(readDeviceInfo()).toEqual({
      chipName: null,
      modelName: "Microsoft Windows 11 专业版",
    });
    expect(execFileSyncMock).toHaveBeenCalledWith(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-CimInstance Win32_OperatingSystem).Caption"
      ],
      expect.objectContaining({
        encoding: "utf8",
      }),
    );
  });

  it("falls back to OS release on Windows when wmic fails", async () => {
    setPlatform("win32");
    execFileSyncMock.mockImplementation(() => {
      throw new Error("wmic not found");
    });

    const { readDeviceInfo } = await import(
      "../src/main/services/deviceInfo"
    );

    const result = readDeviceInfo();
    expect(result.chipName).toBeNull();
    expect(result.modelName).toBeNull();
  });
});
