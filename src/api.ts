import { OPENAI_MODEL, SYSTEM_PROMPT } from './constants';
import { dbgLog } from './debug';

export interface SceneResponse {
  title: string;
  layers: Array<{ label: string; sfx_prompt: string }>;
}

export async function callOpenAI(sceneText: string, openaiKey: string): Promise<SceneResponse> {
  dbgLog('info', `OpenAI → POST chat/completions (model: ${OPENAI_MODEL})`);
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: 3000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: sceneText },
      ],
    }),
  });

  dbgLog('info', `OpenAI ← HTTP ${resp.status} ${resp.statusText}`);

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { error?: { message?: string } };
    dbgLog('error', 'OpenAI error body', err);
    throw new Error(`OpenAI error ${resp.status}: ${err?.error?.message || resp.statusText}`);
  }

  const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
  dbgLog('ok', 'OpenAI raw response', data);

  const raw = data.choices?.[0]?.message?.content ?? '';
  dbgLog('info', 'OpenAI content string', raw);

  if (!raw) throw new Error('OpenAI returned empty content.');

  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  dbgLog('info', 'Cleaned JSON string', cleaned);

  const parsed = JSON.parse(cleaned) as SceneResponse;
  dbgLog('ok', 'JSON parsed successfully', parsed);
  return parsed;
}

export async function callElevenLabs(sfx_prompt: string, elevenKey: string): Promise<ArrayBuffer> {
  dbgLog('info', `ElevenLabs → sound-generation`, { text: sfx_prompt.slice(0, 80) + '…' });
  const resp = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': elevenKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      text: sfx_prompt,
      duration_seconds: 30,
      prompt_influence: 0.7,
    }),
  });

  dbgLog('info', `ElevenLabs ← HTTP ${resp.status} ${resp.statusText}, content-type: ${resp.headers.get('content-type')}`);

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { detail?: { message?: string } | string };
    dbgLog('error', 'ElevenLabs error body', err);
    const msg = typeof err.detail === 'object' ? err.detail?.message : err.detail;
    throw new Error(`ElevenLabs error ${resp.status}: ${msg || resp.statusText}`);
  }

  const buf = await resp.arrayBuffer();
  dbgLog('ok', `ElevenLabs audio received — ${(buf.byteLength / 1024).toFixed(1)} KB`);
  return buf;
}
