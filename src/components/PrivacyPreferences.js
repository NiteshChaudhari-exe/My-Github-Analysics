import React, { useState, useEffect } from 'react';
import analytics from '../utils/analytics';
import ManageData from './ManageData';

export default function PrivacyPreferences() {
  const [consent, setConsent] = useState(() => analytics.consentGiven());
  const [open, setOpen] = useState(false);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    setConsent(analytics.consentGiven());
  }, []);

  const giveConsent = () => {
    analytics.setConsent(true);
    setConsent(true);
    setOpen(false);
  };

  const revokeConsent = () => {
    analytics.setConsent(false);
    setConsent(false);
    setOpen(false);
  };

  const clearConsent = () => {
    try { localStorage.removeItem('analytics.consent'); } catch (e) {}
    setConsent(false);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm"
        aria-haspopup="true"
        aria-expanded={open}
      >
        Privacy
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 text-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50">
          <div className="mb-2 font-medium">Privacy preferences</div>
          <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">Manage analytics consent for this device.</div>
          <div className="flex gap-2">
            <button onClick={giveConsent} className="flex-1 px-2 py-1 rounded bg-blue-600 text-white text-sm">Accept</button>
            <button onClick={revokeConsent} className="flex-1 px-2 py-1 rounded bg-gray-200 text-sm">Decline</button>
          </div>
          <div className="mt-2 text-xs text-gray-500">Current: <span className="font-medium">{consent ? 'Accepted' : 'Not accepted'}</span></div>
          <div className="mt-2 pt-2 border-t text-xs">
            <button onClick={clearConsent} className="text-xs underline text-gray-600">Clear stored consent</button>
          </div>
          <div className="mt-2 pt-2 border-t text-xs">
            <button onClick={() => { setShowManage(true); setOpen(false); }} className="text-xs underline text-gray-600">Manage data on server</button>
          </div>
        </div>
      )}
      {showManage && <ManageData onClose={() => setShowManage(false)} />}
    </div>
  );
}
