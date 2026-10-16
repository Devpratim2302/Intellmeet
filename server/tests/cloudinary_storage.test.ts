import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import http from 'http';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { generateAccessToken } from '../src/utils/token.js';
import { cloudinaryStorage } from '../src/services/storage/cloudinary.service.js';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intellmeet_test';
const app = createApp();

let httpServer: http.Server;
let testUser: any;
let accessToken: string;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  httpServer = http.createServer(app);
  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => resolve());
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});

  testUser = await User.create({
    name: 'Storage Test User',
    email: 'storage@intellmeet.com',
    password: 'Password123!',
    role: 'user',
  });

  accessToken = generateAccessToken({
    userId: testUser._id.toString(),
    email: testUser.email,
    role: testUser.role,
  });
});

describe('Cloudinary Media Storage & Avatar API', () => {
  it('should reject avatar upload when unauthenticated with 401', async () => {
    const fakeImageBuffer = Buffer.from('fake image content');

    const res = await request(app)
      .post('/api/auth/avatar')
      .attach('avatar', fakeImageBuffer, 'avatar.png');

    expect(res.status).toBe(401);
  });

  it('should reject unsupported file types (e.g., text file) with 400', async () => {
    const textBuffer = Buffer.from('This is a text file, not an image');

    const res = await request(app)
      .post('/api/auth/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('avatar', textBuffer, { filename: 'document.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/unsupported image format/i);
  });

  it('should reject avatar upload when no file is attached with 400', async () => {
    const res = await request(app)
      .post('/api/auth/avatar')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no image file provided/i);
  });

  it('should successfully upload avatar via Cloudinary service (mock fallback) and persist URL in MongoDB', async () => {
    // 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/api/auth/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('avatar', pngBuffer, { filename: 'profile.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.avatar).toMatch(/cloudinary\.com.*\.png/);

    // Verify stored in DB
    const updatedUser = await User.findById(testUser.id);
    expect(updatedUser?.avatar).toBe(res.body.data.user.avatar);
    expect(updatedUser?.avatarPublicId).toBeTruthy();
  });

  it('should delete avatar and remove asset reference from MongoDB and Cloudinary storage', async () => {
    // First upload an avatar
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    await request(app)
      .post('/api/auth/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('avatar', pngBuffer, { filename: 'profile.png', contentType: 'image/png' });

    const userWithAvatar = await User.findById(testUser.id);
    expect(userWithAvatar?.avatar).toBeTruthy();
    const oldPublicId = userWithAvatar?.avatarPublicId;

    // Delete avatar
    const deleteRes = await request(app)
      .delete('/api/auth/avatar')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.data.user.avatar).toBe('');

    // Verify DB update
    const cleanedUser = await User.findById(testUser.id);
    expect(cleanedUser?.avatar).toBe('');
    expect(cleanedUser?.avatarPublicId).toBe('');
  });

  it('should verify Cloudinary service interface and asset upload/delete lifecycle', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const result = await cloudinaryStorage.uploadAvatar(pngBuffer, 'image/png', 'unit-test-user');

    expect(result.url).toContain('cloudinary.com');
    expect(result.publicId).toBeTruthy();

    const deleteOk = await cloudinaryStorage.deleteAsset(result.publicId);
    expect(deleteOk).toBe(true);
  });
});
