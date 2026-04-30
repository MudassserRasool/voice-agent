export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorDark?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;

  // agent dispatch configuration
  agentName?: string;

  // LiveKit Cloud Sandbox configuration
  sandboxId?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'LearnMate',
  pageTitle: 'LearnMate AI Voice Tutor',
  pageDescription: 'A conversational AI tutor for guided voice lessons',

  supportsChatInput: true,
  supportsVideoInput: false,
  supportsScreenShare: false,
  isPreConnectBufferEnabled: true,

  logo: '/learnmate-mark.svg',
  accent: '#0f766e',
  logoDark: '/learnmate-mark.svg',
  accentDark: '#5eead4',
  startButtonText: 'Start lesson',

  // optional: audio visualization configuration
  // audioVisualizerType: 'bar',
  // audioVisualizerColor: '#002cf2',
  // audioVisualizerColorDark: '#1fd5f9',
  // audioVisualizerColorShift: 0.3,
  // audioVisualizerBarCount: 5,
  // audioVisualizerType: 'radial',
  // audioVisualizerRadialBarCount: 24,
  // audioVisualizerRadialRadius: 100,
  // audioVisualizerType: 'grid',
  // audioVisualizerGridRowCount: 25,
  // audioVisualizerGridColumnCount: 25,
  // audioVisualizerType: 'wave',
  // audioVisualizerWaveLineWidth: 3,
  // audioVisualizerType: 'aura',

  audioVisualizerType: 'wave',
  audioVisualizerColor: '#0f766e',
  audioVisualizerColorDark: '#5eead4',
  audioVisualizerWaveLineWidth: 3,

  // agent dispatch configuration
  agentName: process.env.AGENT_NAME ?? 'teacher',

  // LiveKit Cloud Sandbox configuration
  sandboxId: undefined,
};
