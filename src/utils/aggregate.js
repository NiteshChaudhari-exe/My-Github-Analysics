// Utilities to aggregate contribution data by month

export function aggregateDailyToMonths(days) {
  // days: [{date: 'YYYY-MM-DD', count: number}]
  const map = {};
  (days || []).forEach(d => {
    const m = d.date.slice(0, 7);
    map[m] = (map[m] || 0) + (d.count || 0);
  });
  const months = Object.keys(map).sort();
  return months.map(m => ({ month: m, total: map[m] }));
}

export function aggregateDatesToMonthMap(dates) {
  // dates: array of ISO date strings
  const map = {};
  (dates || []).forEach(dt => {
    try {
      const m = new Date(dt).toISOString().slice(0,7);
      map[m] = (map[m] || 0) + 1;
    } catch (e) {
      // ignore invalid dates
    }
  });
  return map;
}

export function monthMapToSeries(months, commitMap = {}, prMap = {}) {
  return months.map(m => ({ month: m, commits: commitMap[m] || 0, prs: prMap[m] || 0 }));
}
