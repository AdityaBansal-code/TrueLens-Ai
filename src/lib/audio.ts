
export async function transcribeBase64Audio(base64Audio: string) {
  try {    
    const TRANSCRIBE_BASE = (import.meta.env.VITE_TRANSCRIBE_BASE as string) || "https://gen-ai-exchange-5fsa.onrender.com";

    if (typeof window !== 'undefined' && base64Audio && base64Audio.startsWith('data:')) {
      try {
        const matches = base64Audio.match(/^data:(.+?);base64,(.+)$/);
        if (matches) {
          const mime = matches[1];
          const b64 = matches[2];
          const byteChars = atob(b64);
          const byteNumbers = new Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mime });
          const form = new FormData();
          // Use File if available to preserve filename; otherwise append blob
          try {
            const file = new File([blob], 'recording.webm', { type: mime });
            form.append('file', file);
          } catch (e) {
            form.append('file', blob, 'recording.webm');
          }

          const resp = await fetch(`${TRANSCRIBE_BASE}/transcribe-file`, {
            method: 'POST',
            body: form,
          });
          if (!resp.ok) {
            const errBody = await resp.text().catch(() => resp.statusText);
            throw new Error(errBody || resp.statusText);
          }
          const data = await resp.json();
          console.log('transcribe-file response:', data);
          return data.transcript;
        }
      } catch (e) {
        console.warn('multipart transcribe failed, falling back to JSON POST', e);
      }
    }

    // Fallback: JSON POST to /transcribe (existing flow)
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
