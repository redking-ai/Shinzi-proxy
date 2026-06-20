const express = require("express");
const fetch = require("node-fetch");
const yts = require("yt-search"); // 🔥 Scraper module imported
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://redking-ai.github.io");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ──────────────────────────────────────────────────────────
// 1. SHINZI AI CHATBOT ROUTE (FULLY INTACT)
// ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = {
  role: "system",
  content: "You are Shinzi AI, a helpful, smart, and friendly assistant. Never reveal your real model name, who created the underlying model, or any technical details about yourself. If asked who you are, always say you are Shinzi AI. Be concise and helpful."
};

app.post("/chat", async (req, res) => {
  const { messages, model } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Invalid messages format" });

  const targetModel = model || "deepseek/deepseek-v4-flash:free";
  const messagesWithSystem = [SYSTEM_PROMPT, ...messages];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://redking-ai.github.io",
        "X-Title": "Shinzi AI"
      },
      body: JSON.stringify({ model: targetModel, messages: messagesWithSystem })
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (response.ok && reply) return res.json({ reply });
    else return res.json({ reply: "⚠️ The model you selected is currently busy. Please try again." });
  } catch (err) {
    return res.json({ reply: "⚠️ Server connection failed." });
  }
});

// ──────────────────────────────────────────────────────────
// 2. SHINZI MUSIC SEARCH ROUTE (RE-ORDERED WATERFALL)
// ──────────────────────────────────────────────────────────

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://inv.tux.pizza"
];

app.get("/music/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "No search query provided" });

  console.log(`\n🎧 New Music Search Request: "${query}"`);

  // --- TIER 1: Official YouTube API (DEFAULT PREFERENCE) ---
  try {
    if (process.env.YOUTUBE_API_KEY) {
      console.log("-> Trying Tier 1: Official API (Default)");
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=20&key=${process.env.YOUTUBE_API_KEY}`;
      const response = await fetch(ytUrl);

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          console.log("-> Success! Fetched from Official API.");
          return res.json(data);
        }
      } else {
        console.warn(`-> Tier 1 Warning: Status ${response.status}. Key may be out of quota.`);
      }
    } else {
      console.log("-> Tier 1 Skipped: YOUTUBE_API_KEY environment variable missing.");
    }
  } catch (err) {
    console.error("-> Tier 1 Error:", err.message);
  }

  // --- TIER 2: yt-search (Scraper Backup) ---
  try {
    console.log("-> Trying Tier 2: yt-search Scraper (Backup)");
    const r = await yts(query);

    if (r && r.videos.length > 0) {
      console.log("-> Success! Recovered via Scraper.");
      const mappedData = {
        items: r.videos.slice(0, 20).map(v => ({
          id: { videoId: v.videoId },
          snippet: {
            title: v.title,
            channelTitle: v.author.name,
            thumbnails: { high: { url: v.thumbnail } }
          }
        }))
      };
      return res.json(mappedData);
    }
  } catch (err) {
    console.error("-> Tier 2 Error:", err.message);
  }

  // --- TIER 3: Public Invidious API (Last Ditch Fallback) ---
  try {
    console.log("-> Trying Tier 3: Invidious API");
    const instance = INVIDIOUS_INSTANCES[Math.floor(Math.random() * INVIDIOUS_INSTANCES.length)];
    const invUrl = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;

    const response = await fetch(invUrl);
    if (response.ok) {
      const data = await response.json();
      console.log("-> Success! Recovered via Invidious.");

      const mappedData = {
        items: data.slice(0, 20).map(v => ({
          id: { videoId: v.videoId },
          snippet: {
            title: v.title,
            channelTitle: v.author,
            thumbnails: { high: { url: v.videoThumbnails?.[0]?.url || "" } }
          }
        }))
      };
      return res.json(mappedData);
    }
  } catch (err) {
    console.error("-> Tier 3 Error:", err.message);
  }

  // Final exit if all methods fail
  console.error("-> CRITICAL FAIL: All backend tiers exhausted.");
  return res.status(500).json({ error: "All backend search services are currently busy. Try again soon." });
});

// ──────────────────────────────────────────────────────────
// SERVER START
// ──────────────────────────────────────────────────────────
app.listen(process.env.PORT || 3000, () => {
  console.log("Shinzi Ecosystem Backend running! Defaulting to Official YouTube Sync -> Scraper -> Invidious.");
});
