import path from 'node:path';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'lead-generator-super-secure-jwt-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  saltRounds: 10,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  dbPath: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'leads.db'),
};
