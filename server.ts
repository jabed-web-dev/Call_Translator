import "dotenv/config";
import express from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const app = express();
const port = Number(process.env.PORT || 3000);
const maxAudioMb = Number(process.env.MAX_AUDIO_MB || 25);
const allowedExtensions = new Set([".mp3", ".m4a", ".wav", ".ogg", ".webm", ".mp4", ".mpeg", ".mpga", ".flac"]);

app.disable("x-powered-by");
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.json({ limit: "1mb" }));
app.use("/api/", rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }));

const upload = multer({
  dest: path.join(os.tmpdir(), "arabic-audio-chat-translator"),
  limits: { fileSize: maxAudioMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(ext)) {
      callback(new Error("Unsupported audio format. Use MP3, M4A, WAV, OGG, WEBM, MP4, MPEG, MPGA, or FLAC."));
      return;
    }
    callback(null, true);
  }
});

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "replace_with_your_api_key") {
    throw new Error("OPENAI_API_KEY is missing. Copy .env.example to .env and add your API key.");
  }
  return new OpenAI({ apiKey });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "replace_with_your_api_key") });
});

app.post("/api/translate-audio", upload.single("audio"), async (req, res) => {
  const uploaded = req.file;
  if (!uploaded) {
    res.status(400).json({ error: "Choose an audio file first." });
    return;
  }

  try {
    const client = getClient();
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(uploaded.path),
      model: "gpt-transcribe",
      prompt: "This is a real conversation with a customer in Saudi Arabia. The speech may be Saudi Arabic, especially Hijazi dialect, or English, and speakers may switch between them. Transcribe the words actually spoken in their original language. Do not translate, summarize, or invent words."
    });

    const originalText = transcription.text?.trim();
    if (!originalText) {
      res.status(422).json({ error: "No speech was detected. Try a clearer or longer audio file." });
      return;
    }

    const translationResponse = await client.responses.create({
      model: process.env.OPENAI_TRANSLATION_MODEL || "gpt-5-mini",
      input: [
        {
          role: "system",
          content: "You translate short customer conversations accurately. Preserve meaning, names, numbers, politeness, and Saudi/Hijazi Arabic context. Do not add details. Return only valid JSON with keys detectedLanguage, arabicText, englishTranslation, bengaliTranslation. detectedLanguage must be one of Arabic, English, Mixed, Other. arabicText should contain the Arabic transcription if the source contains Arabic; otherwise use an empty string. englishTranslation should translate the full source into natural English. bengaliTranslation should translate the full source into natural Bengali. Keep the original transcript separate from translations."
        },
        {
          role: "user",
          content: `Transcription from audio:\\n${originalText}`
        }
      ]
    });

    const raw = translationResponse.output_text?.trim() || "";
    let translated: {
      detectedLanguage?: string;
      arabicText?: string;
      englishTranslation?: string;
      bengaliTranslation?: string;
    };
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      translated = JSON.parse(cleaned);
    } catch {
      translated = {
        detectedLanguage: "Other",
        arabicText: "",
        englishTranslation: raw || originalText,
        bengaliTranslation: "অনুবাদ তৈরি করা যায়নি। আবার চেষ্টা করুন।"
      };
    }

    res.json({
      fileName: uploaded.originalname,
      originalText,
      detectedLanguage: translated.detectedLanguage || "Other",
      arabicText: translated.arabicText || "",
      englishTranslation: translated.englishTranslation || "",
      bengaliTranslation: translated.bengaliTranslation || "",
      note: "AI translation may contain errors. Check names, addresses, prices, and order details."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected processing error.";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    res.status(status).json({ error: message });
  } finally {
    await fs.promises.unlink(uploaded.path).catch(() => undefined);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Request failed.";
  const isLimit = message.toLowerCase().includes("file too large");
  res.status(isLimit ? 413 : 400).json({
    error: isLimit ? `Audio file is too large. Limit: ${maxAudioMb} MB.` : message
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Arabic Audio Chat Translator running at http://localhost:${port}`);
});
