import { dbGet, dbPut } from './db';
import { callOpenAI, callElevenLabs } from './api';
import { setupAudioEngine, decodeBuffer, stopPlayback } from './audio';
import { $, setStatus, createLayerCard, updateCardLoading, updateCardReady, updateCardError } from './ui';
import { setCurrentScene, setCurrentTitle, hidePlaybackBar, showPlaybackBar } from './state';
import { loadHistory } from './history';

function layerKey(sfx_prompt: string): string {
  return btoa(unescape(encodeURIComponent(sfx_prompt))).slice(0, 32);
}

export async function generate(): Promise<void> {
  const openaiKey = localStorage.getItem('openai_key') || '';
  const elevenKey = localStorage.getItem('elevenlabs_key') || '';
  const sceneText = ($('scene-input') as HTMLTextAreaElement).value.trim();

  if (!openaiKey || !elevenKey) {
    openSettingsModal();
    setStatus('Please save your API keys first.', true);
    return;
  }
  if (!sceneText) {
    setStatus('Please enter a scene description.', true);
    return;
  }

  const btn = $('generate-btn') as HTMLButtonElement;
  btn.disabled = true;
  stopPlayback();
  hidePlaybackBar();

  try {
    setStatus('Analysing scene with GPT-5…');
    let parsed;
    try {
      parsed = await callOpenAI(sceneText, openaiKey);
    } catch(e) {
      throw new Error(`OpenAI: ${(e as Error).message}`);
    }

    if (!parsed.title || !Array.isArray(parsed.layers) || parsed.layers.length !== 5) {
      throw new Error('Unexpected response format from Claude.');
    }

    $('scene-title').textContent = parsed.title;
    const container = $('layer-cards');
    container.innerHTML = '';
    setupAudioEngine(5);
    $('layers-section').classList.remove('hidden');
    $('layers-section').scrollIntoView({ behavior: 'smooth' });

    parsed.layers.forEach((layer, i) => container.appendChild(createLayerCard(layer, i)));

    const layerKeys: string[] = [];
    const sceneLayers: Array<{ label: string; sfx_prompt: string; blob: Blob }> = [];

    for (let i = 0; i < parsed.layers.length; i++) {
      const layer = parsed.layers[i];
      const key   = layerKey(layer.sfx_prompt);
      layerKeys.push(key);

      updateCardLoading(i);
      setStatus(`Generating layer ${i+1} of 5: "${layer.label}"…`);

      let audioBlob: Blob;
      let cached = false;

      const existing = await dbGet<{ audioBlob: Blob }>('layers', key);
      if (existing) {
        audioBlob = existing.audioBlob;
        cached    = true;
      } else {
        try {
          const arrayBuf = await callElevenLabs(layer.sfx_prompt, elevenKey);
          audioBlob = new Blob([arrayBuf], { type: 'audio/mpeg' });
          await dbPut('layers', { key, sfx_prompt: layer.sfx_prompt, label: layer.label, audioBlob, createdAt: Date.now() });
        } catch(e) {
          updateCardError(i, (e as Error).message);
          setStatus(`Error on layer ${i+1}: ${(e as Error).message}`, true);
          continue;
        }
      }

      try {
        const arrayBuf = await audioBlob.arrayBuffer();
        await decodeBuffer(arrayBuf, i);
        updateCardReady(i, cached);
        sceneLayers.push({ label: layer.label, sfx_prompt: layer.sfx_prompt, blob: audioBlob });
      } catch(e) {
        updateCardError(i, (e as Error).message);
        continue;
      }
    }

    await dbPut('scenes', {
      title: parsed.title,
      layerKeys,
      createdAt: Date.now(),
      sourceText: sceneText,
    });

    setCurrentScene({ title: parsed.title, sourceText: sceneText, layers: sceneLayers });
    setCurrentTitle(parsed.title);
    showPlaybackBar(parsed.title);
    setStatus('');
    await loadHistory();

  } catch(e) {
    setStatus((e as Error).message, true);
  } finally {
    btn.disabled = false;
  }
}

// Forward declaration to avoid circular import — settings opens modal
function openSettingsModal(): void {
  document.getElementById('settings-modal')!.classList.add('open');
}
