import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { apiRouter } from './api/routes.js';
import { logger } from './utils/logger.js';
import { getDatabase } from './db/database.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SEO Keyword & Website Analyzer API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    config: {
      port: config.port,
      environment: config.nodeEnv,
      crawlerUserAgent: config.crawlerUserAgent,
    },
  });
});

// Mount API routes
app.use('/api', apiRouter);

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.',
  });
});

let server: any = null;

const isTest =
  process.env.NODE_ENV === 'test' ||
  process.env.npm_lifecycle_event === 'test' ||
  process.argv.includes('--test') ||
  process.execArgv.includes('--test');

if (!isTest) {
  // Ensure DB initializes on startup
  getDatabase();

  server = app.listen(config.port, config.host, () => {
    logger.info(`SEO Analyzer Server active at http://${config.host}:${config.port}`);
  });

  const handleShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    if (server) {
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

export default app;
