import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import http from 'http';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { initSocketServer } from '../src/sockets/index.js';
import { User } from '../src/models/user.model.js';
import { Meeting } from '../src/models/meeting.model.js';
import { Transcript } from '../src/models/transcript.model.js';
import { MockTranscriptionProvider } from '../src/services/transcription/providers/mock.provider.js';
import { TranscriptionProviderFactory } from '../src/services/transcription/provider.factory.js';
import { transcriptionService } from '../src/services/transcription/transcription.service.js';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intellmeet_test';
const app = createApp();

let httpServer: http.Server;
let serverPort: number;

/**
 * Generates a valid RIFF/WAV audio buffer in memory for testing
 */
function createSampleWavBuffer(durationSeconds = 1, sampleRate = 16000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // 'fmt ' chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // 'data' chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Synthetic 440Hz Sine wave audio data
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  httpServer = http.createServer(app);
  const io = initSocketServer(httpServer);
  app.set('io', io);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      const addr = httpServer.address() as any;
      serverPort = addr.port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Meeting.deleteMany({});
  await Transcript.deleteMany({});
});

describe('Transcription Pipeline (Development Block 5)', () => {
  let userToken: string;
  let userId: string;
  let userName: string;
  let meetingId: string;
  let roomId: string;

  beforeEach(async () => {
    // 1. Register authenticated user
    const userRes = await request(app).post('/api/auth/register').send({
      name: 'Dr. Sarah Connor',
      email: 'sarah@intellmeet.io',
      password: 'SecurePassword123!',
    });
    userToken = userRes.body.data.accessToken;
    userId = userRes.body.data.user.id;
    userName = userRes.body.data.user.name;

    // 2. Create meeting
    const meetingRes = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'AI Architecture & Audio Pipeline Sync',
        description: 'Testing speech recognition and MongoDB persistence',
      });

    meetingId = meetingRes.body.data.meeting.id;
    roomId = meetingRes.body.data.meeting.roomId;
  });

  describe('1. Isolated Transcription Provider & Factory', () => {
    it('MockTranscriptionProvider should process audio buffer and return valid transcript result', async () => {
      const provider = new MockTranscriptionProvider();
      expect(provider.name).toBe('mock');
      expect(provider.isAvailable()).toBe(true);

      const sampleAudio = createSampleWavBuffer(2);
      const result = await provider.transcribeAudio(sampleAudio, 'audio/wav', {
        speakerName: userName,
        speakerId: userId,
        prompt: 'Testing direct transcription pipeline verification.',
      });

      expect(result).toBeDefined();
      expect(result.text).toBe('Testing direct transcription pipeline verification.');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.provider).toBe('mock');
      expect(result.segments).toHaveLength(1);
      expect(result.segments![0].speakerName).toBe(userName);
      expect(result.segments![0].words).toBeDefined();
      expect(result.segments![0].words!.length).toBeGreaterThan(0);
    });

    it('TranscriptionProviderFactory should fallback to mock provider when cloud credentials are missing', () => {
      const factory = new TranscriptionProviderFactory();
      const provider = factory.getProvider('openai'); // OPENAI_API_KEY is not set in test

      // Should safely fallback to mock provider without crashing
      expect(provider).toBeDefined();
      expect(provider.name).toBe('mock');
      expect(provider.isAvailable()).toBe(true);
    });

    it('TranscriptionProviderFactory should list registered providers and their availability status', () => {
      const factory = new TranscriptionProviderFactory();
      const list = factory.listProviders();

      expect(list.some((p) => p.name === 'mock' && p.available)).toBe(true);
      expect(list.some((p) => p.name === 'openai')).toBe(true);
      expect(list.some((p) => p.name === 'deepgram')).toBe(true);
    });
  });

  describe('2. Transcript Mongoose Model & Schema', () => {
    it('should validate segment speaker, text, timestamp, and meeting reference', async () => {
      const transcriptDoc = new Transcript({
        meeting: new mongoose.Types.ObjectId(meetingId),
        roomId,
        status: 'recording',
        language: 'en-US',
        provider: 'mock',
        fullText: 'Hello world',
        segments: [
          {
            speaker: {
              id: new mongoose.Types.ObjectId(userId),
              name: userName,
              email: 'sarah@intellmeet.io',
            },
            text: 'Hello world',
            timestamp: new Date(),
            startTime: 0,
            endTime: 2.5,
            confidence: 0.98,
          },
        ],
      });

      const saved = await transcriptDoc.save();
      expect(saved._id).toBeDefined();
      expect(saved.roomId).toBe(roomId.toLowerCase());
      expect(saved.segments).toHaveLength(1);
      expect(saved.segments[0].speaker.name).toBe(userName);
      expect(saved.segments[0].text).toBe('Hello world');
      expect(saved.segments[0].timestamp).toBeInstanceOf(Date);
      expect(saved.segments[0].confidence).toBe(0.98);
    });

    it('should fail validation if required fields are missing', async () => {
      const invalidDoc = new Transcript({
        roomId: 'test-room',
        // missing meeting reference
        segments: [],
      });

      await expect(invalidDoc.save()).rejects.toThrow();
    });
  });

  describe('3. REST API: Audio Upload & Transcription Pipeline', () => {
    it('POST /api/meetings/:id/transcripts/audio - should transcribe sample audio and save segment to MongoDB', async () => {
      const sampleAudio = createSampleWavBuffer(2);

      const res = await request(app)
        .post(`/api/meetings/${roomId}/transcripts/audio`)
        .set('Authorization', `Bearer ${userToken}`)
        .field('prompt', 'We are deploying the transcription service to production.')
        .field('startTime', '0')
        .field('endTime', '3')
        .attach('audio', sampleAudio, 'sample-audio.wav');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.segment).toBeDefined();
      expect(res.body.data.segment.text).toBe('We are deploying the transcription service to production.');
      expect(res.body.data.segment.speaker.name).toBe(userName);
      expect(res.body.data.segment.timestamp).toBeDefined();
      expect(res.body.data.provider).toBe('mock');

      // Verify in MongoDB
      const dbTranscript = await Transcript.findOne({ roomId: roomId.toLowerCase() });
      expect(dbTranscript).toBeDefined();
      expect(dbTranscript!.segments).toHaveLength(1);
      expect(dbTranscript!.segments[0].text).toBe('We are deploying the transcription service to production.');
      expect(dbTranscript!.fullText).toContain('We are deploying the transcription service to production.');
    });

    it('should accumulate multiple audio chunks chronologically in MongoDB', async () => {
      const audioChunk1 = createSampleWavBuffer(1);
      const audioChunk2 = createSampleWavBuffer(1);

      // Chunk 1
      await request(app)
        .post(`/api/meetings/${roomId}/transcripts/audio`)
        .set('Authorization', `Bearer ${userToken}`)
        .field('prompt', 'First segment of the discussion.')
        .attach('audio', audioChunk1, 'chunk1.wav');

      // Chunk 2
      const res2 = await request(app)
        .post(`/api/meetings/${roomId}/transcripts/audio`)
        .set('Authorization', `Bearer ${userToken}`)
        .field('prompt', 'Second segment of the discussion.')
        .attach('audio', audioChunk2, 'chunk2.wav');

      expect(res2.status).toBe(201);
      expect(res2.body.data.transcript.segments).toHaveLength(2);

      const dbTranscript = await Transcript.findOne({ roomId: roomId.toLowerCase() });
      expect(dbTranscript!.segments).toHaveLength(2);
      expect(dbTranscript!.segments[0].text).toBe('First segment of the discussion.');
      expect(dbTranscript!.segments[1].text).toBe('Second segment of the discussion.');
      expect(dbTranscript!.fullText).toContain('First segment');
      expect(dbTranscript!.fullText).toContain('Second segment');
    });

    it('should reject audio upload without an audio file with 400', async () => {
      const res = await request(app)
        .post(`/api/meetings/${roomId}/transcripts/audio`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ prompt: 'No audio attached' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No audio file uploaded');
    });

    it('should reject unauthenticated transcription request with 401', async () => {
      const sampleAudio = createSampleWavBuffer(1);
      const res = await request(app)
        .post(`/api/meetings/${roomId}/transcripts/audio`)
        .attach('audio', sampleAudio, 'sample.wav');

      expect(res.status).toBe(401);
    });
  });

  describe('4. REST API: Direct Segment Addition & Retrieval', () => {
    it('POST /api/meetings/:id/transcripts/segments - should add direct transcript segment', async () => {
      const res = await request(app)
        .post(`/api/meetings/${roomId}/transcripts/segments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          text: 'The team will complete Block 5 testing by end of day.',
          startTime: 10,
          endTime: 14,
          confidence: 0.99,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.segment.text).toBe('The team will complete Block 5 testing by end of day.');
      expect(res.body.data.segment.speaker.name).toBe(userName);
    });

    it('GET /api/meetings/:id/transcript - should retrieve transcript with all segments', async () => {
      // Add a segment first
      await request(app)
        .post(`/api/meetings/${roomId}/transcripts/segments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ text: 'Reviewing quarterly architecture goals.' });

      const res = await request(app)
        .get(`/api/meetings/${roomId}/transcript`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transcript).toBeDefined();
      expect(res.body.data.segments).toHaveLength(1);
      expect(res.body.data.segments[0].text).toBe('Reviewing quarterly architecture goals.');
      expect(res.body.data.fullText).toContain('Reviewing quarterly architecture goals.');
    });

    it('GET /api/meetings/:id/transcript - should return empty structure if no transcript exists yet', async () => {
      const res = await request(app)
        .get(`/api/meetings/non-existent-room/transcript`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transcript).toBeNull();
      expect(res.body.data.segments).toEqual([]);
    });

    it('GET /api/meetings/transcription/providers - should list providers', async () => {
      const res = await request(app)
        .get('/api/meetings/transcription/providers')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.providers).toBeDefined();
      expect(res.body.data.providers.length).toBeGreaterThan(0);
    });

    it('DELETE /api/meetings/:id/transcript - should delete meeting transcript', async () => {
      // Add segment
      await request(app)
        .post(`/api/meetings/${roomId}/transcripts/segments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ text: 'Temporary segment to be deleted.' });

      const delRes = await request(app)
        .delete(`/api/meetings/${roomId}/transcript`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const check = await Transcript.findOne({ roomId: roomId.toLowerCase() });
      expect(check).toBeNull();
    });
  });

  describe('5. Real-Time Socket Transcription Pipeline', () => {
    let client1: ClientSocketType;
    let client2: ClientSocketType;

    afterEach(() => {
      if (client1?.connected) client1.disconnect();
      if (client2?.connected) client2.disconnect();
    });

    it('should transcribe audio chunk sent over socket and broadcast to room participants', async () => {
      // Create user 2
      const u2Res = await request(app).post('/api/auth/register').send({
        name: 'John Connor',
        email: 'john@intellmeet.io',
        password: 'SecurePassword123!',
      });
      const user2Token = u2Res.body.data.accessToken;

      const serverUrl = `http://localhost:${serverPort}`;

      // Connect Client 1 (Speaker)
      client1 = ClientSocket(serverUrl, {
        auth: { token: userToken },
        transports: ['websocket'],
      });

      // Connect Client 2 (Listener)
      client2 = ClientSocket(serverUrl, {
        auth: { token: user2Token },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        let connectedCount = 0;
        const check = () => {
          connectedCount++;
          if (connectedCount === 2) resolve();
        };
        client1.on('connect', check);
        client2.on('connect', check);
      });

      // Join room
      await new Promise<void>((resolve) => {
        client1.emit('join-meeting', { roomId }, () => {
          client2.emit('join-meeting', { roomId }, () => resolve());
        });
      });

      const sampleAudio = createSampleWavBuffer(1);
      const audioBase64 = sampleAudio.toString('base64');

      // Setup listener on client 2 for live broadcast
      const broadcastPromise = new Promise<any>((resolve) => {
        client2.on('new-transcript-segment', (payload) => {
          resolve(payload);
        });
      });

      // Client 1 sends audio chunk for transcription
      const ackPromise = new Promise<any>((resolve) => {
        client1.emit(
          'audio-chunk-transcribe',
          {
            roomId,
            audioBase64,
            mimeType: 'audio/wav',
            prompt: 'Real-time WebRTC audio stream segment received.',
          },
          (res: any) => resolve(res)
        );
      });

      const [ack, broadcast] = await Promise.all([ackPromise, broadcastPromise]);

      expect(ack.success).toBe(true);
      expect(ack.data.segment.text).toBe('Real-time WebRTC audio stream segment received.');

      expect(broadcast).toBeDefined();
      expect(broadcast.roomId).toBe(roomId.toLowerCase());
      expect(broadcast.segment.text).toBe('Real-time WebRTC audio stream segment received.');
      expect(broadcast.segment.speaker.name).toBe(userName);
    });
  });
});
