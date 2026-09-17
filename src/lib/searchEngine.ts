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
      relevanceReason: 'Direct file repository index match',
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
    const summaryLower = file.semanticSummary.toLowerCase();
    const tagsCombined = file.tags.join(' ').toLowerCase();

    // Exact phrase match
    if (summaryLower.includes(query.toLowerCase()) || fileNameLower.includes(query.toLowerCase())) {
      score += 45;
      reasons.push('Exact phrase match in summary or filename');
    }

    // Term matches
    let matchedTermsCount = 0;
    for (const term of queryTerms) {
      if (fileNameLower.includes(term)) {
        score += 25;
        matchedTermsCount++;
      } else if (summaryLower.includes(term)) {
        score += 15;
        matchedTermsCount++;
      } else if (tagsCombined.includes(term)) {
        score += 12;
        matchedTermsCount++;
      }
    }

    // Google Drive origin boost if searching drive
    if (queryTerms.some(t => ['drive', 'google', 'cloud', 'gdrive'].includes(t)) && file.isGoogleDriveItem) {
      score += 35;
      reasons.push('Google Drive Cloud item');
    }

    // Semantic conceptual proximity checks
    if (queryTerms.some(t => ['money', 'revenue', 'tax', 'audit', 'fiscal', 'earning', 'budget', 'cost', 'sales', 'balance'].includes(t))) {
      if (file.tags.includes('finance') || file.tags.includes('audit') || file.tags.includes('sales') || file.category === 'spreadsheet') {
        score += 30;
        reasons.push('Semantic cluster: Financial & Accounting');
      }
    }

    if (queryTerms.some(t => ['trip', 'team', 'travel', 'photo', 'picture', 'camera', 'image', 'sf', 'pic', 'wallpaper'].includes(t))) {
      if (file.category === 'image' || file.tags.includes('team') || file.tags.includes('photo')) {
        score += 30;
        reasons.push('Semantic cluster: Media & Photography');
      }
    }

    if (queryTerms.some(t => ['secure', 'secret', 'password', 'confidential', 'safe', 'private', 'lock', 'vault'].includes(t))) {
      if (file.isEncrypted || file.tags.includes('vault') || file.tags.includes('confidential')) {
        score += 35;
        reasons.push('Semantic cluster: High-Security / Encrypted Vault');
      }
    }

    if (queryTerms.some(t => ['responsive', 'mobile', 'tablet', 'layout', 'design', 'figma', 'ui', 'prototype'].includes(t))) {
      if (file.tags.includes('ui') || file.tags.includes('mobile') || file.tags.includes('design')) {
        score += 35;
        reasons.push('Semantic cluster: UI / Adaptive Design Assets');
      }
    }

    if (queryTerms.some(t => ['presentation', 'slide', 'deck', 'pitch', 'pptx', 'google slides'].includes(t))) {
      if (file.mimeType.includes('presentation') || file.name.endsWith('.pptx') || file.tags.includes('board')) {
        score += 35;
        reasons.push('Semantic cluster: Slide Decks & Presentations');
      }
    }

    if (score > 10) {
      const normalizedScore = Math.min(Math.round(score), 99);
      results.push({
        file,
        score: normalizedScore,
        matchedSnippet: file.semanticSummary,
        relevanceReason: reasons.length > 0 ? reasons.join(' • ') : `Matched ${matchedTermsCount} search terms`,
      });
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}
