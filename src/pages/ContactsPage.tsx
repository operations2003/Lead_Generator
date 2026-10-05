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
import { Plus, Mail, Linkedin } from 'lucide-react';
import { contactService } from '../api';
import { Contact, ContactFilterParams } from '../types';

export const ContactsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newContact, setNewContact] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    companyName: string;
    title: string;
    department: string;
    decisionRole: 'Decision Maker' | 'Influencer' | 'User' | 'Gatekeeper';
  }>({
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    title: 'VP of Engineering',
    department: 'Engineering',
    decisionRole: 'Decision Maker',
  });

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params: ContactFilterParams = {
        page,
        limit: 10,
        search: search || undefined,
        decisionRole: roleFilter || undefined,
      };
      const res = await contactService.getContacts(params);
      if (res.data) {
        setContacts(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch {
      // Interface ready for backend endpoint
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await contactService.createContact({
        companyId: 'comp-1',
        companyName: newContact.companyName || 'Enterprise Corp',
        firstName: newContact.firstName,
        lastName: newContact.lastName,
        email: newContact.email,
        title: newContact.title,
        department: newContact.department,
        decisionRole: newContact.decisionRole,
        status: 'Active',
      });
      setIsModalOpen(false);
      loadContacts();
    } catch {
      // Endpoint interface ready
    }
  };

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Decision Maker',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--primary-400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
            }}
          >
            {row.firstName?.[0]}{row.lastName?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{row.firstName} {row.lastName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.title}</div>
          </div>
        </div>
      ),
    },
    { key: 'companyName', header: 'Target Company', sortable: true },
    { key: 'department', header: 'Department' },
    {
      key: 'decisionRole',
      header: 'Buying Role',
      render: (row) => (
        <span
          className={`badge ${
            row.decisionRole === 'Decision Maker' ? 'badge-purple' : 'badge-neutral'
          }`}
        >
          {row.decisionRole}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Contact Info',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem' }}>
          <a href={`mailto:${row.email}`} style={{ color: 'var(--primary-400)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Mail size={12} />
            {row.email}
          </a>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Connect',
      render: () => (
        <button className="btn btn-secondary btn-sm" title="View LinkedIn Profile">
          <Linkedin size={14} />
          <span>LinkedIn</span>
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="IT Decision Makers Directory"
        description="Verified C-level executive contacts, CTOs, VPs of Infrastructure, and IT Buyers."
        breadcrumbs={[{ label: 'Home' }, { label: 'Contacts', active: true }]}
        actions={
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Add Contact</span>
          </button>
        }
      />

      <Filters
        searchPlaceholder="Search contact name, title, email..."
        searchValue={search}
        onSearchChange={setSearch}
        filterOptions={[
          {
            key: 'decisionRole',
            label: 'All Buying Roles',
            value: roleFilter,
            options: [
              { label: 'Decision Maker', value: 'Decision Maker' },
              { label: 'Influencer', value: 'Influencer' },
              { label: 'User', value: 'User' },
              { label: 'Gatekeeper', value: 'Gatekeeper' },
            ],
            onChange: setRoleFilter,
          },
        ]}
      />

      <Table
        columns={columns}
        data={contacts}
        loading={loading}
        keyExtractor={(row) => row.id}
        emptyTitle="No contacts found"
        emptyDescription="Search for IT decision makers across mapped target companies."
        pagination={{
          page,
          limit: 10,
          total,
          onPageChange: setPage,
        }}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add IT Decision Maker"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateContact}>
              Save Contact
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateContact} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="First Name" required>
              <TextInput
                value={newContact.firstName}
                onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Last Name" required>
              <TextInput
                value={newContact.lastName}
                onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                required
              />
            </FormField>
          </div>
          <FormField label="Work Email Address" required>
            <TextInput
              type="email"
              value={newContact.email}
              onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              placeholder="alex@company.com"
              required
            />
          </FormField>
          <FormField label="Company Name">
            <TextInput
              value={newContact.companyName}
              onChange={(e) => setNewContact({ ...newContact, companyName: e.target.value })}
              placeholder="Target Enterprise Name"
            />
          </FormField>
          <FormField label="Job Title">
            <TextInput
              value={newContact.title}
              onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
              placeholder="e.g. Chief Technology Officer (CTO)"
            />
          </FormField>
          <FormField label="Decision Role">
            <SelectInput
              value={newContact.decisionRole}
              onChange={(e) => setNewContact({ ...newContact, decisionRole: e.target.value as 'Decision Maker' | 'Influencer' | 'User' | 'Gatekeeper' })}
              options={[
                { label: 'Decision Maker', value: 'Decision Maker' },
                { label: 'Technical Influencer', value: 'Influencer' },
                { label: 'End User / Lead Specifier', value: 'User' },
              ]}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};
