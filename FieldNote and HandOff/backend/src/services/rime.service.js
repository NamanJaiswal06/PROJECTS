const axios = require('axios');

const RIME_API_URL = 'https://users.rime.ai/v1/rime-tts';

/**
 * Calls the Rime TTS API and returns raw audio bytes (Buffer).
 * The RIME_API_KEY never leaves the server.
 *
 * @param {string} text - spoken text (max 500 chars recommended)
 * @param {string} [voice] - Rime speaker ID (falls back to env default)
 * @returns {Buffer} audio/mpeg binary data
 */
const speak = async (text, voice) => {
  if (!process.env.RIME_API_KEY) {
    throw new Error('RIME_API_KEY is not configured on the server');
  }

  const response = await axios.post(
    RIME_API_URL,
    {
      text,
      speaker: voice || process.env.RIME_VOICE || 'marsh',
      modelId: process.env.RIME_MODEL || 'mist',
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.RIME_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'audio/mp3',
      },
      responseType: 'arraybuffer',
      timeout: 15000,
    }
  );

  return Buffer.from(response.data);
};

module.exports = { speak };
