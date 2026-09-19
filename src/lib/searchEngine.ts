/** Metadata + keyword ranking — not vector/embedding semantic search. */
import { DriveFile, SemanticSearchResult } from '../types';

export function runSemanticSearch(
  query: string,
  files: DriveFile[],
  filterCategory?: string
): SemanticSearchResult[] {
  const filtered = files.filter(file => {
    if (!filterCategory || filterCategory === 'all') return true;
    if (filterCategory === 'google_drive') return Boolean(file.isGoogleDriveItem);
    return file.category === filterCategory;
  });

  // Empty query = browse mode (no ranked relevance)
  if (!query.trim()) {
    return filtered.map(file => ({
      file,
      score: 0,
      matchedSnippet: file.semanticSummary || file.name,
      relevanceReason: 'Browse mode (no query)',
    }));
  }

  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results: SemanticSearchResult[] = [];

  for (const file of filtered) {
    let score = 0;
    const reasons: string[] = [];

    const fileNameLower = file.name.toLowerCase();
    const summaryLower = (file.semanticSummary || '').toLowerCase();
    const tagsCombined = (file.tags || []).join(' ').toLowerCase();
    const q = query.toLowerCase();

    if (summaryLower.includes(q) || fileNameLower.includes(q)) {
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
