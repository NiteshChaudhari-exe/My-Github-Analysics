import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RepoList from '../RepoList';

const sampleRepos = [
  { id: 1, name: 'alpha', description: 'first repo', stargazers_count: 5, forks_count: 1, updated_at: '2021-01-01T00:00:00Z' },
  { id: 2, name: 'beta', description: 'second repo', stargazers_count: 10, forks_count: 2, updated_at: '2022-01-01T00:00:00Z' },
];

test('renders loading state', () => {
  render(<RepoList repos={[]} isLoading={true} />);
  expect(screen.getByText(/loading repositories/i)).toBeInTheDocument();
});

test('renders empty state when no repos', () => {
  render(<RepoList repos={[]} isLoading={false} />);
  expect(screen.getByText(/no repositories found/i)).toBeInTheDocument();
});

test('renders list and handles click', () => {
  const onOpen = jest.fn();
  render(<RepoList repos={sampleRepos} onOpenRepo={onOpen} />);
  expect(screen.getByText('alpha')).toBeInTheDocument();
  expect(screen.getByText('beta')).toBeInTheDocument();

  fireEvent.click(screen.getByText('alpha'));
  expect(onOpen).toHaveBeenCalled();
});

