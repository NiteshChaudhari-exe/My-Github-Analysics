import React, { useState } from 'react';

// Receives props.daily: Array of { date: 'YYYY-MM-DD', count: number }
export default function Heatmap({ daily = [], isDarkMode = true }) {
  const [hover, setHover] = useState(null); // {date, count, x, y}

  // map of date->count
  const map = {};
  daily.forEach(d => { map[d.date] = d.count; });

  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 364);

  // find the Sunday on or before startDate to align weeks
  const startSunday = new Date(startDate);
  startSunday.setDate(startDate.getDate() - startDate.getDay());

  // build weeks array until today
  const weeks = [];
  let cursor = new Date(startSunday);
  while (cursor <= today) {
    const days = [];
    for (let wd = 0; wd < 7; wd++) {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() + wd);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      days.push({ date: key, dateObj: new Date(d) });
    }
    weeks.push(days);
    cursor.setDate(cursor.getDate() + 7);
  }

  const counts = daily.map(d => d.count || 0);
  const max = Math.max(...counts, 1);

  function colorFor(count) {
    const ratio = count / max;
    if (ratio === 0) return isDarkMode ? '#0f172a' : '#f3f4f6';
    if (ratio < 0.25) return '#1f2937';
    if (ratio < 0.5) return '#065f46';
    if (ratio < 0.75) return '#059669';
    return '#10b981';
  }

  function onEnter(e, date) {
    const rect = e.target.getBoundingClientRect();
    setHover({ date, count: map[date] || 0, x: rect.left + rect.width / 2, y: rect.top - 8 });
  }
  function onLeave() { setHover(null); }

  return (
    <div className="p-3 rounded-lg bg-gray-800/30 relative">
      <div className="text-sm font-semibold mb-2">Contributions (last 12 months)</div>
      <div className="flex gap-1">
        {/* render weekday labels */}
  <div className="flex-col gap-1 mr-2 hidden sm:flex">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i) => (
            <div key={d} className="text-xs text-gray-400" style={{ height: 12 }}>{i%2===0?d:''}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {week.map(day => {
                const date = day.date;
                const within = new Date(date) >= startDate && new Date(date) <= today;
                return (
                  <div
                    key={date}
                    onMouseEnter={(e) => within && onEnter(e, date)}
                    onMouseLeave={onLeave}
                    style={{ width: 12, height: 12, backgroundColor: within ? colorFor(map[date] || 0) : 'transparent', borderRadius: 3, cursor: within ? 'pointer' : 'default' }}
                    title={`${date}: ${map[date] || 0}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {hover && (
        <div style={{ position: 'fixed', left: hover.x + 8, top: hover.y - 24, background: '#111827', color: 'white', padding: '6px 8px', borderRadius: 6, fontSize: 12, zIndex: 60 }}>
          <div className="font-medium">{hover.date}</div>
          <div className="text-xs text-gray-300">Contributions: {hover.count}</div>
        </div>
      )}
    </div>
  );
}
