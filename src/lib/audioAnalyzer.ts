export interface AudioSection {
  startMs: number;
  endMs: number;
  intensity: number;
  type: "intro" | "verse" | "build" | "drop" | "break" | "outro";
}

export interface SustainedEvent {
  startMs: number;
  endMs: number;
  type: "sustain" | "vocal_phrase";
  avgEnergy: number;
}

export interface AudioAnalysisResult {
  hash: string;
  durationMs: number;
  estimatedBpm: number;
  energyCurve: { timeMs: number; energy: number }[];
  onsets: number[];
  strongBeats: number[];
  energyPeaks: number[];
  silenceRanges: { startMs: number; endMs: number }[];
  sections: AudioSection[];
  sustainedEvents: SustainedEvent[];
  originalBuffer: ArrayBuffer;
  originalFileName: string;
}

export async function generateSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function analyzeAudioStructure(file: File): Promise<AudioAnalysisResult> {
  const arrayBuffer = await file.arrayBuffer();
  const hash = await generateSHA256(arrayBuffer);
  
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx!();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  
  const durationMs = audioBuffer.duration * 1000;
  
  const analysis = performDeepAnalysis(audioBuffer);
  
  return {
    hash,
    durationMs,
    ...analysis,
    originalBuffer: arrayBuffer,
    originalFileName: file.name
  };
}

// Retro-compatibility wrapper
export async function analyzeAudio(file: File): Promise<AudioAnalysisResult> {
  return analyzeAudioStructure(file);
}

function performDeepAnalysis(audioBuffer: AudioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  const windowSize = 2048; // ~46ms at 44.1kHz
  const windowDurationMs = (windowSize / sampleRate) * 1000;
  const totalWindows = Math.floor(channelData.length / windowSize);
  
  const rmsArray = new Float32Array(totalWindows);
  const fluxArray = new Float32Array(totalWindows);
  
  let maxRms = 0;
  let globalRmsSum = 0;

  // 1. Calculate RMS and Flux (Energy diff)
  for (let i = 0; i < totalWindows; i++) {
    let sumSquares = 0;
    const start = i * windowSize;
    for (let j = 0; j < windowSize; j++) {
      const val = channelData[start + j];
      sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / windowSize);
    rmsArray[i] = rms;
    globalRmsSum += rms;
    if (rms > maxRms) maxRms = rms;

    // Approximate Spectral Flux as positive energy difference
    if (i > 0) {
      fluxArray[i] = Math.max(0, rms - rmsArray[i-1]);
    }
  }

  const avgGlobalRms = globalRmsSum / totalWindows;
  const silenceThreshold = avgGlobalRms * 0.15; // 15% of average energy is considered silence

  const energyCurve: { timeMs: number; energy: number }[] = [];
  
  // Downsample energy curve for UI drawing (e.g. 1 point per 100ms)
  const uiStep = Math.max(1, Math.floor(100 / windowDurationMs));
  for (let i = 0; i < totalWindows; i += uiStep) {
    energyCurve.push({
      timeMs: i * windowDurationMs,
      energy: rmsArray[i] / maxRms
    });
  }

  const onsets: number[] = [];
  const energyPeaks: number[] = [];
  const strongBeats: number[] = [];
  
  // 2. Detect Onsets, Peaks, and Strong Beats
  let maxFlux = 0;
  for (let i = 0; i < totalWindows; i++) if (fluxArray[i] > maxFlux) maxFlux = fluxArray[i];

  let lastOnsetMs = -1000;
  let lastPeakMs = -1000;

  // Usamos uma janela local (sliding window) de ~2 segundos para achar picos.
  // Isso impede que uma explosão de som no meio da música destrua a detecção de batidas no final dela.
  const localWindowRange = Math.floor(2000 / windowDurationMs);

  for (let i = 2; i < totalWindows - 2; i++) {
    const timeMs = i * windowDurationMs;
    const currentRms = rmsArray[i];
    const currentFlux = fluxArray[i];

    let localMaxFlux = 0;
    let localMaxRms = 0;
    const startIdx = Math.max(0, i - localWindowRange);
    const endIdx = Math.min(totalWindows, i + localWindowRange);
    
    for (let j = startIdx; j < endIdx; j++) {
      if (fluxArray[j] > localMaxFlux) localMaxFlux = fluxArray[j];
      if (rmsArray[j] > localMaxRms) localMaxRms = rmsArray[j];
    }

    // O threshold agora se adapta ao volume LOCAL (com um limite mínimo global para ignorar ruídos)
    const onsetThreshold = Math.max(localMaxFlux * 0.20, maxFlux * 0.05);
    const peakThreshold = Math.max(localMaxRms * 0.50, maxRms * 0.15);

    // Detect Onset (Transient)
    if (currentFlux > onsetThreshold && currentFlux > fluxArray[i-1] && currentFlux > fluxArray[i+1]) {
      if (timeMs - lastOnsetMs > 50) { // Min 50ms apart
        onsets.push(timeMs);
        lastOnsetMs = timeMs;
      }
    }

    // Detect Energy Peak (Strong kick/snare)
    if (currentRms > peakThreshold && currentRms > rmsArray[i-1] && currentRms > rmsArray[i+1]) {
      if (timeMs - lastPeakMs > 100) {
        energyPeaks.push(timeMs);
        lastPeakMs = timeMs;
      }
    }
  }

  // 3. Estimate BPM using autocorrelation on onsets/peaks
  let estimatedBpm = 120;
  if (energyPeaks.length > 10) {
    const intervals: Record<number, number> = {};
    for (let i = 1; i < Math.min(400, energyPeaks.length); i++) {
      const diff = energyPeaks[i] - energyPeaks[i-1];
      if (diff > 300 && diff < 1000) { // 60-200 BPM
        const bucket = Math.round(diff / 5) * 5; // 5ms precision
        intervals[bucket] = (intervals[bucket] || 0) + 1;
      }
    }
    
    let maxCount = 0;
    let bestInterval = 500;
    for (const [intervalStr, count] of Object.entries(intervals)) {
      if (count > maxCount) {
        maxCount = count;
        bestInterval = parseInt(intervalStr);
      }
    }
    estimatedBpm = Math.round(60000 / bestInterval);
  }

  // Define Strong Beats aligned with BPM and major energy peaks
  if (energyPeaks.length > 0) {
    const beatInterval = 60000 / estimatedBpm;
    let t = energyPeaks[0];
    const durationMs = audioBuffer.duration * 1000;
    
    while (t < durationMs) {
      // Find the closest real onset/peak to this theoretical beat
      const closestOnset = onsets.find(o => Math.abs(o - t) < 50);
      strongBeats.push(closestOnset || t);
      t += beatInterval;
    }
  }

  // 4. Detect Silence Ranges
  const silenceRanges: { startMs: number; endMs: number }[] = [];
  let inSilence = false;
  let silenceStart = 0;

  for (let i = 0; i < totalWindows; i++) {
    const isQuiet = rmsArray[i] < silenceThreshold;
    const timeMs = i * windowDurationMs;

    if (isQuiet && !inSilence) {
      inSilence = true;
      silenceStart = timeMs;
    } else if (!isQuiet && inSilence) {
      inSilence = false;
      if (timeMs - silenceStart > 1000) { // Minimum 1 second to be considered a real silence/pause
        silenceRanges.push({ startMs: silenceStart, endMs: timeMs });
      }
    }
  }
  if (inSilence && (totalWindows * windowDurationMs) - silenceStart > 1000) {
    silenceRanges.push({ startMs: silenceStart, endMs: totalWindows * windowDurationMs });
  }

  // 5. Detect Sections (2 to 4 seconds blocks)
  const sections: AudioSection[] = [];
  const sectionDurationMs = 4000; // 4 second blocks
  const windowsPerSection = Math.floor(sectionDurationMs / windowDurationMs);
  const totalSections = Math.ceil(totalWindows / windowsPerSection);
  
  let previousIntensity = 0;

  for (let s = 0; s < totalSections; s++) {
    const startIdx = s * windowsPerSection;
    const endIdx = Math.min((s + 1) * windowsPerSection, totalWindows);
    
    let sumRms = 0;
    for (let i = startIdx; i < endIdx; i++) sumRms += rmsArray[i];
    
    const avgRms = sumRms / (endIdx - startIdx);
    
    // Calcula o quão mais alto esse bloco está comparado com a média da música
    const ratioToAvg = avgRms / avgGlobalRms; 
    const intensity = avgRms / maxRms; // Keep intensity 0..1 for JSON
    
    const startMs = startIdx * windowDurationMs;
    const endMs = endIdx * windowDurationMs;
    
    let type: AudioSection["type"] = "verse";
    
    if (ratioToAvg < 0.3) {
      type = "break";
    } else if (s < 3 && ratioToAvg < 0.8) {
      type = "intro";
    } else if (s > totalSections - 3 && ratioToAvg < 0.8) {
      type = "outro";
    } else if (ratioToAvg > 1.35 && avgRms > previousIntensity * maxRms * 1.15) {
      type = "drop"; // Bateu forte e cresceu
    } else if (ratioToAvg > 1.5) {
      type = "drop"; // Absurdamente mais alto que a média = DROP
    } else if (avgRms > previousIntensity * maxRms * 1.1 && ratioToAvg > 0.9) {
      type = "build";
    } else {
      type = "verse";
    }

    // Merge similar contiguous sections if possible, or just push
    if (sections.length > 0 && sections[sections.length - 1].type === type) {
      sections[sections.length - 1].endMs = endMs;
      // update average intensity of merged section
      sections[sections.length - 1].intensity = (sections[sections.length - 1].intensity + intensity) / 2;
    } else {
      sections.push({ startMs, endMs, intensity, type });
    }

    previousIntensity = intensity;
  }

  // 6. Detect Sustained Events (long vocal phrases, synths, held notes)
  // A sustained event is a region where energy is stable (low flux variance) for 300ms+
  const sustainedEvents: SustainedEvent[] = [];
  const sustainWindowMs = 300;
  const sustainWindows = Math.floor(sustainWindowMs / windowDurationMs);
  
  let sustainStart = -1;
  let sustainEnergySum = 0;
  let sustainCount = 0;

  for (let i = sustainWindows; i < totalWindows - sustainWindows; i++) {
    const timeMs = i * windowDurationMs;
    const rms = rmsArray[i];
    
    // Check if this is an active, stable region (low volume change = steady sound)
    const rmsDelta = Math.abs(rms - rmsArray[i - 1]);
    
    // A steady sound is loud enough, but the volume barely changes
    // We use a much stricter threshold (0.05 instead of 0.15) to avoid compressed songs registering as 100% sustain
    const isSteady = rms > silenceThreshold * 2 && rmsDelta < (avgGlobalRms * 0.05);
    
    if (isSteady) {
      if (sustainStart < 0) sustainStart = timeMs;
      sustainEnergySum += rms;
      sustainCount++;
      
      // If a sustain event is dragging on for over 5 seconds, it's a false positive (brickwall mastering)
      // Break it here to prevent infinite snake blocks.
      if (timeMs - sustainStart > 5000) {
        sustainedEvents.push({
          startMs: sustainStart,
          endMs: timeMs,
          type: "sustain",
          avgEnergy: sustainEnergySum / sustainCount / maxRms
        });
        sustainStart = -1;
        sustainEnergySum = 0;
        sustainCount = 0;
      }
    } else {
      if (sustainStart >= 0 && sustainCount >= sustainWindows) {
        const endMs = timeMs;
        const durationMs_local = endMs - sustainStart;
        // Strict bounds for real sustains: between 400ms and 5000ms
        if (durationMs_local >= 400 && durationMs_local <= 5000) { 
          sustainedEvents.push({
            startMs: sustainStart,
            endMs,
            type: durationMs_local > 1500 ? "vocal_phrase" : "sustain",
            avgEnergy: sustainEnergySum / sustainCount / maxRms
          });
        }
      }
      sustainStart = -1;
      sustainEnergySum = 0;
      sustainCount = 0;
    }
  }

  return {
    estimatedBpm,
    energyCurve,
    onsets,
    strongBeats,
    energyPeaks,
    silenceRanges,
    sections,
    sustainedEvents
  };
}
