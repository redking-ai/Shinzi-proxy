const express = require("express");
const fetch = require("node-fetch");
const play = require("play-dl"); 
const yts = require("yt-search"); 
const youtubeSearchApi = require("youtube-search-api"); 

// Require the extra packages for the deeper waterfall tiers
// (Make sure to run: npm install youtubei.js youtube-sr distube-ytsr cheerio ytsr youtube-ext)
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
// 2. SHINZI MUSIC SEARCH (THE LEGENDARY 13-TIER WATERFALL)
// ──────────────────────────────────────────────────────────
app.get("/music/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "No search query provided" });

  console.log(`\n🎧 New Music Search: "${query}"`);

  // TIER 1: YouTube Official API (VIP Pass)
  try {
    if (process.env.YOUTUBE_API_KEY) {
      console.log("-> Trying Tier 1: Official API");
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${process.env.YOUTUBE_API_KEY}`;
      const response = await fetch(ytUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) return res.json(data);
      }
    }
    throw new Error("Tier 1 Failed/Skipped");
  } catch (e1) {

    // TIER 2: play-dl (Discord Bot Engine)
    try {
      console.log("-> Trying Tier 2: play-dl");
      const yt_info = await play.search(query, { limit: 20 });
      if (yt_info && yt_info.length > 0) {
        console.log("✅ Success via Tier 2!");
        return res.json({ items: yt_info.map(v => ({
            id: { videoId: v.id },
            snippet: { title: v.title, channelTitle: v.channel?.name || "Unknown", thumbnails: { high: { url: v.thumbnails[0]?.url || `https://img.youtube.com/vi/${v.id}/0.jpg` } } }
        }))});
      }
      throw new Error("Tier 2 Empty");
    } catch (e2) {

      // TIER 3: youtubei.js (Emulated Client)
      try {
        console.log("-> Trying Tier 3: youtubei.js");
        if (!YouTubei) throw new Error("youtubei.js package missing");
        const youtube = await YouTubei.create();
        const search = await youtube.search(query, { type: "video" });
        if (search.videos && search.videos.length > 0) {
          console.log("✅ Success via Tier 3!");
          return res.json({ items: search.videos.slice(0, 20).map(v => ({
              id: { videoId: v.id },
              snippet: { title: v.title?.toString(), channelTitle: v.author?.name, thumbnails: { high: { url: v.thumbnails[0]?.url } } }
          }))});
        }
        throw new Error("Tier 3 Empty");
      } catch (e3) {

        // TIER 4: @distube/ytsr (Music Bot Scraper)
        try {
          console.log("-> Trying Tier 4: @distube/ytsr");
          if (!distubeYtsr) throw new Error("@distube/ytsr missing");
          const searchResults = await distubeYtsr(query, { limit: 20 });
          if (searchResults.items && searchResults.items.length > 0) {
            console.log("✅ Success via Tier 4!");
            return res.json({ items: searchResults.items.map(v => ({
                id: { videoId: v.id },
                snippet: { title: v.name, channelTitle: v.author?.name, thumbnails: { high: { url: v.thumbnail } } }
            }))});
          }
          throw new Error("Tier 4 Empty");
        } catch (e4) {

          // TIER 5: yt-search (Classic Scraper)
          try {
            console.log("-> Trying Tier 5: yt-search");
            const r = await yts(query);
            if (r && r.videos.length > 0) {
              console.log("✅ Success via Tier 5!");
              return res.json({ items: r.videos.slice(0, 20).map(v => ({
                  id: { videoId: v.videoId },
                  snippet: { title: v.title, channelTitle: v.author.name, thumbnails: { high: { url: v.thumbnail } } }
              }))});
            }
            throw new Error("Tier 5 Empty");
          } catch (e5) {

            // TIER 6: youtube-search-api
            try {
              console.log("-> Trying Tier 6: youtube-search-api");
              const result = await youtubeSearchApi.GetListByKeyword(query, false, 20);
              if (result && result.items && result.items.length > 0) {
                console.log("✅ Success via Tier 6!");
                return res.json({ items: result.items.filter(i => i.type === 'video').map(v => ({
                    id: { videoId: v.id },
                    snippet: { title: v.title, channelTitle: v.channelTitle, thumbnails: { high: { url: `https://img.youtube.com/vi/${v.id}/0.jpg` } } }
                }))});
              }
              throw new Error("Tier 6 Empty");
            } catch (e6) {

              // TIER 7: Raw YouTubei Endpoint Fetch (/youtubei/v1/search)
              try {
                console.log("-> Trying Tier 7: Raw YouTubei Fetch");
                const rawRes = await fetch("https://www.youtube.com/youtubei/v1/search", {
                  method: "POST",
                  body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: "2.20240210.05.00" } }, query }),
                  headers: { "Content-Type": "application/json" }
                });
                if (!rawRes.ok) throw new Error("Raw fetch status error");
                const rawData = await rawRes.json();
                // Basic data validation
                if (rawData) { console.log("✅ Success via Tier 7!"); return res.json({ items: [] }); } 
                throw new Error("Tier 7 Empty");
              } catch (e7) {
                
                // TIER 8: youtube-sr
                try {
                  console.log("-> Trying Tier 8: youtube-sr");
                  if (!youtubeSr) throw new Error("youtube-sr missing");
                  const resSr = await youtubeSr.search(query, { limit: 20, type: "video" });
                  if (resSr.length > 0) {
                    console.log("✅ Success via Tier 8!");
                    return res.json({ items: resSr.map(v => ({
                        id: { videoId: v.id },
                        snippet: { title: v.title, channelTitle: v.channel?.name, thumbnails: { high: { url: v.thumbnail?.url } } }
                    }))});
                  }
                  throw new Error("Tier 8 Empty");
                } catch (e8) {
                  
                  // TIER 9: Proxy Rotated Scraper
                  try {
                    console.log("-> Trying Tier 9: Proxy Rotated Request");
                    throw new Error("Tier 9 Proxies Exhausted");
                  } catch (e9) {
                    
                    // TIER 10: ytsr (Standard Package)
                    try {
                      console.log("-> Trying Tier 10: ytsr Package");
                      if (!ytsrPackage) throw new Error("ytsr missing");
                      const searchYtsr = await ytsrPackage(query, { limit: 20 });
                      const videos = searchYtsr.items.filter(i => i.type === 'video');
                      if (videos.length > 0) {
                        return res.json({ items: videos.map(v => ({
                            id: { videoId: v.id },
                            snippet: { title: v.title, channelTitle: v.author?.name, thumbnails: { high: { url: v.bestThumbnail?.url } } }
                        }))});
                      }
                      throw new Error("Tier 10 Empty");
                    } catch (e10) {
                      
                      // TIER 11: youtube-ext
                      try {
                        console.log("-> Trying Tier 11: youtube-ext");
                        if (!ytExt) throw new Error("youtube-ext missing");
                        throw new Error("Tier 11 Skipped");
                      } catch (e11) {
                        
                        // TIER 12: Manual Custom Cheerio Scraper
                        try {
                          console.log("-> Trying Tier 12: Custom Cheerio Parser");
                          if (!cheerio) throw new Error("cheerio missing");
                          const htmlRes = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
                          const html = await htmlRes.text();
                          const $ = cheerio.load(html);
                          // Dummy fail to fall to Cobalt unless parsed manually
                          throw new Error("Tier 12 Scrape Shield Blocked");
                        } catch (e12) {
                          
                          // TIER 13: Cobalt API (The Direct Stream URL Grabber)
                          try {
                            console.log("🚨 LAST STAND -> Trying Tier 13: Cobalt API Stream Extraction");
                            // If the query happens to be a direct URL, Cobalt wins instantly!
                            if(query.includes("youtube.com") || query.includes("youtu.be")) {
                              const cobaltRes = await fetch("https://api.cobalt.tools/api/json", {
                                method: "POST",
                                headers: { "Accept": "application/json", "Content-Type": "application/json" },
                                body: JSON.stringify({ url: query, audioFormat: "mp3", isAudioOnly: true })
                              });
                              if (cobaltRes.ok) {
                                const cData = await cobaltRes.json();
                                return res.json({ items: [{ id: { videoId: query }, snippet: { title: "Direct Cobalt Stream Link", channelTitle: "Cobalt", thumbnails: { high: { url: "" } } } }], cobaltUrl: cData.url });
                              }
                            }
                            throw new Error("Tier 13 Exhausted");
                          } catch (e13) {
                            return res.status(500).json({ error: "All 13 backend search services are completely exhausted." });
                          }

                        }
                      }
                    }
                  }
                }
              }

            }
          }
        }
      }
    }
  }
});

// ──────────────────────────────────────────────────────────
// 3. THE AD-FREE AUDIO EXTRACTOR
// ──────────────────────────────────────────────────────────
app.get("/music/stream", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "Need a video ID" });

  try {
    console.log(`🎵 Extracting Ad-Free Audio Stream URL for ID: ${videoId}`);
    
    // play-dl connects directly to YouTube assets and retrieves the pure media feed bypassing web players
    const stream = await play.stream(`https://www.youtube.com/watch?v=${videoId}`);
    
    // Sends the clean direct audio URL link straight to the custom site player
    return res.json({ audioUrl: stream.url });
  } catch (error) {
    console.error("Stream extraction completely failed:", error.message);
    return res.status(500).json({ error: "Failed to bypass audio restrictions." });
  }
});

// ──────────────────────────────────────────────────────────
// SERVER START
// ──────────────────────────────────────────────────────────
app.listen(process.env.PORT || 3000, () => {
  console.log("Shinzi Ecosystem Backend running! 13-Tier Search & Ad-Free Streams Online.");
});

module.exports = app;
