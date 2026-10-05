export interface MetricSummary {
  totalLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  totalPipelineValue: number;
  leadsTrend: number; // percentage change
  pipelineValueTrend: number;
}

export interface IndustryBreakdown {
  industry: string;
  companyCount: number;
  leadCount: number;
  totalValue: number;
}

export interface PerformanceReport {
  period: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
  summary: MetricSummary;
  industryBreakdown: IndustryBreakdown[];
  generatedAt: string;
}
