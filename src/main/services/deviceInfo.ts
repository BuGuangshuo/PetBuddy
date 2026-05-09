import { execFileSync } from "node:child_process";

interface SystemProfilerHardwareEntry {
  chip_type?: unknown;
  machine_name?: unknown;
  model_identifier?: unknown;
}

interface SystemProfilerOutput {
  SPHardwareDataType?: SystemProfilerHardwareEntry[];
}

export interface DeviceInfo {
  chipName: string | null;
  modelName: string | null;
}

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const readDeviceInfo = (): DeviceInfo => {
  if (process.platform !== "darwin") {
    return {
      chipName: null,
      modelName: null,
    };
  }

  try {
    const raw = execFileSync("system_profiler", ["SPHardwareDataType", "-json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parsed = JSON.parse(raw) as SystemProfilerOutput;
    const hardware = parsed.SPHardwareDataType?.[0];

    return {
      chipName: readString(hardware?.chip_type),
      modelName:
        readString(hardware?.machine_name) ??
        readString(hardware?.model_identifier),
    };
  } catch {
    return {
      chipName: null,
      modelName: null,
    };
  }
};
