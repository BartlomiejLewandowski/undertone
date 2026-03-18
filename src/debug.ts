let debugCount = 0;

export function dbgLog(level: string, label: string, detail: unknown = null): void {
  const log = document.getElementById('debug-log')!;
  const now = new Date().toLocaleTimeString(undefined, { hour12: false });
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">${now}</span><span class="log-${level}">${escapeForLog(label)}</span>`;
  if (detail !== null) {
    const raw = document.createElement('div');
    raw.className = 'log-raw';
    raw.textContent = typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2);
    entry.appendChild(raw);
  }
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
  debugCount++;
  document.getElementById('debug-count')!.textContent = `(${debugCount})`;
  console.log(`[ambience ${level}]`, label, detail ?? '');
}

export function clearDebugLog(): void {
  const log = document.getElementById('debug-log')!;
  [...log.querySelectorAll('.log-entry')].forEach(el => el.remove());
  debugCount = 0;
  document.getElementById('debug-count')!.textContent = '';
}

function escapeForLog(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
