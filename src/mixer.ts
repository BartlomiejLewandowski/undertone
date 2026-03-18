import { dbGetAll } from './db';
import { $, escapeHTML } from './ui';

interface StoredLayer {
  key: string;
  label: string;
  sfx_prompt: string;
  audioBlob: Blob;
  createdAt: number;
}

interface StoredScene {
  id: number;
  title: string;
  layerKeys: string[];
}

let mixCtx: AudioContext | null = null;
const gains   = new Map<string, GainNode>();
const sources = new Map<string, AudioBufferSourceNode>();
const buffers = new Map<string, AudioBuffer>();
const enabled = new Set<string>();
const vols    = new Map<string, number>();
let playing   = false;
let allLayers: StoredLayer[] = [];

function getCtx(): AudioContext {
  if (!mixCtx || mixCtx.state === 'closed') {
    mixCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return mixCtx;
}

function updateGain(key: string): void {
  const gain = gains.get(key);
  if (!gain) return;
  gain.gain.value = enabled.has(key) ? (vols.get(key) ?? 0.7) : 0;
}

async function startMix(): Promise<void> {
  const btn = $('mixer-play') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = '… Loading';

  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  for (const layer of allLayers) {
    if (!buffers.has(layer.key)) {
      try {
        const ab = await layer.audioBlob.arrayBuffer();
        buffers.set(layer.key, await ctx.decodeAudioData(ab.slice(0)));
      } catch(e) {
        console.warn('Mixer: failed to decode', layer.label, e);
        continue;
      }
    }
    if (!gains.has(layer.key)) {
      const g = ctx.createGain();
      g.gain.value = enabled.has(layer.key) ? (vols.get(layer.key) ?? 0.7) : 0;
      g.connect(ctx.destination);
      gains.set(layer.key, g);
    }
  }

  const t = ctx.currentTime;
  for (const layer of allLayers) {
    const buf  = buffers.get(layer.key);
    const gain = gains.get(layer.key);
    if (!buf || !gain) continue;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;
    src.connect(gain);
    src.start(t);
    sources.set(layer.key, src);
  }

  playing = true;
  btn.textContent = '⏹ Stop Mix';
  btn.classList.add('playing');
  btn.disabled = false;
}

function stopMix(): void {
  for (const src of sources.values()) { try { src.stop(); } catch(e) {} }
  sources.clear();
  playing = false;
  const btn = $('mixer-play') as HTMLButtonElement;
  btn.textContent = '▶ Play Mix';
  btn.classList.remove('playing');
}

async function togglePlay(): Promise<void> {
  if (playing) stopMix(); else await startMix();
}

function closeMixer(): void {
  stopMix();
  $('mixer-modal').classList.remove('open');
}

async function openMixer(): Promise<void> {
  const list = $('mixer-list');
  list.innerHTML = '<div class="mixer-empty">Loading…</div>';
  $('mixer-modal').classList.add('open');

  const [layers, scenes] = await Promise.all([
    dbGetAll<StoredLayer>('layers'),
    dbGetAll<StoredScene>('scenes'),
  ]);

  const keyToScene = new Map<string, string>();
  for (const scene of scenes) {
    for (const key of scene.layerKeys) {
      if (!keyToScene.has(key)) keyToScene.set(key, scene.title);
    }
  }

  if (!layers.length) {
    list.innerHTML = '<div class="mixer-empty">No clips yet — generate some scenes first.</div>';
    return;
  }

  layers.sort((a, b) => b.createdAt - a.createdAt);
  allLayers = layers;

  // First-time defaults: enabled at 70%
  for (const l of layers) {
    if (!vols.has(l.key)) { vols.set(l.key, 0.7); enabled.add(l.key); }
  }

  list.innerHTML = '';
  for (const layer of layers) {
    const vol = vols.get(layer.key) ?? 0.7;
    const item = document.createElement('div');
    item.className = 'mixer-item';
    item.innerHTML = `
      <input type="checkbox" class="mixer-check" ${enabled.has(layer.key) ? 'checked' : ''}>
      <div class="mixer-item-info">
        <span class="mixer-label">${escapeHTML(layer.label)}</span>
        <span class="mixer-scene">${escapeHTML(keyToScene.get(layer.key) || '—')}</span>
      </div>
      <input type="range" class="vol-slider mixer-vol" min="0" max="100" value="${Math.round(vol * 100)}">
      <span class="vol-label mixer-vol-label">${Math.round(vol * 100)}%</span>
    `;

    const check  = item.querySelector('.mixer-check') as HTMLInputElement;
    const volEl  = item.querySelector('.mixer-vol')   as HTMLInputElement;
    const volLbl = item.querySelector('.mixer-vol-label') as HTMLElement;

    check.addEventListener('change', () => {
      check.checked ? enabled.add(layer.key) : enabled.delete(layer.key);
      if (playing) updateGain(layer.key);
    });

    volEl.addEventListener('input', () => {
      const v = Number(volEl.value) / 100;
      vols.set(layer.key, v);
      volLbl.textContent = `${volEl.value}%`;
      if (playing) updateGain(layer.key);
    });

    list.appendChild(item);
  }

  const btn = $('mixer-play') as HTMLButtonElement;
  btn.textContent = playing ? 'Stop Mix' : 'Play Mix';
  btn.classList.toggle('playing', playing);
  btn.disabled = false;
}

export function initMixer(): void {
  $('mixer-btn').addEventListener('click', openMixer);
  $('mixer-close').addEventListener('click', closeMixer);
  $('mixer-modal').addEventListener('click', e => {
    if (e.target === $('mixer-modal')) closeMixer();
  });
  $('mixer-play').addEventListener('click', togglePlay);
}
