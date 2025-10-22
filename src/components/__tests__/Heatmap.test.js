import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Heatmap from '../Heatmap';

test('focus on a day square shows tooltip / aria-live announcement', async () => {
  const todayKey = new Date().toISOString().slice(0,10);
  render(<Heatmap daily={[{ date: todayKey, count: 3 }]} isDarkMode={true} />);

  // find the square by its aria-label and focus it
  const square = await screen.findByLabelText(`${todayKey}: 3 contributions`);
  fireEvent.focus(square);

  // aria-live region should contain the announcement text
  const liveText = await screen.findByText(`${todayKey}: 3 contributions`);
  expect(liveText).toBeInTheDocument();
});
