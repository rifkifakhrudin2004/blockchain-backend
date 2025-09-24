// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { pool } from './config/database';
import { Logger } from './utils/logger';

// Import Routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/project';
import tokenRoutes from './routes/token';
import transactionRoutes from './routes/transactions';
import profitRoutes from './routes/profits';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting (if behind reverse proxy)
app.set('trust proxy', 1);

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  skipSuccessfulRequests: true,
});

// Middleware Setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL?.split(',') || ['http://localhost:3001']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        Logger.info('HTTP Request', { message: message.trim() });
      }
    }
  }));
} else {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use(limiter);

// Request ID middleware for tracking
app.use((req: any, res, next) => {
  req.requestId = Math.random().toString(36).substring(2, 15);
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Request logging middleware
app.use((req: any, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id || 'anonymous'
    };
    
    if (res.statusCode >= 400) {
      Logger.warn('HTTP Request Warning', logData);
    } else {
      Logger.info('HTTP Request', logData);
    }
  });
  
  next();
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/profits', profitRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const [result] = await pool.execute('SELECT 1 as health');
    
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
      blockchain: {
        network: process.env.CHAIN_ID,
        contractAddress: process.env.CONTRACT_ADDRESS
      },
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100
      }
    };

    res.status(200).json(healthCheck);
  } catch (error) {
    Logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// API documentation endpoint
app.get('/api', (req, res) => {
  const apiDocs = {
    title: 'Blockchain Investment Platform API',
    version: '1.0.0', 
    description: 'API untuk platform investasi berbasis blockchain dengan sistem profit sharing',
    baseUrl: `${req.protocol}://${req.get('host')}`,
    endpoints: {
      authentication: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login'
      },
      projects: {
        'GET /api/projects': 'Get all projects',
        'GET /api/projects/:projectId': 'Get project by ID',
        'POST /api/projects': 'Create new project (Admin only)',
        'GET /api/projects/admin/my-projects': 'Get admin projects (Admin only)'
      },
      tokens: {
        'POST /api/tokens/purchase': 'Purchase tokens (User)',
        'GET /api/tokens/my-tokens': 'Get user tokens (User)',
        'GET /api/tokens/project/:projectId': 'Get project tokens'
      },
      transactions: {
        'GET /api/transactions': 'Get all transactions',
        'GET /api/transactions/my': 'Get user transactions (User)',
        'GET /api/transactions/project/:projectId': 'Get project transactions'
      },
      profits: {
        'POST /api/profits/distribute': 'Distribute profits (Admin only)',
        'GET /api/profits/history/:projectId': 'Get profit history',
        'GET /api/profits/my-profits': 'Get user profit history (User)'
      }
    },
    examples: {
      profitDistribution: {
        description: 'Contoh distribusi profit: Modal 100 juta, Keuntungan 50 juta',
        request: {
          projectId: 'PROJECT_001',
          initialCapital: 100000000,
          totalRevenue: 150000000,
          newProfit: 50000000
        },
        calculation: {
          adminShare: '30% = 15,000,000',
          userShare: '70% = 35,000,000',
          distribution: 'Dibagi rata berdasarkan jumlah token yang dimiliki'
        }
      }
    }
  };

  res.json(apiDocs);
});

// 404 handler - untuk route yang tidak ditemukan
app.use((req, res) => {
  Logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /health',
      'GET /api',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/projects',
      'POST /api/tokens/purchase',
      'POST /api/profits/distribute'
    ]
  });
});

// Global error handler
app.use((err: any, req: any, res: express.Response, next: express.NextFunction) => {
  const errorId = Math.random().toString(36).substring(2, 15);
  
  // Log error dengan detail lengkap
  Logger.error('Application Error', {
    errorId,
    requestId: req.requestId,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      userId: req.user?.id
    },
    timestamp: new Date().toISOString()
  });

  // Response berdasarkan environment
  if (process.env.NODE_ENV === 'production') {
    // Production: Jangan expose stack trace
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong. Please try again later.',
      errorId,
      timestamp: new Date().toISOString()
    });
  } else {
    // Development: Show full error details
    res.status(err.status || 500).json({
      error: err.name || 'Internal Server Error',
      message: err.message,
      stack: err.stack,
      errorId,
      request: {
        method: req.method,
        url: req.originalUrl,
        body: req.body
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  
  const server = app.listen();
  server.close(() => {
    Logger.info('Process terminated');
    pool.end().then(() => {
      Logger.info('Database connections closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  Logger.info('SIGINT received, shutting down gracefully');
  
  const server = app.listen();
  server.close(() => {
    Logger.info('Process terminated');
    pool.end().then(() => {
      Logger.info('Database connections closed');
      process.exit(0);
    });
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise) => {
  Logger.error('Unhandled Rejection', {
    reason: reason?.toString(),
    stack: reason?.stack,
    promise
  });
  
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  // Close server & exit process
  process.exit(1);
});

// Database connection test on startup
const testDatabaseConnection = async () => {
  try {
    const [result] = await pool.execute('SELECT 1 as test');
    Logger.info('Database connection established successfully');
  } catch (error) {
    Logger.error('Failed to connect to database', { error });
    process.exit(1);
  }
};

// Server startup
const startServer = async () => {
  try {
    // Test database connection first
    await testDatabaseConnection();
    
    const server = app.listen(PORT, () => {
      Logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      });
      
      // Log available routes
      Logger.info('Available routes', {
        routes: [
          `GET http://localhost:${PORT}/health - Health check`,
          `GET http://localhost:${PORT}/api - API documentation`,
          `POST http://localhost:${PORT}/api/auth/register - Register user`,
          `POST http://localhost:${PORT}/api/auth/login - User login`,
          `GET http://localhost:${PORT}/api/projects - Get all projects`,
          `POST http://localhost:${PORT}/api/tokens/purchase - Purchase tokens`,
          `POST http://localhost:${PORT}/api/profits/distribute - Distribute profits`
        ]
      });
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        Logger.error(`Port ${PORT} is already in use`);
      } else {
        Logger.error('Server error', { error });
      }
      process.exit(1);
    });

  } catch (error) {
    Logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;