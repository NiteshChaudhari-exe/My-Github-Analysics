// Utilities for aggregating contribution data
export function aggregateMonthlyFromContribDays(days = []) {
  const map = {};
  days.forEach(d => {
    const m = d.date.slice(0,7); // YYYY-MM
    map[m] = (map[m] || 0) + (d.count || 0);
  });
  const months = Object.keys(map).sort();
  return months.map(m => ({ month: m, total: map[m] }));
}

export function bucketsToSeries(months = [], commitBuckets = {}, prBuckets = {}) {
  return months.map(m => ({ month: m, commits: commitBuckets[m] || 0, prs: prBuckets[m] || 0 }));
}
