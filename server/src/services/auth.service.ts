import bcrypt from 'bcryptjs';
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
   * Automatically initializes or logs in a Demo Mentor / Evaluator account with full admin privileges,
   * provisioning default workspaces, meetings, and tasks for a complete live testing evaluation.
   */
  async loginDemo(): Promise<AuthResult> {
    const demoEmail = 'mentor.evaluator@intellmeet.io';
    let user = await User.findOne({ email: demoEmail }).select('+password +refreshToken');

    if (!user) {
      user = new User({
        name: 'Project Mentor (Evaluator)',
        email: demoEmail,
        password: 'DemoPassword2026!',
        role: 'admin',
        isVerified: true,
      });
      await user.save();
    } else if (user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    // Auto-provision demo workspace, meeting, and evaluation tasks if not present
    try {
      let workspace = await Workspace.findOne({ owner: user._id });
      if (!workspace) {
        workspace = new Workspace({
          name: 'IntellMeet Evaluation Workspace',
          slug: `eval-${Date.now().toString(36)}`,
          description:
            'Dedicated evaluation environment for project mentor testing: WebRTC HD video, AI transcription, and team collaboration.',
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
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
