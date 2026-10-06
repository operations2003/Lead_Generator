import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Campaign, CampaignPayload, CampaignStatus, LEAD_SOURCES } from '../../types';
import { campaignService } from '../../api';
import { Layers, Loader2, AlertCircle } from 'lucide-react';

export interface CampaignModalProps {
  isOpen: boolean;
  campaign?: Campaign | null;
  onClose: () => void;
  onSuccess: (saved: Campaign) => void;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  isOpen,
  campaign,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(campaign);

  const [name, setName] = useState('');
  const [product, setProduct] = useState('HireIQ');
  const [targetAudience, setTargetAudience] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [leadSource, setLeadSource] = useState('LinkedIn');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<CampaignStatus>('Active');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campaign) {
      setName(campaign.name || '');
      setProduct(campaign.product || 'HireIQ');
      setTargetAudience(campaign.targetAudience || '');
      setIndustry(campaign.industry || '');
      setLocation(campaign.location || '');
      setLeadSource(campaign.leadSource || 'LinkedIn');
      setStartDate(campaign.startDate ? campaign.startDate.split('T')[0] : '');
      setEndDate(campaign.endDate ? campaign.endDate.split('T')[0] : '');
      setStatus(campaign.status || 'Active');
      setNotes(campaign.notes || '');
    } else {
      setName('');
      setProduct('HireIQ');
      setTargetAudience('');
      setIndustry('');
      setLocation('');
      setLeadSource('LinkedIn');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setStatus('Active');
      setNotes('');
    }
    setError(null);
  }, [campaign, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Campaign name is required');
      return;
    }
    if (!startDate) {
      setError('Start date is required');
      return;
    }

    setLoading(true);
    setError(null);

    const payload: CampaignPayload = {
      name: name.trim(),
      product,
      targetAudience: targetAudience.trim() || null,
      industry: industry.trim() || null,
      location: location.trim() || null,
      leadSource: leadSource || null,
      startDate,
      endDate: endDate || null,
      status,
      notes: notes.trim() || null,
    };

    try {
      if (isEditing && campaign) {
        const res = await campaignService.updateCampaign(campaign.id, payload);
        if (res.data) {
          onSuccess(res.data);
          onClose();
        }
      } else {
        const res = await campaignService.createCampaign(payload);
        if (res.data) {
          onSuccess(res.data);
          onClose();
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || e.message || 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Outreach Campaign' : 'Create New Outreach Campaign'}
      maxWidth="640px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--status-error)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--status-error)',
              fontSize: '0.875rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Campaign Name */}
        <div>
          <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
            Campaign Name <span style={{ color: 'var(--status-error)' }}>*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Q4 High-Growth Tech Hiring Drive"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Product & Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Target Product <span style={{ color: 'var(--status-error)' }}>*</span>
            </label>
            <select
              className="form-select"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              required
            >
              <option value="HireIQ">HireIQ (ATS & Assessment)</option>
              <option value="HRMS">HRMS (HR & Payroll)</option>
              <option value="Both">Both (Unified Suite)</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Status
            </label>
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as CampaignStatus)}
            >
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Paused">Paused</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Lead Source & Target Audience */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Lead Source
            </label>
            <select
              className="form-select"
              value={leadSource}
              onChange={(e) => setLeadSource(e.target.value)}
            >
              {LEAD_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Target Audience
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. TA Heads, HR Directors, CEOs"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </div>
        </div>

        {/* Industry & Location */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Industry Focus
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. IT & Software, FinTech, E-commerce"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Target Location
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Bangalore, Mumbai, Remote India"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        {/* Start Date & End Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Start Date <span style={{ color: 'var(--status-error)' }}>*</span>
            </label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              End Date (Optional)
            </label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Strategy Notes */}
        <div>
          <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
            Campaign Strategy & Sequence Notes
          </label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Key messaging pillars, value propositions, and 15-day touchpoint cadence targets..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
            <span>{isEditing ? 'Save Changes' : 'Create Campaign'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
