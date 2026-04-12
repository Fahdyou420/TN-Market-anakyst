import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Data paths
  const DATA_DIR = path.join(__dirname, "data");
  const RAW_DIR = path.join(DATA_DIR, "raw");
  const PROCESSED_DIR = path.join(DATA_DIR, "processed");
  const LOGS_DIR = path.join(__dirname, "logs");
  const REPORTS_DIR = path.join(__dirname, "reports", "daily");

  // Ensure directories exist
  const UPLOADS_DIR = path.join(__dirname, "uploads");
  const dirs = [
    DATA_DIR,
    RAW_DIR,
    path.join(RAW_DIR, "bvmt"),
    path.join(RAW_DIR, "cmf"),
    PROCESSED_DIR,
    path.join(PROCESSED_DIR, "embeddings"),
    path.join(PROCESSED_DIR, "signals"),
    LOGS_DIR,
    path.join(__dirname, "reports"),
    REPORTS_DIR,
    UPLOADS_DIR,
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  });
  const upload = multer({ storage });

  const genAI = new (GoogleGenAI as any)(process.env.GEMINI_API_KEY || "");

  // Simple JSON "Truth Store"
  const DB_PATH = path.join(DATA_DIR, "db.json");
  async function getDB() {
    try {
      const data = await fs.readFile(DB_PATH, "utf-8");
      return JSON.parse(data);
    } catch {
      return { 
        bvmt_prices: [], 
        signals: [], 
        cmf_docs: [], 
        market_news: [],
        n8n_analysis: [],
        last_n8n_sync: null
      };
    }
  }

  async function saveDB(data: any) {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  }

  // API Routes
  app.get("/api/market/summary", async (req, res) => {
    const db = await getDB();
    res.json(db);
  });

  // N8N Integration Endpoints
  app.post("/api/n8n/analysis", async (req, res) => {
    try {
      const { analysis, source, type } = req.body;
      const db = await getDB();
      
      const newEntry = {
        id: Date.now().toString(),
        content: analysis,
        source: source || "n8n",
        type: type || "general",
        date: new Date().toISOString()
      };

      db.n8n_analysis = [newEntry, ...(db.n8n_analysis || [])].slice(0, 50);
      db.last_n8n_sync = new Date().toISOString();
      
      await saveDB(db);
      res.json({ status: "success", entry: newEntry });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.get("/api/n8n/config", (req, res) => {
    const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    res.json({
      endpoints: {
        scrape_stocks: `${baseUrl}/api/scrape/bvmt`,
        scrape_cmf: `${baseUrl}/api/scrape/cmf`,
        scrape_news: `${baseUrl}/api/scrape/news`,
        get_data: `${baseUrl}/api/market/summary`,
        push_analysis: `${baseUrl}/api/n8n/analysis`
      },
      instructions: "Use these endpoints in n8n HTTP Request nodes to automate daily scraping and analysis."
    });
  });

  const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  app.post("/api/scrape/bvmt", async (req, res) => {
    try {
      const response = await axios.get("https://www.bvmt.com.tn/fr/entreprises/list", {
        headers: { "User-Agent": USER_AGENT },
        timeout: 10000
      });
      const $ = cheerio.load(response.data);
      
      const prices: any[] = [];
      const rows = $(".views-table tr, table tr").filter((i, el) => $(el).find("td").length > 0);
      
      rows.each((i, el) => {
        const name = $(el).find(".views-field-title, td:nth-child(1)").text().trim();
        const priceText = $(el).find(".views-field-field-cours-cloture, td:nth-child(2)").text().trim().replace(",", ".");
        const price = parseFloat(priceText);
        const variation = $(el).find(".views-field-field-variation, td:nth-child(3)").text().trim();
        
        if (name && !isNaN(price)) {
          prices.push({
            symbol: name,
            price: price,
            variation: variation || "0%",
            segment: "STOCK",
            date: new Date().toISOString(),
          });
        }
      });

      // Scrape SICAV/FCP - Use Tustex as primary (Reliable and Comprehensive)
      try {
        const tustexRes = await axios.get("https://www.tustex.com/sicav", {
          headers: { "User-Agent": USER_AGENT },
          timeout: 15000
        });
        const $tx = cheerio.load(tustexRes.data);
        let found = false;
        
        // Tustex SICAV/FCP table
        $tx("table").first().find("tr").each((i, el) => {
          const cols = $tx(el).find("td");
          if (cols.length >= 6) {
            const name = $tx(cols[0]).text().trim();
            // Handle prices like "5 005,656" or "101,947"
            const priceRaw = $tx(cols[4]).text().trim().replace(/\s/g, "").replace(",", ".");
            const price = parseFloat(priceRaw);
            const variation = $tx(cols[5]).text().trim() || "0%";
            
            if (name && !isNaN(price) && name !== "Désignation") {
              prices.push({
                symbol: name,
                price: price,
                variation: variation,
                segment: "FCP", // Generic segment for funds
                date: new Date().toISOString()
              });
              found = true;
            }
          }
        });
        
        if (!found) throw new Error("No data found on Tustex SICAV page");
      } catch (tustexErr: any) {
        console.error(`Tustex SICAV scrape failed (${tustexErr.message}). Trying BVMT fallback...`);
        try {
          // BVMT fallback
          const bvmtSicavRes = await axios.get("https://www.bvmt.com.tn/fr/marches/opcvm/sicav-fcp", {
            headers: { "User-Agent": USER_AGENT },
            timeout: 10000
          });
          const $sicav = cheerio.load(bvmtSicavRes.data);
          $sicav(".views-table tr, table tr").each((i, el) => {
            const name = $sicav(el).find(".views-field-title, td:nth-child(1)").text().trim();
            const priceText = $sicav(el).find(".views-field-field-valeur-liquidative, td:nth-child(2)").text().trim().replace(",", ".");
            const price = parseFloat(priceText);
            if (name && !isNaN(price)) {
              prices.push({
                symbol: name,
                price: price,
                variation: "0%",
                segment: "FCP",
                date: new Date().toISOString()
              });
            }
          });
        } catch (fallbackErr: any) {
          console.error(`All SICAV fallbacks failed. Last error: ${fallbackErr.message}`);
        }
      }

      const db = await getDB();
      if (prices.length > 0) {
        db.bvmt_prices = prices;
        
        // Generate signals with more logic
        db.signals = prices.map(p => {
          const varVal = parseFloat(p.variation);
          let type = "NEUTRAL";
          if (varVal > 0.5) type = "BULLISH";
          if (varVal < -0.5) type = "BEARISH";
          
          return {
            symbol: p.symbol,
            type: type,
            strength: Math.abs(varVal) > 2 ? "STRONG" : "NORMAL",
            message: `${p.symbol} (${p.segment}) is showing ${p.variation} movement.`,
            date: p.date
          };
        });
      }

      await saveDB(db);
      res.json({ status: "success", count: prices.length });
    } catch (error: any) {
      res.json({ status: "error", message: error.message, source: "BVMT" });
    }
  });

  app.post("/api/scrape/cmf", async (req, res) => {
    try {
      const urls = [
        "https://www.cmf.tn/?q=communiqu-s-des-opc",
        "https://www.cmf.tn/?q=bulletin-officiel",
        "https://www.cmf.tn/?q=valeurs-liquidatives-des-titres-opcvm",
        "https://www.cmf.tn/?q=avis-et-d-cisions-du-cmf",
        "https://www.cmf.tn/?q=informations-des-soci-t-s"
      ];
      
      const allDocs: any[] = [];
      for (const url of urls) {
        try {
          const response = await axios.get(url, { 
            headers: { "User-Agent": USER_AGENT }, 
            timeout: 10000 
          });
          const $ = cheerio.load(response.data);
          
          const sourceName = url.includes("opc") ? "OPC" : url.includes("bulletin") ? "Bulletin Officiel" : url.includes("valeurs") ? "OPCVM Data" : "CMF";
          
          // Try multiple selectors
          $(".views-row, .item-list li, table tr").each((i, el) => {
            const title = $(el).find(".views-field-title, a, td").first().text().trim();
            const link = $(el).find("a").attr("href");
            const date = $(el).find(".views-field-created, .date, td:nth-child(2)").text().trim();
            
            if (title && title.length > 5 && link) {
              allDocs.push({
                title: `[${sourceName}] ${title}`,
                url: link.startsWith("http") ? link : `https://www.cmf.tn${link}`,
                date: date || new Date().toLocaleDateString(),
                source: "CMF",
                category: sourceName
              });
            }
          });
        } catch (e) {
          console.warn(`Failed to scrape CMF URL: ${url}`);
          continue;
        }
      }

      const db = await getDB();
      if (allDocs.length > 0) {
        // Deduplicate by URL
        const uniqueDocs = Array.from(new Map(allDocs.map(item => [item.url, item])).values());
        db.cmf_docs = uniqueDocs.slice(0, 50); // Keep last 50
      }
      await saveDB(db);
      res.json({ status: "success", count: allDocs.length });
    } catch (error: any) {
      res.json({ status: "error", message: error.message, source: "CMF" });
    }
  });

  app.post("/api/scrape/news", async (req, res) => {
    try {
      const urls = [
        "https://www.bvmt.com.tn/fr/actualites",
        "https://www.bvmt.com.tn/fr/communique-de-presse",
        "https://www.bvmt.com.tn/fr/avis-decisions",
        "https://www.bvmt.com.tn/fr/actualites-emetteurs",
        "https://www.bvmt.com.tn/fr/lettres-mensuelles",
        "https://www.bvmt.com.tn/fr/semaines-boursieres",
        "https://www.bvmt.com.tn/fr/physionomie",
        "https://www.bvmt.com.tn/fr/bulletins"
      ];

      const allNews: any[] = [];
      for (const url of urls) {
        try {
          const response = await axios.get(url, { 
            headers: { 
              "User-Agent": USER_AGENT,
              "Accept-Language": "fr-FR,fr;q=0.9"
            }, 
            timeout: 10000 
          });
          const $ = cheerio.load(response.data);
          const category = url.split("/").pop() || "news";

          $(".views-row, .item-list li, table tr").each((i, el) => {
            const title = $(el).find(".views-field-title, a, td").first().text().trim();
            const link = $(el).find("a").attr("href");
            const date = $(el).find(".views-field-created, .date, td:nth-child(2)").text().trim();

            if (title && title.length > 10 && link) {
              allNews.push({
                title,
                url: link.startsWith("http") ? link : `https://www.bvmt.com.tn${link}`,
                date: date || new Date().toLocaleDateString(),
                category: category.replace("-", " "),
                source: "BVMT"
              });
            }
          });
        } catch (e) {
          console.warn(`Failed to scrape news URL: ${url}`);
          continue;
        }
      }

      const db = await getDB();
      if (allNews.length > 0) {
        const uniqueNews = Array.from(new Map(allNews.map(item => [item.url, item])).values());
        db.market_news = uniqueNews.slice(0, 100);
      }
      await saveDB(db);
      res.json({ status: "success", count: allNews.length });
    } catch (error: any) {
      res.json({ status: "error", message: error.message });
    }
  });

  app.post("/api/analyze-doc", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) throw new Error("No file uploaded");
      
      const filePath = req.file.path;
      const fileData = await fs.readFile(filePath);
      const mimeType = req.file.mimetype;
      
      const model = (genAI as any).getGenerativeModel({ model: "gemini-1.5-pro" });
      const prompt = req.body.prompt || "Analyse ce document financier et extrais les informations clés pour le marché tunisien.";
      
      const filePart = {
        inlineData: {
          data: fileData.toString("base64"),
          mimeType
        }
      };

      const result = await model.generateContent([prompt, filePart]);
      const text = result.response.text();

      res.json({ 
        status: "success", 
        filename: req.file.originalname,
        analysis: text
      });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { prompt, context, useOpenRouter } = req.body;
      const openRouterKey = process.env.OPENROUTER_API_KEY;

      if (useOpenRouter && openRouterKey) {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
          model: "google/gemini-pro-1.5",
          messages: [
            { role: "system", content: "Tu es un expert financier tunisien." },
            { role: "user", content: `Contexte: ${context}\n\nQuestion: ${prompt}` }
          ]
        }, {
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
            "X-Title": "Tunisian Market Advisor"
          }
        });
        return res.json({ status: "success", text: response.data.choices[0].message.content });
      }

      // Default to Gemini SDK
      const model = (genAI as any).getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent(`Contexte: ${context}\n\nQuestion: ${prompt}`);
      res.json({ status: "success", text: result.response.text() });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
