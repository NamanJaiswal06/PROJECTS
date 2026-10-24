const asyncHandler = require('../utils/asyncHandler');
const rimeService = require('../services/rime.service');

// ─── POST /api/tts/speak ──────────────────────────────────────────────────────
/**
 * Proxies TTS requests to Rime — the API key never touches the browser.
 * Body: { text, voice? }
 * Returns: audio/mpeg binary stream
 */
const speak = asyncHandler(async (req, res) => {
  const { text, voice } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    res.status(400);
    throw new Error('text is required and must be a non-empty string');
  }

  if (text.length > 500) {
    res.status(400);
    throw new Error('text must be 500 characters or fewer for TTS');
  }

  const audioBuffer = await rimeService.speak(text.trim(), voice);

  res.set({
    'Content-Type': 'audio/mpeg',
    'Content-Length': audioBuffer.length,
    'Cache-Control': 'no-store',
  });

  res.send(audioBuffer);
});

module.exports = { speak };
