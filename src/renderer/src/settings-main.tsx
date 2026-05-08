import { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  CoffeeOutlined,
  BellOutlined,
  FieldTimeOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import type { RendererPetAppearance, SettingsPayload } from "@shared/api";
import type { AppSettings, DailyStats } from "@shared/types";
import { getElapsedFocusSessionSeconds } from "@shared/focusSession";
import "./styles.css";
import {
  resolveAppearanceCustomizePreviewAsset,
  resolveAppearancePreviewAsset,
} from "./sceneAssetResolver";
import { isReminderEnabled, nextReminderInterval } from "./settingsHelpers";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const Toggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) => (
  <button
    className={`toggle ${checked ? "on" : ""}`}
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
  />
);

const Stepper = ({
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}) => (
  <div className="stepper">
    <button onClick={() => onChange(clamp(value - step, min, max))}>−</button>
    <span className="stepper-value">{value}</span>
    <span className="stepper-unit">{unit}</span>
    <button onClick={() => onChange(clamp(value + step, min, max))}>＋</button>
  </div>
);

const ChipEditor = ({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) => {
  const [draft, setDraft] = useState("");

  return (
    <div className="chip-box">
      <div className="chips">
        {values.map((value) => (
          <span className="chip" key={value}>
            {value}
            <button
              onClick={() => onChange(values.filter((item) => item !== value))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className="chip-input"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            const next = draft.trim();
            if (!next || values.includes(next)) {
              return;
            }
            onChange([...values, next]);
            setDraft("");
          }
        }}
      />
    </div>
  );
};

const StatCard = ({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
}) => (
  <div className="stat-card">
    <div className="stat-header">
      <span className="stat-icon">{icon}</span>
      <div className="stat-label">{label}</div>
    </div>
    <div>
      <span className="stat-value">{value}</span>
      <span className="stat-unit">{unit}</span>
    </div>
  </div>
);

const AppearanceCard = ({
  appearance,
  active,
  onSelect,
}: {
  appearance: RendererPetAppearance;
  active: boolean;
  onSelect: () => void;
}) => (
  <button
    className={`appearance-card ${active ? "active" : ""}`}
    onClick={onSelect}
  >
    <div className="appearance-preview">
      <img
        src={resolveAppearancePreviewAsset(appearance)}
        alt={appearance.displayName}
      />
    </div>
    <div className="appearance-name">{appearance.displayName}</div>
    <div className="appearance-meta">
      {appearance.id === "golden-puppy" ? "beta" : "已启用素材"}
    </div>
  </button>
);

const SettingsApp = () => {
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAppearanceCustomizing, setIsAppearanceCustomizing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const applyPayload = (nextPayload: SettingsPayload) => {
    setPayload(nextPayload);
    setError(null);
  };

  const handleActionError = (actionError: unknown) => {
    setError(
      actionError instanceof Error ? actionError.message : String(actionError),
    );
  };

  const syncTodayStats = async () => {
    if (!window.petBuddy) {
      setError("preload API not available");
      return;
    }

    try {
      const today = await window.petBuddy.stats.getToday();
      setStats(today);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    }
  };

  const syncPermissionState = async () => {
    if (!window.petBuddy) {
      setError("preload API not available");
      return;
    }

    try {
      const permissionState =
        await window.petBuddy.permissions.getAccessibilityStatus();
      setPayload((current) =>
        current ? { ...current, permissionState } : current,
      );
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    }
  };

  const load = async () => {
    if (!window.petBuddy) {
      setError("preload API not available");
      return;
    }

    try {
      const [nextPayload, today] = await Promise.all([
        window.petBuddy.settings.get(),
        window.petBuddy.stats.getToday(),
      ]);
      applyPayload(nextPayload);
      setStats(today);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    }
  };

  useEffect(() => {
    if (!window.petBuddy) {
      setError("preload API not available");
      return;
    }

    void load();

    const unsubscribe = window.petBuddy.pet.onEvent((event) => {
      if (
        event.type === "reminder" ||
        event.type === "hydration-completed" ||
        event.type === "focus-session-updated" ||
        event.type === "focus-session-started" ||
        event.type === "focus-session-completed"
      ) {
        void syncTodayStats();
      }

      if (event.type === "focus-session-updated") {
        setPayload((current) =>
          current ? { ...current, focusSession: event.focusSession } : current,
        );
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncPermissionState();
      }
    };

    window.addEventListener("focus", syncPermissionState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const permissionSyncTimer = window.setInterval(() => {
      void syncPermissionState();
    }, 2000);

    const syncTimer = window.setInterval(() => {
      void syncTodayStats();
    }, 15000);

    const clockTimer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", syncPermissionState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(permissionSyncTimer);
      window.clearInterval(syncTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  const updateSettings = async (patch: Partial<AppSettings>) => {
    try {
      const next = await window.petBuddy.settings.update(patch);
      applyPayload(next);
    } catch (actionError) {
      handleActionError(actionError);
    }
  };

  const runPayloadAction = async (action: Promise<SettingsPayload>) => {
    try {
      applyPayload(await action);
    } catch (actionError) {
      handleActionError(actionError);
    }
  };

  const selectedAppearance = useMemo(
    () =>
      payload?.appearances.find(
        (item) => item.id === payload.settings.selectedPetAppearance,
      ) ?? null,
    [payload],
  );
  const referenceAppearance = useMemo(
    () => payload?.appearances.find((item) => item.id === "line-dog") ?? null,
    [payload],
  );
  const customizePreviewAsset = selectedAppearance
    ? resolveAppearanceCustomizePreviewAsset(selectedAppearance)
    : undefined;

  if (error) {
    return (
      <div className="settings-root">
        <div className="settings-drag-region" aria-hidden="true" />
        <div className="settings-shell">
          <div className="settings-wrap">
            <div className="notice">
              <div>
                <strong>Renderer failed to initialize</strong>
                <p>{error}</p>
              </div>
              <button className="ghost-button" onClick={() => void load()}>
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!payload || !stats) {
    return (
      <div className="settings-root">
        <div className="settings-drag-region" aria-hidden="true" />
        <div className="settings-shell">
          <div className="settings-wrap">
            <div className="notice">
              <div>
                <strong>Loading PetBuddy…</strong>
                <p>Waiting for main process data.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showOnboarding = !payload.settings.onboardingCompleted;
  const isBreakReminderEnabled = isReminderEnabled(
    payload.settings.breakIntervalMinutes,
  );
  const isWaterReminderEnabled = isReminderEnabled(
    payload.settings.waterIntervalMinutes,
  );
  const isFocusModeEnabled = payload.settings.focusModeEnabled;
  const activeFocusSeconds =
    payload.focusSession.status === "active"
      ? getElapsedFocusSessionSeconds(payload.focusSession.session, now)
      : payload.focusSession.status === "paused"
        ? 0
        : 0;
  const displayedFocusMinutes = Math.floor(
    (stats.focusDurationSeconds + activeFocusSeconds) / 60,
  );

  return (
    <div className="settings-root">
      <div className="settings-drag-region" aria-hidden="true" />
      <div className="settings-shell">
        <div className="settings-wrap">
          <div className="hero">
            <div className="hero-mark">
              {selectedAppearance ? (
                <img
                  src={resolveAppearancePreviewAsset(selectedAppearance)}
                  alt=""
                />
              ) : null}
            </div>
            <div>
              <div className="hero-eyebrow"></div>
              <h1 className="hero-title">今日统计</h1>
            </div>
          </div>

          <div className="stats-grid">
            <StatCard
              label="休息"
              value={stats.shown.break}
              unit="次"
              icon={<CoffeeOutlined />}
            />
            <StatCard
              label="喝水"
              value={stats.acknowledged.water}
              unit="次"
              icon={<CheckCircleOutlined />}
            />
            <StatCard
              label="专注"
              value={displayedFocusMinutes}
              unit="分钟"
              icon={<FieldTimeOutlined />}
            />
            <StatCard
              label="分心"
              value={stats.shown.focusNudge}
              unit="次"
              icon={<BellOutlined />}
            />
          </div>

          {showOnboarding ? (
            <div className="notice">
              <div>
                <strong>欢迎使用 PetBuddy</strong>
                <p>
                  PetBuddy
                  会定时提醒你休息、喝水和保持节奏。分心检测功能需打开系统辅助功能权限。
                </p>
              </div>
              <div className="notice-actions">
                <button
                  className="secondary-button"
                  onClick={() =>
                    void window.petBuddy.permissions.openAccessibilitySettings()
                  }
                >
                  打开权限设置
                </button>
                <button
                  className="primary-button"
                  onClick={() =>
                    void updateSettings({ onboardingCompleted: true })
                  }
                >
                  知道了
                </button>
              </div>
            </div>
          ) : null}

          <section className="section">
            <div className="section-title">外观</div>
            <div className="section-panel">
              <div>
                <div>
                  <div className="field-label" style={{ marginBottom: 12 }}>
                    宠物形象
                  </div>
                </div>
                <div className="field-control">
                  <div className="appearance-grid">
                    {payload.appearances.map((appearance) => (
                      <AppearanceCard
                        key={appearance.id}
                        appearance={appearance}
                        active={
                          !isAppearanceCustomizing &&
                          appearance.id ===
                            payload.settings.selectedPetAppearance
                        }
                        onSelect={() => {
                          setIsAppearanceCustomizing(false);
                          void updateSettings({
                            selectedPetAppearance: appearance.id,
                          });
                        }}
                      />
                    ))}
                    <button
                      className={`appearance-card ${isAppearanceCustomizing ? "active" : ""}`}
                      onClick={() => setIsAppearanceCustomizing(true)}
                    >
                      <div className="appearance-preview">
                        {customizePreviewAsset ? (
                          <img
                            src={customizePreviewAsset}
                            alt={`${selectedAppearance?.displayName ?? "当前宠物"} 自定义预览`}
                          />
                        ) : (
                          <div
                            style={{
                              fontSize: 32,
                              color: "var(--muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "100%",
                            }}
                          >
                            ＋
                          </div>
                        )}
                      </div>
                      <div className="appearance-name">自定义</div>
                      <div className="appearance-meta">
                        编辑当前宠物的场景素材
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {selectedAppearance && isAppearanceCustomizing ? (
                <div className="field-row">
                  <div>
                    <div className="field-label">场景素材</div>
                    <div className="field-hint">
                      正在编辑 {selectedAppearance.displayName} 的场景 GIF。
                    </div>
                  </div>
                  <div className="field-control">
                    <div className="scene-asset-list">
                      {selectedAppearance.sceneAssets
                        .filter((sceneAsset) => sceneAsset.scene !== "sit")
                        .map((sceneAsset) => {
                          const referenceSceneAsset =
                            referenceAppearance?.sceneAssets.find(
                              (item) => item.scene === sceneAsset.scene,
                            );

                          return (
                            <div
                              className="scene-asset-row"
                              key={sceneAsset.scene}
                            >
                              <div className="scene-asset-copy">
                                <div className="scene-asset-name">
                                  {sceneAsset.label}
                                </div>
                                <div className="scene-asset-desc">
                                  {sceneAsset.description}
                                </div>
                              </div>
                              <div className="scene-asset-previews">
                                <div className="scene-preview-card">
                                  <div className="scene-preview-label">
                                    示例
                                  </div>
                                  <div className="scene-preview-frame">
                                    {referenceSceneAsset?.defaultAssets[0] ? (
                                      <img
                                        src={
                                          referenceSceneAsset.defaultAssets[0]
                                        }
                                        alt={`${sceneAsset.label} 示例`}
                                      />
                                    ) : (
                                      <span>暂无</span>
                                    )}
                                  </div>
                                </div>
                                <div className="scene-preview-card">
                                  <div className="scene-preview-label">
                                    自定义
                                  </div>
                                  <div className="scene-preview-frame">
                                    {sceneAsset.customAsset ? (
                                      <img
                                        src={sceneAsset.customAsset}
                                        alt={`${sceneAsset.label} 自定义`}
                                      />
                                    ) : (
                                      <span>未上传</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="scene-asset-actions">
                                <button
                                  className="secondary-button"
                                  onClick={() =>
                                    void runPayloadAction(
                                      window.petBuddy.appearanceScenes.uploadCustomGif(
                                        selectedAppearance.id,
                                        sceneAsset.scene,
                                      ),
                                    )
                                  }
                                >
                                  {sceneAsset.customAsset ? "替换" : "上传"}
                                </button>
                                {sceneAsset.customAsset ? (
                                  <button
                                    className="ghost-button"
                                    onClick={() =>
                                      void runPayloadAction(
                                        window.petBuddy.appearanceScenes.clearCustomGif(
                                          selectedAppearance.id,
                                          sceneAsset.scene,
                                        ),
                                      )
                                    }
                                  >
                                    清除
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="section">
            <div className="section-title">提醒</div>
            <div className="section-panel">
              <div className="field-row horizontal">
                <div className="field-label">开启休息提醒</div>
                <div className="field-control">
                  <Toggle
                    checked={isBreakReminderEnabled}
                    onChange={(checked) =>
                      void updateSettings({
                        breakIntervalMinutes: nextReminderInterval(checked, 50),
                      })
                    }
                  />
                </div>
              </div>
              {isBreakReminderEnabled ? (
                <div className="field-row">
                  <div className="field-label">休息间隔</div>
                  <div className="field-control">
                    <Stepper
                      value={payload.settings.breakIntervalMinutes}
                      unit="分钟"
                      min={1}
                      max={120}
                      step={1}
                      onChange={(next) =>
                        void updateSettings({ breakIntervalMinutes: next })
                      }
                    />
                  </div>
                </div>
              ) : null}
              <div className="field-row horizontal">
                <div className="field-label">开启喝水提醒</div>
                <div className="field-control">
                  <Toggle
                    checked={isWaterReminderEnabled}
                    onChange={(checked) =>
                      void updateSettings({
                        waterIntervalMinutes: nextReminderInterval(checked, 30),
                      })
                    }
                  />
                </div>
              </div>
              {isWaterReminderEnabled ? (
                <div className="field-row">
                  <div className="field-label">喝水间隔</div>
                  <div className="field-control">
                    <Stepper
                      value={payload.settings.waterIntervalMinutes}
                      unit="分钟"
                      min={1}
                      max={180}
                      step={1}
                      onChange={(next) =>
                        void updateSettings({ waterIntervalMinutes: next })
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="section">
            <div className="section-title">专注</div>
            <div className="section-panel">
              <div className="field-row">
                <div className="field-label">专注时长</div>
                <div className="field-control">
                  <Stepper
                    value={payload.settings.focusSessionMinutes}
                    unit="分钟"
                    min={5}
                    max={180}
                    step={5}
                    onChange={(next) =>
                      void updateSettings({ focusSessionMinutes: next })
                    }
                  />
                </div>
              </div>
              <div className="field-row horizontal">
                <div>
                  <div className="field-label">开启分心检测</div>
                  <div className="field-hint">
                    检测当前前台
                    App；命中预设分心应用时，会在宽限时间后提醒你回到工作。
                  </div>
                </div>
                <div className="field-control">
                  <Toggle
                    checked={isFocusModeEnabled}
                    onChange={(checked) =>
                      void runPayloadAction(
                        window.petBuddy.app.toggleFocusMode(checked),
                      )
                    }
                  />
                </div>
              </div>
              {isFocusModeEnabled ? (
                <>
                  <div className="field-row">
                    <div className="field-label">检测宽限时间</div>
                    <div className="field-control">
                      <Stepper
                        value={payload.settings.focusGraceSeconds}
                        unit="秒"
                        min={5}
                        max={60}
                        step={5}
                        onChange={(next) =>
                          void updateSettings({ focusGraceSeconds: next })
                        }
                      />
                    </div>
                  </div>
                  <div className="field-row">
                    <div>
                      <div className="field-label">分心应用</div>
                      <div className="field-hint">
                        输入 App 名或 bundle id，按 Enter 添加。
                      </div>
                    </div>
                    <div className="field-control">
                      <ChipEditor
                        values={payload.settings.distractingApps}
                        onChange={(next) =>
                          void updateSettings({ distractingApps: next })
                        }
                        placeholder="例如 com.apple.Safari 或 Google Chrome"
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <section className="section">
            <div className="section-title">系统</div>
            <div className="section-panel">
              <div className="field-row horizontal">
                <div>
                  <div className="field-label">开机自启</div>
                  <div className="field-hint">
                    正式打包版会在登录后启动；开发环境仅保存偏好。
                  </div>
                </div>
                <div className="field-control">
                  <Toggle
                    checked={payload.settings.launchAtLogin}
                    onChange={(checked) =>
                      void updateSettings({ launchAtLogin: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-title">关于</div>
            <div className="section-panel">
              <div className="about-grid">
                <div className="about-row">
                  <div>
                    <div className="about-title">版本</div>
                    <div className="about-text">当前版本</div>
                  </div>
                  <strong>{payload.version}</strong>
                </div>
                <div className="about-row">
                  <div>
                    <div className="about-title">诊断信息</div>
                    <div className="about-text">
                      {payload.isMacArm64
                        ? "Apple Silicon macOS"
                        : "当前平台不在正式支持范围内"}
                    </div>
                  </div>
                  <strong>{payload.isMacArm64 ? "已支持" : "未支持"}</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<SettingsApp />);
