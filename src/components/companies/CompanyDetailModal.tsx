import React from 'react';
import { Modal } from '../common/Modal';
import { Company } from '../../types';
import {
  Globe,
  MapPin,
  Users,
  TrendingUp,
  Cpu,
  Radio,
  FileText,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  UserCheck,
  Target,
} from 'lucide-react';

export interface CompanyDetailModalProps {
  isOpen: boolean;
  company: Company | null;
  onClose: () => void;
  onEdit?: (company: Company) => void;
  onDelete?: (company: Company) => void;
}

export const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({
  isOpen,
  company,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!company) return null;

  const getProductFitBadge = (fit: string) => {
    switch (fit) {
      case 'High':
        return <span className="badge badge-success">High Product Fit</span>;
      case 'Medium':
        return <span className="badge badge-info">Medium Product Fit</span>;
      default:
        return <span className="badge badge-neutral">Low Product Fit</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Qualified':
        return <span className="badge badge-success">Qualified</span>;
      case 'Customer':
        return <span className="badge badge-primary">Customer</span>;
      case 'Contacted':
        return <span className="badge badge-info">Contacted</span>;
      case 'Researching':
        return <span className="badge badge-warning">Researching</span>;
      case 'Archived':
        return <span className="badge badge-danger">Archived</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Company Target Details"
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div>
            {onDelete && company.status !== 'Archived' && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onClose();
                  onDelete(company);
                }}
              >
                <Trash2 size={15} style={{ marginRight: '6px' }} />
                Archive Company
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            {onEdit && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onEdit(company);
                }}
              >
                <Edit2 size={15} style={{ marginRight: '6px' }} />
                Edit Company
              </button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Summary */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary, #0f172a)' }}>
              {company.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <a
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--primary-color, #2563eb)',
                  textDecoration: 'none',
                  fontSize: '14px',
                }}
              >
                <Globe size={14} />
                {company.domain || company.website}
                <ExternalLink size={12} />
              </a>
              <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '13px' }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>
                <MapPin size={14} />
                {company.location}
              </span>
              <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '13px' }}>•</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>
                {company.industry}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {getStatusBadge(company.status)}
            {getProductFitBadge(company.productFit)}
          </div>
        </div>

        {/* IT Mapping & Relevance Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary, #f8fafc)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} /> Employee Size
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>{company.employeeSize} ({company.employeeCount} headcount)</div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary, #f8fafc)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} /> Relevance Score
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#16a34a' }}>{company.leadRelevanceScore} / 100</div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary, #f8fafc)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> Created Date
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              {new Date(company.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Current Tools */}
        {company.currentTools && (
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={15} /> Current HR / Recruitment & IT Tools
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {company.currentTools.split(',').map((tool, idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #dbeafe',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {tool.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Hiring Signals */}
        {company.hiringSignals && (
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={15} /> Hiring Signals & Buying Triggers
            </h4>
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fefce8',
                borderLeft: '4px solid #eab308',
                color: '#854d0e',
                fontSize: '13px',
                borderRadius: '0 6px 6px 0',
              }}
            >
              {company.hiringSignals}
            </div>
          </div>
        )}

        {/* Notes */}
        {company.notes && (
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} /> Account Strategy & Notes
            </h4>
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-secondary, #f8fafc)',
                borderRadius: '6px',
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--text-primary, #334155)',
              }}
            >
              {company.notes}
            </div>
          </div>
        )}

        {/* Related Contacts */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '10px 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={16} /> Related Contacts ({company.contacts?.length || 0})
          </h4>
          {company.contacts && company.contacts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {company.contacts.map((contact) => (
                <div
                  key={contact.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-secondary, #f8fafc)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '6px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>
                      {contact.name}
                      {contact.decision_maker === 1 && (
                        <span className="badge badge-primary" style={{ marginLeft: '8px', fontSize: '11px' }}>
                          Decision Maker
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                      {contact.title} • {contact.department || 'General'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px' }}>
                    {contact.email && <div>{contact.email}</div>}
                    {contact.phone && <div style={{ color: 'var(--text-secondary, #64748b)' }}>{contact.phone}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary, #64748b)', fontSize: '13px', backgroundColor: 'var(--bg-secondary, #f8fafc)', borderRadius: '6px' }}>
              No contacts associated with this company yet.
            </div>
          )}
        </div>

        {/* Related Leads */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '10px 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={16} /> Related Leads / Pipeline ({company.leads?.length || 0})
          </h4>
          {company.leads && company.leads.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {company.leads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-secondary, #f8fafc)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '6px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{lead.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                      Status: {lead.status} • Priority: {lead.priority}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#16a34a' }}>
                      ${lead.value.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary, #64748b)', fontSize: '13px', backgroundColor: 'var(--bg-secondary, #f8fafc)', borderRadius: '6px' }}>
              No active pipeline leads mapped for this company.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
