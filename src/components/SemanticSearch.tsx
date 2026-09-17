import React, { useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Filter,
  FileText,
  Image as ImageIcon,
  Table,
  Archive,
  Lock,
  ArrowRight,
  SlidersHorizontal,
  X,
  ExternalLink,
} from 'lucide-react';
import { DriveFile, FileCategory } from '../types';
import { runSemanticSearch } from '../lib/searchEngine';
import { formatBytes } from '../lib/driveApi';

interface SemanticSearchProps {
  files: DriveFile[];
  onSelectFile: (file: DriveFile) => void;
}

const SAMPLE_PROMPTS = [
  'financial audits and fiscal reports',
  'team offsite photos in san francisco',
  'confidential client contracts vault',
  'mobile and tablet responsive wireframes',
  'sales projections and regional quota',
];

export const SemanticSearch: React.FC<SemanticSearchProps> = ({
  files,
  onSelectFile,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const results = useMemo(() => {
    return runSemanticSearch(query, files, selectedCategory);
  }, [query, files, selectedCategory]);

  const categories: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: 'All Files', value: 'all', icon: null },
    { label: 'Documents', value: 'document', icon: <FileText className="w-3.5 h-3.5" /> },
    { label: 'Images', value: 'image', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { label: 'Spreadsheets', value: 'spreadsheet', icon: <Table className="w-3.5 h-3.5" /> },
    { label: 'Archives', value: 'archive', icon: <Archive className="w-3.5 h-3.5" /> },
  ];

  const getScoreBadge = (score: number) => {
    if (score >= 80) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
        label: 'High Match',
      };
    }
    if (score >= 50) {
      return {
        bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
        label: 'Medium Match',
      };
    }
    return {
      bg: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400',
      label: 'Related',
    };
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-blue-950/80 via-zinc-900 to-zinc-950 text-white border border-blue-900/30 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">AI Semantic Vector Search</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Concept Match
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                Search files by concept, topic, or natural language query without needing exact filename matches.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar and Filters */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="semantic-search-input"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Describe what you are looking for (e.g. 'recent team photos', 'fiscal audits')..."
            className="w-full pl-11 pr-10 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-xs sm:text-sm min-h-[44px]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-zinc-400 text-[11px] font-medium shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-500" /> Suggestions:
          </span>
          {SAMPLE_PROMPTS.map(sample => (
            <button
              key={sample}
              type="button"
              onClick={() => setQuery(sample)}
              className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[11px] shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 transition min-h-[36px] flex items-center"
            >
              {sample}
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition min-h-[38px] ${
                  selectedCategory === cat.value
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>
          Found <strong className="text-zinc-900 dark:text-zinc-100">{results.length}</strong> matching item
          {results.length !== 1 ? 's' : ''}
        </span>
        {query && <span>Ranked by contextual relevance</span>}
      </div>

      {/* Search Results List */}
      <div className="space-y-3">
        {results.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <Search className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No matching files found</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Try adjusting your semantic query terms or clear the category filters to broaden your search.
            </p>
          </div>
        ) : (
          results.map(({ file, score, matchedSnippet, relevanceReason }) => {
            const badge = getScoreBadge(score);

            return (
              <div
                key={file.id}
                onClick={() => onSelectFile(file)}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/40 cursor-pointer transition shadow-xs group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.name}
                        className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                          {file.name}
                        </h4>
                        {file.isEncrypted && (
                          <span className="p-0.5 rounded bg-amber-500/10 text-amber-500">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 line-clamp-2">
                        {matchedSnippet}
                      </p>

                      <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] text-zinc-400">
                        <span>{formatBytes(file.size)}</span>
                        <span>•</span>
                        <span>Modified: {new Date(file.modifiedTime).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {relevanceReason}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 sm:w-16 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {score}%
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
