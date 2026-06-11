const express = require("express");
const fetch = require("node-fetch");
const app = express();

// 🔥 FIXED: Raised the limit from 100kb to 50mb so big image strings can pass through
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
      // THE FIX: Send the error text disguised as a normal successful AI reply!
      console.error(`Model ${targetModel} failed or is busy. Details:`, data);
      return res.json({ reply: "⚠️ The model you selected is currently busy or offline. Please try again or select a different model from the menu." });
    }

  } catch (err) {
    console.error(`Connection error targeting model ${targetModel}:`, err.message);
    // Send network errors as a chat reply too, so the frontend doesn't crash
    return res.json({ reply: "⚠️ Server connection failed. Please check your internet or try again later." });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Shinzi proxy running with STRICT single-model routing!");
});
