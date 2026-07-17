import { Platform } from 'react-native';
import { showPrompt } from '../prompt';

// Helper: mock Platform.OS since it's a plain string in Node env
function setPlatformOS(os: string) {
  Object.defineProperty(Platform, 'OS', {
    get: () => os,
    configurable: true,
  });
}

// Mock window.prompt for web-platform tests without jsdom (RN preset conflicts)
const mockWindowPrompt = jest.fn();
Object.defineProperty(globalThis, 'window', {
  value: { prompt: mockWindowPrompt },
  writable: true,
  configurable: true,
});

beforeEach(() => {
  jest.restoreAllMocks();
  jest.useFakeTimers();
  mockWindowPrompt.mockReset();
  // Default to web
  setPlatformOS('web');
});

afterEach(() => {
  jest.useRealTimers();
});

describe('showPrompt', () => {
  it('calls window.prompt on web platform', () => {
    mockWindowPrompt.mockReturnValue('user input');

    const callback = jest.fn();
    showPrompt('Title', 'Message', callback);

    jest.runAllTimers();

    expect(mockWindowPrompt).toHaveBeenCalledWith('Title\nMessage', '');
    expect(callback).toHaveBeenCalledWith('user input');
  });

  it('passes defaultValue to window.prompt', () => {
    mockWindowPrompt.mockReturnValue('edited name');

    const callback = jest.fn();
    showPrompt('Rename', 'Enter new name', callback, 'current name');

    jest.runAllTimers();

    expect(mockWindowPrompt).toHaveBeenCalledWith(
      'Rename\nEnter new name',
      'current name',
    );
    expect(callback).toHaveBeenCalledWith('edited name');
  });

  it('does not call callback when window.prompt is cancelled (returns null)', () => {
    mockWindowPrompt.mockReturnValue(null);

    const callback = jest.fn();
    showPrompt('Title', 'Message', callback);

    jest.runAllTimers();

    expect(callback).not.toHaveBeenCalled();
  });

  it('does not crash when callback is synchronous', () => {
    mockWindowPrompt.mockReturnValue('sync value');

    const callback = (text: string) => {
      expect(text).toBe('sync value');
    };

    expect(() => {
      showPrompt('Title', 'Message', callback);
      jest.runAllTimers();
    }).not.toThrow();
  });

  it('logs a warning on non-web platforms', () => {
    setPlatformOS('ios');

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    showPrompt('Title', 'Message', jest.fn());

    expect(warnSpy).toHaveBeenCalledWith(
      'showPrompt is not supported on this platform yet.',
    );
  });
});
