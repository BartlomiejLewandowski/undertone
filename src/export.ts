import { $, setStatus } from './ui';
import { currentScene } from './state';

interface ExportLayer { label: string; sfx_prompt: string; blob: Blob; }
interface ExportScene { title: string; sourceText: string; layers: ExportLayer[]; }

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function buildExportHTML(scene: ExportScene, dataURIs: string[]): string {
  const safeTitle  = scene.title.replace(/</g, '&lt;');
  const safeSource = scene.sourceText.replace(/</g, '&lt;');
  const layerRows  = scene.layers.map((l, i) => `
      <div class="layer-card" id="lc${i}">
        <div class="layer-top">
          <span class="layer-label">${l.label.replace(/</g,'&lt;')}</span>
        </div>
        <div class="layer-controls">
          <button class="mute-btn" id="mb${i}">&#128266;</button>
          <input type="range" class="vol-slider" id="vs${i}" min="0" max="100" value="70">
          <span class="vol-label" id="vl${i}">70%</span>
        </div>
      </div>`).join('');

  const audioDataJSON = JSON.stringify(dataURIs);
  const labelsJSON    = JSON.stringify(scene.layers.map(l => l.label));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle} — Undertone</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0d0c08;--bg2:#161410;--bg3:#1e1c14;--border:#2e2a1c;--accent:#8a9e50;--text:#ece8d8;--text2:#908878;--radius:10px}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;line-height:1.5}
#app{max-width:680px;margin:0 auto;padding:24px 16px 100px}
.logo{font-size:20px;font-weight:700;margin-bottom:4px}.logo span{color:var(--accent)}
.version{font-size:11px;color:var(--text2);margin-bottom:24px}
.scene-title{font-size:22px;font-weight:700;margin-bottom:14px;letter-spacing:-.3px}
.prompt-box{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;font-size:14px;color:var(--text2);line-height:1.6;white-space:pre-wrap;word-break:break-word;margin-bottom:24px}
.prompt-label{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--text2);margin-bottom:6px;opacity:.7}
.layer-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px}
.layer-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.layer-label{font-weight:600;font-size:15px}
.layer-controls{display:flex;align-items:center;gap:12px}
.mute-btn{background:var(--bg3);border:1px solid var(--border);color:var(--text2);border-radius:6px;width:32px;height:32px;font-size:14px;cursor:pointer;flex-shrink:0}
.mute-btn.muted{background:#2a2020;color:#e05b5b;border-color:#e05b5b}
.vol-slider{flex:1;-webkit-appearance:none;height:4px;border-radius:2px;background:var(--border);outline:none;cursor:pointer}
.vol-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--accent);cursor:pointer}
.vol-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:var(--accent);cursor:pointer;border:none}
.vol-label{font-size:12px;color:var(--text2);width:36px;text-align:right;flex-shrink:0}
#bar{position:fixed;bottom:0;left:0;right:0;background:var(--bg2);border-top:1px solid var(--border);padding:14px 16px;display:flex;justify-content:center;align-items:center;gap:16px}
#bar-title{font-size:14px;color:var(--text2);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#playbtn{background:var(--accent);color:#fff;border:none;border-radius:50px;padding:10px 0;width:110px;font-size:15px;font-weight:600;line-height:1;text-align:center;cursor:pointer}
#playbtn.playing{background:#1a1e0a}
#loading{text-align:center;padding:40px 0;color:var(--text2);font-size:14px}
#footer{margin-top:48px;padding-bottom:16px;text-align:center;font-size:13px;color:var(--text2);opacity:.5}
#footer a{color:inherit;text-decoration:none}#footer a:hover{opacity:1;color:var(--text)}
</style>
</head>
<body>
<div id="app">
  <div class="logo"><span>undertone</span></div>
  <div class="version">Exported scene</div>
  <div class="scene-title">${safeTitle}</div>
  <div class="prompt-label">Scene description</div>
  <div class="prompt-box">${safeSource}</div>
  <div id="loading">Decoding audio…</div>
  <div id="layers" style="display:none">${layerRows}</div>
  <div id="footer">made with <a href="https://undertone.datumai.com" target="_blank" rel="noopener noreferrer">undertone</a></div>
</div>
<div id="bar" style="display:none">
  <div id="bar-title">${safeTitle}</div>
  <button id="playbtn">&#9654; Play</button>
</div>
<script>
(async () => {
  const AUDIO  = ${audioDataJSON};
  const LABELS = ${labelsJSON};
  const N = AUDIO.length;

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const gains   = [];
  const muted   = new Array(N).fill(false);
  const vols    = new Array(N).fill(0.7);
  const buffers = [];
  let sources   = [];
  let playing   = false;

  for (let i = 0; i < N; i++) {
    const resp = await fetch(AUDIO[i]);
    const ab   = await resp.arrayBuffer();
    buffers[i] = await ctx.decodeAudioData(ab);
    const g = ctx.createGain();
    g.gain.value = 0.7;
    g.connect(ctx.destination);
    gains.push(g);
  }

  document.getElementById('loading').style.display = 'none';
  document.getElementById('layers').style.display  = 'block';
  document.getElementById('bar').style.display     = 'flex';

  for (let i = 0; i < N; i++) {
    const vs = document.getElementById('vs' + i);
    const vl = document.getElementById('vl' + i);
    const mb = document.getElementById('mb' + i);
    vs.addEventListener('input', () => {
      vols[i] = vs.value / 100;
      vl.textContent = vs.value + '%';
      if (!muted[i]) gains[i].gain.value = vols[i];
    });
    mb.addEventListener('click', () => {
      muted[i] = !muted[i];
      gains[i].gain.value = muted[i] ? 0 : vols[i];
      mb.innerHTML = muted[i] ? '&#128263;' : '&#128266;';
      mb.classList.toggle('muted', muted[i]);
    });
  }

  document.getElementById('playbtn').addEventListener('click', () => {
    if (ctx.state === 'suspended') ctx.resume();
    const btn = document.getElementById('playbtn');
    if (playing) {
      sources.forEach(s => { try { s.stop(); } catch(e) {} });
      sources = [];
      playing = false;
      btn.innerHTML = '&#9654; Play';
      btn.classList.remove('playing');
    } else {
      const t = ctx.currentTime;
      sources = buffers.map((buf, i) => {
        const s = ctx.createBufferSource();
        s.buffer = buf; s.loop = true;
        s.connect(gains[i]); s.start(t);
        return s;
      });
      playing = true;
      btn.innerHTML = '&#9209; Stop';
      btn.classList.add('playing');
    }
  });
})();
<\/script>
</body>
</html>`;
}

export function exportBtnLabel(): string {
  return navigator.maxTouchPoints > 0 ? '⬆ Share' : '⬇ Save';
}

export async function exportScene(): Promise<void> {
  if (!currentScene || !currentScene.layers.length) return;

  const btn = $('export-btn') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = '… Encoding';

  try {
    const dataURIs = await Promise.all(currentScene.layers.map(l => blobToBase64(l.blob)));
    const html     = buildExportHTML(currentScene, dataURIs);
    const file     = new File([html], `${currentScene.title}.html`, { type: 'text/html' });

    const isMobile = navigator.maxTouchPoints > 0;
    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: currentScene.title });
    } else {
      const url = URL.createObjectURL(file);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  } catch(e) {
    if ((e as Error).name !== 'AbortError') setStatus('Export failed: ' + (e as Error).message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = exportBtnLabel();
  }
}
