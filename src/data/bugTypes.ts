export interface KnownBug {
  id: string;
  appId: string;
  title: string;
  keywords: string[];   // words used for fuzzy matching against user report titles
  level: number;
  technique: string;
}
