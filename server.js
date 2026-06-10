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

// Safety net: Reliable free models to fall back on if the clicked model is down
const BACKUP_MODELS = [
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "poolside/laguna-xs.2:free",
  "openai/gpt-oss-120b:free",
  "minimax/minimax-m2.5:free",
  "openrouter/owl-alpha"
];

app.post("/chat", async (req, res) => {
  const { messages, model } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  // Target the exact model chosen on the frontend
  const targetModel = model || "deepseek/deepseek-v4-flash:free";
  const messagesWithSystem = [SYSTEM_PROMPT, ...messages];

  // Try the target model FIRST. If it fails, loop through the backups.
  const modelList = [targetModel, ...BACKUP_MODELS.filter(m => m !== targetModel)];

  for (const currentModel of modelList) {
    try {
      console.log(`Attempting OpenRouter request with: ${currentModel}`);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://redking-ai.github.io",
          "X-Title": "Shinzi AI"
        },
        body: JSON.stringify({ model: currentModel, messages: messagesWithSystem })
      });

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content;

      // If successful, instantly send the reply and break the loop
      if (response.ok && reply) {
        console.log(`Success with model: ${currentModel}`);
        return res.json({ reply });
      } else {
        console.warn(`Model ${currentModel} is busy or failed. Trying next...`);
      }

    } catch (err) {
      console.warn(`Connection error targeting model ${currentModel}:`, err.message);
    }
  }

  // If it loops through every single backup and still fails:
  console.error("All models failed to respond.");
  return res.status(500).json({ error: "Servers are overloaded right now. Please try again." });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Shinzi proxy running with smart fallback routing!");
});
