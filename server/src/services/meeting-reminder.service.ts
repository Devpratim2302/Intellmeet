import { Meeting } from '../models/meeting.model.js';
import { notificationService } from './notification.service.js';

export class MeetingReminderService {
  private timer: NodeJS.Timeout | null = null;

  start(intervalMs: number = 60000) {
    if (this.timer) return;
    // Initial check after 5s
    setTimeout(() => this.checkUpcomingMeetings(), 5000);
    this.timer = setInterval(() => {
      this.checkUpcomingMeetings();
    }, intervalMs);
    console.log('[MeetingReminderService] Scheduled meeting reminder daemon started');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async checkUpcomingMeetings() {
    try {
      const now = new Date();
      // Lookahead window: 5 minutes ago up to 15 minutes ahead
      const windowStart = new Date(now.getTime() - 5 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);

      const meetings = await Meeting.find({
        status: 'scheduled',
        scheduledStartTime: { $gte: windowStart, $lte: windowEnd },
        reminderSent: { $ne: true },
      });

      for (const meeting of meetings) {
        const recipientIds = new Set<string>();
        if (meeting.host) recipientIds.add(meeting.host.toString());
        if (meeting.participants) {
          for (const p of meeting.participants) {
            if (p) recipientIds.add(p.toString());
          }
        }

        const formattedTime = meeting.scheduledStartTime
          ? new Date(meeting.scheduledStartTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'now';

        for (const recipientId of recipientIds) {
          try {
            await notificationService.createNotification({
              recipient: recipientId,
              sender: meeting.host,
              type: 'meeting_reminder',
              title: 'Scheduled Meeting Reminder',
              message: `Meeting "${meeting.title}" is scheduled to start soon (${formattedTime}). Click to join!`,
              link: `/meetings/${meeting.roomId}`,
              metadata: {
                meetingId: meeting.id,
                roomId: meeting.roomId,
                scheduledStartTime: meeting.scheduledStartTime,
              },
            });
          } catch (err) {
            console.warn(`[MeetingReminderService] Failed to notify ${recipientId}:`, err);
          }
        }

        meeting.reminderSent = true;
        await meeting.save();
      }
    } catch (error) {
      console.warn('[MeetingReminderService] Check error:', error);
    }
  }
}

export const meetingReminderService = new MeetingReminderService();
