import { $ } from './ui';

export interface Layer { label: string; sfx_prompt: string; blob: Blob; }
export interface Scene { title: string; sourceText: string; layers: Layer[]; }

export let currentScene: Scene | null = null;
export let currentTitle = '';

export function setCurrentScene(s: Scene | null): void { currentScene = s; }
export function setCurrentTitle(t: string): void { currentTitle = t; }

export function showPlaybackBar(title: string): void {
  $('playback-title').textContent = title;
  $('playback-bar').classList.add('visible');
  $('play-btn').textContent = '▶ Play';
  $('play-btn').classList.remove('playing');
}

export function hidePlaybackBar(): void {
  $('playback-bar').classList.remove('visible');
}
