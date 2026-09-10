export type NavTab = 'analyzer' | 'competitors' | 'domain' | 'history' | 'methodology';

export interface RouteState {
  navTab: NavTab;
  reportId?: string;
  reportSubTab: string;
}

/**
 * Parses current window.location into active navigation tab, report ID, and report subtab.
 */
export function parseCurrentRoute(): RouteState {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(window.location.search);

  if (path === '/history' || path.startsWith('/history/')) {
    return { navTab: 'history', reportSubTab: 'overview' };
  }

  if (path === '/methodology' || path.startsWith('/methodology/')) {
    return { navTab: 'methodology', reportSubTab: 'overview' };
  }

  if (path === '/competitors' || path.startsWith('/competitors/')) {
    return { navTab: 'competitors', reportSubTab: 'overview' };
  }

  if (path === '/domain' || path.startsWith('/domain/')) {
    return { navTab: 'domain', reportSubTab: 'overview' };
  }

  // Pattern: /report/:id or /report/:id/:subtab
  const reportMatch = path.match(/^\/report\/([^/]+)(?:\/([^/]+))?/);
  if (reportMatch) {
    const reportId = reportMatch[1];
    let subTab = reportMatch[2] || searchParams.get('tab') || 'overview';
    if (subTab === 'robots') subTab = 'robots_sitemap';
    if (subTab === 'links') subTab = 'links_images';
    return {
      navTab: 'analyzer',
      reportId,
      reportSubTab: subTab,
    };
  }

  // Pattern: /analyzer/:subtab or /analyzer or /
  const analyzerMatch = path.match(/^\/analyzer(?:\/([^/]+))?/);
  if (analyzerMatch) {
    let subTab = analyzerMatch[1] || searchParams.get('tab') || 'overview';
    if (subTab === 'robots') subTab = 'robots_sitemap';
    if (subTab === 'links') subTab = 'links_images';
    return {
      navTab: 'analyzer',
      reportSubTab: subTab,
    };
  }

  return {
    navTab: 'analyzer',
    reportSubTab: searchParams.get('tab') || 'overview',
  };
}

/**
 * Builds standard, clean URL paths to display in the browser address bar.
 */
export function buildRouteUrl(navTab: NavTab, reportId?: string, reportSubTab?: string): string {
  if (navTab === 'history') return '/history';
  if (navTab === 'methodology') return '/methodology';
  if (navTab === 'competitors') return '/competitors';
  if (navTab === 'domain') return '/domain';

  if (reportId) {
    const normalizedSub = (reportSubTab || 'overview')
      .replace('robots_sitemap', 'robots')
      .replace('links_images', 'links');
    return normalizedSub === 'overview' ? `/report/${reportId}` : `/report/${reportId}/${normalizedSub}`;
  }

  return '/analyzer';
}

/**
 * Updates browser address bar and history state.
 */
export function pushRoute(navTab: NavTab, reportId?: string, reportSubTab?: string, replace = false): void {
  const url = buildRouteUrl(navTab, reportId, reportSubTab);
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (currentPath !== url) {
    if (replace) {
      window.history.replaceState({ navTab, reportId, reportSubTab }, '', url);
    } else {
      window.history.pushState({ navTab, reportId, reportSubTab }, '', url);
    }
  }
}
