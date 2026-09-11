import 'server-only';
import { SEOKeywordProvider } from './types';
import { DataForSEOProvider } from './dataForSeoProvider';

let currentProvider: SEOKeywordProvider | null = null;

export function getSEOProvider(): SEOKeywordProvider {
  if (!currentProvider) {
    currentProvider = new DataForSEOProvider();
  }
  return currentProvider;
}

export function setSEOProvider(provider: SEOKeywordProvider): void {
  currentProvider = provider;
}

export function resetSEOProvider(): void {
  currentProvider = null;
}
