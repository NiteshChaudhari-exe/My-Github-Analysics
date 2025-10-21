import React, { useState, useRef } from 'react';

// Receives props.daily: Array of { date: 'YYYY-MM-DD', count: number }
export default function Heatmap({ daily = [], isDarkMode = true }) {
  const [hover, setHover] = useState(null); // {date, count, left, top}
  const [showDebug, setShowDebug] = useState(false);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const tooltipRef = useRef(null);
  const [showHint, setShowHint] = useState(false);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, lastX: 0, lastTime: 0, velocity: 0, momentumId: null });

  // map of date->count
  const map = {};
  daily.forEach(d => { map[d.date] = d.count || 0; });

  // Normalize to UTC: use UTC today and startDate (last 365 days)
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  startDate.setUTCDate(startDate.getUTCDate() - 364);

  // find the Monday on or before startDate to align weeks (week starts Monday)
  const startMonday = new Date(startDate);
  const dayIndex = startMonday.getUTCDay(); // 0=Sun,1=Mon,...
  const daysSinceMonday = (dayIndex + 6) % 7; // 0 if Monday, 6 if Sunday
  startMonday.setUTCDate(startMonday.getUTCDate() - daysSinceMonday);

  // build weeks array until today
  const weeks = [];
  let cursor = new Date(startMonday);
  while (cursor <= today) {
    const days = [];
    for (let wd = 0; wd < 7; wd++) {
      const d = new Date(cursor);
      d.setUTCDate(cursor.getUTCDate() + wd);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      days.push({ date: key, dateObj: new Date(Date.UTC(yyyy, d.getUTCMonth(), d.getUTCDate())) });
    }
    weeks.push(days);
    cursor.setDate(cursor.getDate() + 7);
  }

  // helper: build mapping of weekIndex -> month short name for the week that contains each month's 1st day
  function buildMonthLabelMap(startDate, today, weeks) {
    const map = {};
    const months = [];
    // iterate months using UTC to avoid timezone drift
    const mCursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    while (mCursor <= today) {
      months.push(new Date(mCursor));
      mCursor.setUTCMonth(mCursor.getUTCMonth() + 1);
    }
    months.forEach(dt => {
      const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-01`;
      const wi = weeks.findIndex(week => week.some(d => d.date === key));
      if (wi >= 0) map[wi] = dt.toLocaleString(undefined, { month: 'short' });
    });
    return map;
  }

  const monthStarts = buildMonthLabelMap(startDate, today, weeks);

  const counts = daily.map(d => d.count || 0);
  const max = Math.max(...counts, 1);

  // Define fixed color buckets for predictable legend
  const palette = isDarkMode
    ? ['#0f172a', '#1f2937', '#065f46', '#059669', '#10b981']
    : ['#f3f4f6', '#e6f4ea', '#c7f0d4', '#7fe0ac', '#34d399'];

  function bucketFor(count) {
    if (!count) return 0;
    const pct = count / max;
    if (pct < 0.25) return 1;
    if (pct < 0.5) return 2;
    if (pct < 0.75) return 3;
    return 4;
  }

  function colorFor(count) {
    return palette[bucketFor(count)];
  }

  function onEnter(e, date) {
    const target = e.target;
    const containerRect = containerRef.current?.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const left = containerRect ? rect.left - containerRect.left + rect.width / 2 : rect.left + rect.width / 2;
    const top = containerRect ? rect.top - containerRect.top - 8 : rect.top - 8;
    // initialize hover and allow mousemove to update
    setHover({ date, count: map[date] || 0, left, top });
  }
  function onLeave() { setHover(null); }

  // update hover position to follow mouse
  function handleSquareMouseMove(e, date) {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const tooltipWidth = tooltipRef.current?.offsetWidth || 120;
    let left = e.clientX - containerRect.left;
    const top = e.clientY - containerRect.top - 20;
    // clamp left so tooltip stays inside container
    const minLeft = tooltipWidth / 2 + 6;
    const maxLeft = containerRect.width - tooltipWidth / 2 - 6;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;
    setHover(prev => prev && prev.date === date ? ({ ...prev, left, top }) : prev);
  }

  // drag-to-scroll handlers
  function handleMouseDown(e) {
    const el = scrollRef.current;
    if (!el) return;
    // cancel any running momentum
    if (dragState.current.momentumId) {
      cancelAnimationFrame(dragState.current.momentumId);
      dragState.current.momentumId = null;
    }
    dragState.current.isDown = true;
    dragState.current.startX = e.pageX - el.offsetLeft;
    dragState.current.scrollLeft = el.scrollLeft;
    dragState.current.lastX = e.pageX;
    dragState.current.lastTime = performance.now();
    dragState.current.velocity = 0;
    el.classList.add('cursor-grabbing');
  }
  function handleMouseLeave() {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current.isDown = false;
    el.classList.remove('cursor-grabbing');
  }
  function handleMouseUp() {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current.isDown = false;
    el.classList.remove('cursor-grabbing');
    // start momentum (tuned)
    const startVelocity = (dragState.current.velocity || 0) * 1.3; // multiplier to make fling feel snappier
    const decay = 0.0025; // higher decay -> stronger friction
    let lastT = performance.now();
    function step(t) {
      const dt = t - lastT; lastT = t;
      el.scrollLeft -= dragState.current.velocity * dt * 100; // scale for visible movement
      // exponential decay
      dragState.current.velocity *= Math.exp(-decay * dt);
      if (Math.abs(dragState.current.velocity) > 0.001) {
        dragState.current.momentumId = requestAnimationFrame(step);
      } else {
        dragState.current.momentumId = null;
      }
    }
    if (Math.abs(startVelocity) > 0.02) {
      dragState.current.velocity = startVelocity;
      dragState.current.momentumId = requestAnimationFrame(step);
    }
  }
  function handleMouseMove(e) {
    const el = scrollRef.current;
    if (!el || !dragState.current.isDown) return;
    e.preventDefault();
    const x = e.pageX;
    const localX = x - el.offsetLeft;
    const walk = (localX - dragState.current.startX) * 1; // scroll-fast factor
    el.scrollLeft = dragState.current.scrollLeft - walk;

    // compute velocity (px per ms)
    const now = performance.now();
    const dt = now - dragState.current.lastTime || 16;
    const dx = x - dragState.current.lastX;
    const v = dx / dt; // px per ms
    dragState.current.velocity = v;
    dragState.current.lastX = x;
    dragState.current.lastTime = now;
  }

  // touch support
  function handleTouchStart(e) {
    const el = scrollRef.current;
    if (!el) return;
    if (dragState.current.momentumId) {
      cancelAnimationFrame(dragState.current.momentumId);
      dragState.current.momentumId = null;
    }
    dragState.current.isDown = true;
    dragState.current.startX = e.touches[0].pageX - el.offsetLeft;
    dragState.current.scrollLeft = el.scrollLeft;
    dragState.current.lastX = e.touches[0].pageX;
    dragState.current.lastTime = performance.now();
    dragState.current.velocity = 0;
  }
  function handleTouchMove(e) {
    const el = scrollRef.current;
    if (!el || !dragState.current.isDown) return;
    const x = e.touches[0].pageX;
    const localX = x - el.offsetLeft;
    const walk = (localX - dragState.current.startX) * 1;
    el.scrollLeft = dragState.current.scrollLeft - walk;

    const now = performance.now();
    const dt = now - dragState.current.lastTime || 16;
    const dx = x - dragState.current.lastX;
    const v = dx / dt;
    dragState.current.velocity = v;
    dragState.current.lastX = x;
    dragState.current.lastTime = now;
  }
  function handleTouchEnd() {
    dragState.current.isDown = false;
    const el = scrollRef.current;
    if (!el) return;
    const startVelocity = (dragState.current.velocity || 0) * 1.3;
    const decay = 0.0025;
    let lastT = performance.now();
    function step(t) {
      const dt = t - lastT; lastT = t;
      el.scrollLeft -= dragState.current.velocity * dt * 100;
      dragState.current.velocity *= Math.exp(-decay * dt);
      if (Math.abs(dragState.current.velocity) > 0.001) {
        dragState.current.momentumId = requestAnimationFrame(step);
      } else {
        dragState.current.momentumId = null;
      }
    }
    if (Math.abs(startVelocity) > 0.02) {
      dragState.current.velocity = startVelocity;
      dragState.current.momentumId = requestAnimationFrame(step);
    }
  }

  // show scroll hint when content overflows; hide after user scrolls or after timeout
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function update() {
      setShowHint(el.scrollWidth > el.clientWidth + 2);
    }
    update();
    const onScroll = () => setShowHint(false);
    el.addEventListener('scroll', onScroll);
    window.addEventListener('resize', update);
    const t = setTimeout(() => setShowHint(false), 3000);
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', update); clearTimeout(t); };
  }, []);

  // cleanup momentum on unmount
  React.useEffect(() => {
    const id = dragState.current.momentumId;
    return () => { if (id) cancelAnimationFrame(id); };
  }, []);

  return (
    <div ref={containerRef} className="p-3 rounded-lg bg-gray-800/30 relative w-full overflow-auto">
        {/* auto-hide scrollbar styles (webkit + firefox) */}
        <style>{`
          .heatmap-scroll::-webkit-scrollbar { display: none; }
          .heatmap-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
  <div className="text-sm font-semibold mb-2" onDoubleClick={() => setShowDebug(s => !s)} title="Double-click to toggle debug overlay">Contributions (last 12 months)</div>
      <div className="flex gap-1">
        {/* weekday labels */}
        <div className="flex-col gap-1 mr-2 hidden sm:flex">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i) => (
            <div key={d} className="text-xs text-gray-400" style={{ height: 14 }}>{i%2===0?d:''}</div>
          ))}
        </div>

        {/* weeks container - allow horizontal scroll inside the parent when many weeks */}
          {/* month labels */}
          <div className="mb-1 w-full overflow-hidden">
            <div style={{ display: 'flex', gap: 6, minWidth: 'max-content', alignItems: 'center' }}>
              {(() => {
                // monthStarts maps weekIndex -> month short name
                const labelMap = {};
                Object.entries(monthStarts).forEach(([wi, name]) => {
                  labelMap[Number(wi)] = name;
                });

                return weeks.map((week, wi) => (
                  <div key={wi} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                    {labelMap[wi] ? <div style={{ width: 2, height: 8, background: 'rgba(156,163,175,0.7)', borderRadius: 1, marginBottom: 2 }} /> : <div style={{ height: 8 }} />}
                    {labelMap[wi] ? <div className="text-xs text-gray-400" style={{ textAlign: 'center', fontSize: 11 }}>{labelMap[wi]}</div> : <div style={{ height: 12 }} />}
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* weeks container - allow horizontal scroll inside the parent when many weeks */}
          <div
            ref={scrollRef}
            className="heatmap-scroll"
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ display: 'flex', gap: 6, minWidth: 'max-content', overflowX: 'auto', paddingBottom: 4 }}
          >
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                {week.map(day => {
                  const date = day.date;
                  const within = new Date(date) >= startDate && new Date(date) <= today;
                  const count = map[date] || 0;
                  const color = within ? colorFor(count) : 'transparent';
                  const isToday = date === today.toISOString().slice(0,10);
                  return (
                    <div
                      key={date}
                      onMouseEnter={(e) => within && onEnter(e, date)}
                      onMouseMove={(e) => within && handleSquareMouseMove(e, date)}
                      onMouseLeave={onLeave}
                      onFocus={(e) => within && onEnter(e, date)}
                      onBlur={onLeave}
                      tabIndex={within ? 0 : -1}
                      role="button"
                      aria-label={`${date}: ${count} contributions`}
                      style={{ width: 12, height: 12, backgroundColor: color, borderRadius: 4, cursor: within ? 'pointer' : 'default', boxSizing: 'border-box', outline: isToday ? '2px solid rgba(59,130,246,0.9)' : 'none' }}
                      title={`${date}: ${count}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
      </div>

      {/* legend */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-300">
        <span className="mr-2">Less</span>
        {palette.map((c, i) => (
          <div key={i} className="w-4 h-3 rounded" style={{ background: c, border: i===0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }} />
        ))}
        <span className="ml-2">More</span>
      </div>

      {hover && (
        <div ref={tooltipRef} style={{ position: 'absolute', left: hover.left, top: hover.top - 28, transform: 'translateX(-50%)', background: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#fff' : '#000', padding: '6px 8px', borderRadius: 6, fontSize: 12, zIndex: 60, boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
          <div className="font-medium">{hover.date}</div>
          <div className="text-xs text-gray-300" style={{ color: isDarkMode ? '#d1d5db' : '#6b7280' }}>Contributions: {hover.count}</div>
        </div>
      )}

      {/* debug overlay: show week index and first date when toggled */}
      {showDebug && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-6 left-6 text-xs text-yellow-300 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>Debug: week index -&gt; first date</div>
          <div style={{ position: 'absolute', top: 32, left: 6, display: 'flex', gap: 6, padding: 6, overflowX: 'auto', pointerEvents: 'auto' }}>
            {weeks.map((w, i) => (
              <div key={i} className="text-xs text-yellow-200 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                #{i}: {w[0].date}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* small scroll hint handle - appears when content overflows and user hasn't scrolled yet */}
      {showHint && (
        <div aria-hidden className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/30 dark:bg-white/10 text-xs text-gray-200 px-2 py-1 rounded-full shadow-sm">
          <div className="w-6 h-1 bg-gray-400 rounded-full animate-pulse" />
          <div>Drag to scroll</div>
        </div>
      )}
    </div>
  );
}
