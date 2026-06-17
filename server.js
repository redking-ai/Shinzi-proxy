const express = require("express");
const fetch = require("node-fetch");
const app = express();

// 🔥 FIXED: Raised the limit from 100kb to 50mb so big image strings can pass through
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
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  // 100% STRICT ROUTING: Only use the exact model selected from the dropdown
  const targetModel = model || "deepseek/deepseek-v4-flash:free";
  const messagesWithSystem = [SYSTEM_PROMPT, ...messages];

  try {
    console.log(`STRICT MODE: Attempting OpenRouter request with exactly: ${targetModel}`);

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

    // If successful, send the reply normally
    if (response.ok && reply) {
      console.log(`Success! EXACT model ${targetModel} replied.`);
      return res.json({ reply });
    } else {
      // Send the error text disguised as a normal successful AI reply
      console.error(`Model ${targetModel} failed or is busy. Details:`, data);
      return res.json({ reply: "⚠️ The model you selected is currently busy or offline. Please try again or select a different model from the menu." });
    }

  } catch (err) {
    console.error(`Connection error targeting model ${targetModel}:`, err.message);
    return res.json({ reply: "⚠️ Server connection failed. Please check your internet or try again later." });
  }
});

// ──────────────────────────────────────────────────────────
// 2. SHINZI MUSIC SEARCH ROUTE (NEW!)
// ──────────────────────────────────────────────────────────
app.get("/music/search", async (req, res) => {
  const query = req.query.q;
  
  if (!query) {
    return res.status(400).json({ error: "No search query provided" });
  }

  try {
    console.log(`Searching YouTube for: ${query}`);
    
    // Call the official YouTube API securely from the backend
    const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=20&key=${process.env.YOUTUBE_API_KEY}`;
    
    const response = await fetch(ytUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error("YouTube API Error:", data);
      return res.status(500).json({ error: "YouTube API failed to fetch data." });
    }

    // Send the exact data back to your frontend
    return res.json(data);

  } catch (err) {
    console.error("Music proxy error:", err.message);
    return res.status(500).json({ error: "Failed to connect to YouTube servers." });
  }
});

// ──────────────────────────────────────────────────────────
// SERVER START
// ──────────────────────────────────────────────────────────
app.listen(process.env.PORT || 3000, () => {
  console.log("Shinzi Ecosystem Backend running! Handles AI Chat + Music Search.");
});
