import { useCallback, useEffect, useRef, useState } from "react";

import type {
  EntityKind,
  GameEntity,
  GameSnapshot,
  Lane,
} from "./types";

const BEST_SCORE_KEY = "neon-drift-best-v1";
const PLAYER_Z = 0;
const COLLISION_Z = -0.45;
const START_SPEED = 12;

type EngineState = {
  status: GameSnapshot["status"];
  lane: Lane;
  distance: number;
  shards: number;
  bonusScore: number;
  combo: number;
  lastShardAt: number;
  speed: number;
  jumpTimer: number;
  slideTimer: number;
  spawnTimer: number;
  nextEntityId: number;
  best: number;
  entities: GameEntity[];
};

function readBestScore() {
  if (typeof window === "undefined") return 0;

  try {
    const stored = Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? 0);
    return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0;
  } catch {
    return 0;
  }
}

function makeEngine(best = readBestScore()): EngineState {
  return {
    status: "ready",
    lane: 0,
    distance: 0,
    shards: 0,
    bonusScore: 0,
    combo: 0,
    lastShardAt: -Infinity,
    speed: START_SPEED,
    jumpTimer: 0,
    slideTimer: 0,
    spawnTimer: 0.8,
    nextEntityId: 1,
    best,
    entities: [],
  };
}

function toSnapshot(state: EngineState): GameSnapshot {
  const jumpDuration = 0.88;
  const jumpProgress = state.jumpTimer > 0 ? 1 - state.jumpTimer / jumpDuration : 0;
  const jumpHeight =
    state.jumpTimer > 0
      ? Math.sin(Math.max(0, Math.min(1, jumpProgress)) * Math.PI) * 1.9
      : 0;

  return {
    status: state.status,
    score: calculateScore(state),
    best: state.best,
    shards: state.shards,
    combo: state.combo,
    speed: Math.round(state.speed),
    lane: state.lane,
    jumpHeight,
    sliding: state.slideTimer > 0,
    entities: state.entities,
  };
}

function calculateScore(state: EngineState) {
  return Math.floor(state.distance * 8) + state.shards * 100 + state.bonusScore;
}

function makeEntity(
  state: EngineState,
  lane: Lane,
  kind: EntityKind,
  z = -54,
): GameEntity {
  return {
    id: `entity-${state.nextEntityId++}`,
    lane,
    z,
    kind,
  };
}

function spawnRow(state: EngineState) {
  const lanes: Lane[] = [-1, 0, 1];
  const first = lanes[Math.floor(Math.random() * lanes.length)];
  const remaining = lanes.filter((lane) => lane !== first);
  const second = remaining[Math.floor(Math.random() * remaining.length)];
  const rowRoll = Math.random();

  if (rowRoll < 0.2) {
    const count = 3;
    for (let index = 0; index < count; index += 1) {
      state.entities.push(makeEntity(state, first, "orb", -54 - index * 3.1));
    }
    return;
  }

  const chooseHazard = (): EntityKind => {
    const roll = Math.random();
    if (roll < 0.37) return "block";
    if (roll < 0.69) return "gap";
    return "barrier";
  };

  state.entities.push(makeEntity(state, first, chooseHazard()));

  // Leave one lane open in every double-hazard row so patterns are always fair.
  if (rowRoll > 0.58) {
    state.entities.push(makeEntity(state, second, chooseHazard()));
  } else if (Math.random() < 0.55) {
    state.entities.push(makeEntity(state, second, "orb", -58));
  }
}

function persistBestScore(score: number) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // The run still works if browser storage is unavailable.
  }
}

function finishRun(state: EngineState) {
  state.status = "over";
  const score = calculateScore(state);
  if (score > state.best) {
    state.best = score;
    persistBestScore(score);
  }
}

function updateEngine(state: EngineState, delta: number) {
  if (state.status !== "running") return;

  state.distance += state.speed * delta;
  state.speed = Math.min(23, START_SPEED + state.distance * 0.012);
  state.jumpTimer = Math.max(0, state.jumpTimer - delta);
  state.slideTimer = Math.max(0, state.slideTimer - delta);

  if (state.combo > 0 && performance.now() / 1000 - state.lastShardAt > 2.4) {
    state.combo = 0;
  }

  const spawnInterval = Math.max(0.76, 1.18 - state.distance * 0.00075);
  state.spawnTimer -= delta;
  if (state.spawnTimer <= 0) {
    spawnRow(state);
    state.spawnTimer += spawnInterval;
  }

  const jumpDuration = 0.88;
  const jumpProgress =
    state.jumpTimer > 0 ? 1 - state.jumpTimer / jumpDuration : 0;
  const jumpHeight =
    state.jumpTimer > 0
      ? Math.sin(Math.max(0, Math.min(1, jumpProgress)) * Math.PI) * 1.9
      : 0;

  const remainingEntities: GameEntity[] = [];
  for (const entity of state.entities) {
    const previousZ = entity.z;
    entity.z += state.speed * delta;

    if (entity.kind === "orb") {
      if (
        entity.lane === state.lane &&
        previousZ < COLLISION_Z &&
        entity.z >= COLLISION_Z
      ) {
        state.shards += 1;
        state.combo += 1;
        state.bonusScore += Math.min(state.combo * 25, 250);
        state.lastShardAt = performance.now() / 1000;
        continue;
      }
      if (entity.z <= PLAYER_Z + 2.5) remainingEntities.push(entity);
      continue;
    }

    if (
      entity.lane === state.lane &&
      previousZ < COLLISION_Z &&
      entity.z >= COLLISION_Z
    ) {
      const avoided =
        (entity.kind === "gap" && jumpHeight > 0.72) ||
        (entity.kind === "barrier" && state.slideTimer > 0.05);
      if (!avoided) {
        finishRun(state);
        break;
      }
    }

    if (entity.z <= PLAYER_Z + 4) remainingEntities.push(entity);
  }

  state.entities = remainingEntities;
}

export function useGameEngine() {
  const engine = useRef<EngineState | null>(null);
  if (engine.current === null) {
    engine.current = makeEngine();
  }

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() =>
    toSnapshot(engine.current!),
  );

  const publish = useCallback(() => {
    if (engine.current) setSnapshot(toSnapshot(engine.current));
  }, []);

  const start = useCallback(() => {
    const best = engine.current?.best ?? readBestScore();
    engine.current = makeEngine(best);
    engine.current.status = "running";
    publish();
  }, [publish]);

  const pause = useCallback(() => {
    if (!engine.current || engine.current.status !== "running") return;
    engine.current.status = "paused";
    publish();
  }, [publish]);

  const resume = useCallback(() => {
    if (!engine.current || engine.current.status !== "paused") return;
    engine.current.status = "running";
    publish();
  }, [publish]);

  const restart = useCallback(() => {
    start();
  }, [start]);

  const move = useCallback(
    (direction: -1 | 1) => {
      if (!engine.current || engine.current.status !== "running") return;
      engine.current.lane = Math.max(
        -1,
        Math.min(1, engine.current.lane + direction),
      ) as Lane;
      publish();
    },
    [publish],
  );

  const jump = useCallback(() => {
    if (
      !engine.current ||
      engine.current.status !== "running" ||
      engine.current.jumpTimer > 0.25 ||
      engine.current.slideTimer > 0.1
    ) {
      return;
    }
    engine.current.jumpTimer = 0.88;
    publish();
  }, [publish]);

  const slide = useCallback(() => {
    if (
      !engine.current ||
      engine.current.status !== "running" ||
      engine.current.jumpTimer > 0.2
    ) {
      return;
    }
    engine.current.slideTimer = 0.62;
    publish();
  }, [publish]);

  useEffect(() => {
    let frameId = 0;
    let lastFrame = 0;
    let publishAccumulator = 0;

    const frame = (now: number) => {
      const delta = lastFrame === 0 ? 0 : Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;

      const state = engine.current;
      if (state) {
        const previousStatus = state.status;
        updateEngine(state, delta);
        if (state.status !== previousStatus) {
          publishAccumulator = 0;
          setSnapshot(toSnapshot(state));
        } else if (state.status === "running") {
          publishAccumulator += delta;
          if (publishAccumulator >= 0.035) {
            publishAccumulator = 0;
            setSnapshot(toSnapshot(state));
          }
        }
      }

      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.code;
      const state = engine.current;
      if (!state) return;

      const isGameKey = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Space",
        "KeyA",
        "KeyD",
        "KeyW",
        "KeyS",
        "KeyP",
        "Escape",
      ].includes(key);
      if (!isGameKey) return;

      event.preventDefault();
      if (event.repeat && key !== "ArrowLeft" && key !== "ArrowRight") return;

      if (key === "Escape" || key === "KeyP") {
        if (state.status === "running") pause();
        else if (state.status === "paused") resume();
        return;
      }

      if (state.status === "ready" || state.status === "over") {
        if (key === "Space" || key === "ArrowUp" || key === "KeyW") start();
        return;
      }

      if (state.status !== "running") return;
      if (key === "ArrowLeft" || key === "KeyA") move(-1);
      else if (key === "ArrowRight" || key === "KeyD") move(1);
      else if (key === "ArrowUp" || key === "KeyW" || key === "Space") jump();
      else if (key === "ArrowDown" || key === "KeyS") slide();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jump, move, pause, resume, slide, start]);

  return { snapshot, start, pause, resume, restart, move, jump, slide };
}