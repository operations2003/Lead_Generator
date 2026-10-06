import React, { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Card,
  MetricCard,
  CardSkeleton,
  ErrorState,
} from '../components/common';
import {
  Download,
  BarChart3,
  TrendingUp,
  Layers,
  Sparkles,
  Target,
  RefreshCw,
} from 'lucide-react';
import { reportingService } from '../api';
import { ReportingOverview } from '../types';

export const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('this_month');
  const [overview, setOverview] = useState<ReportingOverview | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportingService.getOverview({ period });
      if (res.data) {
        setOverview(res.data);
      }
    } catch {
      setError('Failed to fetch reporting analytics from server.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const summary = overview?.summary;

  const handleExportCsv = () => {
    if (!overview) return;
    const s = overview.summary;
    const rows = [
      ['Metric', 'Value'],
      ['Companies Added', s.companiesAdded],
      ['Contacts Found', s.contactsFound],
      ['Leads Created', s.leadsCreated],
      ['Messages Sent', s.messagesSent],
      ['Calls Made', s.callsMade],
      ['Total Outreach Touches', s.totalOutreachTouches],
      ['Replies', s.replies],
      ['Demos Booked', s.demosBooked],
      ['Demos Completed', s.demosCompleted],
      ['Won', s.won],
      ['Lost', s.lost],
      ['Conversion Rate (%)', s.conversionRate],
      ['Overdue Follow-ups', s.overdueFollowUps],
      ['Total Pipeline Value ($)', s.totalPipelineValue],
      [],
      ['Lead Source', 'Lead Count', 'Share (%)', 'Deals Won'],
      ...overview.leadsBySource.map((src) => [src.source, src.count, `${src.percentage}%`, src.wonCount]),
      [],
      ['Product Fit', 'Lead Count', 'Share (%)', 'Pipeline ($)', 'Deals Won'],
      ...overview.leadsByProduct.map((p) => [p.product, p.count, `${p.percentage}%`, p.pipelineValue, p.wonCount]),
      [],
      ['Campaign Name', 'Product', 'Leads', 'Contacted', 'Replies', 'Demos', 'Won', 'Conv Rate (%)'],
      ...overview.leadsByCampaign.map((c) => [c.campaignName, c.product, c.totalLeads, c.contacted, c.replies, c.demosBooked, c.won, `${c.conversionRate}%`]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Lead_Generation_Report_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Analytics & Lead Performance Reports"
        description="Comprehensive real-time analysis of pipeline velocity, outreach touchpoints, source yield, and campaign conversions."
        breadcrumbs={[{ label: 'Home' }, { label: 'Reports', active: true }]}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              className="input"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8125rem' }}
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="all_time">All Time</option>
            </select>
            <button className="btn btn-secondary" onClick={handleExportCsv} disabled={!overview}>
              <Download size={15} />
              <span>Export CSV</span>
            </button>
            <button className="btn btn-secondary" onClick={fetchReport} disabled={loading} title="Refresh">
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        }
      />

      {loading && !overview ? (
        <CardSkeleton count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchReport} />
      ) : summary ? (
        <>
          {/* TOP SUMMARY METRIC CARDS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
            }}
          >
            <MetricCard
              title="Leads Generated"
              value={summary.leadsCreated.toLocaleString()}
              icon={<Target size={20} />}
              subtitle={`${summary.companiesAdded} companies / ${summary.contactsFound} contacts`}
            />
            <MetricCard
              title="Outreach Touches"
              value={summary.totalOutreachTouches.toLocaleString()}
              icon={<BarChart3 size={20} />}
              subtitle={`${summary.messagesSent} msgs • ${summary.callsMade} calls`}
            />
            <MetricCard
              title="Pipeline Conversion"
              value={`${summary.conversionRate}%`}
              icon={<TrendingUp size={20} />}
              subtitle={`${summary.won} Won / ${summary.lost} Lost`}
            />
            <MetricCard
              title="Total Pipeline Value"
              value={`$${summary.totalPipelineValue.toLocaleString()}`}
              icon={<Layers size={20} />}
              subtitle="Active potential deal value"
            />
          </div>

          {/* OUTREACH ACTIVITY FUNNEL BREAKDOWN */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              Full Funnel Progression
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-subtle, rgba(255,255,255,0.03))', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACCOUNTS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>{summary.companiesAdded}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-subtle, rgba(255,255,255,0.03))', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>CONTACTS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>{summary.contactsFound}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-subtle, rgba(255,255,255,0.03))', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>LEADS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>{summary.leadsCreated}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 600 }}>MESSAGES</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px', color: '#3b82f6' }}>{summary.messagesSent}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>CALLS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px', color: '#10b981' }}>{summary.callsMade}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 600 }}>REPLIES</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px', color: '#8b5cf6' }}>{summary.replies}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>DEMOS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px', color: '#f59e0b' }}>
                  {summary.demosBooked} <span style={{ fontSize: '0.75rem' }}>({summary.demosCompleted} done)</span>
                </div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>WON DEALS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px', color: '#10b981' }}>{summary.won}</div>
              </div>
            </div>
          </div>

          {/* TWO COLUMN BREAKDOWN GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
            {/* SOURCE BREAKDOWN */}
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#3b82f6" />
                <span>Lead Acquisition Yield by Source</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {overview.leadsBySource.length > 0 ? (
                  overview.leadsBySource.map((src) => (
                    <div key={src.source}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{src.source}</span>
                        <span>
                          <strong>{src.count} Leads</strong> ({src.percentage}%) • <span style={{ color: '#10b981' }}>{src.wonCount} Won</span>
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.06))', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${src.percentage}%`,
                            height: '100%',
                            backgroundColor:
                              src.source === 'Free ATS Score Check'
                                ? '#10b981'
                                : src.source === 'LinkedIn'
                                ? '#0077b5'
                                : src.source === 'Referral' || src.source === 'Partner'
                                ? '#8b5cf6'
                                : '#3b82f6',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                    No source data recorded in this period.
                  </div>
                )}
              </div>
            </Card>

            {/* PRODUCT BREAKDOWN */}
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="#8b5cf6" />
                <span>Product Performance (HireIQ vs HRMS)</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {overview.leadsByProduct.map((p) => (
                  <div
                    key={p.product}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.product}</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary-color, #3b82f6)' }}>
                        {p.count} Leads ({p.percentage}%)
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Pipeline Value: ${p.pipelineValue.toLocaleString()}</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>{p.wonCount} Deals Closed Won</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* CAMPAIGN LEVEL PERFORMANCE TABLE */}
          {overview.leadsByCampaign.length > 0 && (
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Campaign Level Performance Analytics
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 12px' }}>Campaign</th>
                      <th style={{ padding: '8px 12px' }}>Product</th>
                      <th style={{ padding: '8px 12px' }}>Leads</th>
                      <th style={{ padding: '8px 12px' }}>Contacted</th>
                      <th style={{ padding: '8px 12px' }}>Replies</th>
                      <th style={{ padding: '8px 12px' }}>Demos</th>
                      <th style={{ padding: '8px 12px' }}>Won</th>
                      <th style={{ padding: '8px 12px' }}>Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.leadsByCampaign.map((c) => (
                      <tr key={c.campaignId} style={{ borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.05))' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.campaignName}</td>
                        <td style={{ padding: '10px 12px' }}>{c.product}</td>
                        <td style={{ padding: '10px 12px' }}>{c.totalLeads}</td>
                        <td style={{ padding: '10px 12px' }}>{c.contacted}</td>
                        <td style={{ padding: '10px 12px' }}>{c.replies}</td>
                        <td style={{ padding: '10px 12px', color: '#f59e0b', fontWeight: 600 }}>{c.demosBooked}</td>
                        <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 600 }}>{c.won}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{c.conversionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
};
export default ReportsPage;
