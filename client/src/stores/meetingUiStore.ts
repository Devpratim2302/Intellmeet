import { create } from 'zustand';

export type MeetingLayoutMode = 'grid' | 'speaker';

export interface MeetingUiState {
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  isTranscriptOpen: boolean;
  showLogs: boolean;
  layoutMode: MeetingLayoutMode;
  isNoiseSuppressionEnabled: boolean;
  isEchoCancellationEnabled: boolean;

  // Actions
  toggleChat: () => void;
  toggleParticipants: () => void;
  toggleTranscript: () => void;
  toggleLogs: () => void;
  closeAllPanels: () => void;
  setLayoutMode: (mode: MeetingLayoutMode) => void;
  toggleNoiseSuppression: () => void;
  toggleEchoCancellation: () => void;
  resetMeetingUi: () => void;
}

export const useMeetingUiStore = create<MeetingUiState>((set) => ({
  isChatOpen: false,
  isParticipantsOpen: false,
  isTranscriptOpen: false,
  showLogs: false,
  layoutMode: 'grid',
  isNoiseSuppressionEnabled: true,
  isEchoCancellationEnabled: true,

  toggleChat: () =>
    set((state) => ({
      isChatOpen: !state.isChatOpen,
      // When opening chat, close transcript and participants for clean layout
      ...(state.isChatOpen ? {} : { isParticipantsOpen: false, isTranscriptOpen: false }),
    })),

  toggleParticipants: () =>
    set((state) => ({
      isParticipantsOpen: !state.isParticipantsOpen,
      ...(state.isParticipantsOpen ? {} : { isChatOpen: false, isTranscriptOpen: false }),
    })),

  toggleTranscript: () =>
    set((state) => ({
      isTranscriptOpen: !state.isTranscriptOpen,
      ...(state.isTranscriptOpen ? {} : { isChatOpen: false, isParticipantsOpen: false }),
    })),

  toggleLogs: () => set((state) => ({ showLogs: !state.showLogs })),

  closeAllPanels: () =>
    set({
      isChatOpen: false,
      isParticipantsOpen: false,
      isTranscriptOpen: false,
      showLogs: false,
    }),

  setLayoutMode: (layoutMode) => set({ layoutMode }),

  toggleNoiseSuppression: () =>
    set((state) => ({ isNoiseSuppressionEnabled: !state.isNoiseSuppressionEnabled })),

  toggleEchoCancellation: () =>
    set((state) => ({ isEchoCancellationEnabled: !state.isEchoCancellationEnabled })),

  resetMeetingUi: () =>
    set({
      isChatOpen: false,
      isParticipantsOpen: false,
      isTranscriptOpen: false,
      showLogs: false,
      layoutMode: 'grid',
      isNoiseSuppressionEnabled: true,
      isEchoCancellationEnabled: true,
    }),
}));
