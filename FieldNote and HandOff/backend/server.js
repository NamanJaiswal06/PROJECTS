const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./src/config/db');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

// --- Route imports ---
const authRoutes      = require('./src/routes/auth.routes');
const logsRoutes      = require('./src/routes/logs.routes');
const handoffRoutes   = require('./src/routes/handoff.routes');
const voiceRoutes     = require('./src/routes/voice.routes');
const ttsRoutes       = require('./src/routes/tts.routes');
const equipmentRoutes = require('./src/routes/equipment.routes');
const incidentRoutes  = require('./src/routes/incidents.routes');
const handoffsRoutes  = require('./src/routes/handoffs.routes');
const memoryRoutes    = require('./src/routes/memory.routes');
const agentRoutes     = require('./src/ai/routes/agent.routes');

// --- Connect to MongoDB + init Qdrant collection ---
connectDB();

const app = express();

// --- Security middleware ---
app.use(helmet());

// --- CORS ---
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin or any localhost origin in dev
    if (!origin || allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// --- Body parsing ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- Request logging ---
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// --- Global rate limiter (100 req / 15 min per IP) ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'FieldNote API is running', timestamp: new Date().toISOString() });
});

// --- API routes ---
app.use('/api/auth',      authRoutes);
app.use('/api/logs',      logsRoutes);
app.use('/api/handoff',   handoffRoutes);
app.use('/api/voice',     voiceRoutes);
app.use('/api/tts',       ttsRoutes);
// Full-stack routes (equipment, incidents, handoffs, memory search)
app.use('/api/equipment', equipmentRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/handoffs',  handoffsRoutes);
app.use('/api/memory',    memoryRoutes);
// ML engineer — agent turn (STT → intent → agent loop → TTS)
app.use('/api/agent',    agentRoutes);

// --- 404 + global error handler ---
app.use(notFound);
app.use(errorHandler);

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 FieldNote API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
