const express = require("express");
const fetch = require("node-fetch");
const play = require("play-dl");
const yts = require("yt-search");
const youtubeSearchApi = require("youtube-search-api");

// Load the deep-tier fallback packages if they are installed
let YouTubei, youtubeSr, distubeYtsr, cheerio, ytsrPackage, ytExt;
try { YouTubei = require("youtubei.js").Innertube; } catch(e){}
try { youtubeSr = require("youtube-sr").default; } catch(e){}
try { distubeYtsr = require("@distube/ytsr"); } catch(e){}
try { cheerio = require("cheerio"); } catch(e){}
try { ytsrPackage = require("ytsr"); } catch(e){}
try { ytExt = require("youtube-ext"); } catch(e){}

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
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
// 2. SHINZI MUSIC SEARCH (13-TIER MEGA-RACE)
// ──────────────────────────────────────────────────────────
app.get("/music/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "No search query provided" });

  console.log(`\n🎧 13-TIER MEGA-RACE Search: "${query}"`);

  const racers = [];

  // TIER 1: YouTube Official API (VIP Pass)
  if (process.env.YOUTUBE_API_KEY) {
    racers.push(fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${process.env.YOUTUBE_API_KEY}`)
      .then(res => res.json())
      .then(data => { if (!data.items || data.items.length === 0) throw new Error(); return data; })
    );
  }

  // TIER 2: play-dl (Discord Bot Engine)
  racers.push(play.search(query, { limit: 20 }).then(data => {
    if (!data || data.length === 0) throw new Error();
    return { items: data.map(v => ({ id: { videoId: v.id }, snippet: { title: v.title, channelTitle: v.channel?.name || "Unknown", thumbnails: { high: { url: v.thumbnails[0]?.url || `https://img.youtube.com/vi/${v.id}/0.jpg` } } } }))};
  }));

  // TIER 3: youtubei.js (Emulated Client)
  if (YouTubei) {
    racers.push(YouTubei.create().then(yt => yt.search(query, { type: "video" })).then(search => {
      if (!search.videos || search.videos.length === 0) throw new Error();
      return { items: search.videos.slice(0, 20).map(v => ({ id: { videoId: v.id }, snippet: { title: v.title?.toString(), channelTitle: v.author?.name, thumbnails: { high: { url: v.thumbnails[0]?.url } } } }))};
    }));
  }

  // TIER 4: @distube/ytsr
  if (distubeYtsr) {
    racers.push(distubeYtsr(query, { limit: 20 }).then(data => {
      if (!data.items || data.items.length === 0) throw new Error();
      return { items: data.items.map(v => ({ id: { videoId: v.id }, snippet: { title: v.name, channelTitle: v.author?.name, thumbnails: { high: { url: v.thumbnail } } } }))};
    }));
  }

  // TIER 5: yt-search
  racers.push(yts(query).then(data => {
    if (!data || data.videos.length === 0) throw new Error();
    return { items: data.videos.slice(0, 20).map(v => ({ id: { videoId: v.videoId }, snippet: { title: v.title, channelTitle: v.author.name, thumbnails: { high: { url: v.thumbnail } } } }))};
  }));

  // TIER 6: youtube-search-api
  racers.push(youtubeSearchApi.GetListByKeyword(query, false, 20).then(data => {
    if (!data.items || data.items.length === 0) throw new Error();
    return { items: data.items.filter(i => i.type === 'video').map(v => ({ id: { videoId: v.id }, snippet: { title: v.title, channelTitle: v.channelTitle, thumbnails: { high: { url: `https://img.youtube.com/vi/${v.id}/0.jpg` } } } }))};
  }));

  // TIER 7: Raw YouTubei Endpoint Fetch
  racers.push(fetch("https://www.youtube.com/youtubei/v1/search", {
    method: "POST", body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: "2.20240210.05.00" } }, query }), headers: { "Content-Type": "application/json" }
  }).then(res => { if(!res.ok) throw new Error(); return res.json(); }).then(data => { if(!data) throw new Error(); return { items: [] }; })); // Basic map fallback

  // TIER 8: youtube-sr
  if (youtubeSr) {
    racers.push(youtubeSr.search(query, { limit: 20, type: "video" }).then(resSr => {
      if (resSr.length === 0) throw new Error();
      return { items: resSr.map(v => ({ id: { videoId: v.id }, snippet: { title: v.title, channelTitle: v.channel?.name, thumbnails: { high: { url: v.thumbnail?.url } } } }))};
    }));
  }

  // TIER 9: Proxy Rotated Scraper (Placeholder for future API)
  racers.push(new Promise((_, reject) => reject("Proxy skipped")));

  // TIER 10: ytsr Package
  if (ytsrPackage) {
    racers.push(ytsrPackage(query, { limit: 20 }).then(data => {
      const videos = data.items.filter(i => i.type === 'video');
      if (videos.length === 0) throw new Error();
      return { items: videos.map(v => ({ id: { videoId: v.id }, snippet: { title: v.title, channelTitle: v.author?.name, thumbnails: { high: { url: v.bestThumbnail?.url } } } }))};
    }));
  }

  // TIER 11: youtube-ext
  racers.push(new Promise((_, reject) => reject("youtube-ext skipped")));

  // TIER 12: Manual Cheerio Scraper
  if (cheerio) {
    racers.push(fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`).then(res => res.text()).then(html => {
      if(!html) throw new Error(); return { items: [] };
    }));
  }

  // TIER 13: Cobalt API (Direct URL Stream Link)
  if (query.includes("youtube.com") || query.includes("youtu.be")) {
    racers.push(fetch("https://api.cobalt.tools/api/json", {
      method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ url: query, audioFormat: "mp3", isAudioOnly: true })
    }).then(res => res.json()).then(data => {
      if(!data.url) throw new Error();
      return { items: [{ id: { videoId: query }, snippet: { title: "Direct Stream", channelTitle: "Cobalt", thumbnails: { high: { url: "" } } } }], cobaltUrl: data.url };
    }));
  }

  try {
    // 🏁 The Race Begins! First one to successfully load the JSON wins!
    const fastestResult = await Promise.any(racers);
    console.log("✅ Mega-Race Success! Fastest tier delivered the data.");
    return res.json(fastestResult);
  } catch (error) {
    console.error("🚨 CRITICAL: All 13 engines failed or were blocked by Vercel's IP.");
    return res.status(500).json({ error: "All backend search services are currently busy." });
  }
});

// ──────────────────────────────────────────────────────────
// 3. THE AD-FREE AUDIO EXTRACTOR
// ──────────────────────────────────────────────────────────
app.get("/music/stream", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "Need a video ID" });

  try {
    console.log(`🎵 Extracting Ad-Free Audio for: ${videoId}`);
    const stream = await play.stream(`https://www.youtube.com/watch?v=${videoId}`);
    
    return res.json({ audioUrl: stream.url });
  } catch (error) {
    console.error("Stream extraction failed:", error.message);
    return res.status(500).json({ error: "Failed to extract audio." });
  }
});

// ──────────────────────────────────────────────────────────
// SERVER START
// ──────────────────────────────────────────────────────────
app.listen(process.env.PORT || 3000, () => {
  console.log("Shinzi Ecosystem Backend running! 13-Tier Mega-Race Active.");
});

module.exports = app;
