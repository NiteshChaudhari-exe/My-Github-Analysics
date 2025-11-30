import React, { useEffect, useState } from 'react';
import { getApiServerUrl } from '../utils/apiServer.js';

export default function ManageData({ onClose }) {
  const [serverConsent, setServerConsent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Determine API server URL (same as Login component)
  const apiServer = getApiServerUrl();

  useEffect(() => {
    fetch(`${apiServer.replace(/\/$/, '')}/api/consent`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setServerConsent(data.consent || null))
      .catch(() => setServerConsent(null));
  }, [apiServer]);

  const requestExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiServer.replace(/\/$/, '')}/api/data-request`, { method: 'POST', credentials: 'include' });
      const json = await res.json();
      if (json && json.data) {
        const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-export-${json.data.id || 'user'}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setMessage('Export downloaded');
      } else {
        setMessage('No data available');
      }
    } catch (e) {
      setMessage('Export failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiServer.replace(/\/$/, '')}/api/data`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json();
      if (json && json.ok) {
        setMessage('Your data has been deleted from the server.');
        setServerConsent(null);
      } else {
        setMessage('Delete failed');
      }
    } catch (e) {
      setMessage('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg z-70">
        <h3 className="text-lg font-medium mb-2">Manage your data</h3>
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Server-stored consent: <span className="font-medium">{serverConsent ? String(serverConsent.consent) : 'none'}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={requestExport} disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded">Request export</button>
          <button onClick={deleteData} disabled={loading} className="px-3 py-2 bg-red-600 text-white rounded">Delete my data</button>
          <button onClick={onClose} className="px-3 py-2 bg-gray-200 rounded">Close</button>
        </div>
        {message && <div className="mt-3 text-sm text-gray-500">{message}</div>}
      </div>
    </div>
  );
}
