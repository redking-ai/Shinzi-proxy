const express = require("express");
const fetch = require("node-fetch");
const yts = require("yt-search"); // Tier 3 Scraper
const youtubeSearchApi = require("youtube-search-api"); // Tier 2 Scraper
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
// 1. SHINZI AI CHATBOT ROUTE
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
// 2. SHINZI MUSIC SEARCH ROUTE (5-TIER WATERFALL)
// ──────────────────────────────────────────────────────────

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://inv.tux.pizza"
];

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.tokhmi.xyz"
];

app.get("/music/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "No search query provided" });

  console.log(`\n🎧 New Music Search Request: "${query}"`);

  // --- TIER 1: Official YouTube API (Primary Sync) ---
  try {
    if (process.env.YOUTUBE_API_KEY) {
      console.log("-> Trying Tier 1: Official YouTube API");
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=20&key=${process.env.YOUTUBE_API_KEY}`;
      const response = await fetch(ytUrl);

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          console.log("✅ Success! Fetched from Tier 1 (Official API).");
          return res.json(data);
        }
      } else {
        console.warn(`-> Tier 1 Failed: Status ${response.status}. Key may be out of quota.`);
      }
    }
  } catch (err) {
    console.error("-> Tier 1 Error:", err.message);
  }

  // --- TIER 2: youtube-search-api (Advanced Internal Engine Scraper) ---
  try {
    console.log("-> Trying Tier 2: youtube-search-api");
    const result = await youtubeSearchApi.GetListByKeyword(query, false, 20);

    if (result && result.items && result.items.length > 0) {
      console.log("✅ Success! Recovered via Tier 2 (youtube-search-api).");
      const mappedData = {
        items: result.items.filter(item => item.type === 'video').map(v => ({
          id: { videoId: v.id },
          snippet: {
            title: v.title,
            channelTitle: v.channelTitle || v.author, // Depends on the specific object structure
            thumbnails: { high: { url: v.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${v.id}/0.jpg` } }
          }
        }))
      };
      return res.json(mappedData);
    }
  } catch (err) {
    console.error("-> Tier 2 Error:", err.message);
  }

  // --- TIER 3: yt-search (Basic HTML Scraper) ---
  try {
    console.log("-> Trying Tier 3: yt-search");
    const r = await yts(query);

    if (r && r.videos.length > 0) {
      console.log("✅ Success! Recovered via Tier 3 (yt-search).");
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
    console.error("-> Tier 3 Error:", err.message);
  }

  // --- TIER 4: Piped API (Public Proxy) ---
  try {
    console.log("-> Trying Tier 4: Piped API");
    const instance = PIPED_INSTANCES[Math.floor(Math.random() * PIPED_INSTANCES.length)];
    const pipedUrl = `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`;

    const response = await fetch(pipedUrl);
    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        console.log("✅ Success! Recovered via Tier 4 (Piped API).");
        const mappedData = {
          items: data.items.slice(0, 20).map(v => ({
            id: { videoId: v.url.replace('/watch?v=', '') },
            snippet: {
              title: v.title,
              channelTitle: v.uploaderName,
              thumbnails: { high: { url: v.thumbnail } }
            }
          }))
        };
        return res.json(mappedData);
      }
    }
  } catch (err) {
    console.error("-> Tier 4 Error:", err.message);
  }

  // --- TIER 5: Invidious API (Final Backup) ---
  try {
    console.log("-> Trying Tier 5: Invidious API");
    const instance = INVIDIOUS_INSTANCES[Math.floor(Math.random() * INVIDIOUS_INSTANCES.length)];
    const invUrl = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;

    const response = await fetch(invUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        console.log("✅ Success! Recovered via Tier 5 (Invidious API).");
        const mappedData = {
          items: data.slice(0, 20).map(v => ({
            id: { videoId: v.videoId },
            snippet: {
              title: v.title,
              channelTitle: v.author,
              thumbnails: { high: { url: v.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${v.videoId}/0.jpg` } }
            }
          }))
        };
        return res.json(mappedData);
      }
    }
  } catch (err) {
    console.error("-> Tier 5 Error:", err.message);
  }

  // Final exit if absolutely everything fails
  console.error("🚨 CRITICAL FAIL: All 5 backend tiers exhausted.");
  return res.status(500).json({ error: "All backend search services are currently busy. Try again soon." });
});

// ──────────────────────────────────────────────────────────
// SERVER START
// ──────────────────────────────────────────────────────────
app.listen(process.env.PORT || 3000, () => {
  console.log("Shinzi Ecosystem Backend running! 5-Tier Waterfall Active.");
});
