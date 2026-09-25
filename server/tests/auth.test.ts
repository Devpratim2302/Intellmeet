import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intellmeet_test';
const app = createApp();

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('IntellMeet Foundation & Health API', () => {
  it('GET /api/health should return a healthy status with service metadata', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('intellmeet-api');
    expect(res.body.version).toBe('0.1.0');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Authentication API (Development Block 1)', () => {
  const testUser = {
    name: 'Sarah Connor',
    email: 'sarah@intellmeet.io',
    password: 'Password123!',
  };

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user with hashed password and clean response', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.name).toBe(testUser.name);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      // Ensure password is never returned
      expect(res.body.data.user.password).toBeUndefined();

      // Check DB
      const userInDb = await User.findOne({ email: testUser.email });
      expect(userInDb).not.toBeNull();
      expect(userInDb?.password).not.toBe(testUser.password); // Bcrypt hashed
    });

    it('should reject duplicate registration with 409 conflict', async () => {
      // First registration
      await request(app).post('/api/auth/register').send(testUser);

      // Duplicate registration attempt
      const res = await request(app).post('/api/auth/register').send(testUser);
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject malformed requests (missing fields or weak password) with 400', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'S',
        email: 'invalid-email-format',
        password: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('should successfully login with valid credentials and return tokens', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject login with invalid password with 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject login with non-existent email with 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'ghost@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    it('should return safe user profile when authenticated with valid token', async () => {
      const regRes = await request(app).post('/api/auth/register').send(testUser);
      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.id).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject access to protected route without token with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/token required/i);
    });

    it('should reject access with invalid or malformed token with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_malformed_token_xyz');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid or malformed/i);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should issue a new access token given a valid refresh token', async () => {
      const loginRes = await request(app).post('/api/auth/register').send(testUser);
      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });
  });
});
