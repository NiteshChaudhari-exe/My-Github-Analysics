import analytics from '../utils/analytics';

describe('analytics consent wrapper', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch (e) {}
    try { delete window.gtag; } catch (e) {}
    // Ensure wrapper starts disabled
    analytics.setConsent(false);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.warn.mockRestore();
  });

  test('does not log or send events before consent', () => {
    analytics.setConsent(false);
    analytics.trackEvent('test_event', { a: 1 });
    expect(console.log).not.toHaveBeenCalled();
  });

  test('logs events after consent when no provider present', () => {
    analytics.setConsent(true);
    analytics.trackEvent('test_event', { a: 2 });
    expect(console.log).toHaveBeenCalledWith('[analytics] event', 'test_event', { a: 2 });
  });
});
