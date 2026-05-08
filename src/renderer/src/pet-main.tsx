import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import type {
  PetEvent,
  RendererPetAppearance,
  SettingsPayload,
} from "@shared/api";
import type {
  DailyStats,
  PetPosition,
  PetSceneKey,
  ReminderEvent,
} from "@shared/types";
import { getFocusSessionRemainingSeconds } from "@shared/focusSession";
import "./styles.css";
import { getDragOffsetForMouseDown } from "./pet-drag";
import {
  getPetSceneAssetCandidates,
  pickRandomAsset,
  resolvePetSceneAsset,
  resolvePetSceneKey,
} from "./sceneAssetResolver";
import { getPetWindowContentWidth } from "./petWindowContentWidth";

const FOCUS_COMPLETION_MESSAGE_DURATION_MS = 3000;
const BREAK_PROMPT_TIMEOUT_MS = 10000;
const HYDRATION_PROMPT_TIMEOUT_MS = 10000;
const HYDRATION_DEFER_DURATION_MS = 5000;
const HYDRATION_DRINKING_DURATION_MS = 5000;
const HYDRATION_DONE_DURATION_MS = 5000;
const BREAK_DONE_DURATION_MS = 5000;
const BREAK_SKIP_DURATION_MS = 5000;
const BREAK_SNOOZE_DURATION_MS = 5000;
const BREAK_SNOOZE_DELAY_MS = 10 * 60 * 1000;
const BREAK_RUNNING_SPEED_PX_PER_SECOND = 84;
const BREAK_RUNNING_DIRECTION_CHANGE_MIN_MS = 2200;
const BREAK_RUNNING_DIRECTION_CHANGE_MAX_MS = 4600;
const BREAK_RUNNING_EDGE_PADDING_PX = 72;
const PET_WINDOW_WIDTH = 176;
const PET_WINDOW_HEIGHT = 320;

interface BreakRunningMotionState {
  direction: { x: number; y: number };
  lastFrameAt: number | null;
  nextDirectionChangeAt: number;
  position: PetPosition;
}

type BreakInteractionState = "running" | "done" | "snoozed" | "sad" | null;
interface DeferredBreakReminder {
  id: string;
  message: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min);

const normalizeDirection = (x: number, y: number) => {
  const magnitude = Math.hypot(x, y);

  if (!magnitude) {
    return { x: 1, y: 0 };
  }

  return {
    x: x / magnitude,
    y: y / magnitude,
  };
};

const pickRandomDirection = () =>
  normalizeDirection(Math.random() * 2 - 1, Math.random() * 2 - 1);

const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const PetApp = () => {
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [appearance, setAppearance] = useState<RendererPetAppearance | null>(
    null,
  );
  const [activeEvent, setActiveEvent] = useState<ReminderEvent | null>(null);
  const [pendingBreakEvent, setPendingBreakEvent] =
    useState<ReminderEvent | null>(null);
  const [pendingHydrationEvent, setPendingHydrationEvent] =
    useState<ReminderEvent | null>(null);
  const [focusStartMessage, setFocusStartMessage] = useState<string | null>(
    null,
  );
  const [focusCompletionMessage, setFocusCompletionMessage] = useState<
    string | null
  >(null);
  const [interactionScene, setInteractionScene] = useState<PetSceneKey | null>(
    null,
  );
  const [breakInteractionState, setBreakInteractionState] =
    useState<BreakInteractionState>(null);
  const [breakInteractionMessage, setBreakInteractionMessage] = useState<
    string | null
  >(null);
  const [deferredBreakReminder, setDeferredBreakReminder] =
    useState<DeferredBreakReminder | null>(null);
  const [hydrationInteractionScene, setHydrationInteractionScene] =
    useState<PetSceneKey | null>(null);
  const [hydrationAutoDeferMessage, setHydrationAutoDeferMessage] = useState<
    string | null
  >(null);
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [focusNow, setFocusNow] = useState(() => Date.now());
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [petMousePassthrough, setPetMousePassthrough] = useState(true);
  const dragOffset = useRef({ x: 0, y: 0 });
  const statsUpdatedAtRef = useRef(Date.now());
  const selectedSceneRef = useRef<{
    appearanceId: string;
    scene: string;
  } | null>(null);
  const hydrationInteractionTimersRef = useRef<number[]>([]);
  const breakInteractionTimersRef = useRef<number[]>([]);
  const deferredBreakTimerRef = useRef<number | null>(null);
  const displayedReminderRef = useRef<ReminderEvent | null>(null);
  const breakRunningFrameRef = useRef<number | null>(null);
  const breakRunningMotionStateRef = useRef<BreakRunningMotionState | null>(
    null,
  );
  const petPositionRef = useRef<PetPosition | null>(null);

  const clearHydrationInteractionTimers = () => {
    hydrationInteractionTimersRef.current.forEach((timer) =>
      window.clearTimeout(timer),
    );
    hydrationInteractionTimersRef.current = [];
  };

  const clearBreakInteractionTimers = () => {
    breakInteractionTimersRef.current.forEach((timer) =>
      window.clearTimeout(timer),
    );
    breakInteractionTimersRef.current = [];
  };

  const stopBreakRunningMotion = () => {
    breakRunningMotionStateRef.current = null;
    if (breakRunningFrameRef.current !== null) {
      window.cancelAnimationFrame(breakRunningFrameRef.current);
      breakRunningFrameRef.current = null;
    }
  };

  const clearDeferredBreakTimer = () => {
    if (deferredBreakTimerRef.current !== null) {
      window.clearTimeout(deferredBreakTimerRef.current);
      deferredBreakTimerRef.current = null;
    }
  };

  const clearPendingHydrationEvent = (reminderId?: string) => {
    setPendingHydrationEvent((current) => {
      if (!reminderId || current?.id === reminderId) {
        return null;
      }

      return current;
    });
  };

  const clearPendingBreakEvent = (reminderId?: string) => {
    setPendingBreakEvent((current) => {
      if (!reminderId || current?.id === reminderId) {
        return null;
      }

      return current;
    });
  };

  const acknowledgeReminder = (reminderId: string) => {
    void window.petBuddy.pet.acknowledge(reminderId);
    setActiveEvent((current) => (current?.id === reminderId ? null : current));
    clearPendingBreakEvent(reminderId);
    clearPendingHydrationEvent(reminderId);
  };

  const dismissHydrationReminderForFocusTransition = () => {
    const reminder = displayedReminderRef.current;

    if (reminder?.kind !== "water") {
      return;
    }

    clearHydrationInteractionTimers();
    setHydrationInteractionScene(null);
    setHydrationAutoDeferMessage(null);
    acknowledgeReminder(reminder.id);
  };

  const clearBreakInteraction = () => {
    stopBreakRunningMotion();
    clearBreakInteractionTimers();
    setBreakInteractionState(null);
    setBreakInteractionMessage(null);
    setInteractionScene(null);
  };

  useEffect(() => {
    if (!window.petBuddy) {
      setError("preload API not available");
      return;
    }

    const loadPetState = async () => {
      const [next, stats] = await Promise.all([
        window.petBuddy.settings.get(),
        window.petBuddy.stats.getToday(),
      ]);
      setPayload(next);
      setTodayStats(stats);
      statsUpdatedAtRef.current = Date.now();
      setFocusNow(Date.now());
      setAppearance(
        next.appearances.find(
          (item) => item.id === next.settings.selectedPetAppearance,
        ) ?? next.appearances[0],
      );
      setError(null);
    };

    void loadPetState().catch((loadError) => {
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    });

    const unsubscribe = window.petBuddy.pet.onEvent((event: PetEvent) => {
      if (event.type === "reminder") {
        if (event.event.kind === "break") {
          clearDeferredBreakTimer();
          setDeferredBreakReminder(null);
          setPendingBreakEvent(event.event);
        }
        if (event.event.kind === "water") {
          setPendingHydrationEvent(event.event);
        }
        setActiveEvent(event.event);
      }

      if (event.type === "reminder-finished") {
        setActiveEvent((current) =>
          current?.id === event.eventId ? null : current,
        );
      }

      if (event.type === "hydration-completed") {
        setActiveEvent(null);
        clearPendingHydrationEvent();
        runHydrationCompleteSequence();
      }

      if (event.type === "appearance-changed") {
        setAppearance(event.appearance);
      }

      if (event.type === "position-changed") {
        setPayload((current) =>
          current
            ? {
                ...current,
                settings: {
                  ...current.settings,
                  petPosition: event.position,
                },
              }
            : current,
        );
      }

      if (event.type === "focus-session-started") {
        dismissHydrationReminderForFocusTransition();
        setFocusStartMessage(event.message);
      }

      if (event.type === "focus-session-completed") {
        dismissHydrationReminderForFocusTransition();
        setFocusCompletionMessage(event.message);
      }

      if (event.type === "focus-session-updated") {
        setPayload((current) =>
          current ? { ...current, focusSession: event.focusSession } : current,
        );
      }
    });

    const syncTimer = window.setInterval(() => {
      void loadPetState().catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        );
      });
    }, 15000);

    return () => {
      clearDeferredBreakTimer();
      clearBreakInteractionTimers();
      clearHydrationInteractionTimers();
      window.clearInterval(syncTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => setFocusNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    void window.petBuddy?.app.setPetMousePassthrough(petMousePassthrough);
  }, [petMousePassthrough]);

  useEffect(() => {
    if (!focusStartMessage) {
      return;
    }

    const timer = window.setTimeout(() => setFocusStartMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [focusStartMessage]);

  useEffect(() => {
    if (!focusCompletionMessage) {
      return;
    }

    const timer = window.setTimeout(
      () => setFocusCompletionMessage(null),
      FOCUS_COMPLETION_MESSAGE_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [focusCompletionMessage]);

  const displayedReminder = pendingHydrationEvent ?? activeEvent;
  const displayedBreakReminder =
    displayedReminder?.kind === "break" ? displayedReminder : null;
  const breakReminder =
    pendingBreakEvent ?? displayedBreakReminder ?? deferredBreakReminder;

  useEffect(() => {
    if (!breakReminder) {
      return;
    }

    const timer = window.setTimeout(
      () => handleBreakAutoDismiss(breakReminder.id),
      BREAK_PROMPT_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [breakReminder]);

  useEffect(() => {
    const displayedReminder = pendingHydrationEvent ?? activeEvent;

    if (displayedReminder?.kind !== "water") {
      return;
    }

    const timer = window.setTimeout(
      () => handleHydrationAutoDefer(displayedReminder.id),
      HYDRATION_PROMPT_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [activeEvent, pendingHydrationEvent]);
  useEffect(() => {
    displayedReminderRef.current = displayedReminder;
  }, [displayedReminder]);

  const sceneOverride: PetSceneKey | null = focusStartMessage
    ? "focusGuard"
    : focusCompletionMessage
      ? "focusDone"
      : null;
  const breakInteractionScene: PetSceneKey | null =
    breakInteractionState === "running"
      ? "breakRunning"
      : breakInteractionState === "done"
        ? "breakDone"
        : breakInteractionState === "sad"
          ? "sad"
          : null;

  const currentScene = useMemo(() => {
    if (!appearance) {
      return null;
    }

    return resolvePetSceneKey({
      sceneOverride,
      activeEvent: breakReminder
        ? {
            ...breakReminder,
            kind: "break",
            durationMs: 0,
            animation: "run",
            priority: 0,
            timestamp: 0,
          }
        : displayedReminder,
      focusSession: payload?.focusSession ?? {
        session: null,
        status: "idle",
        doneEndsAt: null,
        pausedRemainingMs: null,
      },
      interactionScene:
        breakInteractionScene ?? interactionScene ?? hydrationInteractionScene,
    });
  }, [
    appearance,
    breakInteractionScene,
    breakReminder,
    displayedReminder,
    hydrationInteractionScene,
    interactionScene,
    payload?.focusSession,
    sceneOverride,
  ]);

  const [currentAsset, setCurrentAsset] = useState<string | undefined>(
    undefined,
  );

  useLayoutEffect(() => {
    if (!appearance || !currentScene) {
      setCurrentAsset(undefined);
      selectedSceneRef.current = null;
      return;
    }

    const nextCandidates = getPetSceneAssetCandidates(appearance, currentScene);
    const previousSelection = selectedSceneRef.current;
    const sameScene =
      previousSelection?.appearanceId === appearance.id &&
      previousSelection.scene === currentScene;

    setCurrentAsset((current) =>
      pickRandomAsset(nextCandidates, sameScene ? current : undefined),
    );
    selectedSceneRef.current = {
      appearanceId: appearance.id,
      scene: currentScene,
    };
  }, [appearance, currentScene]);

  const settings = payload?.settings;

  useEffect(() => {
    if (settings) {
      petPositionRef.current = settings.petPosition;
    }
  }, [settings?.petPosition.x, settings?.petPosition.y]);

  const updatePetPosition = (nextPosition: PetPosition) => {
    const roundedPosition = {
      x: Math.round(nextPosition.x),
      y: Math.round(nextPosition.y),
    };

    petPositionRef.current = roundedPosition;
    void window.petBuddy.pet.setPosition(roundedPosition);
    setPayload((current) =>
      current
        ? {
            ...current,
            settings: {
              ...current.settings,
              petPosition: roundedPosition,
            },
          }
        : current,
    );
  };

  const getBreakRunningBounds = (position: PetPosition) => {
    const petWidth = window.outerWidth || PET_WINDOW_WIDTH;
    const petHeight = window.outerHeight || PET_WINDOW_HEIGHT;
    const screenWithOffsets = window.screen as Screen & {
      availLeft?: number;
      availTop?: number;
    };
    const minX = screenWithOffsets.availLeft ?? 0;
    const minY = screenWithOffsets.availTop ?? 0;
    const maxX = minX + window.screen.availWidth - petWidth;
    const maxY = minY + window.screen.availHeight - petHeight;
    const clampedPosition = {
      x: clamp(position.x, minX, maxX),
      y: clamp(position.y, minY, maxY),
    };

    return {
      minX,
      maxX,
      minY,
      maxY,
      clampedPosition,
    };
  };

  const scheduleNextBreakDirectionChange = (frameAt: number) =>
    frameAt +
    randomBetween(
      BREAK_RUNNING_DIRECTION_CHANGE_MIN_MS,
      BREAK_RUNNING_DIRECTION_CHANGE_MAX_MS,
    );

  const chooseBreakRunningDirection = (position: PetPosition) => {
    const { minX, maxX, minY, maxY } = getBreakRunningBounds(position);
    let nextDirection = pickRandomDirection();

    if (
      position.x <= minX + BREAK_RUNNING_EDGE_PADDING_PX &&
      nextDirection.x < 0
    ) {
      nextDirection = normalizeDirection(
        Math.abs(nextDirection.x),
        nextDirection.y,
      );
    }

    if (
      position.x >= maxX - BREAK_RUNNING_EDGE_PADDING_PX &&
      nextDirection.x > 0
    ) {
      nextDirection = normalizeDirection(
        -Math.abs(nextDirection.x),
        nextDirection.y,
      );
    }

    if (
      position.y <= minY + BREAK_RUNNING_EDGE_PADDING_PX &&
      nextDirection.y < 0
    ) {
      nextDirection = normalizeDirection(
        nextDirection.x,
        Math.abs(nextDirection.y),
      );
    }

    if (
      position.y >= maxY - BREAK_RUNNING_EDGE_PADDING_PX &&
      nextDirection.y > 0
    ) {
      nextDirection = normalizeDirection(
        nextDirection.x,
        -Math.abs(nextDirection.y),
      );
    }

    return nextDirection;
  };

  const isBreakRunningNearEdge = (position: PetPosition) => {
    const { minX, maxX, minY, maxY } = getBreakRunningBounds(position);

    return (
      position.x <= minX + BREAK_RUNNING_EDGE_PADDING_PX ||
      position.x >= maxX - BREAK_RUNNING_EDGE_PADDING_PX ||
      position.y <= minY + BREAK_RUNNING_EDGE_PADDING_PX ||
      position.y >= maxY - BREAK_RUNNING_EDGE_PADDING_PX
    );
  };

  const acknowledgeBreakReminderIfNeeded = (reminderId: string) => {
    if (activeEvent?.kind === "break" && activeEvent.id === reminderId) {
      acknowledgeReminder(reminderId);
    }

    clearPendingBreakEvent(reminderId);
    setDeferredBreakReminder((current) =>
      current?.id === reminderId ? null : current,
    );
  };

  const handleBreakAccept = (reminderId: string) => {
    if (payload?.focusSession.status === "active") {
      void window.petBuddy.app
        .pauseFocusSessionForBreak()
        .then((nextPayload) => {
          setPayload(nextPayload);
        });
    }
    clearDeferredBreakTimer();
    setDeferredBreakReminder(null);
    acknowledgeBreakReminderIfNeeded(reminderId);
    clearBreakInteractionTimers();
    clearHydrationInteractionTimers();
    setHydrationInteractionScene(null);
    setHydrationAutoDeferMessage(null);
    setBreakInteractionState("running");
    setBreakInteractionMessage("休息就不许再看屏幕了");
    setInteractionScene("breakRunning");
  };

  const handleBreakComplete = () => {
    stopBreakRunningMotion();
    clearBreakInteractionTimers();
    void window.petBuddy.pet.completeBreak();
    if (payload?.focusSession.status === "paused") {
      void window.petBuddy.app
        .resumeFocusSessionAfterBreak()
        .then((nextPayload) => {
          setPayload(nextPayload);
        });
    }
    if (appearance) {
      setCurrentAsset(resolvePetSceneAsset(appearance, "breakDone"));
      selectedSceneRef.current = {
        appearanceId: appearance.id,
        scene: "breakDone",
      };
    }
    setBreakInteractionState("done");
    setBreakInteractionMessage("每天锻炼身体好");
    setInteractionScene("breakDone");
    breakInteractionTimersRef.current = [
      window.setTimeout(() => {
        clearBreakInteraction();
      }, BREAK_DONE_DURATION_MS),
    ];
  };

  const handleBreakSnooze = (reminderId: string, reminderMessage: string) => {
    acknowledgeBreakReminderIfNeeded(reminderId);
    void window.petBuddy.pet.snoozeBreak(BREAK_SNOOZE_DELAY_MS);
    stopBreakRunningMotion();
    clearDeferredBreakTimer();
    clearBreakInteractionTimers();
    setBreakInteractionState("snoozed");
    setBreakInteractionMessage("那十分钟后我再来叫你玩～");
    setDeferredBreakReminder(null);
    setInteractionScene(null);
    breakInteractionTimersRef.current = [
      window.setTimeout(() => {
        clearBreakInteraction();
      }, BREAK_SNOOZE_DURATION_MS),
    ];
    deferredBreakTimerRef.current = window.setTimeout(() => {
      setDeferredBreakReminder({
        id: `${reminderId}-deferred`,
        message: reminderMessage,
      });
      deferredBreakTimerRef.current = null;
    }, BREAK_SNOOZE_DELAY_MS);
  };

  const handleBreakSkip = (reminderId: string) => {
    acknowledgeBreakReminderIfNeeded(reminderId);
    void window.petBuddy.pet.muteBreakForToday();
    stopBreakRunningMotion();
    clearDeferredBreakTimer();
    clearBreakInteractionTimers();
    setBreakInteractionState("sad");
    setBreakInteractionMessage("那我先自己去趴着了...");
    setDeferredBreakReminder(null);
    setInteractionScene("sad");
    breakInteractionTimersRef.current = [
      window.setTimeout(() => {
        clearBreakInteraction();
      }, BREAK_SKIP_DURATION_MS),
    ];
  };

  const handleBreakAutoDismiss = (reminderId: string) => {
    acknowledgeBreakReminderIfNeeded(reminderId);
    stopBreakRunningMotion();
    clearDeferredBreakTimer();
    clearBreakInteractionTimers();
    setBreakInteractionState("sad");
    setBreakInteractionMessage("忙的话我一会再来叫你...");
    setDeferredBreakReminder(null);
    setInteractionScene("sad");
    breakInteractionTimersRef.current = [
      window.setTimeout(() => {
        clearBreakInteraction();
      }, BREAK_SKIP_DURATION_MS),
    ];
  };

  const handleHydrationDefer = (reminderId: string) => {
    acknowledgeReminder(reminderId);
    clearHydrationInteractionTimers();
    setHydrationInteractionScene("sad");
    hydrationInteractionTimersRef.current = [
      window.setTimeout(() => {
        setHydrationInteractionScene(null);
        setHydrationAutoDeferMessage(null);
      }, HYDRATION_DEFER_DURATION_MS),
    ];
  };

  const handleHydrationAutoDefer = (reminderId: string) => {
    setHydrationAutoDeferMessage("不理我 5555～");
    handleHydrationDefer(reminderId);
    setHydrationAutoDeferMessage("不理我 5555～");
  };

  const runHydrationCompleteSequence = () => {
    clearHydrationInteractionTimers();
    setHydrationAutoDeferMessage(null);
    setHydrationInteractionScene("drinking");
    const drinkingTimer = window.setTimeout(
      () => setHydrationInteractionScene("hydrationDone"),
      HYDRATION_DRINKING_DURATION_MS,
    );
    const resetTimer = window.setTimeout(() => {
      setHydrationInteractionScene(null);
      setHydrationAutoDeferMessage(null);
    }, HYDRATION_DRINKING_DURATION_MS + HYDRATION_DONE_DURATION_MS);
    hydrationInteractionTimersRef.current = [drinkingTimer, resetTimer];
  };

  const handleHydrationComplete = (reminderId: string) => {
    void window.petBuddy.pet.completeHydration(reminderId);
  };

  useEffect(() => {
    if (breakInteractionState !== "running" || dragging) {
      if (breakInteractionState !== "running") {
        stopBreakRunningMotion();
      }
      return;
    }

    const startingPosition = petPositionRef.current ?? settings?.petPosition;
    if (!startingPosition) {
      return;
    }

    const initialBounds = getBreakRunningBounds(startingPosition);
    const currentMotionState = breakRunningMotionStateRef.current;
    breakRunningMotionStateRef.current = {
      direction:
        currentMotionState?.direction ??
        chooseBreakRunningDirection(initialBounds.clampedPosition),
      lastFrameAt: null,
      nextDirectionChangeAt:
        currentMotionState?.nextDirectionChangeAt ??
        scheduleNextBreakDirectionChange(performance.now()),
      position: initialBounds.clampedPosition,
    };

    const stepBreakRunningMotion = (frameAt: number) => {
      const motionState = breakRunningMotionStateRef.current;
      if (!motionState) {
        return;
      }

      if (motionState.lastFrameAt === null) {
        motionState.lastFrameAt = frameAt;
        breakRunningFrameRef.current = window.requestAnimationFrame(
          stepBreakRunningMotion,
        );
        return;
      }

      if (frameAt >= motionState.nextDirectionChangeAt) {
        motionState.direction = chooseBreakRunningDirection(
          motionState.position,
        );
        motionState.nextDirectionChangeAt =
          scheduleNextBreakDirectionChange(frameAt);
      }

      const deltaSeconds = Math.min(
        (frameAt - motionState.lastFrameAt) / 1000,
        0.05,
      );
      const rawPosition = {
        x:
          motionState.position.x +
          motionState.direction.x *
            BREAK_RUNNING_SPEED_PX_PER_SECOND *
            deltaSeconds,
        y:
          motionState.position.y +
          motionState.direction.y *
            BREAK_RUNNING_SPEED_PX_PER_SECOND *
            deltaSeconds,
      };
      const bounds = getBreakRunningBounds(rawPosition);
      const clampedPosition = bounds.clampedPosition;
      const hitBoundary =
        clampedPosition.x !== rawPosition.x ||
        clampedPosition.y !== rawPosition.y;

      motionState.position = clampedPosition;
      motionState.lastFrameAt = frameAt;

      if (hitBoundary || isBreakRunningNearEdge(clampedPosition)) {
        motionState.direction = chooseBreakRunningDirection(clampedPosition);
        motionState.nextDirectionChangeAt =
          scheduleNextBreakDirectionChange(frameAt);
      }

      updatePetPosition(clampedPosition);
      breakRunningFrameRef.current = window.requestAnimationFrame(
        stepBreakRunningMotion,
      );
    };

    breakRunningFrameRef.current = window.requestAnimationFrame(
      stepBreakRunningMotion,
    );

    return () => {
      stopBreakRunningMotion();
    };
  }, [breakInteractionState, dragging]);

  const shouldHideFocusSessionCountdown =
    breakInteractionState === "running" || breakInteractionState === "done";

  const focusSessionCountdown = useMemo(() => {
    if (shouldHideFocusSessionCountdown || !payload) {
      return null;
    }

    if (
      payload.focusSession.status === "paused" &&
      payload.focusSession.pausedRemainingMs !== null
    ) {
      return formatDuration(
        Math.ceil(payload.focusSession.pausedRemainingMs / 1000),
      );
    }

    if (
      !payload.focusSession.session ||
      payload.focusSession.status !== "active"
    ) {
      return null;
    }

    return formatDuration(
      getFocusSessionRemainingSeconds(payload.focusSession.session, focusNow),
    );
  }, [focusNow, payload?.focusSession, shouldHideFocusSessionCountdown]);

  useEffect(() => {
    const reportContentWidth = () => {
      const stage = document.querySelector(".pet-stage");

      if (!(stage instanceof HTMLElement)) {
        void window.petBuddy?.app.setPetWindowContentWidth(PET_WINDOW_WIDTH);
        return;
      }

      const stageRect = stage.getBoundingClientRect();
      const contentRects = Array.from(
        stage.querySelectorAll<HTMLElement>(".pet-bubble, .pet-dialog"),
      ).map((element) => element.getBoundingClientRect());
      const nextWidth = getPetWindowContentWidth({
        baseWidth: PET_WINDOW_WIDTH,
        stageRect,
        contentRects,
      });
      void window.petBuddy?.app.setPetWindowContentWidth(nextWidth);
    };

    const frame = window.requestAnimationFrame(reportContentWidth);
    const resizeObserver = new ResizeObserver(() => reportContentWidth());

    resizeObserver.observe(document.documentElement);
    window.addEventListener("resize", reportContentWidth);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", reportContentWidth);
    };
  }, [
    appearance,
    activeEvent,
    breakInteractionMessage,
    breakReminder,
    currentAsset,
    focusCompletionMessage,
    focusSessionCountdown,
    focusStartMessage,
    hydrationAutoDeferMessage,
  ]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!settings) {
      return;
    }

    const nextDragOffset = getDragOffsetForMouseDown({
      button: event.button,
      screenX: event.screenX,
      screenY: event.screenY,
      petPosition: settings.petPosition,
    });
    if (!nextDragOffset) {
      return;
    }

    setDragging(true);
    dragOffset.current = nextDragOffset;
  };

  const setPetHoverState = (interactive: boolean) => {
    setPetMousePassthrough(!interactive);
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragging) {
        return;
      }

      const nextPosition = {
        x: event.screenX - dragOffset.current.x,
        y: event.screenY - dragOffset.current.y,
      };
      updatePetPosition(nextPosition);
    };

    const handleMouseUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  if (error) {
    return (
      <div className="pet-shell">
        <div className="pet-stage">
          <div className="pet-bubble">
            <div className="pet-bubble-text">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!payload || !appearance) {
    return (
      <div className="pet-shell">
        <div className="pet-stage" />
      </div>
    );
  }

  const messageBubble = focusStartMessage ? (
    <div
      className="pet-bubble pet-bubble-message"
      onMouseEnter={() => setPetHoverState(true)}
      onMouseLeave={() => setPetHoverState(false)}
    >
      <div className="pet-bubble-text">{focusStartMessage}</div>
    </div>
  ) : focusCompletionMessage ? (
    <div
      className="pet-bubble pet-bubble-message"
      onMouseEnter={() => setPetHoverState(true)}
      onMouseLeave={() => setPetHoverState(false)}
    >
      <div className="pet-bubble-text">{focusCompletionMessage}</div>
    </div>
  ) : breakInteractionMessage ? (
    <div
      className="pet-bubble pet-bubble-message"
      onMouseEnter={() => setPetHoverState(true)}
      onMouseLeave={() => setPetHoverState(false)}
    >
      <div className="pet-bubble-text">{breakInteractionMessage}</div>
      {breakInteractionState === "running" ? (
        <div className="pet-bubble-actions">
          <button
            className="small-button pet-bubble-button"
            onClick={handleBreakComplete}
          >
            我回来了
          </button>
        </div>
      ) : null}
    </div>
  ) : hydrationAutoDeferMessage ? (
    <div
      className="pet-bubble pet-bubble-message"
      onMouseEnter={() => setPetHoverState(true)}
      onMouseLeave={() => setPetHoverState(false)}
    >
      <div className="pet-bubble-text">{hydrationAutoDeferMessage}</div>
    </div>
  ) : displayedReminder?.kind === "water" ? (
    <div
      className="pet-bubble pet-bubble-message"
      onMouseEnter={() => setPetHoverState(true)}
      onMouseLeave={() => setPetHoverState(false)}
    >
      <div className="pet-bubble-text">{displayedReminder.message}</div>
      <div className="pet-bubble-actions">
        <button
          className="small-button pet-bubble-button"
          onClick={() => handleHydrationDefer(displayedReminder.id)}
        >
          没空
        </button>
        <button
          className="small-button pet-bubble-button"
          onClick={() => handleHydrationComplete(displayedReminder.id)}
        >
          我喝啦
        </button>
      </div>
    </div>
  ) : activeEvent?.kind !== "break" && activeEvent ? (
    <div
      className="pet-bubble pet-bubble-message"
      onMouseEnter={() => setPetHoverState(true)}
      onMouseLeave={() => setPetHoverState(false)}
    >
      <div className="pet-bubble-text">{activeEvent.message}</div>
      <div className="pet-bubble-actions">
        <button
          className="small-button pet-bubble-button"
          onClick={() => {
            acknowledgeReminder(activeEvent.id);
          }}
        >
          知道了
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div
      className="pet-shell"
      onContextMenu={(event) => {
        event.preventDefault();
        void window.petBuddy.app.showPetContextMenu();
      }}
    >
      <div className="pet-stage">
        <div
          className="pet-presence"
          onMouseEnter={() => setPetHoverState(true)}
          onMouseLeave={() => setPetHoverState(false)}
        >
          <div className="pet-card-anchor">
            {messageBubble}
            {breakReminder ? (
              <div className="pet-dialog pet-dialog-break">
                <div className="pet-dialog-text">{breakReminder.message}</div>
                <div className="pet-dialog-actions">
                  <button
                    className="small-button pet-dialog-button"
                    onClick={() => handleBreakAccept(breakReminder.id)}
                  >
                    好的我休息会
                  </button>
                  <button
                    className="small-button pet-dialog-button"
                    onClick={() =>
                      handleBreakSnooze(breakReminder.id, breakReminder.message)
                    }
                  >
                    我再干十分钟
                  </button>
                  <button
                    className="small-button pet-dialog-button"
                    onClick={() => handleBreakSkip(breakReminder.id)}
                  >
                    今天别管我
                  </button>
                </div>
              </div>
            ) : null}
            <div className="pet-card" onMouseDown={handleMouseDown}>
              {currentAsset ? (
                <img
                  key={`${appearance.id}:${currentScene}:${currentAsset ?? "empty"}`}
                  src={currentAsset}
                  alt={appearance.displayName}
                />
              ) : null}
            </div>
          </div>
          {focusSessionCountdown ? (
            <div
              className="pet-bubble pet-bubble-status"
              aria-label={`专注倒计时 ${focusSessionCountdown}`}
            >
              <span className="pet-bubble-status-label">专注</span>
              <span className="pet-bubble-status-time">
                {focusSessionCountdown}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<PetApp />);
