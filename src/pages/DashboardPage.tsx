/// <reference path="../types/jsx.d.ts" />
import React, { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  MetricCard,
  Card,
  Table,
  StatusBadge,
  PriorityBadge,
  CardSkeleton,
  ErrorState,
} from '../components/common';
import {
  Target,
  Building2,
  Users,
  TrendingUp,
  ArrowRight,
  Mail,
  Phone,
  MessageSquare,
  Presentation,
  AlertTriangle,
  RefreshCw,
  Layers,
  Sparkles,
  Compass,
} from 'lucide-react';
import { reportService, leadService } from '../api';
import { ReportingOverview, Lead } from '../types';
import { WeeklyTargetsWidget } from '../components/targets';
import { AutoDiscoveryModal } from '../components/discovery';

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<ReportingOverview | null>(null);
  const [period, setPeriod] = useState<string>('this_month');
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, leadsRes] = await Promise.all([
        reportService.getOverview({ period }),
        leadService.getLeads({ limit: 6, sortBy: 'created_at', sortOrder: 'desc' }),
      ]);

      if (overviewRes.data) {
        setOverview(overviewRes.data);
      }
      if (leadsRes.data) {
        setRecentLeads(leadsRes.data.items || []);
      }
    } catch {
      setError('Failed to load live dashboard statistics from database.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const summary = overview?.summary;

  const leadColumns = [
    {
      key: 'title',
      header: 'Opportunity / Company',
      render: (row: Lead) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.title}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.companyName || 'Unassigned Account'}
          </div>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (row: Lead) => (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: row.product === 'Higher IQ' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(139, 92, 246, 0.12)',
            color: row.product === 'Higher IQ' ? '#3b82f6' : '#8b5cf6',
          }}
        >
          {row.product}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Stage',
      render: (row: Lead) => <StatusBadge status={row.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row: Lead) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: 'source',
      header: 'Source',
      render: (row: Lead) => (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {row.source || 'Other'}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Executive Performance & Lead Operations"
        description="Comprehensive real-time tracking of lead generation, outreach cadences, stage conversions and quota achievements."
        breadcrumbs={[{ label: 'Home' }, { label: 'Dashboard', active: true }]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-primary"
              onClick={() => setIsDiscoveryOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                fontWeight: 600,
                fontSize: '0.8125rem',
                padding: '6px 14px',
                backgroundColor: '#2563eb',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
              }}
            >
              <Compass size={15} />
              <span>Automatic Lead Discovery</span>
            </button>
            <select
              className="input"
              value={period}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPeriod(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.8125rem', width: 'auto' }}
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="all_time">All Time</option>
            </select>
            <button
              className="btn btn-secondary"
              onClick={fetchDashboardData}
              disabled={loading}
              title="Refresh Metrics"
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        }
      />

      {/* AUTOMATIC DISCOVERY HERO ACTION BANNER */}
      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1.25rem 1.5rem',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
              flexShrink: 0,
            }}
          >
            <Compass size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Hunter.io B2B Prospecting & Automated Lead Discovery
              </h3>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                }}
              >
                Hunter API v2 Integrated
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', margin: 0 }}>
              Hunter.io POST /v2/discover &bull; Domain Search emails &bull; On-demand Email Verifier &bull; Direct CRM Saving &bull; CSV Export
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDiscoveryOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '9px',
            backgroundColor: '#2563eb',
            border: 'none',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            transition: 'all 0.15s ease',
          }}
        >
          <Compass size={16} />
          <span>Launch Prospecting Studio</span>
        </button>
      </div>

      {/* WEEKLY TARGETS & QUOTA TRACKING WIDGET */}
      <WeeklyTargetsWidget />

      {loading && !overview ? (
        <CardSkeleton count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDashboardData} />
      ) : summary ? (
        <>
          {/* PRIMARY PIPELINE METRIC CARDS */}
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
              Core Generation & Conversion
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
              }}
            >
              <MetricCard
                title="Companies Added"
                value={summary.companiesAdded.toLocaleString()}
                icon={<Building2 size={20} />}
                subtitle="Accounts registered"
              />
              <MetricCard
                title="Contacts Identified"
                value={summary.contactsFound.toLocaleString()}
                icon={<Users size={20} />}
                subtitle="Decision makers & HR"
              />
              <MetricCard
                title="Leads Created"
                value={summary.leadsCreated.toLocaleString()}
                icon={<Target size={20} />}
                subtitle="Qualified opportunities"
              />
              <MetricCard
                title="Conversion Rate"
                value={`${summary.conversionRate}%`}
                icon={<TrendingUp size={20} />}
                subtitle={`${summary.won} Won / ${summary.lost} Lost`}
              />
            </div>
          </div>

          {/* OUTREACH & FUNNEL EXECUTION METRIC CARDS */}
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
              Outreach Funnel & Cadence Touches
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
              }}
            >
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>MESSAGES SENT</span>
                  <Mail size={16} color="#3b82f6" />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.messagesSent.toLocaleString()}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Email & LinkedIn</div>
              </div>

              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CALLS MADE</span>
                  <Phone size={16} color="#10b981" />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.callsMade.toLocaleString()}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Phone connects</div>
              </div>

              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>REPLIES RECEIVED</span>
                  <MessageSquare size={16} color="#8b5cf6" />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>{summary.replies.toLocaleString()}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Prospect responses</div>
              </div>

              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DEMOS BOOKED</span>
                  <Presentation size={16} color="#f59e0b" />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                  {summary.demosBooked} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>({summary.demosCompleted} done)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Product demos</div>
              </div>

              <div className="card" style={{ padding: '1rem', borderLeft: summary.overdueFollowUps > 0 ? '3px solid #ef4444' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: summary.overdueFollowUps > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
                    OVERDUE FOLLOW-UPS
                  </span>
                  <AlertTriangle size={16} color={summary.overdueFollowUps > 0 ? '#ef4444' : 'var(--text-muted)'} />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: summary.overdueFollowUps > 0 ? '#ef4444' : 'inherit' }}>
                  {summary.overdueFollowUps}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Action required</div>
              </div>
            </div>
          </div>

          {/* BREAKDOWN SECTIONS (BY SOURCE, PRODUCT, CAMPAIGN) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
            {/* LEADS BY LEAD SOURCE */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#3b82f6" />
                  <span>Leads by Lead Source</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Total: {summary.leadsCreated}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {overview.leadsBySource.length > 0 ? (
                  overview.leadsBySource.map((src) => (
                    <div key={src.source}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{src.source}</span>
                        <span>
                          <strong>{src.count}</strong> ({src.percentage}%) • <span style={{ color: '#10b981' }}>{src.wonCount} Won</span>
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
                                : 'var(--primary-color, #3b82f6)',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                    No source data available for this period
                  </div>
                )}
              </div>
            </Card>

            {/* LEADS BY PRODUCT */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} color="#8b5cf6" />
                  <span>Leads by Product Fit</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HireIQ vs HRMS</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.product}</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary-color, #3b82f6)' }}>
                        {p.count} Leads ({p.percentage}%)
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Pipeline: ${p.pipelineValue.toLocaleString()}</span>
                      <span style={{ color: '#10b981' }}>{p.wonCount} Deals Won</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ACTIVE CAMPAIGNS BREAKDOWN */}
          {overview.leadsByCampaign.length > 0 && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Active Outreach Campaigns Performance</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Conversion metrics aggregated across live campaigns
                  </span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => (window.location.href = '/campaigns')}>
                  <span>View All Campaigns</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 12px' }}>Campaign Name</th>
                      <th style={{ padding: '8px 12px' }}>Product</th>
                      <th style={{ padding: '8px 12px' }}>Leads</th>
                      <th style={{ padding: '8px 12px' }}>Contacted</th>
                      <th style={{ padding: '8px 12px' }}>Replies</th>
                      <th style={{ padding: '8px 12px' }}>Demos</th>
                      <th style={{ padding: '8px 12px' }}>Won</th>
                      <th style={{ padding: '8px 12px' }}>Conv. Rate</th>
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

          {/* RECENT SALES LEADS */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  Recent Opportunities & Inbounds
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Latest leads enrolled or captured from all channels
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => (window.location.href = '/leads')}>
                <span>View All Leads</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <Table
              columns={leadColumns}
              data={recentLeads}
              loading={false}
              keyExtractor={(item) => item.id}
              emptyTitle="No leads in database"
              emptyDescription="Capture Free ATS Score leads or launch a campaign to begin."
            />
          </Card>
        </>
      ) : null}

      {/* AUTOMATIC DISCOVERY STUDIO MODAL */}
      <AutoDiscoveryModal
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        onLeadsSaved={fetchDashboardData}
      />
    </div>
  );
};
export default DashboardPage;
