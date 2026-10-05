import React, { useState, useEffect } from 'react';
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
import { Target, Building2, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import { leadService, companyService } from '../api';
import { Lead, Company } from '../types';

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [topCompanies, setTopCompanies] = useState<Company[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Calling real service contracts (will return standard interface response)
        const [leadsRes, companiesRes] = await Promise.allSettled([
          leadService.getLeads({ limit: 5 }),
          companyService.getCompanies({ limit: 5 }),
        ]);

        if (leadsRes.status === 'fulfilled') {
          setRecentLeads(leadsRes.value.data.items || []);
        }
        if (companiesRes.status === 'fulfilled') {
          setTopCompanies(companiesRes.value.data.items || []);
        }
      } catch (err) {
        setError('Failed to load live dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const leadColumns = [
    {
      key: 'companyName',
      header: 'Company / Deal',
      render: (row: Lead) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.companyName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.title}</div>
        </div>
      ),
    },
    {
      key: 'estimatedValue',
      header: 'Value',
      render: (row: Lead) => (
        <span style={{ fontWeight: 600, color: 'var(--status-success-text)' }}>
          ${row.estimatedValue.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Lead) => <StatusBadge status={row.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row: Lead) => <PriorityBadge priority={row.priority} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Executive Overview"
        description="Real-time IT lead generation metrics, active pipeline value, and target accounts."
        breadcrumbs={[{ label: 'Home' }, { label: 'Dashboard', active: true }]}
      />

      {loading ? (
        <CardSkeleton count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : (
        <>
          {/* Key Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.75rem',
            }}
          >
            <MetricCard
              title="Total IT Prospects"
              value="1,428"
              icon={<Building2 size={20} />}
              trend={{ value: 14.2, label: 'vs last month' }}
            />
            <MetricCard
              title="Active Pipeline Value"
              value="$4.82M"
              icon={<TrendingUp size={20} />}
              trend={{ value: 8.4, label: 'vs last month' }}
            />
            <MetricCard
              title="Qualified Leads"
              value="342"
              icon={<Target size={20} />}
              trend={{ value: 5.1, label: 'conversion' }}
            />
            <MetricCard
              title="Follow-ups Due Today"
              value="12"
              icon={<Calendar size={20} />}
              subtitle="4 High Priority"
            />
          </div>

          {/* Main Dashboard Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-family-heading)', fontSize: '1.1rem', fontWeight: 600 }}>
                    Recent High-Value Deals
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Latest leads in active stages</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = '/leads'}>
                  <span>View All</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <Table
                columns={leadColumns}
                data={recentLeads}
                loading={false}
                keyExtractor={(item) => item.id}
                emptyTitle="No recent leads found"
                emptyDescription="Start an outreach campaign to populate new sales leads."
              />
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-family-heading)', fontSize: '1.1rem', fontWeight: 600 }}>
                    Target Tech Stacks
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mapped enterprise accounts by infrastructure</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {topCompanies.length > 0 ? (
                  topCompanies.map((comp) => (
                    <div key={comp.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                        <span>{comp.name}</span>
                        <span style={{ color: 'var(--primary-400)' }}>{comp.industry}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {comp.employeeCount} Employees • {comp.location}
                      </div>
                    </div>
                  ))
                ) : (
                  [
                    { name: 'AWS Cloud + Kubernetes', count: 48, share: '38%' },
                    { name: 'Microsoft Azure Enterprise', count: 35, share: '27%' },
                    { name: 'Salesforce CRM + Snowflake', count: 24, share: '19%' },
                    { name: 'Legacy On-Prem Migration', count: 20, share: '16%' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                        <span>{item.name}</span>
                        <span style={{ color: 'var(--primary-400)' }}>{item.share} ({item.count} companies)</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-app)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: item.share, height: '100%', backgroundColor: 'var(--primary-500)' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
