import React, { useState, useRef } from 'react';
import { generateWeeks, buildMonthLabelMap, clamp, FLING, formatMonthLabel } from '../utils/heatmap';

// Receives props.daily: Array of { date: 'YYYY-MM-DD', count: number }
export default function Heatmap({ daily = [], isDarkMode = true }) {
  const [hover, setHover] = useState(null); // {date, count, left, top}
  const [showDebug, setShowDebug] = useState(false);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipIdRef = useRef(`heatmap-tooltip-${Math.random().toString(36).slice(2,9)}`);
  const [showHint, setShowHint] = useState(false);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, lastX: 0, lastTime: 0, velocity: 0, momentumId: null });
  // Virtualization config
  const SQUARE_SIZE = 12; // px
  const GAP = 6; // px gap between week columns (css gap)
  const COLUMN_STEP = SQUARE_SIZE + GAP; // effective step per week column
  const VIRTUAL_BUFFER = 8; // number of extra weeks to render on each side
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 0 });

  // map of date->count
  const map = {};
  daily.forEach(d => { map[d.date] = d.count || 0; });

  // generate weeks using UTC-aware helper
  const { today, startDate, weeks } = generateWeeks({});

  // helper: build mapping of weekIndex -> month short name for the week that contains each month's 1st day
  const monthStarts = buildMonthLabelMap(startDate, today, weeks);

  const counts = daily.map(d => d.count || 0);
  const max = Math.max(...counts, 1);

  // Define fixed color buckets for predictable legend
  const palette = isDarkMode
    ? ['#0f172a', '#1f2937', '#065f46', '#059669', '#10b981']
    : ['#f3f4f6', '#e6f4ea', '#c7f0d4', '#7fe0ac', '#34d399'];

  // palette presets
  const PALETTES = {
    default: palette,
    warm: isDarkMode ? ['#0b1220','#3b1f1f','#7b2c1f','#c96b3b','#ff9b66'] : ['#fff5f0','#ffe6dc','#ffc9ad','#ff8a4c','#ff6b2d'],
    blue: isDarkMode ? ['#041024','#0b2a4a','#0f4a86','#0f6fbf','#3aa0ff'] : ['#f0f9ff','#d9f2ff','#a9ddff','#5fb8ff','#2b9cff']
  };
  const currentPalette = PALETTES.default;

  function bucketFor(count) {
    if (!count) return 0;
    const pct = count / max;
    if (pct < 0.25) return 1;
    if (pct < 0.5) return 2;
    if (pct < 0.75) return 3;
    return 4;
  }

  function colorFor(count) {
    return currentPalette[bucketFor(count)];
  }

  // simple selection state for range (click start, click end)
  const [selection, setSelection] = useState({ start: null, end: null });
  function handleSelect(date) {
    if (!selection.start) {
      setSelection({ start: date, end: null });
      return;
    }
    if (selection.start && !selection.end) {
      const s = selection.start;
      // ensure start <= end lexicographically for YYYY-MM-DD
      if (date >= s) setSelection({ start: s, end: date });
      else setSelection({ start: date, end: s });
      return;
    }
    // reset selection to new start
    setSelection({ start: date, end: null });
  }

  function onEnter(e, date) {
    const target = e.target;
    const containerRect = containerRef.current?.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    const pos = computeTooltipPosition(containerRect, clientX, clientY);
    // initialize hover and allow mousemove to update
    setHover({ date, count: map[date] || 0, left: pos.left, top: pos.top, placement: pos.placement, arrowLeft: pos.arrowLeft });
  }
  function onLeave() { setHover(null); }

  // update hover position to follow mouse
  function handleSquareMouseMove(e, date) {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const pos = computeTooltipPosition(containerRect, e.clientX, e.clientY);
    setHover(prev => prev && prev.date === date ? ({ ...prev, left: pos.left, top: pos.top, placement: pos.placement, arrowLeft: pos.arrowLeft }) : prev);
  }

  // compute clamped tooltip position and arrow offset (percent)
  function computeTooltipPosition(containerRect, clientX, clientY) {
    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl?.offsetWidth || 120;
    const tooltipHeight = tooltipEl?.offsetHeight || 44;
    const rawCx = clientX - (containerRect?.left || 0);
    const minCenter = tooltipWidth / 2 + 8;
    const maxCenter = (containerRect?.width || 0) - tooltipWidth / 2 - 8;
    const leftCenter = Math.max(minCenter, Math.min(maxCenter, rawCx));

    // arrowLeft is the arrow position inside the tooltip as percent
    const arrowLeft = Math.max(8, Math.min(92, ((rawCx - (leftCenter - tooltipWidth / 2)) / tooltipWidth) * 100));

    // placement: prefer top if enough space, otherwise bottom
    const spaceAbove = clientY - (containerRect?.top || 0);
    const spaceBelow = (containerRect?.bottom || 0) - clientY;
    const placement = spaceAbove > tooltipHeight + 16 ? 'top' : (spaceBelow > tooltipHeight + 16 ? 'bottom' : 'top');

    const top = placement === 'top'
      ? (clientY - (containerRect?.top || 0) - tooltipHeight - 10)
      : (clientY - (containerRect?.top || 0) + 10);

    return { left: leftCenter, top, placement, arrowLeft };
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
    const startVelocity = (dragState.current.velocity || 0) * FLING.MULTIPLIER; // multiplier to make fling feel snappier
    const decay = FLING.DECAY; // higher decay -> stronger friction
    let lastT = performance.now();
    function step(t) {
      const dt = t - lastT; lastT = t;
      // update position with scaled velocity
      const next = el.scrollLeft - dragState.current.velocity * dt * FLING.SCALE;
      // clamp to bounds
      const maxScroll = el.scrollWidth - el.clientWidth;
      el.scrollLeft = clamp(next, 0, Math.max(0, maxScroll));
      // exponential decay
      dragState.current.velocity *= Math.exp(-decay * dt);
      if (Math.abs(dragState.current.velocity) > 0.001) {
        dragState.current.momentumId = requestAnimationFrame(step);
      } else {
        dragState.current.momentumId = null;
      }
    }
    if (Math.abs(startVelocity) > FLING.MIN_VELOCITY) {
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
    const startVelocity = (dragState.current.velocity || 0) * FLING.MULTIPLIER;
    const decay = FLING.DECAY;
    let lastT = performance.now();
    function step(t) {
      const dt = t - lastT; lastT = t;
      const next = el.scrollLeft - dragState.current.velocity * dt * FLING.SCALE;
      const maxScroll = el.scrollWidth - el.clientWidth;
      el.scrollLeft = clamp(next, 0, Math.max(0, maxScroll));
      dragState.current.velocity *= Math.exp(-decay * dt);
      if (Math.abs(dragState.current.velocity) > 0.001) {
        dragState.current.momentumId = requestAnimationFrame(step);
      } else {
        dragState.current.momentumId = null;
      }
    }
    if (Math.abs(startVelocity) > FLING.MIN_VELOCITY) {
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

  // virtualization: update visible range based on scroll position and container width
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = null;
    const totalCols = weeks.length;
    function updateRange() {
      const scrollLeft = el.scrollLeft;
      const clientWidth = el.clientWidth;
      const startIdx = Math.floor(scrollLeft / COLUMN_STEP) - VIRTUAL_BUFFER;
      const endIdx = Math.ceil((scrollLeft + clientWidth) / COLUMN_STEP) + VIRTUAL_BUFFER;
      const s = Math.max(0, startIdx);
      const e = Math.min(totalCols - 1, Math.max(s, endIdx));
      setVisibleRange({ start: s, end: e });
    }
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateRange);
    };
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateRange);
    };
    el.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onResize);
    // initial compute
    updateRange();
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); if (raf) cancelAnimationFrame(raf); };
  }, [weeks.length, COLUMN_STEP]);

  // During tests, the scrollRef dimensions may be zero; render all weeks so tests can query day cells.
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      setVisibleRange({ start: 0, end: Math.max(0, weeks.length - 1) });
    }
  }, [weeks.length]);

  // cleanup momentum on unmount
  React.useEffect(() => {
    const id = dragState.current.momentumId;
    return () => { if (id) cancelAnimationFrame(id); };
  }, []);

  // handle Escape key to dismiss tooltip for keyboard users
  React.useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setHover(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
                    {labelMap[wi] ? (() => {
                      // build Date from the week's day that matches the month-start
                      const label = labelMap[wi];
                      // find the corresponding date object to determine whether to include year
                      const monthDate = week.find(d => d.date.endsWith('-01'))?.dateObj;
                      const text = monthDate ? formatMonthLabel(monthDate, undefined, monthDate.getUTCMonth() === 0) : label;
                      return <div className="text-xs text-gray-400" style={{ textAlign: 'center', fontSize: 11 }}>{text}</div>;
                    })() : <div style={{ height: 12 }} />}
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
            style={{ display: 'flex', gap: GAP, minWidth: 'max-content', overflowX: 'auto', paddingBottom: 4 }}
          >
            {/* left spacer */}
            <div style={{ width: Math.max(0, visibleRange.start * COLUMN_STEP) }} aria-hidden />
            {weeks.slice(visibleRange.start, visibleRange.end + 1).map((week, wi) => {
              const idx = visibleRange.start + wi;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: GAP, minWidth: 0 }}>
                  {week.map(day => {
                    const date = day.date;
                    const within = new Date(date) >= startDate && new Date(date) <= today;
                    const count = map[date] || 0;
                    const color = within ? colorFor(count) : 'transparent';
                    const isToday = date === today.toISOString().slice(0,10);
                    const isSelected = selection.start && selection.end ? (date >= selection.start && date <= selection.end) : (selection.start === date);
                    const bg = isSelected ? (isDarkMode ? '#0ea5e9' : '#7dd3fc') : color;
                    return (
                      <div
                        key={date}
                        onClick={() => within && handleSelect(date)}
                        onMouseEnter={(e) => within && onEnter(e, date)}
                        onMouseMove={(e) => within && handleSquareMouseMove(e, date)}
                        onMouseLeave={onLeave}
                        onFocus={(e) => within && onEnter(e, date)}
                        onBlur={onLeave}
                        tabIndex={within ? 0 : -1}
                        role="button"
                        aria-label={`${date}: ${count} contributions`}
                        aria-describedby={hover && hover.date === date ? tooltipIdRef.current : undefined}
                        style={{ width: SQUARE_SIZE, height: SQUARE_SIZE, backgroundColor: bg, borderRadius: 4, cursor: within ? 'pointer' : 'default', boxSizing: 'border-box', outline: isToday ? '2px solid rgba(59,130,246,0.9)' : 'none' }}
                        title={`${date}: ${count}`}
                      />
                    );
                  })}
                </div>
              );
            })}
            {/* right spacer */}
            <div style={{ width: Math.max(0, (weeks.length - 1 - visibleRange.end) * COLUMN_STEP) }} aria-hidden />
          </div>
      </div>

      {/* legend (accessible) */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-300" role="img" aria-label="Contribution intensity legend">
        <span className="mr-2" aria-hidden>Less</span>
        <div role="list" className="flex items-center gap-1">
          {palette.map((c, i) => (
            <div key={i} role="listitem" aria-label={i===0? 'none' : `${i} contributions`} className="w-4 h-3 rounded" style={{ background: c, border: i===0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }} />
          ))}
        </div>
        <span className="ml-2" aria-hidden>More</span>
      </div>

      {hover && (
        <div
          id={tooltipIdRef.current}
          ref={tooltipRef}
          role="tooltip"
          aria-live="polite"
          aria-hidden={hover ? 'false' : 'true'}
          tabIndex={-1}
          style={{
            position: 'absolute',
            left: hover.left,
            top: hover.top,
            transform: 'translateX(-50%)',
            background: isDarkMode ? '#0f172a' : '#ffffff',
            color: isDarkMode ? '#fff' : '#000',
            padding: '6px 8px',
            borderRadius: 6,
            fontSize: 12,
            zIndex: 60,
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)'
          }}
        >
          {/* arrow */}
          <div style={{ position: 'absolute', left: `${hover.arrowLeft || 50}%`, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', ...(hover.placement === 'top' ? { bottom: -6, borderTop: `6px solid ${isDarkMode ? '#0f172a' : '#ffffff'}` } : { top: -6, borderBottom: `6px solid ${isDarkMode ? '#0f172a' : '#ffffff'}` }) }} />
          <div className="font-medium">{hover.date}</div>
          <div className="text-xs text-gray-300" style={{ color: isDarkMode ? '#d1d5db' : '#6b7280' }}>Contributions: {hover.count}</div>
        </div>
      )}

      {/* aria-live region for screen readers to announce tooltip changes when keyboard-focused */}
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(1px, 1px, 1px, 1px)' }}>
        {hover ? `${hover.date}: ${hover.count} contributions` : ''}
      </div>

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
