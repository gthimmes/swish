// Maps app routes to the help articles most relevant on that page —
// surfaced as "Suggested for this page" when the help panel opens.

const ROUTE_HELP: Array<{ pattern: RegExp; articles: string[] }> = [
  { pattern: /^\/$/, articles: ["swish-tour", "board-basics", "navigation-shortcuts"] },
  { pattern: /^\/inbox/, articles: ["inbox-help", "comments-mentions"] },
  { pattern: /^\/board/, articles: ["board-basics", "swimlanes", "saved-views", "item-drawer"] },
  { pattern: /^\/backlog/, articles: ["backlog-bulk", "item-drawer", "saved-views"] },
  { pattern: /^\/roadmap/, articles: ["roadmap-help", "timeline-help"] },
  { pattern: /^\/cycles/, articles: ["cycles-help", "timeline-help"] },
  { pattern: /^\/timeline/, articles: ["timeline-help", "dependencies-help"] },
  { pattern: /^\/insights/, articles: ["insights-flow", "workflow-stages", "specs-overview"] },
  { pattern: /^\/specs/, articles: ["specs-overview", "specs-structured", "criteria-tests"] },
  { pattern: /^\/settings/, articles: ["workflow-stages", "board-basics"] },
];

export function helpArticlesFor(pathname: string): string[] {
  return ROUTE_HELP.find((r) => r.pattern.test(pathname))?.articles ?? ["swish-tour"];
}

// Exported for tests: every article id referenced by the map.
export function allMappedArticleIds(): string[] {
  return [...new Set(ROUTE_HELP.flatMap((r) => r.articles))];
}
