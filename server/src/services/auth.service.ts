import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { User, IUser } from '../models/user.model.js';
import { Workspace } from '../models/workspace.model.js';
import { Meeting } from '../models/meeting.model.js';
import { Task } from '../models/task.model.js';
import { generateRoomId } from '../utils/roomId.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../utils/token.js';

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface GoogleAuthDTO {
  idToken?: string;
  code?: string;
  redirectUri?: string;
  email?: string;
  name?: string;
  avatar?: string;
}

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Registers a new user account
   */
  async register(data: RegisterDTO): Promise<AuthResult> {
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      const error: any = new Error('A user with this email address already exists');
      error.statusCode = 409;
      throw error;
    }

    const user = new User({
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: data.role || 'user',
    });

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generates Google OAuth authorization URL with account chooser
   */
  getGoogleAuthUrl(customRedirectUri?: string): { url: string; clientId: string } {
    const clientId = config.google.clientId;
    const redirectUri = customRedirectUri || config.google.redirectUri;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(
      'openid email profile'
    )}&access_type=offline&prompt=select_account`;

    return { url, clientId };
  }

  /**
   * Authenticates or creates an account via Google
   */
  async googleAuth(data: GoogleAuthDTO): Promise<AuthResult> {
    let verifiedEmail = data.email?.toLowerCase().trim();
    let verifiedName = data.name?.trim();
    let verifiedAvatar = data.avatar?.trim();

    // 1. Exchange authorization code if provided
    if (data.code) {
      try {
        const tokenParams = new URLSearchParams({
          code: data.code,
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          redirect_uri: data.redirectUri || config.google.redirectUri,
          grant_type: 'authorization_code',
        });

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString(),
        });

        if (tokenRes.ok) {
          const tokenData: any = await tokenRes.json();
          if (tokenData.access_token) {
            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            if (userinfoRes.ok) {
              const profile: any = await userinfoRes.json();
              if (profile.email) {
                const userEmail = profile.email.toLowerCase().trim();
                verifiedEmail = userEmail;
                verifiedName = profile.name || verifiedName || userEmail.split('@')[0];
                verifiedAvatar = profile.picture || verifiedAvatar;
              }
            }
          }
        } else {
          const errData = await tokenRes.text();
          console.warn('Google token exchange warning:', errData);
        }
      } catch (codeErr) {
        console.warn('Google code exchange exception:', codeErr);
      }
    }

    // 2. Verify Google id_token if provided
    if (data.idToken) {
      try {
        const response = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${data.idToken}`
        );
        if (response.ok) {
          const payload: any = await response.json();
          if (payload.email) {
            const googleEmail = payload.email.toLowerCase().trim();
            verifiedEmail = googleEmail;
            verifiedName = payload.name || verifiedName || googleEmail.split('@')[0];
            verifiedAvatar = payload.picture || verifiedAvatar;
          }
        }
      } catch (tokenErr) {
        console.warn('Google id_token tokeninfo verification notice:', tokenErr);
      }
    }

    if (!verifiedEmail) {
      const error: any = new Error('A valid Google email address is required');
      error.statusCode = 400;
      throw error;
    }

    if (!verifiedName) {
      verifiedName = verifiedEmail.split('@')[0];
    }

    let user = await User.findOne({ email: verifiedEmail }).select('+password +refreshToken');

    if (!user) {
      const randomPassword = `G_${crypto.randomBytes(16).toString('hex')}!`;
      user = new User({
        name: verifiedName,
        email: verifiedEmail,
        password: randomPassword,
        avatar: verifiedAvatar || '',
        role: 'user',
        isVerified: true,
      });
    } else {
      if (verifiedAvatar && !user.avatar) {
        user.avatar = verifiedAvatar;
      }
      if (verifiedName && user.name.startsWith('user_')) {
        user.name = verifiedName;
      }
    }

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticates user credentials and issues tokens
   */
  async login(data: LoginDTO): Promise<AuthResult> {
    const user = await User.findOne({ email: data.email.toLowerCase() }).select(
      '+password +refreshToken'
    );
    if (!user) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    if (user.name === 'Project Mentor (Evaluator)' || user.name.includes('Project Mentor') || user.email === 'mentor.evaluator@intellmeet.io') {
      user.name = 'Demo Admin';
      user.email = 'demo.admin@intellmeet.io';
      await user.save();
    }

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Automatically initializes or logs in a Demo Admin account with full admin privileges,
   * provisioning default workspaces, meetings, and tasks for a complete live testing environment.
   */
  async loginDemo(): Promise<AuthResult> {
    const demoEmail = 'demo.admin@intellmeet.io';

    // Migrate any legacy mentor.evaluator account to demo.admin@intellmeet.io
    try {
      const legacyMentor = await User.findOne({ email: 'mentor.evaluator@intellmeet.io' });
      if (legacyMentor) {
        const existingDemo = await User.findOne({ email: demoEmail });
        if (existingDemo && existingDemo._id.toString() !== legacyMentor._id.toString()) {
          await User.deleteOne({ _id: legacyMentor._id });
        } else {
          legacyMentor.email = demoEmail;
          legacyMentor.name = 'Demo Admin';
          legacyMentor.role = 'admin';
          await legacyMentor.save();
        }
      }
    } catch {
      // Non-fatal if legacy cleanup fails
    }

    let user = await User.findOne({ email: demoEmail }).select('+password +refreshToken');

    if (!user) {
      user = new User({
        name: 'Demo Admin',
        email: demoEmail,
        password: 'DemoPassword2026!',
        role: 'admin',
        isVerified: true,
      });
      await user.save();
    } else {
      user.name = 'Demo Admin';
      user.email = demoEmail;
      user.role = 'admin';
      await user.save();
    }

    // Auto-provision demo workspace, meeting, and evaluation tasks if not present
    try {
      let workspace = await Workspace.findOne({ owner: user._id });
      if (!workspace) {
        workspace = new Workspace({
          name: 'IntellMeet Demo Workspace',
          slug: `demo-${Date.now().toString(36)}`,
          description:
            'Dedicated demo environment with WebRTC HD video, AI transcription, and team collaboration.',
          owner: user._id,
          members: [
            {
              user: user._id,
              role: 'owner',
              joinedAt: new Date(),
            },
          ],
        });
        await workspace.save();
      }

      // Provision active demo meeting if user has no meetings
      const existingMeeting = await Meeting.findOne({ host: user._id });
      let meetingId: any = existingMeeting?._id;
      let meetingRoomId = existingMeeting?.roomId;

      if (!existingMeeting) {
        meetingRoomId = generateRoomId();
        const demoMeeting = new Meeting({
          title: 'WebRTC & AI System Evaluation Sync',
          description:
            'Interactive evaluation room. Test multi-peer video, screen sharing, live chat, and AI transcription in real-time.',
          host: user._id,
          participants: [user._id],
          roomId: meetingRoomId,
          status: 'active',
          workspace: workspace._id,
          actualStartTime: new Date(),
        });
        await demoMeeting.save();
        meetingId = demoMeeting._id;
        workspace.meetings.push(demoMeeting._id as any);
        await workspace.save();
      }

      // Provision evaluation tasks if user has no tasks
      const existingTasksCount = await Task.countDocuments({ createdBy: user._id });
      if (existingTasksCount === 0) {
        await Task.create([
          {
            title: 'Verify HD WebRTC Audio, Video & Screen Sharing',
            description:
              'Test camera preview in Join Room page, mute/unmute toggles, video track enable/disable, and full-screen presentation stream.',
            status: 'completed',
            priority: 'high',
            workspace: workspace._id,
            meeting: meetingId,
            roomId: meetingRoomId,
            createdBy: user._id,
          },
          {
            title: 'Test Live Speech Transcription & AI Summary Generation',
            description:
              'Enable live speech recognition during a meeting call, inspect speaker diarization segments, and trigger automated post-meeting summaries.',
            status: 'in_progress',
            priority: 'urgent',
            workspace: workspace._id,
            meeting: meetingId,
            roomId: meetingRoomId,
            createdBy: user._id,
          },
          {
            title: 'Inspect Workspace Administration & Role Permissions',
            description:
              'Evaluate workspace creation, member role assignment (owner/admin/member/viewer), and collaborative task tracking Kanban.',
            status: 'todo',
            priority: 'medium',
            workspace: workspace._id,
            createdBy: user._id,
          },
        ]);
      } else {
        // Ensure legacy demo tasks are attached to this demo user & workspace
        await Task.updateMany(
          {
            title: {
              $in: [
                'Verify HD WebRTC Audio, Video & Screen Sharing',
                'Test Live Speech Transcription & AI Summary Generation',
                'Inspect Workspace Administration & Role Permissions',
              ],
            },
          },
          {
            $set: {
              createdBy: user._id,
              workspace: workspace._id,
            },
          }
        );
      }
    } catch (provisionErr) {
      console.warn('Demo environment auto-provision notice:', provisionErr);
    }

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Validates refresh token and issues new access token
   */
  async refreshToken(incomingRefreshToken: string): Promise<string> {
    let decoded: TokenPayload;
    try {
      decoded = verifyRefreshToken(incomingRefreshToken);
    } catch {
      const error: any = new Error('Invalid or expired refresh token. Please log in again.');
      error.statusCode = 401;
      throw error;
    }

    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || !user.refreshToken) {
      const error: any = new Error('User session not found or revoked');
      error.statusCode = 401;
      throw error;
    }

    const isTokenValid = await bcrypt.compare(incomingRefreshToken, user.refreshToken);
    if (!isTokenValid) {
      user.refreshToken = null;
      await user.save();
      const error: any = new Error('Refresh token invalid. Session revoked.');
      error.statusCode = 401;
      throw error;
    }

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return generateAccessToken(tokenPayload);
  }

  /**
   * Clears active session and token in database
   */
  async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  }

  /**
   * Fetches safe user profile
   */
  async getProfile(user: IUser) {
    let name = user.name;
    let email = user.email;
    if (name === 'Project Mentor (Evaluator)' || name.includes('Project Mentor') || email === 'mentor.evaluator@intellmeet.io') {
      name = 'Demo Admin';
      email = 'demo.admin@intellmeet.io';
      await User.findByIdAndUpdate(user._id, { name: 'Demo Admin', email: 'demo.admin@intellmeet.io' });
    }

    return {
      id: user._id.toString(),
      name,
      email,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
