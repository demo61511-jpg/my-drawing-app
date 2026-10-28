import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize GoogleGenAI SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Static route to serve the built APK directly
app.use('/APK_DOWNLOAD', express.static(path.resolve(process.cwd(), 'APK_DOWNLOAD')));
app.get('/api/download-apk', (_req, res) => {
  const apkPath = path.resolve(process.cwd(), 'APK_DOWNLOAD', 'app-debug.apk');
  res.download(apkPath, 'ArtFlow-debug.apk');
});

// Gemini Multi-Turn Chat Endpoint
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, systemInstruction, model = 'gemini-3.8-flash' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Supported models as requested
    const validModel = ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'].includes(model)
      ? model
      : 'gemini-3.8-flash';

    const response = await ai.models.generateContent({
      model: validModel,
      contents: messages,
      config: {
        systemInstruction: systemInstruction || 'You are ArtFlow Mentor, a digital art instructor and creative mentor helping artists with composition, color theory, anatomy, and brush techniques.',
      },
    });

    res.json({ text: response.text || '' });
  } catch (err: any) {
    console.error('Gemini Chat API Error:', err);
    res.status(500).json({ error: err.message || 'Error processing chat request' });
  }
});

// Gemini High-Quality Image Generation Endpoint
// Requested: model gemini-3-pro-image-preview with 1K, 2K, 4K imageSize affordance
app.post('/api/gemini/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1', imageSize = '1K', model = 'gemini-3-pro-image' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Validate imageSize (1K, 2K, 4K)
    const validSize = ['1K', '2K', '4K'].includes(imageSize) ? imageSize : '1K';
    const validRatio = ['1:1', '3:4', '4:3', '9:16', '16:9'].includes(aspectRatio) ? aspectRatio : '1:1';

    let response;
    try {
      // First attempt with gemini-3-pro-image (or nano banana / flash lite fallback if needed)
      response = await ai.models.generateContent({
        model: 'gemini-3-pro-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: validRatio,
            imageSize: validSize,
          },
        },
      });
    } catch (primaryErr: any) {
      console.warn('Primary model generateContent error, trying flash-lite fallback:', primaryErr?.message);
      // Fallback for general availability
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: validRatio,
          },
        },
      });
    }

    let imageUrl = '';
    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image was returned by Gemini' });
    }

    res.json({ imageUrl, imageSize: validSize, aspectRatio: validRatio });
  } catch (err: any) {
    console.error('Gemini Image Generation API Error:', err);
    res.status(500).json({ error: err.message || 'Error generating image' });
  }
});

// Vite Dev Server / Production Static Serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`ArtFlow Server running on port ${PORT}`);
  });
}

startServer();
