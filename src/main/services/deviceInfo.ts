import { execFileSync } from "node:child_process";
import { release } from "node:os";

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

export const readDeviceInfo = (): DeviceInfo => {
  if (process.platform === "win32") {
    return {
      chipName: null,
      modelName: readWindowsVersion(),
    };
  }

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
