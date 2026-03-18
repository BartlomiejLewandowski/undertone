import { setVolume, toggleMute } from './audio';

export const $ = (id: string): HTMLElement => document.getElementById(id)!;

export function setStatus(msg: string, isError = false): void {
  const bar = $('status-bar');
  bar.textContent = msg;
  bar.className = isError ? 'error' : '';
}

export function escapeHTML(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
         ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function createLayerCard(layer: { label: string }, index: number): HTMLElement {
  const card = document.createElement('div');
  card.className = 'layer-card';
  card.id = `layer-card-${index}`;
  card.innerHTML = `
    <div class="layer-top">
      <span class="layer-label">${escapeHTML(layer.label)}</span>
      <span class="layer-badge badge-waiting" id="badge-${index}">Waiting</span>
    </div>
    <div class="layer-controls" id="controls-${index}" style="display:none">
      <button class="mute-btn" id="mute-${index}" title="Mute">🔊</button>
      <input type="range" class="vol-slider" id="vol-${index}"
             min="0" max="100" value="70">
      <span class="vol-label" id="vol-label-${index}">70%</span>
    </div>
  `;

  setTimeout(() => {
    const volEl  = document.getElementById(`vol-${index}`) as HTMLInputElement | null;
    const lblEl  = document.getElementById(`vol-label-${index}`);
    const muteEl = document.getElementById(`mute-${index}`);

    if (volEl && lblEl) {
      volEl.addEventListener('input', () => {
        const v = Number(volEl.value) / 100;
        lblEl.textContent = `${volEl.value}%`;
        setVolume(index, v);
      });
    }

    if (muteEl) {
      muteEl.addEventListener('click', () => {
        const muted = toggleMute(index);
        muteEl.textContent = muted ? '🔇' : '🔊';
        muteEl.classList.toggle('muted', muted);
      });
    }
  }, 0);

  return card;
}

export function updateCardLoading(index: number): void {
  const card  = $(`layer-card-${index}`);
  const badge = $(`badge-${index}`);
  card.className  = 'layer-card loading';
  badge.outerHTML = `<span class="layer-badge badge-loading" id="badge-${index}"><span class="spinner"></span>Generating…</span>`;
}

export function updateCardReady(index: number, cached = false): void {
  const card  = $(`layer-card-${index}`);
  const badge = $(`badge-${index}`);
  const ctrl  = $(`controls-${index}`);
  card.className  = cached ? 'layer-card cached' : 'layer-card ready';
  badge.outerHTML = cached
    ? `<span class="layer-badge badge-cached" id="badge-${index}">✓ Cached</span>`
    : `<span class="layer-badge badge-ready"  id="badge-${index}">✓ Ready</span>`;
  (ctrl as HTMLElement).style.display = 'flex';
}

export function updateCardError(index: number, msg: string): void {
  const card  = $(`layer-card-${index}`);
  const badge = $(`badge-${index}`);
  card.className  = 'layer-card errored';
  badge.outerHTML = `<span class="layer-badge badge-error" id="badge-${index}">Error</span>`;
  console.error(`Layer ${index} error:`, msg);
}
