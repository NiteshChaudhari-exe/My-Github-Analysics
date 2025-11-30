import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../Login';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

test('tests token and displays user on success', async () => {
  // mock POST /auth/token/test
  // first call: initial /api/github/user check (not authenticated)
  global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
  // second call: POST /auth/token/test
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ ok: true, user: { login: 'octocat', avatar_url: 'http://avatar', name: 'The Cat' }, scopes: 'repo,read:user' }),
  });

  render(<Login />);

  const input = screen.getByPlaceholderText(/ghp_xxx|gho_/i) || screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'ghp_testtoken' } });

  const testButton = screen.getByText(/Test token/i);
  fireEvent.click(testButton);

  // wait for user to appear
  expect(await screen.findByText('octocat')).toBeInTheDocument();
  const avatar = screen.getByRole('img', { name: /avatar/i });
  expect(avatar).toHaveAttribute('src', 'http://avatar');
});

test('save posts token, stores server-side and calls onSaved', async () => {
  const onSaved = jest.fn();

  // first call: initial /api/github/user check (not authenticated)
  global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
  // second call: POST /auth/token
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ ok: true, user: { login: 'octocat' }, scopes: 'repo' }),
  });

  render(<Login onSaved={onSaved} />);

  const input = screen.getByPlaceholderText(/ghp_xxx|gho_/i) || screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: '  ghp_save_me  ' } });

  const saveButton = screen.getByText(/Save token/i);
  fireEvent.click(saveButton);

  await waitFor(() => expect(onSaved).toHaveBeenCalled());

  // UI should show the username
  expect(await screen.findByText('octocat')).toBeInTheDocument();
});
