import "@testing-library/jest-dom";

// ─── matchMedia stub (jsdom doesn't implement it) ──────────────────────────
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ─── Capacitor stubs ────────────────────────────────────────────────────────
// Capacitor's LocalNotifications and registerPlugin are native-only.
// In jsdom they don't exist, so we stub them globally so any file that
// imports @capacitor/* or @/hooks/useNotifications doesn't crash.
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => "web",
    isNativePlatform: () => false,
    isPluginAvailable: () => false,
  },
  registerPlugin: (_name: string) => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    saveSound: vi.fn().mockResolvedValue({ path: "/mock/path.mp3" }),
    playSound: vi.fn().mockResolvedValue(undefined),
    deleteSound: vi.fn().mockResolvedValue({ deleted: true }),
    checkBackgroundPermissions: vi.fn().mockResolvedValue({
      notificationsGranted: true,
      exactAlarmGranted: true,
      batteryOptimizationIgnored: true,
    }),
    requestExactAlarmPermission: vi.fn().mockResolvedValue(undefined),
    requestBatteryOptimizationExemption: vi.fn().mockResolvedValue(undefined),
    // WidgetPlugin methods
    updateWidget: vi.fn().mockResolvedValue(undefined),
    getClickedReminder: vi.fn().mockResolvedValue({ reminderId: null }),
  }),
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    createChannel: vi.fn().mockResolvedValue(undefined),
    checkPermissions: vi.fn().mockResolvedValue({ display: "granted" }),
    requestPermissions: vi.fn().mockResolvedValue({ display: "granted" }),
    schedule: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    exitApp: vi.fn(),
  },
}));

// ─── AudioContext stub ───────────────────────────────────────────────────────
// jsdom doesn't implement Web Audio API
const mockOscillator = {
  type: "sine" as OscillatorType,
  frequency: { setValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGain = {
  gain: { value: 0 },
  connect: vi.fn(),
};

const mockAudioContext = {
  currentTime: 0,
  state: "running" as AudioContextState,
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGain),
  destination: {},
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

Object.defineProperty(window, "AudioContext", {
  writable: true,
  value: vi.fn(() => mockAudioContext),
});

// ─── HTMLMediaElement stub (jsdom doesn't implement play()) ─────────────────
Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});
Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
  writable: true,
  value: vi.fn(),
});
