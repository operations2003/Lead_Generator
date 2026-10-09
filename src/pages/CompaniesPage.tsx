import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PageHeader,
  Table,
  StatusBadge,
  Column,
  ErrorState,
  EmptyState,
  TableSkeleton,
} from '../components/common';
import {
  Building2,
  Plus,
  Globe,
  ExternalLink,
  MapPin,
  TrendingUp,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Wrench,
  Filter,
  Compass,
} from 'lucide-react';
import { companyService } from '../api';
import {
  Company,
  CompanyFilterParams,
  CreateCompanyPayload,
  HIREIQ_LEAD_SIGNALS,
  HRMS_LEAD_SIGNALS,
  EXISTING_TOOLS,
} from '../types';
import { CompanyDetailModal, CompanyFormModal, ArchiveConfirmModal } from '../components/companies';
import { AutoDiscoveryModal } from '../components/discovery';

const INDUSTRY_OPTIONS = [
  'Cloud & Cybersecurity',
  'Software & SaaS',
  'Financial Services',
  'Healthcare & Biotech',
  'E-commerce & Retail',
  'Manufacturing & Logistics',
  'Staffing & HR',
  'IT Services & Consulting',
  'EdTech & Education',
];

const EMPLOYEE_SIZES = [
  { label: '1 - 10 staff', value: '1-10' },
  { label: '11 - 50 staff', value: '11-50' },
  { label: '51 - 200 staff', value: '51-200' },
  { label: '201 - 500 staff', value: '201-500' },
  { label: '501 - 1000 staff', value: '501-1000' },
  { label: '1000+ staff', value: '1000+' },
];

const HIRING_VOLUMES = ['High', 'Medium', 'Low', 'None'];

export const CompaniesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Filters
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [employeeSizeFilter, setEmployeeSizeFilter] = useState('');
  const [hiringVolumeFilter, setHiringVolumeFilter] = useState('');
  const [productFitFilter, setProductFitFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [showAdvancedDiscovery, setShowAdvancedDiscovery] = useState(false);

  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [companyToView, setCompanyToView] = useState<Company | null>(null);
  const [companyToArchive, setCompanyToArchive] = useState<Company | null>(null);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: CompanyFilterParams = {
        page,
        limit,
        search: search.trim() || undefined,
        industry: industryFilter || undefined,
        location: locationFilter.trim() || undefined,
        status: statusFilter || undefined,
        productFit: productFitFilter || undefined,
        employeeSize: employeeSizeFilter || undefined,
        hiringVolume: hiringVolumeFilter || undefined,
        hiringSignals: selectedSignals.length > 0 ? selectedSignals.join(',') : undefined,
        existingTools: selectedTools.length > 0 ? selectedTools.join(',') : undefined,
        sortBy,
        sortOrder,
      };

      const res = await companyService.getCompanies(params);
      if (res.data) {
        setCompanies(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Unable to connect to company intelligence server.');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    search,
    industryFilter,
    locationFilter,
    statusFilter,
    productFitFilter,
    employeeSizeFilter,
    hiringVolumeFilter,
    selectedSignals,
    selectedTools,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleOpenDetail = async (company: Company) => {
    try {
      const fullRes = await companyService.getCompanyById(company.id);
      setCompanyToView(fullRes.data);
    } catch {
      setCompanyToView(company);
    }
  };

  const handleCreateOrUpdateCompany = async (payload: CreateCompanyPayload) => {
    if (companyToEdit) {
      await companyService.updateCompany(companyToEdit.id, payload);
    } else {
      await companyService.createCompany(payload);
    }
    setCompanyToEdit(null);
    setIsAddModalOpen(false);
    loadCompanies();
  };

  const handleArchiveCompany = async (company: Company) => {
    await companyService.archiveCompany(company.id);
    setCompanyToArchive(null);
    loadCompanies();
  };

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
    setPage(1);
  };

  const toggleSignal = (signal: string) => {
    setSelectedSignals((prev) =>
      prev.includes(signal) ? prev.filter((s) => s !== signal) : [...prev, signal]
    );
    setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setIndustryFilter('');
    setLocationFilter('');
    setStatusFilter('');
    setProductFitFilter('');
    setEmployeeSizeFilter('');
    setHiringVolumeFilter('');
    setSelectedTools([]);
    setSelectedSignals([]);
    setPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (industryFilter) count++;
    if (locationFilter.trim()) count++;
    if (statusFilter) count++;
    if (productFitFilter) count++;
    if (employeeSizeFilter) count++;
    if (hiringVolumeFilter) count++;
    count += selectedTools.length;
    count += selectedSignals.length;
    return count;
  }, [
    search,
    industryFilter,
    locationFilter,
    statusFilter,
    productFitFilter,
    employeeSizeFilter,
    hiringVolumeFilter,
    selectedTools,
    selectedSignals,
  ]);

  const getProductFitBadge = (fit: string) => {
    switch (fit) {
      case 'High':
        return <span className="badge badge-success">High Fit</span>;
      case 'Medium':
        return <span className="badge badge-info">Medium Fit</span>;
      default:
        return <span className="badge badge-neutral">Low Fit</span>;
    }
  };

  const columns: Column<Company>[] = [
    {
      key: 'name',
      header: 'Company / Target Domain',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            className="state-icon"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              marginBottom: 0,
              background: 'linear-gradient(135deg, var(--bg-card), var(--bg-app))',
              border: '1px solid var(--border-default)',
              color: 'var(--primary-400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building2 size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              onClick={() => handleOpenDetail(row)}
            >
              <span>{row.name}</span>
            </div>
            <a
              href={row.website.startsWith('http') ? row.website : `https://${row.website}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.75rem',
                color: 'var(--primary-400)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '1px',
              }}
            >
              <Globe size={11} />
              <span>{row.domain || row.website}</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      ),
    },
    {
      key: 'industry',
      header: 'Industry Vertical',
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {row.industry}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Headquarters',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
          <span>{row.location}</span>
        </div>
      ),
    },
    {
      key: 'employeeSize',
      header: 'Staff Size',
      sortable: true,
      render: (row) => (
        <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
          {row.employeeSize}
        </span>
      ),
    },
    {
      key: 'productFit',
      header: 'Product Fit',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {getProductFitBadge(row.productFit)}
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {row.leadRelevanceScore}%
          </span>
        </div>
      ),
    },
    {
      key: 'hiringSignals',
      header: 'Hiring Signals',
      render: (row) => (
        <div style={{ maxWidth: '240px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {row.hiringSignals ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={13} color="var(--primary-400)" style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.hiringSignals}>
                {row.hiringSignals}
              </span>
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>None recorded</span>
          )}
        </div>
      ),
    },
    {
      key: 'currentTools',
      header: 'Detected HR & IT Tools',
      render: (row) => {
        const tools = row.currentTools ? row.currentTools.split(',').map((t) => t.trim()).slice(0, 2) : [];
        const hasMore = (row.currentTools?.split(',').length || 0) > 2;
        return (
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {tools.length > 0 ? (
              <>
                {tools.map((t, idx) => (
                  <span key={idx} className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                    <CheckCircle2 size={10} style={{ marginRight: '3px' }} />
                    {t}
                  </span>
                ))}
                {hasMore && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+more</span>
                )}
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Not detected</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Stage Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            className="btn btn-icon-only btn-secondary"
            onClick={() => handleOpenDetail(row)}
            title="View Company IT Mapping Profile"
            aria-label="View Company Details"
          >
            <Eye size={15} />
          </button>
          <button
            className="btn btn-icon-only btn-secondary"
            onClick={() => setCompanyToEdit(row)}
            title="Edit Company Account"
            aria-label="Edit Company"
          >
            <Edit2 size={15} />
          </button>
          <button
            className="btn btn-icon-only btn-secondary"
            style={{ color: 'var(--status-error-text)' }}
            onClick={() => setCompanyToArchive(row)}
            title="Archive Company Account"
            aria-label="Archive Company"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Company Intelligence & IT Mapping"
        description="Filter target accounts by industry, location, headcount, hiring signals, and detected HR tools."
        breadcrumbs={[{ label: 'Home' }, { label: 'Companies', active: true }]}
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {activeFiltersCount > 0 && (
              <button className="btn btn-secondary" onClick={resetFilters}>
                <RotateCcw size={15} />
                <span>Reset Filters ({activeFiltersCount})</span>
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => setIsDiscoveryOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Compass size={15} />
              <span>Auto Lead Finder</span>
            </button>
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} />
              <span>Add Target Account</span>
            </button>
          </div>
        }
      />

      {/* FILTER PANEL */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Primary Filter Bar */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Keyword Search */}
          <div style={{ flex: '1 1 240px', minWidth: '220px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search company name, domain, detected tools..."
              style={{ width: '100%' }}
            />
          </div>

          {/* Industry Filter */}
          <select
            className="input"
            value={industryFilter}
            onChange={(e) => {
              setIndustryFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="">All Industries</option>
            {INDUSTRY_OPTIONS.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>

          {/* Location Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '150px' }}>
            <MapPin size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Location..."
              style={{ width: '130px' }}
            />
          </div>

          {/* Employee Size Filter */}
          <select
            className="input"
            value={employeeSizeFilter}
            onChange={(e) => {
              setEmployeeSizeFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '130px' }}
          >
            <option value="">All Headcounts</option>
            {EMPLOYEE_SIZES.map((sz) => (
              <option key={sz.value} value={sz.value}>
                {sz.label}
              </option>
            ))}
          </select>

          {/* Product Fit */}
          <select
            className="input"
            value={productFitFilter}
            onChange={(e) => {
              setProductFitFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '120px' }}
          >
            <option value="">All Fits</option>
            <option value="High">High Fit</option>
            <option value="Medium">Medium Fit</option>
            <option value="Low">Low Fit</option>
          </select>

          {/* Hiring Volume */}
          <select
            className="input"
            value={hiringVolumeFilter}
            onChange={(e) => {
              setHiringVolumeFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '130px' }}
          >
            <option value="">All Hiring Volumes</option>
            {HIRING_VOLUMES.map((v) => (
              <option key={v} value={v}>
                {v} Volume
              </option>
            ))}
          </select>

          {/* Advanced Signals & Tools Toggle */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowAdvancedDiscovery(!showAdvancedDiscovery)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Filter size={14} />
            <span>Signals & Tools</span>
            {(selectedTools.length > 0 || selectedSignals.length > 0) && (
              <span
                style={{
                  backgroundColor: 'var(--primary-color, #3b82f6)',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {selectedTools.length + selectedSignals.length}
              </span>
            )}
            {showAdvancedDiscovery ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Collapsible Signals & Existing Tools Section */}
        {showAdvancedDiscovery && (
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px dashed var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Existing HR / Recruitment Tools Filter */}
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Wrench size={13} />
                <span>Filter by Existing HR & Recruitment Tools</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {EXISTING_TOOLS.map((tool) => {
                  const isSelected = selectedTools.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => toggleTool(tool)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: isSelected
                          ? '1px solid #3b82f6'
                          : '1px solid var(--border-color)',
                        backgroundColor: isSelected
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'var(--bg-card)',
                        color: isSelected ? '#3b82f6' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tool}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hiring Signals: HireIQ & HRMS Signals */}
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={13} />
                <span>Filter by HireIQ & HRMS Hiring Signals</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[...HIREIQ_LEAD_SIGNALS, ...HRMS_LEAD_SIGNALS].map((signal) => {
                  const isSelected = selectedSignals.includes(signal);
                  return (
                    <button
                      key={signal}
                      type="button"
                      onClick={() => toggleSignal(signal)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: isSelected
                          ? '1px solid #8b5cf6'
                          : '1px solid var(--border-color)',
                        backgroundColor: isSelected
                          ? 'rgba(139, 92, 246, 0.15)'
                          : 'var(--bg-card)',
                        color: isSelected ? '#a78bfa' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {signal}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: ErrorState, TableSkeleton, EmptyState, or Table */}
      {error ? (
        <ErrorState
          title="Failed to Load Companies"
          message={error}
          onRetry={loadCompanies}
        />
      ) : loading && companies.length === 0 ? (
        <TableSkeleton rows={6} cols={8} />
      ) : companies.length === 0 ? (
        <EmptyState
          title="No Target Companies Found"
          description="No enterprise accounts matched your active filters. Try adjusting your search criteria or clearing filters."
          action={{
            label: 'Reset Filters',
            onClick: resetFilters,
          }}
        />
      ) : (
        <Table
          columns={columns}
          data={companies}
          loading={loading}
          keyExtractor={(row) => row.id}
          onSort={handleSort}
          emptyTitle="No mapped companies found"
          emptyDescription="Start your IT mapping journey by adding your first target enterprise company."
          pagination={{
            page,
            limit,
            total,
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      )}

      {/* Add Company Modal */}
      <CompanyFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateOrUpdateCompany}
      />

      {/* Edit Company Modal */}
      <CompanyFormModal
        isOpen={!!companyToEdit}
        onClose={() => setCompanyToEdit(null)}
        onSubmit={handleCreateOrUpdateCompany}
        companyToEdit={companyToEdit}
      />

      {/* Company Detail Modal */}
      <CompanyDetailModal
        isOpen={!!companyToView}
        company={companyToView}
        onClose={() => setCompanyToView(null)}
        onEdit={(cmp: Company) => setCompanyToEdit(cmp)}
        onDelete={(cmp: Company) => setCompanyToArchive(cmp)}
      />

      {/* Archive Confirmation Modal */}
      <ArchiveConfirmModal
        isOpen={!!companyToArchive}
        company={companyToArchive}
        onClose={() => setCompanyToArchive(null)}
        onConfirm={handleArchiveCompany}
      />

      {/* Auto Discovery Workflow Modal */}
      <AutoDiscoveryModal
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        onLeadsSaved={loadCompanies}
      />
    </div>
  );
};
