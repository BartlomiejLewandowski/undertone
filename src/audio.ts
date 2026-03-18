let audioCtx: AudioContext | null = null;
let gainNodes: GainNode[] = [];
let sourceNodes: (AudioBufferSourceNode | null)[] = [];
let audioBuffers: (AudioBuffer | null)[] = [];
let muteStates: boolean[] = [];
let volValues: number[] = [];
let _isPlaying = false;

export function isPlaying(): boolean { return _isPlaying; }

function getAudioCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

export function setupAudioEngine(numLayers: number): void {
  const ctx = getAudioCtx();
  gainNodes    = [];
  sourceNodes  = new Array(numLayers).fill(null);
  audioBuffers = new Array(numLayers).fill(null);
  muteStates   = new Array(numLayers).fill(false);
  volValues    = new Array(numLayers).fill(0.7);

  for (let i = 0; i < numLayers; i++) {
    const gain = ctx.createGain();
    gain.gain.value = 0.7;
    gain.connect(ctx.destination);
    gainNodes.push(gain);
  }
}

export function setVolume(index: number, value: number): void {
  volValues[index] = value;
  if (!muteStates[index] && gainNodes[index]) {
    gainNodes[index].gain.value = value;
  }
}

export function toggleMute(index: number): boolean {
  muteStates[index] = !muteStates[index];
  if (gainNodes[index]) {
    gainNodes[index].gain.value = muteStates[index] ? 0 : volValues[index];
  }
  return muteStates[index];
}

export async function decodeBuffer(arrayBuffer: ArrayBuffer, index: number): Promise<void> {
  const ctx = getAudioCtx();
  audioBuffers[index] = await ctx.decodeAudioData(arrayBuffer.slice(0));
}

export function startPlayback(): void {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const startTime = ctx.currentTime;
  for (let i = 0; i < audioBuffers.length; i++) {
    if (!audioBuffers[i]) continue;
    const src = ctx.createBufferSource();
    src.buffer = audioBuffers[i];
    src.loop   = true;
    src.connect(gainNodes[i]);
    src.start(startTime);
    sourceNodes[i] = src;
  }
  _isPlaying = true;
}

export function stopPlayback(): void {
  for (const src of sourceNodes) {
    if (src) { try { src.stop(); } catch(e) {} }
  }
  sourceNodes = new Array(sourceNodes.length).fill(null);
  _isPlaying = false;
}

export function resumeContextIfNeeded(): void {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
}
