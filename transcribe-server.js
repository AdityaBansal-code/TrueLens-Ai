// transcribe-server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { SpeechClient } from "@google-cloud/speech";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" })); // allow base64 audio payload


const keyPath = process.env.SERVICE_ACCOUNT_KEY_PATH || './src/serviceAccountKey.json';
console.log(`Using service account key: ${keyPath}`);
const client = new SpeechClient({ keyFilename: keyPath });

// Simple POST /transcribe
// Expect body: { audio: "<base64 string>", encoding?: "LINEAR16", sampleRateHertz?: 16000, languageCode?: "en-US" }
app.post("/transcribe", async (req, res) => {
  try {
    const { audio, sampleRateHertz, languageCode = "en-US" } = req.body;
    if (!audio) return res.status(400).json({ error: "Missing audio" });

    // If `audio` is a data URL like 'data:audio/webm;codecs=opus;base64,...', parse it
    let base64Content = audio;
    let inferredEncoding = "LINEAR16";
    if (typeof audio === 'string' && audio.startsWith('data:')) {
      const matches = audio.match(/^data:(.+?);base64,(.+)$/);
      if (matches) {
        const mime = matches[1];
        base64Content = matches[2];
        // Map common MIME types to Google Speech encodings
        if (mime.includes('webm') || mime.includes('opus')) {
          inferredEncoding = 'WEBM_OPUS';
        } else if (mime.includes('ogg')) {
          inferredEncoding = 'OGG_OPUS';
        } else if (mime.includes('wav') || mime.includes('wave')) {
          inferredEncoding = 'LINEAR16';
        } else if (mime.includes('mpeg') || mime.includes('mp3')) {
          inferredEncoding = 'MP3';
        } else {
          // default fallback
          inferredEncoding = 'LINEAR16';
        }
        console.log(`Detected audio mime=${mime}, using encoding=${inferredEncoding}`);
      }
    }

    const request = {
      audio: { content: base64Content },
      config: {
        encoding: inferredEncoding,
        // Only set sampleRateHertz if provided (optional for many encodings)
        ...(sampleRateHertz ? { sampleRateHertz } : {}),
        languageCode,
        enableAutomaticPunctuation: true,
      },
    };

    // For short audio (<1 minute) use recognize
    const [response] = await client.recognize(request);
    const transcription = (response.results || [])
      .map(result => result.alternatives?.[0]?.transcript || "")
      .join("\n");
    console.log(`Transcription: ${transcription}`);
    res.json({ transcript: transcription });
  } catch (err) {
    console.error("transcription error:", err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Transcribe server listening on ${PORT}`));
