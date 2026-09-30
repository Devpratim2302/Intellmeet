import { api } from './api';
import { MeetingSummary, ActionItem, ActionItemStatus, ActionItemPriority } from '../types/summary.types';

export const summaryApi = {
  /**
   * Generates or regenerates AI summary and action items from the meeting transcript
   */
  async generateSummary(
    meetingIdOrRoomId: string,
    options?: { provider?: string; workspaceId?: string }
  ): Promise<{ summary: MeetingSummary; actionItems: ActionItem[] }> {
    const res = await api.post(`/meetings/${meetingIdOrRoomId}/summary/generate`, options || {});
    return res.data.data;
  },

  /**
   * Retrieves existing summary for a meeting
   */
  async getSummary(meetingIdOrRoomId: string): Promise<MeetingSummary | null> {
    const res = await api.get(`/meetings/${meetingIdOrRoomId}/summary`);
    return res.data.data.summary;
  },

  /**
   * Retrieves extracted action items for a meeting
   */
  async getActionItems(
    meetingIdOrRoomId: string,
    filter?: { status?: string }
  ): Promise<ActionItem[]> {
    const params = filter?.status ? { status: filter.status } : {};
    const res = await api.get(`/meetings/${meetingIdOrRoomId}/action-items`, { params });
    return res.data.data.actionItems;
  },

  /**
   * Creates a manual action item for a meeting
   */
  async createActionItem(
    meetingIdOrRoomId: string,
    payload: {
      title: string;
      description?: string;
      assigneeName?: string;
      dueDate?: string;
      priority?: ActionItemPriority;
      workspaceId?: string;
    }
  ): Promise<ActionItem> {
    const res = await api.post(`/meetings/${meetingIdOrRoomId}/action-items`, payload);
    return res.data.data.actionItem;
  },

  /**
   * Updates an existing action item status, priority, or due date
   */
  async updateActionItem(
    meetingIdOrRoomId: string,
    itemId: string,
    payload: {
      status?: ActionItemStatus;
      title?: string;
      description?: string;
      assigneeName?: string;
      dueDate?: string | null;
      priority?: ActionItemPriority;
    }
  ): Promise<ActionItem> {
    const res = await api.patch(
      `/meetings/${meetingIdOrRoomId}/action-items/${itemId}`,
      payload
    );
    return res.data.data.actionItem;
  },

  /**
   * Deletes an action item
   */
  async deleteActionItem(meetingIdOrRoomId: string, itemId: string): Promise<void> {
    await api.delete(`/meetings/${meetingIdOrRoomId}/action-items/${itemId}`);
  },
};
