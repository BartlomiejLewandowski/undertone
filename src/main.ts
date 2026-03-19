import { initDB } from './db';
import { initMixer } from './mixer';
import { clearDebugLog } from './debug';
import { generate } from './generate';
import { exportScene, exportBtnLabel } from './export';
import { loadHistory } from './history';
import { $, setStatus } from './ui';
import { isPlaying, startPlayback, stopPlayback, resumeContextIfNeeded } from './audio';
import { showPlaybackBar, hidePlaybackBar } from './state';

function openSettings(): void {
  ($('openai-key') as HTMLInputElement).value     = localStorage.getItem('openai_key')     || '';
  ($('elevenlabs-key') as HTMLInputElement).value = localStorage.getItem('elevenlabs_key') || '';
  ($('openai-model') as HTMLInputElement).value       = localStorage.getItem('openai_model')     || '';
  ($('openai-tokens') as HTMLInputElement).value      = localStorage.getItem('openai_tokens')    || '';
  ($('openai-reasoning') as HTMLSelectElement).value  = localStorage.getItem('openai_reasoning') || '';
  ($('openai-reasoning-tokens') as HTMLInputElement).value = localStorage.getItem('openai_reasoning_tokens') || '';
  $('settings-modal').classList.add('open');
}

function closeSettings(): void {
  $('settings-modal').classList.remove('open');
}

// Playback bar
$('play-btn').addEventListener('click', () => {
  resumeContextIfNeeded();
  if (isPlaying()) {
    stopPlayback();
    $('play-btn').textContent = '▶ Play';
    $('play-btn').classList.remove('playing');
  } else {
    startPlayback();
    $('play-btn').textContent = '⏹ Stop';
    $('play-btn').classList.add('playing');
  }
});

// Help
$('help-btn').addEventListener('click', () => $('welcome-modal').classList.add('open'));

// Settings modal
$('settings-btn').addEventListener('click', openSettings);
$('settings-cancel').addEventListener('click', closeSettings);
$('settings-modal').addEventListener('click', e => {
  if (e.target === $('settings-modal')) closeSettings();
});
$('settings-save').addEventListener('click', () => {
  const ak = ($('openai-key') as HTMLInputElement).value.trim();
  const ek = ($('elevenlabs-key') as HTMLInputElement).value.trim();
  const mo = ($('openai-model') as HTMLInputElement).value.trim();
  const tk = ($('openai-tokens') as HTMLInputElement).value.trim();
  if (ak) localStorage.setItem('openai_key', ak);
  if (ek) localStorage.setItem('elevenlabs_key', ek);
  const re = ($('openai-reasoning') as HTMLSelectElement).value;
  if (mo) localStorage.setItem('openai_model', mo); else localStorage.removeItem('openai_model');
  if (tk) localStorage.setItem('openai_tokens', tk); else localStorage.removeItem('openai_tokens');
  if (re) localStorage.setItem('openai_reasoning', re); else localStorage.removeItem('openai_reasoning');
  const rt = ($('openai-reasoning-tokens') as HTMLInputElement).value.trim();
  if (rt) localStorage.setItem('openai_reasoning_tokens', rt); else localStorage.removeItem('openai_reasoning_tokens');
  closeSettings();
  setStatus('Settings saved.');
  setTimeout(() => setStatus(''), 2000);
});

// Export
$('export-btn').textContent = exportBtnLabel();
$('export-btn').addEventListener('click', exportScene);

// Debug panel
$('debug-toggle').addEventListener('click', () => {
  $('debug-log').classList.toggle('open');
});
$('debug-clear').addEventListener('click', e => {
  e.stopPropagation();
  clearDebugLog();
});

// Generate
$('generate-btn').addEventListener('click', generate);
$('scene-input').addEventListener('keydown', (e: Event) => {
  const ke = e as KeyboardEvent;
  if (ke.key === 'Enter' && (ke.ctrlKey || ke.metaKey)) generate();
});

// Mixer
initMixer();

// Welcome modal
$('welcome-start').addEventListener('click', () => {
  localStorage.setItem('ambience_welcomed', '1');
  $('welcome-modal').classList.remove('open');
  if (!localStorage.getItem('openai_key') || !localStorage.getItem('elevenlabs_key')) {
    openSettings();
  }
});

// Init
(async () => {
  try {
    await initDB();
    await loadHistory();
    if (!localStorage.getItem('ambience_welcomed')) {
      $('welcome-modal').classList.add('open');
    } else if (!localStorage.getItem('openai_key') || !localStorage.getItem('elevenlabs_key')) {
      openSettings();
    }
  } catch(e) {
    setStatus('Failed to open local database: ' + (e as Error).message, true);
  }
})();
