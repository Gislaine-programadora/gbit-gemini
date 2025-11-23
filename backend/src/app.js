require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 Carregar chave API
const apiKey = process.env.VITE_PUBLIC_API_KEY;
if (!apiKey) {
  console.error("❌ ERRO FATAL: Gemini API Key não encontrada no backend!");
}

const genAI = new GoogleGenerativeAI(apiKey);

// --- ROTAS ---
app.get("/", (req, res) => {
  res.json({ message: "API funcionando no Vercel!" });
});

app.post("/api", async (req, res) => {
  try {
    const { contents, systemInstruction } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash"
    });

    const result = await model.generateContent({
      contents,
      system_instruction: {
        parts: [{ text: systemInstruction }]
      }
    });

    const text = result.response.text();

    res.json({
      success: true,
      text
    });

  } catch (err) {
    console.error("🔥 ERRO API:", err);
    res.status(500).json({
      success: false,
      error: "Erro ao comunicar com a API Gemini",
      detail: err.message
    });
  }
});

// ✅ Exporta como função para Vercel
module.exports = app;




