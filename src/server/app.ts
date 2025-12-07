import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { config } from './config';
import { errorHandler } from './middleware/error-handler';
import apiRoutes from './routes/api.routes';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for development, configure properly for production
  }));

  // CORS configuration
  app.use(cors({
    origin: config.nodeEnv === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') || '*'
      : '*',
    credentials: true,
  }));

  // Compression middleware
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Serve static files from client dist
  app.use(express.static(path.join(__dirname, '../../client')));

  // API routes
  app.use('/api', apiRoutes);

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // Serve index.html for client-side routing
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../client/index.html'));
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
