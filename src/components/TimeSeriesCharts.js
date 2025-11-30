import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { ResponsiveContainer, LineChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function TimeSeriesCharts({ series = [] }) {
  // series: array of { month: '2025-01', commits: n, prs: m }

  // formatter for month labels like "Jan 2025"
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }), []);

  // Process and validate the incoming series once
  const processed = useMemo(() => {
    if (!Array.isArray(series)) return [];

    return series
      .map((item) => {
        const { month } = item || {};
        // try to parse month strings like '2025-01' -> Date
        let date = null;
        if (typeof month === 'string') {
          // append day to allow Date parsing
          const parsed = new Date(`${month}-01`);
          if (!Number.isNaN(parsed.getTime())) date = parsed;
        } else if (month instanceof Date && !Number.isNaN(month.getTime())) {
          date = month;
        }

        return {
          ...item,
          _date: date,
        };
      })
      .filter((it) => it && it._date) // remove invalid entries
      .sort((a, b) => a._date - b._date)
      .map((it) => ({ ...it, monthLabel: monthFormatter.format(it._date) }));
  }, [series, monthFormatter]);

  // selection state: null = full range, or { startIndex, endIndex }
  const [range, setRange] = useState(null);

  // slice data to display according to selected preset range
  const displayed = useMemo(() => {
    if (!range || typeof range.startIndex !== 'number' || typeof range.endIndex !== 'number') return processed;
    return processed.slice(range.startIndex, range.endIndex + 1);
  }, [processed, range]);

  // small helpers
  const totalCommits = processed.reduce((s, r) => s + (Number(r.commits) || 0), 0);
  const totalPRs = processed.reduce((s, r) => s + (Number(r.prs) || 0), 0);
  const formatNumber = (v) => (v == null ? '' : Number(v).toLocaleString());

  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-white text-gray-900 p-2 rounded shadow-lg text-sm">
        <div className="font-medium mb-1">{label}</div>
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span style={{ width: 10, height: 10, background: p.color, display: 'inline-block', borderRadius: 2 }} />
            <div>{p.name}: <strong>{formatNumber(p.value)}</strong></div>
          </div>
        ))}
      </div>
    );
  }

  // helper: set range by selecting last N months (nMonths: 3,6,12). nMonths=null clears selection
  const selectLastNMonths = (nMonths) => {
    if (!processed.length) return;
    if (!nMonths) {
      setRange(null);
      return;
    }
    const end = processed.length - 1;
    const endDate = processed[end]._date;
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - (nMonths - 1));
    // find the first index where _date >= startDate
    const start = processed.findIndex((p) => p._date >= startDate);
    setRange({ startIndex: start === -1 ? 0 : start, endIndex: end });
  };

  // visibility state for series
  const [visible, setVisible] = useState({ commits: true, prs: true });

  const toggleSeries = (key) => {
    setVisible((v) => ({ ...v, [key]: !v[key] }));
  };


  if (!processed.length) {
    return (
      <div className="bg-gray-800/30 p-4 rounded" role="img" aria-label="Monthly activity: no data">
        <h4 className="font-semibold mb-2">Monthly activity</h4>
        <div style={{ width: '100%', height: 240 }} className="flex items-center justify-center text-sm text-gray-300">
          No activity to show
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 p-4 rounded" role="img" aria-label="Monthly activity chart showing commits and pull requests">
      <h4 className="font-semibold mb-2">Monthly activity</h4>
      <div style={{ width: '100%' }}>

        <div className="mb-3 flex items-center justify-between text-sm text-gray-300">
          <div className="flex items-center gap-3">
            <div>
              {range ? (
                <span>
                  Showing <strong>{processed[range.startIndex].monthLabel}</strong> — <strong>{processed[range.endIndex].monthLabel}</strong>
                </span>
              ) : (
                <span>Showing full range</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-xs">Commits: {formatNumber(totalCommits)}</span>
              <span className="px-2 py-0.5 bg-green-600 text-white rounded text-xs">PRs: {formatNumber(totalPRs)}</span>
            </div>
          </div>
          <div className="border-l border-gray-600 h-6" />
          <div className="flex items-center gap-4">
            <button type="button" className="px-2 py-1 text-xs bg-gray-700 rounded" aria-label="Show last 3 months" onClick={() => selectLastNMonths(3)}>3m</button>
            <button type="button" className="px-2 py-1 text-xs bg-gray-700 rounded" aria-label="Show last 6 months" onClick={() => selectLastNMonths(6)}>6m</button>
            <button type="button" className="px-2 py-1 text-xs bg-gray-700 rounded" aria-label="Show last 12 months" onClick={() => selectLastNMonths(12)}>12m</button>
            <button type="button" className="px-2 py-1 text-xs bg-gray-700 rounded" aria-label="Show all months" onClick={() => selectLastNMonths(null)}>All</button>
          </div>
        </div>

        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={displayed} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="monthLabel" tick={{ fill: '#cbd5e1', fontSize: 12 }} tickMargin={8} />
              <YAxis allowDecimals={false} tickFormatter={formatNumber} tick={{ fill: '#cbd5e1' }} domain={[0, 'dataMax + 5']} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="commits" stroke="none" fill="#8884d8" fillOpacity={0.06} isAnimationActive={false} />
              <Area type="monotone" dataKey="prs" stroke="none" fill="#82ca9d" fillOpacity={0.04} isAnimationActive={false} />
              <Line
                key={`commits-${visible.commits}`}
                name="Commits"
                type="monotone"
                dataKey="commits"
                stroke="#8884d8"
                strokeWidth={2}
                connectNulls={true}
                dot={visible.commits ? { r: 3 } : false}
                activeDot={{ r: 6 }}
                isAnimationActive={visible.commits}
                animationDuration={800}
                animationEasing="ease"
                strokeOpacity={visible.commits ? 1 : 0}
                style={{ transition: 'stroke-opacity 350ms ease' }}
              />
              <Line
                key={`prs-${visible.prs}`}
                name="Pull Requests"
                type="monotone"
                dataKey="prs"
                stroke="#82ca9d"
                strokeWidth={2}
                connectNulls={true}
                dot={visible.prs ? { r: 3 } : false}
                activeDot={{ r: 6 }}
                isAnimationActive={visible.prs}
                animationDuration={800}
                animationEasing="ease"
                strokeOpacity={visible.prs ? 1 : 0}
                style={{ transition: 'stroke-opacity 350ms ease' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex items-center gap-2" role="group" aria-label="Toggle series">
          <button
            type="button"
            className={`px-2 py-1 text-xs rounded ${visible.commits ? 'bg-indigo-600' : 'bg-gray-700'}`}
            aria-pressed={visible.commits}
            onClick={() => toggleSeries('commits')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSeries('commits'); } }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: visible.commits ? 14 : 6,
                height: 10,
                backgroundColor: '#8884d8',
                marginRight: 8,
                verticalAlign: 'middle',
                borderRadius: 2,
                transition: 'width 280ms ease, opacity 280ms ease, transform 280ms ease',
                opacity: visible.commits ? 1 : 0.4,
                transform: visible.commits ? 'translateX(0)' : 'translateX(-4px)'
              }}
            />
            <span style={{ verticalAlign: 'middle' }}>Commits</span>
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-xs rounded ${visible.prs ? 'bg-green-600' : 'bg-gray-700'}`}
            aria-pressed={visible.prs}
            onClick={() => toggleSeries('prs')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSeries('prs'); } }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: visible.prs ? 14 : 6,
                height: 10,
                backgroundColor: '#82ca9d',
                marginRight: 8,
                verticalAlign: 'middle',
                borderRadius: 2,
                transition: 'width 280ms ease, opacity 280ms ease, transform 280ms ease',
                opacity: visible.prs ? 1 : 0.4,
                transform: visible.prs ? 'translateX(0)' : 'translateX(-4px)'
              }}
            />
            <span style={{ verticalAlign: 'middle' }}>Pull Requests</span>
          </button>
        </div>

      </div>
    </div>
  );
}

TimeSeriesCharts.propTypes = {
  series: PropTypes.arrayOf(
    PropTypes.shape({
      month: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      commits: PropTypes.number,
      prs: PropTypes.number,
    })
  ),
};

TimeSeriesCharts.defaultProps = {
  series: [],
};

export default React.memo(TimeSeriesCharts);
