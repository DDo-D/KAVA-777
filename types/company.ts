export interface CompanyMetrics {
  per: number | null;
  evEbitda: number | null;
}

export interface Company {
  id: string;
  name: string;
  relatedKeywords: string[];
  relevanceSummary: string;
  metrics: CompanyMetrics;
}

export interface AverageMetrics {
  per: number | null;
  evEbitda: number | null;
}
