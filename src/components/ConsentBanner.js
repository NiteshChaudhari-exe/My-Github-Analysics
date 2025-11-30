import React, { useEffect, useState } from 'react';
import analytics from '../utils/analytics';

const STORAGE_KEY = 'analytics.consent';

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  });

  useEffect(() => {
    // show banner only if consent not set
    if (consent === 'true' || consent === 'false') {
      // if consent true, enable analytics on load
      if (consent === 'true') analytics.enable();
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (e) {}
    analytics.setConsent(true);
    setConsent('true');
    setVisible(false);
  };

  const decline = () => {
    try { localStorage.setItem(STORAGE_KEY, 'false'); } catch (e) {}
    analytics.setConsent(false);
    setConsent('false');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed left-4 right-4 bottom-4 z-50 flex items-center justify-between p-4 bg-white/95 dark:bg-gray-900/95 border rounded-lg shadow-lg">
      <div className="flex-1 pr-4">
        <div className="text-sm font-medium">We use analytics to improve the app</div>
        <div className="text-xs text-gray-600 dark:text-gray-300">Allow anonymous analytics to help us understand usage. You can change this later.</div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={decline} className="px-3 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm">Decline</button>
        <button onClick={accept} className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm">Accept</button>
      </div>
    </div>
  );
}
