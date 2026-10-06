import React, { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Table,
  Filters,
  StatusBadge,
  Column,
  ErrorState,
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
} from 'lucide-react';
import { companyService } from '../api';
import { Company, CompanyFilterParams, CreateCompanyPayload } from '../types';
import { CompanyDetailModal, CompanyFormModal, ArchiveConfirmModal } from '../components/companies';

export const CompaniesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [productFitFilter, setProductFitFilter] = useState('');
  const [employeeSizeFilter, setEmployeeSizeFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [companyToView, setCompanyToView] = useState<Company | null>(null);
  const [companyToArchive, setCompanyToArchive] = useState<Company | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: CompanyFilterParams = {
        page,
        limit,
        search: search.trim() || undefined,
        industry: industryFilter || undefined,
        status: statusFilter || undefined,
        productFit: productFitFilter || undefined,
        employeeSize: employeeSizeFilter || undefined,
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
  }, [page, limit, search, industryFilter, statusFilter, productFitFilter, employeeSizeFilter, sortBy, sortOrder]);

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

  const resetFilters = () => {
    setSearch('');
    setIndustryFilter('');
    setStatusFilter('');
    setProductFitFilter('');
    setEmployeeSizeFilter('');
    setPage(1);
  };

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
        description="Identify target enterprise accounts, analyze hiring signals, and inspect IT infrastructure tools."
        breadcrumbs={[{ label: 'Home' }, { label: 'Companies', active: true }]}
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {(search || industryFilter || statusFilter || productFitFilter || employeeSizeFilter) && (
              <button className="btn btn-secondary" onClick={resetFilters}>
                <RotateCcw size={15} />
                <span>Reset Filters</span>
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} />
              <span>Add Target Account</span>
            </button>
          </div>
        }
      />

      {/* Search and Filters */}
      <Filters
        searchPlaceholder="Search company name, domain, detected tools, signals..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        filterOptions={[
          {
            key: 'industry',
            label: 'All Industries',
            value: industryFilter,
            options: [
              { label: 'Cloud & Cybersecurity', value: 'Cloud & Cybersecurity' },
              { label: 'Software & SaaS', value: 'Software & SaaS' },
              { label: 'Financial Services', value: 'Financial Services' },
              { label: 'Healthcare & Biotech', value: 'Healthcare & Biotech' },
              { label: 'E-commerce & Retail', value: 'E-commerce & Retail' },
              { label: 'Manufacturing & Logistics', value: 'Manufacturing & Logistics' },
            ],
            onChange: (val) => {
              setIndustryFilter(val);
              setPage(1);
            },
          },
          {
            key: 'status',
            label: 'All Stages',
            value: statusFilter,
            options: [
              { label: 'Prospect', value: 'Prospect' },
              { label: 'Researching', value: 'Researching' },
              { label: 'Contacted', value: 'Contacted' },
              { label: 'Qualified', value: 'Qualified' },
              { label: 'Customer', value: 'Customer' },
              { label: 'Archived', value: 'Archived' },
            ],
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
            },
          },
          {
            key: 'productFit',
            label: 'All Product Fits',
            value: productFitFilter,
            options: [
              { label: 'High Fit', value: 'High' },
              { label: 'Medium Fit', value: 'Medium' },
              { label: 'Low Fit', value: 'Low' },
            ],
            onChange: (val) => {
              setProductFitFilter(val);
              setPage(1);
            },
          },
          {
            key: 'employeeSize',
            label: 'All Headcounts',
            value: employeeSizeFilter,
            options: [
              { label: '1 - 10 staff', value: '1-10' },
              { label: '11 - 50 staff', value: '11-50' },
              { label: '51 - 200 staff', value: '51-200' },
              { label: '201 - 500 staff', value: '201-500' },
              { label: '501 - 1000 staff', value: '501-1000' },
              { label: '1000 - 5000 staff', value: '1000-5000' },
            ],
            onChange: (val) => {
              setEmployeeSizeFilter(val);
              setPage(1);
            },
          },
        ]}
      />

      {/* Main Content: ErrorState or Table */}
      {error ? (
        <ErrorState
          title="Failed to Load Companies"
          message={error}
          onRetry={loadCompanies}
        />
      ) : (
        <Table
          columns={columns}
          data={companies}
          loading={loading}
          keyExtractor={(row) => row.id}
          onSort={handleSort}
          emptyTitle="No mapped companies found"
          emptyDescription={
            search || industryFilter || statusFilter || productFitFilter || employeeSizeFilter
              ? 'No target companies match your active filters. Try adjusting or clearing search filters.'
              : 'Start your IT mapping journey by adding your first target enterprise company.'
          }
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
    </div>
  );
};
