// src/lib/audio.ts
export async function transcribeBase64Audio(base64Audio: string) {
  try {
    // Send the full data URL to the server and let it infer encoding from MIME type
    const TRANSCRIBE_BASE = (import.meta.env.VITE_TRANSCRIBE_BASE as string) || "https://gen-ai-exchange-5fsa.onrender.com";
    const resp = await fetch(`${TRANSCRIBE_BASE}/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: base64Audio }),
    });
    if (!resp.ok) {
      // attempt to parse body for a helpful error
      const errBody = await resp.text().catch(() => resp.statusText);
      throw new Error(errBody || resp.statusText);
    }
    const data = await resp.json();
    return data.transcript;
  } catch (err) {
    console.error("transcribe error:", err);
    throw err;
  }
}
