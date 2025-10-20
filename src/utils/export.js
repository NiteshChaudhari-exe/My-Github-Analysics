import { saveAs } from 'file-saver';

export const exportDataAsJSON = (data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  saveAs(blob, `github-analytics-${new Date().toISOString().slice(0, 10)}.json`);
};

export const exportDataAsCSV = (data) => {
  // Convert language data to CSV
  const languageRows = data.languages.map(l => `${l.name},${l.value}`);
  const languageCSV = ['Language,Percentage', ...languageRows].join('\n');

  // Convert monthly data to CSV
  const monthlyRows = data.monthlySeries.map(m => `${m.month},${m.commits},${m.prs}`);
  const monthlyCSV = ['Month,Commits,PRs', ...monthlyRows].join('\n');

  // Create separate files for different data types
  const files = {
    'languages.csv': languageCSV,
    'monthly-activity.csv': monthlyCSV,
    'summary.csv': [
      'Metric,Value',
      `Total Commits,${data.stats.commits}`,
      `Repositories,${data.stats.repos}`,
      `Contributions,${data.stats.contributions}`,
      `Pull Requests,${data.stats.pullRequests}`,
      `Code Reviews,${data.stats.codeReviews}`
    ].join('\n')
  };

  // Create a zip file containing all CSVs
  const zip = require('jszip')();
  Object.entries(files).forEach(([filename, content]) => {
    zip.file(filename, content);
  });

  // Generate and download the zip file
  zip.generateAsync({ type: 'blob' }).then(blob => {
    saveAs(blob, `github-analytics-${new Date().toISOString().slice(0, 10)}.zip`);
  });
};

export const generateReport = (data) => {
  const template = `
# GitHub Analytics Report
Generated on: ${new Date().toLocaleString()}

## Overview
- Total Commits: ${data.stats.commits}
- Repositories: ${data.stats.repos}
- Contributions: ${data.stats.contributions}
- Pull Requests: ${data.stats.pullRequests}
- Code Reviews: ${data.stats.codeReviews}

## Technology Distribution
${data.languages.map(l => `- ${l.name}: ${l.value}%`).join('\n')}

## Monthly Activity
${data.monthlySeries.map(m => `- ${m.month}: ${m.commits} commits, ${m.prs} PRs`).join('\n')}
  `.trim();

  const blob = new Blob([template], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `github-analytics-report-${new Date().toISOString().slice(0, 10)}.md`);
};