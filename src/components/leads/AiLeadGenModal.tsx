import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  aiService,
  AiGeneratedLeadResponseItem,
  AiLeadGenCriteriaPayload,
} from '../../api';

interface AiLeadGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadsImported?: () => void;
}

export const AiLeadGenModal: React.FC<AiLeadGenModalProps> = ({
  isOpen,
  onClose,
  onLeadsImported,
}) => {
  const [industry, setIndustry] = useState('IT & Cloud Services');
  const [product, setProduct] = useState<'Higher IQ' | 'HRMS Portal' | 'Both'>('Higher IQ');
  const [location, setLocation] = useState('San Francisco / Bangalore / Remote');
  const [companySize, setCompanySize] = useState('201-500');
  const [targetRole, setTargetRole] = useState('VP of Engineering, Head of Talent Acquisition');
  const [count, setCount] = useState(3);
  const [autoSave, setAutoSave] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLeads, setGeneratedLeads] = useState<AiGeneratedLeadResponseItem[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const criteria: AiLeadGenCriteriaPayload = {
      industry,
      product,
      location,
      companySize,
      targetRole,
      count,
      autoSave,
    };

    try {
      const response = await aiService.generateLeads(criteria);
      const leads = response.data || [];
      setGeneratedLeads(leads);

      if (autoSave && leads.length > 0) {
        setSuccessMessage(`Successfully generated and saved ${leads.length} leads directly into your pipeline!`);
        if (onLeadsImported) onLeadsImported();
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to generate leads with AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-color, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
                AI Lead Generator
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
                Powered by OpenAI GPT-4o — Targeted account discovery, buyer mapping & qualification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Criteria Form */}
          <form onSubmit={handleGenerate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '6px' }}>
                  Target Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.875rem' }}
                >
                  <option value="IT & Cloud Services">IT & Cloud Services</option>
                  <option value="Cloud & DevOps Software">Cloud & DevOps Software</option>
                  <option value="FinTech & Banking">FinTech & Banking</option>
                  <option value="Healthcare Tech">Healthcare Tech</option>
                  <option value="E-Commerce & Retail Tech">E-Commerce & Retail Tech</option>
                  <option value="AI & Machine Learning Labs">AI & Machine Learning Labs</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '6px' }}>
                  Solution / Product
                </label>
                <select
                  value={product}
                  onChange={(e) => setProduct(e.target.value as 'Higher IQ' | 'HRMS Portal' | 'Both')}
                  className="form-control"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.875rem' }}
                >
                  <option value="Higher IQ">Higher IQ (Technical ATS & Assessments)</option>
                  <option value="HRMS Portal">HRMS Portal (Payroll & Core HR)</option>
                  <option value="Both">Both (Unified Modernization)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '6px' }}>
                  Company Scale
                </label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.875rem' }}
                >
                  <option value="51-200">51-200 Employees</option>
                  <option value="201-500">201-500 Employees</option>
                  <option value="501-1000">501-1000 Employees</option>
                  <option value="1000+">1000+ Enterprise</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '6px' }}>
                  Location / Geography
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="form-control"
                  placeholder="e.g. San Francisco, CA or Bangalore"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '6px' }}>
                  Target Buyer Roles
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="form-control"
                  placeholder="e.g. VP of Engineering, Head of Talent"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '6px' }}>
                  Number of Leads
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {[1, 2, 3, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: '6px',
                        border: count === n ? '1px solid #6366f1' : '1px solid var(--border-color, #334155)',
                        backgroundColor: count === n ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                        color: count === n ? '#6366f1' : 'var(--text-muted, #94a3b8)',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border-color, #334155)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  style={{ accentColor: '#6366f1', width: '16px', height: '16px' }}
                />
                <span>Automatically add generated leads directly to my CRM pipeline</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Analyzing & Synthesizing Leads...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Generate {count} Qualified Leads</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Generated Results List */}
          {generatedLeads.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
                  Generated Accounts ({generatedLeads.length})
                </h3>
                {autoSave && (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} /> Saved into CRM Database
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {generatedLeads.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      border: '1px solid var(--border-color, #334155)',
                      borderRadius: '10px',
                      padding: '16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                            {item.company.name}
                          </span>
                          <a
                            href={item.company.website}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#6366f1', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                          >
                            <span>{item.company.website.replace('https://', '')}</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', display: 'flex', gap: '12px' }}>
                          <span>{item.company.industry}</span>
                          <span>•</span>
                          <span>{item.company.location}</span>
                          <span>•</span>
                          <span>{item.company.employeeSize} employees</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          Score: {item.qualificationScore}/100
                        </span>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: '#6366f1',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                          }}
                        >
                          ${item.value.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Buyer & Opportunity Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', fontSize: '0.8125rem' }}>
                      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} /> Key Buyer Contact
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                          {item.contact.name}
                        </div>
                        <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.75rem' }}>
                          {item.contact.title} ({item.contact.department})
                        </div>
                        <div style={{ color: '#6366f1', fontSize: '0.75rem', marginTop: '2px' }}>
                          {item.contact.email}
                        </div>
                      </div>

                      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building2 size={12} /> Tech Stack & Signals
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-primary, #f8fafc)' }}>
                          <strong>Tools:</strong> {item.company.currentTools}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                          <strong>Signals:</strong> {item.company.hiringSignals}
                        </div>
                      </div>
                    </div>

                    {/* Pain Points & Pitch */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>Target Opportunity:</strong> {item.title}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>Recommended Pitch:</strong> {item.recommendedPitch}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border-color, #334155)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

