# undertone

AI-powered ambient soundscape generator. Describe any scene and get five looping audio layers you can mix in real time.

**[→ undertone.datumai.com](https://undertone.datumai.com)**

## How it works

1. Describe a scene — a stormy tavern, a moonlit forest, a space station airlock
2. GPT-5 breaks it into 5 distinct environmental sound layers
3. ElevenLabs generates each as a 30-second seamless audio loop
4. All layers play together with individual volume and mute controls

## Privacy

Runs entirely in your browser. API keys are stored locally and requests go directly to OpenAI and ElevenLabs — no backend, no tracking, no accounts. Generated audio is cached in IndexedDB so revisiting a scene costs nothing.

## Export

Hit **Save** to download a self-contained HTML file with all audio embedded. Works offline, no keys required, send it to anyone.

## Setup

You'll need your own API keys from:
- [OpenAI](https://platform.openai.com/api-keys)
- [ElevenLabs](https://elevenlabs.io/app/settings/api-keys)

## Development

```bash
npm install
npm run dev      # dev server with watch
npm run build    # production bundle → dist/bundle.js
npm run deploy   # build + wrangler pages deploy
```

## Stack

- Vanilla TypeScript, no framework
- [esbuild](https://esbuild.github.io/) for bundling
- [Cloudflare Pages](https://pages.cloudflare.com/) for hosting
- IndexedDB for audio caching
- Web Audio API for playback
