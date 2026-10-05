import React, { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Table,
  Filters,
  StatusBadge,
  Modal,
  FormField,
  TextInput,
  SelectInput,
  Column,
} from '../components/common';
import { Building2, Plus, ExternalLink, Globe } from 'lucide-react';
import { companyService } from '../api';
import { Company, CompanyFilterParams } from '../types';

export const CompaniesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Company Form State
  const [newCompany, setNewCompany] = useState({
    name: '',
    domain: '',
    industry: 'Cloud Infrastructure',
    employeeCount: 250,
    location: 'San Francisco, CA',
    techStack: 'AWS, Kubernetes, Terraform',
  });

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params: CompanyFilterParams = {
        page,
        limit: 10,
        search: search || undefined,
        industry: industryFilter || undefined,
        leadStatus: statusFilter || undefined,
      };
      const res = await companyService.getCompanies(params);
      if (res.data) {
        setCompanies(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch {
      // Endpoint interface ready for backend integration
    } finally {
      setLoading(false);
    }
  }, [page, search, industryFilter, statusFilter]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await companyService.createCompany({
        name: newCompany.name,
        domain: newCompany.domain,
        industry: newCompany.industry,
        employeeCount: Number(newCompany.employeeCount),
        location: newCompany.location,
        techStack: newCompany.techStack.split(',').map((s) => s.trim()),
        leadStatus: 'Prospect',
      });
      setIsModalOpen(false);
      loadCompanies();
    } catch {
      // Form ready for API connection
    }
  };

  const columns: Column<Company>[] = [
    {
      key: 'name',
      header: 'Company Name',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="state-icon" style={{ width: '36px', height: '36px', borderRadius: '8px', marginBottom: 0 }}>
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{row.name}</div>
            <a
              href={`https://${row.domain}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.75rem', color: 'var(--primary-400)', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <Globe size={12} />
              {row.domain}
            </a>
          </div>
        </div>
      ),
    },
    { key: 'industry', header: 'Industry', sortable: true },
    {
      key: 'employeeCount',
      header: 'Employees',
      sortable: true,
      render: (row) => <span>{row.employeeCount.toLocaleString()}</span>,
    },
    { key: 'location', header: 'Location' },
    {
      key: 'techStack',
      header: 'Tech Stack',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {row.techStack?.map((tech, i) => (
            <span key={i} className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
              {tech}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'leadStatus',
      header: 'Status',
      render: (row) => <StatusBadge status={row.leadStatus} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => window.open(`https://${row.domain}`, '_blank')}
          title="Inspect Account IT Mapping"
        >
          <ExternalLink size={14} />
          <span>Map IT</span>
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Company Intelligence & IT Mapping"
        description="Search, filter, and analyze enterprise IT infrastructure and decision hierarchy."
        breadcrumbs={[{ label: 'Home' }, { label: 'Companies', active: true }]}
        actions={
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Add Account</span>
          </button>
        }
      />

      <Filters
        searchPlaceholder="Search company name, domain..."
        searchValue={search}
        onSearchChange={setSearch}
        filterOptions={[
          {
            key: 'industry',
            label: 'All Industries',
            value: industryFilter,
            options: [
              { label: 'FinTech & Banking', value: 'FinTech' },
              { label: 'Cloud Infrastructure', value: 'Cloud Infrastructure' },
              { label: 'HealthTech', value: 'HealthTech' },
              { label: 'Cybersecurity', value: 'Cybersecurity' },
            ],
            onChange: setIndustryFilter,
          },
          {
            key: 'status',
            label: 'All Lead Statuses',
            value: statusFilter,
            options: [
              { label: 'Prospect', value: 'Prospect' },
              { label: 'Contacted', value: 'Contacted' },
              { label: 'Qualified', value: 'Qualified' },
              { label: 'Customer', value: 'Customer' },
            ],
            onChange: setStatusFilter,
          },
        ]}
      />

      <Table
        columns={columns}
        data={companies}
        loading={loading}
        keyExtractor={(row) => row.id}
        emptyTitle="No mapped companies found"
        emptyDescription="Add target accounts or adjust your search filters."
        pagination={{
          page,
          limit: 10,
          total,
          onPageChange: setPage,
        }}
      />

      {/* Add Company Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Enterprise Mapped Account"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateCompany}>
              Save Company
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label="Company Name" required>
            <TextInput
              value={newCompany.name}
              onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
              placeholder="e.g. Acme Corp Technology"
              required
            />
          </FormField>
          <FormField label="Domain Website" required>
            <TextInput
              value={newCompany.domain}
              onChange={(e) => setNewCompany({ ...newCompany, domain: e.target.value })}
              placeholder="e.g. acmetech.io"
              required
            />
          </FormField>
          <FormField label="Industry Segment">
            <SelectInput
              value={newCompany.industry}
              onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
              options={[
                { label: 'Cloud Infrastructure', value: 'Cloud Infrastructure' },
                { label: 'FinTech & Financial Services', value: 'FinTech' },
                { label: 'Healthcare & Biotech', value: 'HealthTech' },
                { label: 'Enterprise Software (SaaS)', value: 'Enterprise SaaS' },
              ]}
            />
          </FormField>
          <FormField label="Estimated Employee Count">
            <TextInput
              type="number"
              value={newCompany.employeeCount}
              onChange={(e) => setNewCompany({ ...newCompany, employeeCount: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="Detected Primary Tech Stack (comma-separated)">
            <TextInput
              value={newCompany.techStack}
              onChange={(e) => setNewCompany({ ...newCompany, techStack: e.target.value })}
              placeholder="e.g. AWS, Kubernetes, React"
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};
