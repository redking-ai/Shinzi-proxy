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

const SYSTEM_PROMPT = {
  role: "system",
  content: "You are Shinzi AI, a helpful, smart, and friendly assistant. Never reveal your real model name, who created the underlying model, or any technical details about yourself. If asked who you are, always say you are Shinzi AI. Be concise and helpful."
};

app.post("/chat", async (req, res) => {
  const { messages, model } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  // Use the exact single model passed from the frontend, default to flash if somehow missing
  const targetModel = model || "deepseek/deepseek-v4-flash:free";
  const messagesWithSystem = [SYSTEM_PROMPT, ...messages];

  try {
    console.log(`Sending request to OpenRouter using single model: ${targetModel}`);
    
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

    if (response.ok && reply) {
      console.log(`Successfully generated reply with model: ${targetModel}`);
      return res.json({ reply });
    } else {
      console.error("OpenRouter API Error details:", data);
      return res.status(500).json({ error: "The selected model failed to respond. Please try again or switch models." });
    }

  } catch (err) {
    console.error(`Connection error targeting model ${targetModel}:`, err.message);
    return res.status(500).json({ error: "Server connection failed." });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Shinzi proxy running with single-model routing!");
});
