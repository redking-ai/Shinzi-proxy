const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.json());

// Allow requests from your Shinzi AI site
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://redking-ai.github.io");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Main chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://redking-ai.github.io",
        "X-Title": "Shinzi AI"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: messages
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Proxy error" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Shinzi proxy running!");
});