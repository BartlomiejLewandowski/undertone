import { dbGet, dbGetAll } from './db';
import { setupAudioEngine, decodeBuffer } from './audio';
import { $, setStatus, escapeHTML, formatDate, createLayerCard, updateCardLoading, updateCardReady, updateCardError } from './ui';
import { setCurrentScene, setCurrentTitle, showPlaybackBar } from './state';

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
  sourceText: string;
  layerKeys: string[];
  createdAt: number;
}

export async function loadHistory(): Promise<void> {
  const scenes = await dbGetAll<StoredScene>('scenes');
  scenes.sort((a, b) => b.createdAt - a.createdAt);
  renderHistory(scenes);
}

function renderHistory(scenes: StoredScene[]): void {
  const list = $('history-list');
  if (!scenes.length) {
    list.innerHTML = '<div id="no-history">No scenes yet — generate one above!</div>';
    return;
  }
  list.innerHTML = scenes.map(s => `
    <div class="history-item" data-id="${s.id}">
      <div class="history-title">${escapeHTML(s.title)}</div>
      <div class="history-meta">${formatDate(s.createdAt)} · ${s.layerKeys.length} layers</div>
    </div>
  `).join('');

  list.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => loadScene(Number((el as HTMLElement).dataset.id)));
  });
}

export async function loadScene(sceneId: number): Promise<void> {
  const scene = await dbGet<StoredScene>('scenes', sceneId);
  if (!scene) return;

  setStatus('Loading from cache…');
  ($('scene-input') as HTMLTextAreaElement).value = scene.sourceText || '';

  const layers = await Promise.all(scene.layerKeys.map(k => dbGet<StoredLayer>('layers', k)));
  if (layers.some(l => !l)) {
    setStatus('Some layers missing from cache.', true);
    return;
  }

  $('scene-title').textContent = scene.title;
  const container = $('layer-cards');
  container.innerHTML = '';
  setupAudioEngine(layers.length);
  $('layers-section').classList.remove('hidden');

  const sceneLayers: Array<{ label: string; sfx_prompt: string; blob: Blob }> = [];

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]!;
    const card  = createLayerCard(layer, i);
    container.appendChild(card);
    updateCardLoading(i);

    try {
      const arrayBuf = await layer.audioBlob.arrayBuffer();
      await decodeBuffer(arrayBuf, i);
      updateCardReady(i, true);
      sceneLayers.push({ label: layer.label, sfx_prompt: layer.sfx_prompt, blob: layer.audioBlob });
    } catch(e) {
      updateCardError(i, (e as Error).message);
    }
  }

  setCurrentScene({ title: scene.title, sourceText: scene.sourceText || '', layers: sceneLayers });
  setCurrentTitle(scene.title);
  showPlaybackBar(scene.title);
  setStatus('');
  $('layers-section').scrollIntoView({ behavior: 'smooth' });
}
