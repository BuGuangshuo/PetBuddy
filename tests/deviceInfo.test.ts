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
});
