const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || '').trim());

// gemini-embedding-001 outputs 3072 dimensions
// (Qdrant collection vector size must be 3072 — see config/db.js)
const EMBEDDING_MODEL = 'gemini-embedding-001';

/**
 * Generates an embedding vector for a given text string using Google Gemini.
 * @param {string} text
 * @returns {number[]} embedding vector (768 floats)
 */
const embed = async (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('embed() requires a non-empty string');
  }

  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  const result = await model.embedContent(text.replace(/\n/g, ' '));

  return result.embedding.values; // 768-dimensional array
};

module.exports = { embed };
