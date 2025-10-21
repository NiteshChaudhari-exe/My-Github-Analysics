import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useDebouncedValue } from '../hooks/useGitHubData';

const RepoSearch = ({ onSearch, className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm);

  // Update search when debounced value changes
  React.useEffect(() => {
    onSearch(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search repositories..."
        className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};

export const useRepoFilters = (repos) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('stars'); // 'stars', 'name'
  const [filterLanguage, setFilterLanguage] = useState('');

  const filteredRepos = useMemo(() => {
    return repos
      .filter(repo => {
        const matchesSearch = !searchTerm || 
          repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          repo.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesLanguage = !filterLanguage || 
          repo.language === filterLanguage;

        return matchesSearch && matchesLanguage;
      })
        .sort((a, b) => {
        switch (sortBy) {
          case 'stars':
            return b.stargazers_count - a.stargazers_count;
          case 'name':
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });
  }, [repos, searchTerm, sortBy, filterLanguage]);

  const languages = useMemo(() => {
    const langSet = new Set(repos.map(repo => repo.language).filter(Boolean));
    return Array.from(langSet).sort();
  }, [repos]);

  return {
    filteredRepos,
    languages,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    filterLanguage,
    setFilterLanguage
  };
};

export default RepoSearch;