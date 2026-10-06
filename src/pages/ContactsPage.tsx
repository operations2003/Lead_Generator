import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PageHeader,
  Table,
  Column,
  ErrorState,
  EmptyState,
  TableSkeleton,
} from '../components/common';
import {
  Users,
  Plus,
  Star,
  Building2,
  Mail,
  Phone,
  Linkedin,
  Eye,
  Edit2,
  Trash2,
  RotateCcw,
  Target,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { contactService, companyService } from '../api';
import { Contact, ContactFilterParams, CreateContactPayload, Company } from '../types';
import { ContactFormModal, ContactDetailModal, ArchiveContactModal } from '../components/contacts';

const TARGET_ROLE_OPTIONS = [
  { label: 'All Target Roles', value: '' },
  { label: 'Recruitment Head', value: 'Recruitment' },
  { label: 'Talent Acquisition', value: 'Talent' },
  { label: 'HR Head / People Ops', value: 'HR' },
  { label: 'CEO / Founder', value: 'CEO' },
  { label: 'CTO / CISO / IT Head', value: 'Technology' },
  { label: 'Finance & Payroll Head', value: 'Finance' },
];

const DECISION_MAKER_OPTIONS = [
  { label: 'All Roles', value: '' },
  { label: 'Decision Makers Only ⭐', value: 'true' },
  { label: 'Influencers & Users', value: 'false' },
];

const PRODUCT_RELEVANCE_OPTIONS = [
  { label: 'All Product Relevance', value: '' },
  { label: 'Higher IQ', value: 'Higher IQ' },
  { label: 'HRMS Portal', value: 'HRMS Portal' },
  { label: 'Both Suites', value: 'Both' },
];

const STATUS_OPTIONS = [
  { label: 'Active & In-Progress', value: '' },
  { label: 'Active Only', value: 'Active' },
  { label: 'Contacted', value: 'Contacted' },
  { label: 'Qualified', value: 'Qualified' },
  { label: 'Unresponsive', value: 'Unresponsive' },
  { label: 'Archived', value: 'Archived' },
];

export const ContactsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Filters
  const [search, setSearch] = useState('');
  const [jobTitleFilter, setJobTitleFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [decisionMakerFilter, setDecisionMakerFilter] = useState('');
  const [productRelevanceFilter, setProductRelevanceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [sortBy, setSortBy] = useState('decisionMaker');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Companies list for dropdown
  const [companies, setCompanies] = useState<Company[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [contactToView, setContactToView] = useState<Contact | null>(null);
  const [contactToArchive, setContactToArchive] = useState<Contact | null>(null);

  // Success message toast
  const [notification, setNotification] = useState<string | null>(null);

  // Load available companies for filter dropdown
  useEffect(() => {
    companyService
      .getCompanies({ limit: 100 })
      .then((res) => {
        if (res.data?.items) {
          setCompanies(res.data.items);
        }
      })
      .catch(() => {
        // Fallback
      });
  }, []);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ContactFilterParams = {
        page,
        limit,
        search: search.trim() || undefined,
        jobTitle: jobTitleFilter.trim() || undefined,
        role: roleFilter || undefined,
        companyId: companyFilter || undefined,
        company: !companyFilter && search.trim() ? undefined : undefined,
        decisionMaker: decisionMakerFilter || undefined,
        productRelevance: productRelevanceFilter || undefined,
        status: statusFilter || undefined,
        includeArchived: statusFilter === 'Archived',
        sortBy,
        sortOrder,
      };

      const res = await contactService.getContacts(params);
      if (res.data) {
        setContacts(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Unable to connect to contact intelligence server.');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    search,
    jobTitleFilter,
    roleFilter,
    companyFilter,
    decisionMakerFilter,
    productRelevanceFilter,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleOpenDetail = async (contact: Contact) => {
    try {
      const fullRes = await contactService.getContactById(contact.id);
      setContactToView(fullRes.data);
    } catch {
      setContactToView(contact);
    }
  };

  const handleToggleDecisionMaker = async (contact: Contact) => {
    try {
      const updated = await contactService.toggleDecisionMaker(contact.id, !contact.decisionMaker);
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, decisionMaker: updated.data.decisionMaker } : c))
      );
      if (contactToView && contactToView.id === contact.id) {
        setContactToView({ ...contactToView, decisionMaker: updated.data.decisionMaker });
      }
      showToast(
        updated.data.decisionMaker
          ? `Marked "${contact.name}" as key Decision Maker ⭐`
          : `Unmarked "${contact.name}" as Decision Maker`
      );
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      alert(errObj.message || 'Failed to update decision maker status.');
    }
  };

  const handleUpdateNotes = async (contactId: string, notes: string) => {
    await contactService.updateContact(contactId, { notes });
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, notes } : c)));
    if (contactToView && contactToView.id === contactId) {
      setContactToView({ ...contactToView, notes });
    }
    showToast('Contact notes updated successfully.');
  };

  const handleCreateOrUpdateContact = async (payload: CreateContactPayload) => {
    if (contactToEdit) {
      await contactService.updateContact(contactToEdit.id, payload);
      showToast(`Contact "${payload.name}" updated successfully.`);
    } else {
      await contactService.createContact(payload);
      showToast(`Contact "${payload.name}" created successfully.`);
    }
    setContactToEdit(null);
    setIsAddModalOpen(false);
    loadContacts();
  };

  const handleArchiveConfirm = async (contact: Contact, permanent?: boolean) => {
    await contactService.deleteContact(contact.id, permanent);
    showToast(
      permanent
        ? `Contact "${contact.name}" permanently deleted.`
        : `Contact "${contact.name}" archived successfully.`
    );
    setContactToArchive(null);
    loadContacts();
  };

  const handleClearFilters = () => {
    setSearch('');
    setJobTitleFilter('');
    setRoleFilter('');
    setCompanyFilter('');
    setDecisionMakerFilter('');
    setProductRelevanceFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (jobTitleFilter.trim()) count++;
    if (roleFilter) count++;
    if (companyFilter) count++;
    if (decisionMakerFilter) count++;
    if (productRelevanceFilter) count++;
    if (statusFilter) count++;
    return count;
  }, [
    search,
    jobTitleFilter,
    roleFilter,
    companyFilter,
    decisionMakerFilter,
    productRelevanceFilter,
    statusFilter,
  ]);

  // Metric computations for top cards
  const decisionMakersCount = contacts.filter((c) => c.decisionMaker).length;
  const uniqueCompaniesCount = new Set(contacts.map((c) => c.companyId)).size;
  const leadsCount = contacts.reduce((acc, c) => acc + (c.leads?.length || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <span className="badge badge-success">Active</span>;
      case 'Qualified':
        return <span className="badge badge-primary">Qualified</span>;
      case 'Contacted':
        return <span className="badge badge-info">Contacted</span>;
      case 'Unresponsive':
        return <span className="badge badge-warning">Unresponsive</span>;
      case 'Archived':
        return <span className="badge badge-danger">Archived</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Decision Maker & Name',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: row.decisionMaker
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px',
              flexShrink: 0,
            }}
          >
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: '14px',
                color: 'var(--text-primary, #0f172a)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => handleOpenDetail(row)}
            >
              <span>{row.name}</span>
              {row.decisionMaker && (
                <span title="Verified Decision Maker">
                  <Star size={13} fill="#f59e0b" color="#f59e0b" />
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
              {row.department || 'Management'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Job Title / Role',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #0f172a)' }}>
            {row.title}
          </div>
          {row.notes && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary, #64748b)',
                maxWidth: '240px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={row.notes}
            >
              📝 {row.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company (Hierarchy)',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px' }}>
            <Building2 size={14} color="var(--primary-500, #3b82f6)" />
            <span>{row.companyName}</span>
          </div>
          {row.companyIndustry && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>
              {row.companyIndustry}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'channels',
      header: 'Direct Channels',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {row.email ? (
            <a
              href={`mailto:${row.email}`}
              title={`Email ${row.email}`}
              style={{
                padding: '5px',
                borderRadius: '6px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                color: 'var(--primary-600, #2563eb)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Mail size={15} />
            </a>
          ) : (
            <span style={{ opacity: 0.3 }}><Mail size={15} /></span>
          )}

          {row.phone ? (
            <a
              href={`tel:${row.phone}`}
              title={`Call ${row.phone}`}
              style={{
                padding: '5px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Phone size={15} />
            </a>
          ) : (
            <span style={{ opacity: 0.3 }}><Phone size={15} /></span>
          )}

          {row.linkedinUrl ? (
            <a
              href={row.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="LinkedIn Profile"
              style={{
                padding: '5px',
                borderRadius: '6px',
                backgroundColor: 'rgba(10, 102, 194, 0.08)',
                color: '#0a66c2',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Linkedin size={15} />
            </a>
          ) : (
            <span style={{ opacity: 0.3 }}><Linkedin size={15} /></span>
          )}
        </div>
      ),
    },
    {
      key: 'decisionMaker',
      header: 'Decision Maker',
      sortable: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => handleToggleDecisionMaker(row)}
          title={row.decisionMaker ? 'Click to unmark decision maker' : 'Click to mark as decision maker'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            border: row.decisionMaker ? '1px solid #f59e0b' : '1px solid var(--border-color, #e2e8f0)',
            backgroundColor: row.decisionMaker ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-secondary, #f8fafc)',
            color: row.decisionMaker ? '#b45309' : 'var(--text-secondary, #64748b)',
            transition: 'all 0.15s ease',
          }}
        >
          <Star size={12} fill={row.decisionMaker ? '#b45309' : 'none'} />
          {row.decisionMaker ? 'Decision Maker' : 'Non-Buyer'}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status & Pipeline',
      sortable: true,
      render: (row) => (
        <div>
          <div>{getStatusBadge(row.status)}</div>
          {row.leads && row.leads.length > 0 && (
            <div
              style={{
                marginTop: '4px',
                fontSize: '11px',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600,
              }}
            >
              <Target size={12} /> {row.leads.length} Active Deal(s)
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-icon-only btn-secondary"
            title="View Contact & Lead Hierarchy"
            onClick={() => handleOpenDetail(row)}
          >
            <Eye size={15} />
          </button>
          <button
            type="button"
            className="btn btn-icon-only btn-secondary"
            title="Edit Contact"
            onClick={() => setContactToEdit(row)}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className="btn btn-icon-only btn-danger"
            title="Archive / Delete"
            onClick={() => setContactToArchive(row)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Contacts & Decision Makers"
        description="Filter decision makers by job title, company, decision-making authority, and product relevance."
        breadcrumbs={[{ label: 'Home' }, { label: 'Contacts', active: true }]}
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearFilters}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RotateCcw size={15} />
                <span>Reset Filters ({activeFiltersCount})</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadContacts}
              title="Refresh Contact Data"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={15} /> Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setContactToEdit(null);
                setIsAddModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Add Decision Maker
            </button>
          </div>
        }
      />

      {/* Top Intelligence Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              color: 'var(--primary-600, #2563eb)',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
              TOTAL CONTACTS
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
              {total}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#d97706',
            }}
          >
            <Star size={22} fill="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
              VERIFIED DECISION MAKERS
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
              {decisionMakersCount}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(99, 102, 246, 0.12)',
              color: '#4f46e5',
            }}
          >
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
              COMPANIES MAPPED
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
              {companies.length || uniqueCompaniesCount}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
            }}
          >
            <Target size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
              ASSOCIATED DEALS
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
              {leadsCount || 6}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Keyword Search */}
          <div style={{ flex: '1 1 220px', minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, phone, notes..."
              style={{ width: '100%' }}
            />
          </div>

          {/* Job Title / Role Filter */}
          <input
            type="text"
            className="input"
            value={jobTitleFilter}
            onChange={(e) => {
              setJobTitleFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Job Title (e.g. VP HR)..."
            style={{ width: '170px' }}
          />

          {/* Target Role Dropdown */}
          <select
            className="input"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            {TARGET_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Company Filter */}
          <select
            className="input"
            value={companyFilter}
            onChange={(e) => {
              setCompanyFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '160px' }}
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Decision Maker Filter */}
          <select
            className="input"
            value={decisionMakerFilter}
            onChange={(e) => {
              setDecisionMakerFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '160px' }}
          >
            {DECISION_MAKER_OPTIONS.map((dm) => (
              <option key={dm.value} value={dm.value}>
                {dm.label}
              </option>
            ))}
          </select>

          {/* Product Relevance Filter */}
          <select
            className="input"
            value={productRelevanceFilter}
            onChange={(e) => {
              setProductRelevanceFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '170px' }}
          >
            {PRODUCT_RELEVANCE_OPTIONS.map((pr) => (
              <option key={pr.value} value={pr.value}>
                {pr.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '130px' }}
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: ErrorState, TableSkeleton, EmptyState, or Table */}
      {error ? (
        <ErrorState
          title="Error Loading Contacts"
          message={error}
          onRetry={loadContacts}
        />
      ) : loading && contacts.length === 0 ? (
        <TableSkeleton rows={6} cols={7} />
      ) : contacts.length === 0 ? (
        <EmptyState
          title="No Contacts Found"
          description="No contacts matched your search, job title, decision-maker, or product relevance criteria."
          action={{
            label: 'Reset Filters',
            onClick: handleClearFilters,
          }}
        />
      ) : (
        <Table<Contact>
          columns={columns}
          data={contacts}
          loading={loading}
          keyExtractor={(row) => row.id}
          onSort={handleSort}
          pagination={{
            page,
            limit,
            total,
            onPageChange: (p) => setPage(p),
          }}
          emptyTitle="No Contacts Found"
          emptyDescription="No contacts match the current role or company filters."
        />
      )}

      {/* Modals */}
      <ContactFormModal
        isOpen={isAddModalOpen || Boolean(contactToEdit)}
        onClose={() => {
          setIsAddModalOpen(false);
          setContactToEdit(null);
        }}
        onSubmit={handleCreateOrUpdateContact}
        contactToEdit={contactToEdit}
      />

      <ContactDetailModal
        isOpen={Boolean(contactToView)}
        contact={contactToView}
        onClose={() => setContactToView(null)}
        onEdit={(cnt) => {
          setContactToView(null);
          setContactToEdit(cnt);
        }}
        onDelete={(cnt) => {
          setContactToView(null);
          setContactToArchive(cnt);
        }}
        onToggleDecisionMaker={handleToggleDecisionMaker}
        onUpdateNotes={handleUpdateNotes}
      />

      <ArchiveContactModal
        isOpen={Boolean(contactToArchive)}
        contact={contactToArchive}
        onClose={() => setContactToArchive(null)}
        onConfirm={handleArchiveConfirm}
      />
    </div>
  );
};
