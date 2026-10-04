import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Create a custom registry for IntellMeet metrics
export const register = new client.Registry();

// Add default recommended labels
register.setDefaultLabels({
  app: 'intellmeet-backend',
});

// Enable collection of default process/runtime metrics
client.collectDefaultMetrics({ register, prefix: 'intellmeet_' });

// HTTP Request Total Counter
export const httpRequestCounter = new client.Counter({
  name: 'intellmeet_http_requests_total',
  help: 'Total count of HTTP requests processed by IntellMeet',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP Request Duration Histogram
export const httpRequestDurationHistogram = new client.Histogram({
  name: 'intellmeet_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Active Socket.io Connections Gauge
export const activeSocketConnectionsGauge = new client.Gauge({
  name: 'intellmeet_active_socket_connections',
  help: 'Number of active Socket.io client connections',
  registers: [register],
});

// Active Meeting Rooms Gauge
export const activeMeetingRoomsGauge = new client.Gauge({
  name: 'intellmeet_active_meeting_rooms',
  help: 'Number of active meeting rooms in Socket.io',
  registers: [register],
});

/**
 * Normalizes HTTP route paths to prevent metric label cardinality explosion
 * E.g., /api/meetings/6789abc123 -> /api/meetings/:id
 */
const normalizeRoute = (req: Request): string => {
  if (req.route && req.route.path) {
    const baseUrl = req.baseUrl || '';
    return `${baseUrl}${req.route.path}`;
  }
  // Fallback pattern matching for common dynamic segments
  return req.path
    .replace(/[0-9a-fA-F]{24}/g, ':id')
    .replace(/[0-9a-fA-F-]{36}/g, ':uuid')
    .replace(/\/\d+/g, '/:id');
};

/**
 * Express middleware to track HTTP request metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip metrics collection for /metrics itself to avoid polluting statistics
  if (req.path === '/metrics') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    const route = normalizeRoute(req);
    const statusCode = res.statusCode.toString();

    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    httpRequestDurationHistogram.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      durationInSeconds
    );
  });

  next();
};

/**
 * Endpoint handler to expose Prometheus metrics
 */
export const metricsHandler = async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error instanceof Error ? error.message : 'Error collecting metrics');
  }
};
