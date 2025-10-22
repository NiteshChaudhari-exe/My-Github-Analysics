// Helper utilities for heatmap week generation and month label mapping.
// Date math uses UTC to avoid timezone drift and ensures week starts on Monday.
export function toUTCDate(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function formatYYYYMMDD(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

// Generate weeks array similar to the original Heatmap component.
// Returns { today, startDate, startMonday, weeks }
export function generateWeeks({ today: maybeToday, days = 364 } = {}) {
  const now = maybeToday ? new Date(maybeToday) : new Date();
  const today = toUTCDate(now);
  const startDate = toUTCDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())));
  startDate.setUTCDate(startDate.getUTCDate() - days);

  // find Monday on or before startDate
  const startMonday = new Date(startDate);
  const dayIndex = startMonday.getUTCDay(); // 0=Sun,1=Mon
  const daysSinceMonday = (dayIndex + 6) % 7; // 0 if Monday
  startMonday.setUTCDate(startMonday.getUTCDate() - daysSinceMonday);

  const weeks = [];
  const cursor = new Date(startMonday);
  while (cursor <= today) {
    const daysArr = [];
    for (let wd = 0; wd < 7; wd++) {
      const d = new Date(cursor);
      d.setUTCDate(cursor.getUTCDate() + wd);
      const key = formatYYYYMMDD(d);
      daysArr.push({ date: key, dateObj: toUTCDate(d) });
    }
    weeks.push(daysArr);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return { today, startDate, startMonday, weeks };
}

// Build mapping of weekIndex -> short month name for the week that contains YYYY-MM-01
export function buildMonthLabelMap(startDate, today, weeks, locale = undefined) {
  const map = {};
  const months = [];
  const mCursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  while (mCursor <= today) {
    months.push(new Date(mCursor));
    mCursor.setUTCMonth(mCursor.getUTCMonth() + 1);
  }
  months.forEach(dt => {
    const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-01`;
    const wi = weeks.findIndex(week => week.some(d => d.date === key));
    if (wi >= 0) map[wi] = dt.toLocaleString(locale, { month: 'short' });
  });
  return map;
}

// Simple clamp utility for scrolling bounds
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Fling/momentum defaults (can be tuned)
export const FLING = {
  MULTIPLIER: 1.3, // velocity multiplier when releasing
  DECAY: 0.0025, // exponential decay factor per ms
  MIN_VELOCITY: 0.02, // threshold to start momentum
  SCALE: 100, // scale factor converting velocity to scroll pixels per ms
};

// Format month label: include year when month is January or when requested
export function formatMonthLabel(dateObj, locale = undefined, includeYear = false) {
  const month = dateObj.toLocaleString(locale, { month: 'short' });
  const year = dateObj.getUTCFullYear();
  if (includeYear || dateObj.getUTCMonth() === 0) return `${month} ${year}`;
  return month;
}
