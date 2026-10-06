import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Company, CreateCompanyPayload, CompanyStatus, ProductFitLevel } from '../../types';
import { AlertCircle, Loader2 } from 'lucide-react';

export interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCompanyPayload) => Promise<void>;
  companyToEdit?: Company | null;
}

const INDUSTRIES = [
  'Cloud & Cybersecurity',
  'Fintech & Payments',
  'Enterprise Software & SaaS',
  'HealthTech & Life Sciences',
  'E-Commerce & Retail Tech',
  'AI & Data Infrastructure',
  'EdTech & Learning',
  'Manufacturing & Logistics Tech',
  'Professional Services',
  'Other',
];

const EMPLOYEE_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000-5000',
  '5000+',
];

const STATUSES: CompanyStatus[] = [
  'Prospect',
  'Researching',
  'Contacted',
  'Qualified',
  'Customer',
  'Archived',
  'Unqualified',
];

export const CompanyFormModal: React.FC<CompanyFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  companyToEdit,
}) => {
  const isEditing = Boolean(companyToEdit);

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [location, setLocation] = useState('');
  const [employeeSize, setEmployeeSize] = useState(EMPLOYEE_SIZES[2]);
  const [hiringSignals, setHiringSignals] = useState('');
  const [currentTools, setCurrentTools] = useState('');
  const [productFit, setProductFit] = useState<ProductFitLevel>('Medium');
  const [leadRelevanceScore, setLeadRelevanceScore] = useState(70);
  const [status, setStatus] = useState<CompanyStatus>('Prospect');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyToEdit) {
      setName(companyToEdit.name || '');
      setWebsite(companyToEdit.website || '');
      setIndustry(companyToEdit.industry || INDUSTRIES[0]);
      setLocation(companyToEdit.location || '');
      setEmployeeSize(companyToEdit.employeeSize || EMPLOYEE_SIZES[2]);
      setHiringSignals(companyToEdit.hiringSignals || '');
      setCurrentTools(companyToEdit.currentTools || '');
      setProductFit(companyToEdit.productFit || 'Medium');
      setLeadRelevanceScore(companyToEdit.leadRelevanceScore ?? 70);
      setStatus(companyToEdit.status || 'Prospect');
      setNotes(companyToEdit.notes || '');
    } else {
      setName('');
      setWebsite('');
      setIndustry(INDUSTRIES[0]);
      setLocation('');
      setEmployeeSize(EMPLOYEE_SIZES[2]);
      setHiringSignals('');
      setCurrentTools('');
      setProductFit('Medium');
      setLeadRelevanceScore(70);
      setStatus('Prospect');
      setNotes('');
    }
    setError(null);
  }, [companyToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!website.trim()) {
      setError('Website is required.');
      return;
    }
    if (!industry.trim()) {
      setError('Industry is required.');
      return;
    }
    if (!location.trim()) {
      setError('Location is required.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        website: website.trim(),
        industry: industry.trim(),
        location: location.trim(),
        employeeSize: employeeSize.trim(),
        hiringSignals: hiringSignals.trim() || undefined,
        currentTools: currentTools.trim() || undefined,
        productFit,
        leadRelevanceScore: Number(leadRelevanceScore),
        status,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to save company. Please verify details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Company Target' : 'Add New Target Company'}
      maxWidth="680px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="spin" style={{ marginRight: '6px' }} />
                {isEditing ? 'Saving Changes...' : 'Adding Company...'}
              </>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Add Company'
            )}
          </button>
        </div>
      }
    >
      {error && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Company Name *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Acme Cloud Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Website / Domain *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. https://acme.io or acme.io"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Industry *
            </label>
            <select
              className="form-input"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Location / HQ *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. San Francisco, CA or London, UK"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Employee Size *
            </label>
            <select
              className="form-input"
              value={employeeSize}
              onChange={(e) => setEmployeeSize(e.target.value)}
            >
              {EMPLOYEE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} employees
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Product Fit
            </label>
            <select
              className="form-input"
              value={productFit}
              onChange={(e) => setProductFit(e.target.value as ProductFitLevel)}
            >
              <option value="High">High Fit</option>
              <option value="Medium">Medium Fit</option>
              <option value="Low">Low Fit</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Relevance Score (0-100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              className="form-input"
              value={leadRelevanceScore}
              onChange={(e) => setLeadRelevanceScore(Number(e.target.value))}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Status
            </label>
            <select
              className="form-input"
              value={status}
              onChange={(e) => setStatus(e.target.value as CompanyStatus)}
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Current Tools & Stack
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Workday, Jira, AWS, Datadog"
              value={currentTools}
              onChange={(e) => setCurrentTools(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>
            Hiring Signals & Buying Triggers
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Hiring 15+ DevOps engineers, expanding into APAC"
            value={hiringSignals}
            onChange={(e) => setHiringSignals(e.target.value)}
          />
        </div>

        <div>
          <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>
            IT Mapping Notes & Strategy
          </label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Key insights, technical pain points, expansion plans..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};
