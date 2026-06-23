import { AudioAnalysisResult } from "./audioAnalyzer";

export interface MapNote {
  Time: number;
  X: number;
  Y: number;
}

export interface GeneratedMap {
  OnlineId: number;
  OnlineStatus: string;
  LegacyId: string;
  SongName: string;
  Mappers: string[];
  Title: string;
  Duration: number;
  Difficulty: number;
  CustomDifficultyName: string;
  StarRating: number;
  Notes: MapNote[];
  AudioFileName?: string;
  ImagePath?: string;
}

export interface AIMapSection {
  startMs: number;
  endMs: number;
  type: string;
  intensity: number;
  densityMultiplier: number;
  patternStyle: string;
  notesStrategy: string;
}

import { createMapPlanClient } from "./aiStreamer";

export interface AIMapPlan {
  sections: AIMapSection[];
  globalStyle: {
    recommendedPatternMix: string[];
    syncPriority: string;
    avoid: string[];
  };
}

export async function createAIMapPlan(
  audioAnalysis: AudioAnalysisResult,
  starRating: number,
  songName: string,
  allowedPatterns: string[] = ["snake", "stairs", "jumps", "bursts", "rotation", "calm_center", "simple_diagonal"],
  apiKey: string,
  onStatusUpdate?: (msg: string) => void
): Promise<AIMapPlan | null> {
  try {
    const plan = await createMapPlanClient(
      songName,
      starRating,
      {
        durationMs: audioAnalysis.durationMs,
        estimatedBpm: audioAnalysis.estimatedBpm,
        totalEnergyPeaks: audioAnalysis.energyPeaks.length,
        totalOnsets: audioAnalysis.onsets.length,
        silenceRanges: audioAnalysis.silenceRanges,
        sustainedEvents: audioAnalysis.sustainedEvents,
        energySummary: audioAnalysis.sections.map(s => ({
          startMs: s.startMs,
          endMs: s.endMs,
          avgEnergy: s.intensity
        }))
      },
      allowedPatterns,
      apiKey,
      (event) => {
        if (event.type === "status" && onStatusUpdate) {
          onStatusUpdate(typeof event.data === "string" ? event.data : "Processando...");
        } else if (event.type === "error" && onStatusUpdate) {
          onStatusUpdate(`Error: ${typeof event.data === "string" ? event.data : "Erro desconhecido"}`);
        }
      }
    );
    return plan as AIMapPlan | null;
  } catch (err) {
    console.error("AI Generation Error:", err);
    if (onStatusUpdate) onStatusUpdate(`Failed: ${err}`);
    return null;
  }
}

function getDifficultyCategory(stars: number): number {
  if (stars <= 2.5) return 1; // Fácil
  if (stars <= 4.5) return 2; // Médio
  if (stars <= 6.5) return 3; // Difícil
  if (stars <= 8.5) return 4; // Expert
  if (stars <= 11.0) return 5; // Insano
  return 6; // Extremo
}

function getDifficultyLabel(stars: number): string {
  if (stars <= 2.5) return "Fácil";
  if (stars <= 4.5) return "Médio";
  if (stars <= 6.5) return "Difícil";
  if (stars <= 8.5) return "Expert";
  if (stars <= 11.0) return "Insano";
  return "Extremo";
}

function getTargetNps(stars: number): number {
  if (stars <= 2.5) return 1 + ((stars - 1) / 1.5) * 1.5;
  if (stars <= 4.5) return 2.5 + ((stars - 2.5) / 2.0) * 2.5;
  if (stars <= 6.5) return 5 + ((stars - 4.5) / 2.0) * 2.5;
  if (stars <= 8.5) return 7.5 + ((stars - 6.5) / 2.0) * 2.5;
  if (stars <= 11.0) return 10 + ((stars - 8.5) / 2.5) * 3;
  return 13 + ((stars - 11.0) / 4.0) * 7;
}

// Grid positions: 0,1,2 for X and Y
const ALL_POSITIONS = [
  {x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0},
  {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1},
  {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}
];

let globalMomentumX = 0;
let globalMomentumY = 0;


function weightedRandom(weights: number[], items: Array<{x: number, y: number}>): {x: number, y: number} {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function distanceScore(a: {x: number, y: number}, b: {x: number, y: number}): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// ───────────────────────────────────────────────────────────────────────────────
// SNAKE PATTERN GENERATOR
// Generates a continuous, smooth trail of notes for sustained events.
// Mimics a mapper tracing a slow mouse path for vocal sustain / synth holds.
// ───────────────────────────────────────────────────────────────────────────────
export interface SnakeNote extends MapNote {
  pattern: "snake";
}

export function generateSnakePattern(
  startMs: number,
  endMs: number,
  startPos: {x: number, y: number},
  stars: number
): SnakeNote[] {
  const notes: SnakeNote[] = [];
  const durationMs = endMs - startMs;

  // Note spacing: 35ms at 15★, 120ms at 1★
  const msPerNote = Math.round(120 - (stars / 15) * 85);
  const numNotes = Math.max(6, Math.floor(durationMs / msPerNote));

  let cx = Math.max(0, Math.min(2, startPos.x));
  let cy = Math.max(0, Math.min(2, startPos.y));

  // Float delta per step (smaller = tighter snake, bigger = wider loops)
  const deltaRange = 0.15 + (stars / 15) * 0.25; // 0.15 at 1★, 0.40 at 15★

  // Continuous direction bias — updated gradually to curve smoothly
  let vx = (Math.random() - 0.5) * deltaRange * 2; // velocity X
  let vy = (Math.random() - 0.5) * deltaRange * 2; // velocity Y
  let curveTimer = 0;
  const curveInterval = Math.floor(3 + Math.random() * 4); // curve every 3–7 steps

  for (let i = 0; i < numNotes; i++) {
    const t = Math.round(startMs + i * msPerNote);
    if (t > endMs) break;

    // Emit note at current float position
    notes.push({ Time: t, X: parseFloat(cx.toFixed(5)), Y: parseFloat(cy.toFixed(5)), pattern: "snake" });

    // Advance position
    curveTimer++;
    if (curveTimer >= curveInterval) {
      // Gentle steering: nudge velocity slightly
      vx += (Math.random() - 0.5) * deltaRange * 0.7;
      vy += (Math.random() - 0.5) * deltaRange * 0.7;
      // Clamp velocity magnitude
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > deltaRange) { vx = (vx / speed) * deltaRange; vy = (vy / speed) * deltaRange; }
      if (speed < deltaRange * 0.3) { vx *= 1.5; vy *= 1.5; } // avoid stalling
      curveTimer = 0;
    }

    let nx = cx + vx;
    let ny = cy + vy;

    // Bounce off walls smoothly (reflect velocity)
    if (nx < 0) { nx = 0; vx = Math.abs(vx); }
    if (nx > 2) { nx = 2; vx = -Math.abs(vx); }
    if (ny < 0) { ny = 0; vy = Math.abs(vy); }
    if (ny > 2) { ny = 2; vy = -Math.abs(vy); }

    cx = nx;
    cy = ny;
  }

  return notes;
}

// ───────────────────────────────────────────────────────────────────────────────
// PATTERN DECISION ENGINE
// Maps musical event type to the correct pattern style.
// This is the "brain" that ensures patterns are musically coherent.
// ───────────────────────────────────────────────────────────────────────────────
type EventType = "sustain" | "vocal_phrase" | "hit" | "build" | "drop" | "break" | "silence";

export function decidePatternFromAudioEvent(
  eventType: EventType,
  sectionType: string,
  intensity: number,
  stars: number,
  allowedPatterns: string[] = ["snake","stairs","jumps","bursts","rotation","calm_center","simple_diagonal"]
): string {
  const allow = (p: string) => allowedPatterns.includes(p) ? p : allowedPatterns[0] || "simple_diagonal";

  // Sustained events = snake, always (if allowed)
  if (eventType === "sustain" || eventType === "vocal_phrase") return allow("snake");

  // Break / silence = calm
  if (eventType === "break" || eventType === "silence") return allow("calm_center");

  // Build ups = stairs
  if (eventType === "build" || sectionType === "build") return allow("stairs");

  // Drop handling by intensity
  if (eventType === "drop" || sectionType === "drop") {
    if (intensity > 0.75) return allow("bursts");
    return allow("jumps");
  }

  // Intro / outro = calm
  if (sectionType === "intro" || sectionType === "outro") return allow("calm_center");

  // Default verse: organic mix weighted by stars, filtered by allowed
  const candidates = [
    ...(stars < 8 ? ["snake", "simple_diagonal"] : []),
    ...(stars >= 4 ? ["rotation", "jumps"] : []),
    ...(stars >= 8 ? ["bursts"] : []),
    "simple_diagonal",
  ].filter(p => allowedPatterns.includes(p));

  if (candidates.length === 0) return allowedPatterns[0] || "simple_diagonal";
  return candidates[Math.floor(Math.random() * candidates.length)];
}


function getSectionPattern(type: string, patternStyle: string, i: number, cx: number, cy: number, priority: number = 2): {x: number, y: number} {
  const prev = {x: cx, y: cy};

  // Event-Driven Micro-Choreography: Force Jumps on Energy Peaks
  if (priority === 1) {
    const candidates = ALL_POSITIONS.filter(p => distanceScore(prev, p) >= 2);
    if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Vocals and Onsets: Force flowing movements instead of static jumps
  if (priority === 3 && patternStyle !== "snake") {
    patternStyle = Math.random() > 0.5 ? "rotation" : "simple_diagonal";
  }

  // Momentum-Based Flow System (reward continuing direction)
  const applyMomentum = (p: {x: number, y: number}, baseWeight: number) => {
    if (globalMomentumX === 0 && globalMomentumY === 0) return baseWeight;
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    const dot = dx * globalMomentumX + dy * globalMomentumY;
    if (dot > 0) return baseWeight * 2.5; // Natural flow arc
    if (dot < 0 && distanceScore(prev, p) < 2) return baseWeight * 0.3; // Penalize robotic zigzag
    return baseWeight;
  };

  if (patternStyle === "bursts") {
    const weights = ALL_POSITIONS.map(p => {
      const d = distanceScore(prev, p);
      const w = d >= 2 ? 3.0 : (d === 1 ? 1.0 : 0.1);
      return applyMomentum(p, w);
    });
    return weightedRandom(weights, ALL_POSITIONS);
  }

  if (patternStyle === "jumps") {
    const candidates = ALL_POSITIONS.filter(p => distanceScore(prev, p) >= 2);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  if (patternStyle === "snake") {
    // Float-precision snake: prefer adjacent positions with small weighted deltas
    const weights = ALL_POSITIONS.map(p => {
      const d = distanceScore(prev, p);
      if (d === 0) return 0.01;
      if (d === 1) return 5.0;
      if (d === 2) return 1.5;
      return 0.3;
    });
    const target = weightedRandom(weights, ALL_POSITIONS);
    // Move only a fraction towards the target for smooth float motion
    const frac = 0.3 + Math.random() * 0.4; // 30-70% of the way
    return {
      x: parseFloat((prev.x + (target.x - prev.x) * frac).toFixed(4)),
      y: parseFloat((prev.y + (target.y - prev.y) * frac).toFixed(4))
    };
  }

  if (patternStyle === "stairs") {
    const weights = ALL_POSITIONS.map(p => {
      const dx = Math.abs(p.x - prev.x);
      const dy = Math.abs(p.y - prev.y);
      let w = 0.5;
      if (dx === 1 && dy === 1) w = 6.0;
      else if (dx === 0 && dy === 0) w = 0.01;
      else if (dx + dy === 2) w = 2.0;
      return applyMomentum(p, w);
    });
    return weightedRandom(weights, ALL_POSITIONS);
  }

  if (patternStyle === "rotation") {
    const weights = ALL_POSITIONS.map(p => {
      if (p.x === 1 && p.y === 1) return 0.1;
      const d = distanceScore(prev, p);
      let w = 0.5;
      if (d === 1) w = 3.0;
      else if (d === 2) w = 2.0;
      return applyMomentum(p, w);
    });
    return weightedRandom(weights, ALL_POSITIONS);
  }

  if (patternStyle === "calm_center") {
    const weights = ALL_POSITIONS.map(p => {
      const dx = Math.abs(p.x - 1);
      const dy = Math.abs(p.y - 1);
      const dist = dx + dy;
      let w = 0.5;
      if (dist === 0) w = 3.0;
      else if (dist === 1) w = 2.0;
      return applyMomentum(p, w);
    });
    return weightedRandom(weights, ALL_POSITIONS);
  }

  if (patternStyle === "simple_diagonal") {
    const weights = ALL_POSITIONS.map(p => {
      let w = 1.0;
      if (p.x === p.y || p.x + p.y === 2) w = 4.0;
      if (p.x === 1 && p.y === 1) w = 0.3;
      return applyMomentum(p, w);
    });
    return weightedRandom(weights, ALL_POSITIONS);
  }

  // LEGACY FALLBACK
  if (type === "drop") return getSectionPattern(type, "bursts", i, cx, cy, priority);
  if (type === "build") return getSectionPattern(type, "stairs", i, cx, cy, priority);
  if (type === "break" || type === "intro" || type === "outro") return getSectionPattern(type, "calm_center", i, cx, cy, priority);

  const r = Math.random();
  if (r < 0.5) return getSectionPattern(type, "snake", i, cx, cy, priority);
  if (r < 0.75) return getSectionPattern(type, "simple_diagonal", i, cx, cy, priority);
  return getSectionPattern(type, "jumps", i, cx, cy, priority);
}

export function generateNotesFromAIPlan(audioData: AudioAnalysisResult, aiPlan: AIMapPlan, stars: number, allowedPatterns?: string[]): MapNote[] {
  const durationMs = audioData.durationMs;
  const targetNps = getTargetNps(stars);
  const targetTotalNotes = Math.floor(targetNps * (durationMs / 1000));
  
  const allNotes: MapNote[] = [];
  const { strongBeats, onsets, energyPeaks, estimatedBpm, silenceRanges, sustainedEvents } = audioData;
  
  // ─────────────────────────────────────────────────
  // PHASE 1: RESERVE SUSTAINED EVENTS AS SNAKE BLOCKS
  // These get priority. Notes inside sustain windows are generated as smooth trails.
  // ─────────────────────────────────────────────────
  const reservedRanges: { startMs: number; endMs: number }[] = [];
  let lastSnakeEndPos: {x: number, y: number} = {x: Math.floor(Math.random() * 3), y: Math.floor(Math.random() * 3)};

  if (sustainedEvents && sustainedEvents.length > 0 && (!allowedPatterns || allowedPatterns.includes("snake"))) {
    for (const evt of sustainedEvents) {
      // Skip if inside silence
      const inSilence = silenceRanges.some(r => evt.startMs >= r.startMs && evt.endMs <= r.endMs);
      if (inSilence) continue;

      const snakeNotes = generateSnakePattern(evt.startMs, evt.endMs, lastSnakeEndPos, stars);
      if (snakeNotes.length >= 4) {
        allNotes.push(...snakeNotes);
        reservedRanges.push({ startMs: evt.startMs - 100, endMs: evt.endMs + 100 });
        lastSnakeEndPos = { x: snakeNotes[snakeNotes.length - 1].X, y: snakeNotes[snakeNotes.length - 1].Y };
      }
    }
  }

  // ─────────────────────────────────────────────────
  // PHASE 2: GENERATE REMAINING NOTES (non-snake sections)
  // ─────────────────────────────────────────────────
  
  // Tag each time with its priority (1 = Highest, 4 = Filler)
  const timeCandidates: { t: number; priority: number }[] = [];
  
  for (const t of energyPeaks) timeCandidates.push({ t, priority: 1 });
  for (const t of strongBeats) timeCandidates.push({ t, priority: 2 });
  for (const t of onsets) timeCandidates.push({ t, priority: 3 });

  // Add subdivisions only if needed for high stars
  if (stars >= 3) {
    const beatInterval = 60000 / estimatedBpm;
    for (let t = 1000; t < durationMs - 1000; t += beatInterval) {
      timeCandidates.push({ t, priority: 4 });
      if (stars > 4) timeCandidates.push({ t: t + beatInterval / 2, priority: 4 });
      if (stars > 8) timeCandidates.push({ t: t + beatInterval / 4, priority: 4 });
      if (stars > 10) timeCandidates.push({ t: t + (beatInterval * 3) / 4, priority: 4 });
      if (stars > 12) {
        timeCandidates.push({ t: t + beatInterval / 8, priority: 5 });
        timeCandidates.push({ t: t + (beatInterval * 7) / 8, priority: 5 });
      }
    }
  }

  // Deduplicate, keeping highest priority (lowest number)
  const uniqueTimes = new Map<number, number>();
  for (const cand of timeCandidates) {
    const tRounded = Math.round(cand.t);
    if (!uniqueTimes.has(tRounded) || cand.priority < uniqueTimes.get(tRounded)!) {
      uniqueTimes.set(tRounded, cand.priority);
    }
  }

  // (sortedCandidates computed below via validCandidates)

  const currentSnakeNotes = allNotes.length;
  let remainingTarget = Math.max(0, targetTotalNotes - currentSnakeNotes);

  // Filter out invalid candidates
  const validCandidates = Array.from(uniqueTimes.entries())
    .map(([t, priority]) => ({ t, priority }))
    .filter(c => {
      if (c.t < 500 || c.t > durationMs - 500) return false;
      const inSilence = silenceRanges.some(r => c.t >= r.startMs + 100 && c.t <= r.endMs - 100);
      if (inSilence) return false;
      const inReserved = reservedRanges.some(r => c.t >= r.startMs && c.t <= r.endMs);
      if (inReserved) return false;
      return true;
    });

  // Sort into priority buckets
  const priorityBuckets: { [p: number]: number[] } = {};
  for (const c of validCandidates) {
    if (!priorityBuckets[c.priority]) priorityBuckets[c.priority] = [];
    priorityBuckets[c.priority].push(c.t);
  }

  const selectedTimes: {t: number, p: number}[] = [];
  const baseMinGapMs = Math.max(40, 200 - (stars * 12)); 

  // Greedy selection by priority (1 = Peaks, 2 = Beats, 3 = Onsets, 4+ = Fillers)
  for (let p = 1; p <= 7; p++) {
    if (!priorityBuckets[p] || remainingTarget <= 0) continue;
    
    // Shuffle bucket to distribute notes evenly if we don't need the whole bucket
    const bucket = priorityBuckets[p].sort(() => Math.random() - 0.5);
    
    for (const t of bucket) {
      if (remainingTarget <= 0) break;
      
      const sec = aiPlan.sections.find(s => t >= s.startMs && t <= s.endMs);
      let intensityMod = sec ? sec.densityMultiplier : 1;
      if (sec?.type === "break") intensityMod *= 0.3;
      else if (sec?.type === "intro" || sec?.type === "outro") intensityMod *= 0.5;
      else if (sec?.type === "drop") intensityMod *= 1.5;

      // Calculate local rhythm speed (how many real audio events happen nearby)
      // This makes the generator automatically speed up during fast vocals or drum fills
      let localEventCount = 0;
      for (const cand of validCandidates) {
        if (cand.priority <= 3 && Math.abs(cand.t - t) < 500) localEventCount++;
      }
      // 4 events per second is normal. Anything higher makes the map faster.
      const rhythmSpeed = Math.max(1, localEventCount / 4);

      // Apply both AI section intensity and the raw audio rhythm speed
      const finalIntensity = intensityMod * rhythmSpeed;

      // Shrink the minimum gap based on the intensity and speed of the track!
      // This guarantees that fast syllables and fast beats are mapped accurately.
      let localMinGap = baseMinGapMs / Math.max(0.1, finalIntensity);
      
      // Enforce an absolute hard limit of 30ms to prevent game engine crashes
      localMinGap = Math.max(30, localMinGap);

      let tooClose = false;
      for (const st of selectedTimes) {
        if (Math.abs(st.t - t) < localMinGap) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        selectedTimes.push({t, p});
        remainingTarget--;
      }
    }
  }

  // Sort selected times chronologically
  const sortedSelected = selectedTimes.sort((a, b) => a.t - b.t);
  
  // Maintain priority tag for the main assignment loop
  const finalNotesWithPriority: {t: number, p: number}[] = [];

  for (const item of sortedSelected) {
    finalNotesWithPriority.push(item);
    
    const sec = aiPlan.sections.find(s => item.t >= s.startMs && item.t <= s.endMs);
    // Double/Triple notes on drops for insane difficulties (only on strong beats)
    if (stars >= 10 && sec?.type === "drop" && item.p <= 2) {
      finalNotesWithPriority.push(item);
      if (stars >= 13) finalNotesWithPriority.push(item);
    }
  }

  let cx = lastSnakeEndPos.x;
  let cy = lastSnakeEndPos.y;
  const usedSpots = new Map<number, Set<string>>();

  // Track pattern usage for debug
  const patternUsage: Record<string, number> = {};

  for (let i = 0; i < finalNotesWithPriority.length; i++) {
    const item = finalNotesWithPriority[i];
    const t = Math.round(item.t);
    const p = item.p;
    const sec = aiPlan.sections.find(s => t >= s.startMs && t <= s.endMs);
    const sectionType = sec ? sec.type : "verse";
    const intensity = sec ? sec.intensity : 0.5;

    // Use AI-provided patternStyle or decide from event, filtered by user's allowed list
    let patternStyle = sec?.patternStyle || decidePatternFromAudioEvent("hit", sectionType, intensity, stars, allowedPatterns);
    
    // If AI says snake but snake not in allowed patterns, re-decide
    if (patternStyle === "snake" && allowedPatterns && !allowedPatterns.includes("snake")) {
      patternStyle = decidePatternFromAudioEvent("hit", sectionType, intensity, stars, allowedPatterns);
    } else if (patternStyle === "snake") {
      // Snake from AI plan - re-decide for non-sustain sections to keep variety
      patternStyle = decidePatternFromAudioEvent("hit", sectionType, intensity, stars, allowedPatterns);
    }

    // Safety net: If it is a DROP, do not allow calm or simple patterns, force a recalculation
    if (sectionType === "drop" && ["simple_diagonal", "calm_center", "snake"].includes(patternStyle)) {
      patternStyle = decidePatternFromAudioEvent("hit", sectionType, intensity, stars, allowedPatterns);
    }

    patternUsage[patternStyle] = (patternUsage[patternStyle] || 0) + 1;
    
    if (!usedSpots.has(t)) usedSpots.set(t, new Set());
    const spotsAtTime = usedSpots.get(t)!;

    const isDouble = i > 0 && finalNotesWithPriority[i].t === finalNotesWithPriority[i-1].t;
    let pos: {x: number, y: number} = {x: cx, y: cy};

    if (isDouble && allNotes.length > 0) {
      // Symmetrical Mirroring for drops
      const prevNote = allNotes[allNotes.length - 1];
      pos = { x: 2 - prevNote.X, y: prevNote.Y }; // Mirror X
      if (spotsAtTime.has(`${pos.x},${pos.y}`)) {
        pos = { x: prevNote.X, y: 2 - prevNote.Y }; // Mirror Y if X blocked
      }
    } else {
      pos = getSectionPattern(sectionType, patternStyle, i, cx, cy, p);
    }
    
    let attempts = 0;
    while (spotsAtTime.has(`${pos.x},${pos.y}`) && attempts < 9) {
      pos = ALL_POSITIONS[Math.floor(Math.random() * ALL_POSITIONS.length)];
      attempts++;
    }
    
    if (spotsAtTime.has(`${pos.x},${pos.y}`)) continue;
    spotsAtTime.add(`${pos.x},${pos.y}`);

    allNotes.push({ Time: t, X: pos.x, Y: pos.y });
    
    // Update Momentum & Position
    if (!isDouble) {
      globalMomentumX = pos.x - cx;
      globalMomentumY = pos.y - cy;
      cx = pos.x;
      cy = pos.y;
    }
  }

  // Add snake notes to pattern usage stats
  patternUsage["snake"] = (patternUsage["snake"] || 0) + currentSnakeNotes;

  return allNotes.sort((a, b) => a.Time - b.Time);
}

export function validateRhythiaMap(map: GeneratedMap): GeneratedMap {
  if (map.Duration < 0) map.Duration = 0;
  
  const validNotes = map.Notes.filter(n => n.Time >= 0 && n.Time <= map.Duration)
    .map(n => ({
      Time: Math.round(n.Time),            // Time MUST be integer
      X: Math.max(0, Math.min(2, n.X)),   // Clamp to [0, 2] but KEEP floats
      Y: Math.max(0, Math.min(2, n.Y))    // Clamp to [0, 2] but KEEP floats
    }))
    .sort((a, b) => a.Time - b.Time);

  map.Notes = validNotes;
  return map;
}

export function generateMap(
  songName: string,
  mapperName: string,
  stars: number,
  audioData?: AudioAnalysisResult,
  aiPlan?: AIMapPlan,
  allowedPatterns?: string[]
): GeneratedMap {
  const durationMs = audioData ? audioData.durationMs : 30000;
  let notes: MapNote[] = [];

  if (aiPlan && audioData) {
    notes = generateNotesFromAIPlan(audioData, aiPlan, stars, allowedPatterns);
  } else if (audioData && audioData.energyCurve) {
    // Legacy procedural generation...
    const { strongBeats, onsets, energyPeaks, estimatedBpm, sections, silenceRanges } = audioData;
    const targetNps = getTargetNps(stars);
    const targetTotalNotes = Math.floor(targetNps * (durationMs / 1000));
    let pool: number[] = [];

    if (stars <= 2.5) {
      pool = [...strongBeats];
    } else if (stars <= 4.5) {
      pool = [...strongBeats, ...onsets.filter((_, i) => i % 3 === 0)];
    } else if (stars <= 6.5) {
      pool = [...strongBeats, ...onsets];
    } else if (stars <= 8.5) {
      pool = [...strongBeats, ...onsets, ...energyPeaks];
    } else {
      pool = [...strongBeats, ...onsets, ...energyPeaks];
    }

    pool = [...new Set(pool.map(t => Math.round(t)))].sort((a, b) => a - b);

    // Smart Overmapping
    const currentUniquePoolSize = new Set(pool.map(Math.round)).size;
    if (currentUniquePoolSize < targetTotalNotes * 0.8) {
      const beatInterval = 60000 / estimatedBpm;
      const subdivisions: number[] = [];
      for (let t = 1000; t < durationMs - 1000; t += beatInterval) {
          subdivisions.push(t);
          if (stars > 4) subdivisions.push(t + beatInterval / 2); // 1/2 beats
          if (stars > 8) subdivisions.push(t + beatInterval / 4); // 1/4 beats
          if (stars > 10) subdivisions.push(t + (beatInterval * 3) / 4); // 3/4 beats
          if (stars > 12) {
               subdivisions.push(t + beatInterval / 8); 
               subdivisions.push(t + (beatInterval * 7) / 8);
          }
      }
      pool = [...pool, ...subdivisions];
    }
    
    pool = [...new Set(pool.map(t => Math.round(t)))].sort((a, b) => a - b);

    const selectionProb = Math.min(1, targetTotalNotes / pool.length);
    const times: number[] = [];
    
    for (const time of pool) {
      if (time < 500 || time > durationMs - 500) continue;
      const inSilence = silenceRanges.some(r => time >= r.startMs + 100 && time <= r.endMs - 100);
      if (inSilence) continue;

      const sec = sections.find(s => time >= s.startMs && time <= s.endMs);
      let intensityMod = 1;
      if (sec) {
        if (sec.type === "drop") intensityMod = 1.5;
        if (sec.type === "build") intensityMod = 1.2;
        if (sec.type === "break") intensityMod = 0.3;
        if (sec.type === "intro" || sec.type === "outro") intensityMod = 0.5;
      }
      
      if (Math.random() < selectionProb * intensityMod) {
        times.push(time);
        if (stars >= 11 && sec?.type === "drop" && energyPeaks.some(p => Math.abs(p - time) < 50)) {
          times.push(time);
          if (stars >= 13) times.push(time);
        }
      }
    }

    let cx = Math.floor(Math.random() * 3);
    let cy = Math.floor(Math.random() * 3);
    const globalSeed = Math.floor(Math.random() * 100);
    const usedSpots = new Map<number, Set<string>>();

    for (let i = 0; i < times.length; i++) {
      const t = Math.round(times[i]);
      const sec = sections?.find(s => t >= s.startMs && t <= s.endMs);
      const type = sec ? sec.type : "verse";
      
      let pos = getSectionPattern(type, "fallback", i, cx, cy, globalSeed);
      
      if (!usedSpots.has(t)) usedSpots.set(t, new Set());
      const spotsAtTime = usedSpots.get(t)!;
      
      let attempts = 0;
      while (spotsAtTime.has(`${pos.x},${pos.y}`) && attempts < 9) {
        pos = {x: Math.floor(Math.random() * 3), y: Math.floor(Math.random() * 3)};
        attempts++;
      }
      
      if (spotsAtTime.has(`${pos.x},${pos.y}`)) continue;
      spotsAtTime.add(`${pos.x},${pos.y}`);

      notes.push({ Time: t, X: pos.x, Y: pos.y });
      cx = pos.x;
      cy = pos.y;
    }
  } else {
    // Procedural Fallback if no audio
    const msPerBeat = 60000 / 140;
    const targetNps = getTargetNps(stars);
    const targetTotalNotes = Math.floor(targetNps * (durationMs / 1000));
    let times: number[] = [];
    for (let t = 1000; t < durationMs - 1000; t += msPerBeat) {
      times.push(t);
      if (stars > 4) times.push(t + msPerBeat / 2);
      if (stars > 8) times.push(t + msPerBeat / 4);
    }
    const selectionProb = Math.min(1, targetTotalNotes / times.length);
    times = times.filter(() => Math.random() < selectionProb);
    
    let cx = Math.floor(Math.random() * 3);
    let cy = Math.floor(Math.random() * 3);
    const globalSeed = Math.floor(Math.random() * 100);
    for (let i = 0; i < times.length; i++) {
      const pos = getSectionPattern("verse", "fallback", i, cx, cy, globalSeed);
      notes.push({ Time: Math.round(times[i]), X: pos.x, Y: pos.y });
      cx = pos.x; cy = pos.y;
    }
  }

  const uniqueHash = Math.random().toString(36).substring(2, 8);
  const legacyId = `${songName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${stars.toFixed(1)}_${uniqueHash}`;
  const diffCategory = getDifficultyCategory(stars);
  const customDiffName = `${getDifficultyLabel(stars)} ${stars.toFixed(1)}★`;

  const baseMap: GeneratedMap = {
    OnlineId: Math.floor(Math.random() * 10000000),
    OnlineStatus: "UNRANKED",
    LegacyId: legacyId,
    SongName: `${songName} [${stars.toFixed(1)}\u2605]`,
    Mappers: [aiPlan ? `${mapperName} & AI` : mapperName],
    Title: `ZZZ AutoMap - ${songName} [${stars.toFixed(1)}\u2605]`,
    Duration: Math.floor(durationMs),
    Difficulty: diffCategory,
    CustomDifficultyName: customDiffName,
    StarRating: stars,
    Notes: notes,
    ImagePath: "/cache/covers/default"
  };

  if (audioData?.hash) {
    baseMap.AudioFileName = `/cache/audio/${audioData.hash}`;
  }

  return validateRhythiaMap(baseMap);
}
