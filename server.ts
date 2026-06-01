import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PluggyClient } from "pluggy-sdk";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialization check for open finance
  const pluggyClientId = process.env.PLUGGY_CLIENT_ID;
  const pluggyClientSecret = process.env.PLUGGY_CLIENT_SECRET;
  
  let pluggyClient: PluggyClient | null = null;
  if (pluggyClientId && pluggyClientSecret) {
    pluggyClient = new PluggyClient({
      clientId: pluggyClientId,
      clientSecret: pluggyClientSecret,
    });
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Open Finance - Create Connect Token
  app.post("/api/open-finance/token", async (req, res) => {
    try {
      if (!pluggyClient) {
        return res.status(500).json({ 
          error: "Configuração ausente", 
          message: "Para habilitar o Open Finance, configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no painel."
        });
      }

      // We generate a token to initialize the Pluggy Connect Widget
      const data = await pluggyClient.createConnectToken();
      res.json({ accessToken: data.accessToken });
    } catch (error: any) {
      console.error("Open Finance Error:", error);
      res.status(500).json({ error: "Falha ao gerar token de conexão", details: error.message });
    }
  });

  // Open Finance - Fetch Accounts after connection
  // In a real flow, the frontend sends the itemId returned by the Widget
  app.post("/api/open-finance/accounts", async (req, res) => {
    try {
      if (!pluggyClient) {
        return res.status(500).json({ error: "Configuração ausente." });
      }

      const { itemId } = req.body;
      if (!itemId) {
        return res.status(400).json({ error: "Item ID é mandatório." });
      }

      // Fetch accounts connected via that Item
      const accounts = await pluggyClient.fetchAccounts(itemId);
      res.json({ accounts: accounts.results });

    } catch (error: any) {
      console.error("Open Finance Fetch Error:", error);
      res.status(500).json({ error: "Falha ao buscar contas bancárias", details: error.message });
    }
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
