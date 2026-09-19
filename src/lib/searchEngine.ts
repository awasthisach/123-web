/** Metadata + keyword ranking — not vector/embedding semantic search. */
import { DriveFile, SemanticSearchResult } from '../types';

export function runSemanticSearch(
  query: string,
  files: DriveFile[],
  filterCategory?: string
): SemanticSearchResult[] {
  if (!query.trim()) {
    return files.map(file => ({
      file,
      score: 100,
      matchedSnippet: file.semanticSummary,
      relevanceReason: 'Metadata index (no query)',
    }));
  }

  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results: SemanticSearchResult[] = [];

  for (const file of files) {
    if (filterCategory && filterCategory !== 'all') {
      if (filterCategory === 'google_drive') {
        if (!file.isGoogleDriveItem) continue;
      } else if (file.category !== filterCategory) {
        continue;
      }
    }

    let score = 0;
    const reasons: string[] = [];

    const fileNameLower = file.name.toLowerCase();
    const summaryLower = (file.semanticSummary || '').toLowerCase();
    const tagsCombined = (file.tags || []).join(' ').toLowerCase();

    if (summaryLower.includes(query.toLowerCase()) || fileNameLower.includes(query.toLowerCase())) {
      score += 45;
      reasons.push('Phrase match in name or metadata summary');
    }

    let matchedTermsCount = 0;
    for (const term of queryTerms) {
      if (fileNameLower.includes(term)) {
        score += 25;
        matchedTermsCount++;
      } else if (summaryLower.includes(term)) {
        score += 15;
        matchedTermsCount++;
      } else if (tagsCombined.includes(term)) {
        score += 10;
        matchedTermsCount++;
      }
    }

    if (matchedTermsCount > 0) {
      reasons.push(`Matched ${matchedTermsCount}/${queryTerms.length} terms`);
    }

    if (file.starred) {
      score += 5;
      reasons.push('Starred');
    }

    if (score > 0) {
      results.push({
        file,
        score: Math.min(score, 100),
        matchedSnippet: file.semanticSummary || file.name,
        relevanceReason: reasons.join(' · ') || 'Keyword match',
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
