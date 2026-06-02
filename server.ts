import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import { WebSocketServer } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createHttpServer(app);

  app.use(express.json());

  // Wait until API keys exist
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const wss = new WebSocketServer({ server: httpServer, path: '/live' });
  
  wss.on("connection", async (clientWs, req) => {
    // Extract context parameter if any
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    let contextData = url.searchParams.get("context") || "";
    if (contextData) {
      try { contextData = decodeURIComponent(contextData); } catch(e) {}
    }
  
    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio && clientWs.readyState === 1) clientWs.send(JSON.stringify({ audio }));
            if (message.serverContent?.interrupted && clientWs.readyState === 1)
              clientWs.send(JSON.stringify({ interrupted: true }));
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          systemInstruction: "Você é o 'Consultor IA', um especialista financeiro. Seja super conversacional, amigável, não pareça um robô. Fale um pouco informal, parecendo uma pessoa real apoiando seu cliente nas finanças." + (contextData ? `\nContexto do usuário e finanças: ${contextData}` : ""),
        },
      });

      clientWs.on("message", (data) => {
        try {
          const { audio } = JSON.parse(data.toString());
          if (audio) {
            session.sendRealtimeInput({
              audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch(e) {
          console.error("Live ws parse error", e);
        }
      });
      
      clientWs.on("close", () => {
         session.close();
      });
    } catch (err) {
      console.error("Gemini Live API error:", err);
      clientWs.close();
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
