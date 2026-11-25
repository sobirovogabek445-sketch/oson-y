import 'dotenv/config';
import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import {GoogleGenAI} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function normalizeAudioMimeType(rawMimeType: string | undefined): string {
  if (!rawMimeType) return 'audio/webm';
  const base = rawMimeType.split(';')[0]?.trim().toLowerCase();
  if (
    base === 'audio/webm' ||
    base === 'audio/mp4' ||
    base === 'audio/mpeg' ||
    base === 'audio/mp3' ||
    base === 'audio/ogg' ||
    base === 'audio/wav' ||
    base === 'audio/aac' ||
    base === 'audio/flac'
  ) {
    return base;
  }
  return 'audio/webm';
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '12mb'}));

  app.post('/api/transcribe', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error:
            "Ovozni aniqlash xizmati sozlanmagan. Iltimos, Settings > Secrets bo'limida GEMINI_API_KEY ni tekshiring.",
        });
        return;
      }

      const {audioBase64, mimeType} = req.body as {
        audioBase64?: string;
        mimeType?: string;
      };

      if (!audioBase64 || typeof audioBase64 !== 'string') {
        res.status(400).json({error: "Audio ma'lumoti topilmadi."});
        return;
      }

      const cleanMimeType = normalizeAudioMimeType(mimeType);

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: audioBase64,
              },
            },
            {
              text: "Transcribe the spoken place search query accurately in Uzbek (Latin script), Russian, or English exactly as spoken. Return ONLY the clean transcribed search phrase with no quotes, no trailing period, and no extra commentary. If the audio is silent or unintelligible, return an empty string.",
            },
          ],
        },
      });

      const text = (response.text ?? '').trim().replace(/^["'«»]+|["'«»]+$/g, '');
      res.json({text});
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Audio transcription failed';
      console.error('Transcription error:', message);

      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error:
            "Ovozni matnga aylantirish limiti tugadi. Birozdan so'ng qayta urinib ko'ring.",
        });
        return;
      }

      if (
        message.includes('403') ||
        message.includes('PERMISSION_DENIED') ||
        message.includes('API_KEY_INVALID')
      ) {
        res.status(403).json({
          error:
            "Gemini API kaliti yaroqsiz yoki ruxsat etilmagan. Settings > Secrets bo'limini tekshiring.",
        });
        return;
      }

      res.status(500).json({
        error: "Ovozni tushunib bo'lmadi. Qayta urinib ko'ring.",
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`oson.Y server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
