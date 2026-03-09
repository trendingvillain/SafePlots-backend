require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./src/config/config');
const routes = require('./src/routes');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

const app = express();

/* ----------------------------------------------------
   CORS CONFIGURATION (ONLY ONCE)
---------------------------------------------------- */

// This allows ANY website to fetch data from your backend
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
/*------------------------------------------------
   MIDDLEWARES
---------------------------------------------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

/* ----------------------------------------------------
   ROOT ROUTE
---------------------------------------------------- */

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SafePlots Backend API',
    version: '1.0.0',
    environment: config.nodeEnv,
    endpoints: {
      health: '/v1/health',
      auth: '/v1/auth',
      properties: '/v1/properties',
      users: '/v1/users',
      sellers: '/v1/sellers',
      inquiries: '/v1/inquiries',
      reports: '/v1/reports',
      admin: '/v1/admin',
      Mari : '/v1/uploads'
    }
  });
});

/* ----------------------------------------------------
   API ROUTES
---------------------------------------------------- */

app.use('/v1', routes);

/* ----------------------------------------------------
   ERROR HANDLING
---------------------------------------------------- */

app.use(notFound);
app.use(errorHandler);

/* ----------------------------------------------------
   SERVER START
---------------------------------------------------- */

const PORT = config.port || 5000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║           SafePlots Backend API Server                ║
║                                                       ║
║   Environment : ${config.nodeEnv.padEnd(36)}║
║   Port        : ${PORT.toString().padEnd(36)}║
║   API Base    : /v1                                    ║
║                                                       ║
║   Server running successfully ✔                       ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
