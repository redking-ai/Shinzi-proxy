const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://redking-ai.github.io");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "poolside/laguna-m.1:free",
  "poolside/laguna-xs.2:free",
  "z-ai/glm-4.5-air:free",
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "liquid/lfm-2.5-1.2b-thinking:free"
];

app.post("/chat", async (req, res) => {
  const { messages, model } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  const modelList = model
    ? [model, ...MODELS.filter(m => m !== model)]
    : MODELS;

  for (const m of modelList) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://redking-ai.github.io",
          "X-Title": "Shinzi AI"
        },
        body: JSON.stringify({ model: m, messages })
      });

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content;

      if (response.ok && reply) {
        console.log(`Success with model: ${m}`);
        return res.json({ reply });
      }
    } catch (err) {
      console.warn(`Model ${m} failed:`, err.message);
    }
  }

  return res.status(500).json({ error: "All models failed. Please try again later." });
});
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://redking-ai.github.io",
          "X-Title": "Shinzi AI"
        },
        body: JSON.stringify({ model, messages })
      });

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content;

      if (response.ok && reply) {
        console.log(`Success with model: ${model}`);
        return res.json({ reply });
      }

      console.warn(`Model ${model} returned no reply, trying next...`);
    } catch (err) {
      console.warn(`Model ${model} failed:`, err.message);
    }
  }

  return res.status(500).json({ error: "All models failed. Please try again later." });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Shinzi proxy running!");
});