import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { OutreachTemplate } from '../../types';
import { templateService } from '../../api';
import {
  FileText,
  Mail,
  Linkedin,
  Phone,
  MessageSquare,
  Presentation,
  Check,
  Search,
  Loader2,
} from 'lucide-react';

export interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: OutreachTemplate) => void;
  currentType?: string;
  companyName?: string;
  contactName?: string;
}

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentType,
  companyName = 'Company',
  contactName = 'Prospect',
}) => {
  const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>(currentType || 'All');

  useEffect(() => {
    if (!isOpen) return;

    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const res = await templateService.getTemplates();
        if (res.data) {
          setTemplates(res.data);
        }
      } catch {
        // Fallback or empty
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [isOpen]);

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.body.toLowerCase().includes(search.toLowerCase()) ||
      (t.subject && t.subject.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedType === 'All' || t.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'Initial Email':
      case 'Follow-up Email':
      case 'Final Follow-up':
      case 'Email':
        return <Mail size={16} color="var(--primary-400)" />;
      case 'LinkedIn Message':
      case 'LinkedIn':
        return <Linkedin size={16} color="#0a66c2" />;
      case 'Call Script':
      case 'Phone':
        return <Phone size={16} color="#10b981" />;
      case 'WhatsApp Message':
      case 'WhatsApp':
        return <MessageSquare size={16} color="#25D366" />;
      case 'Demo Follow-up':
        return <Presentation size={16} color="#f59e0b" />;
      default:
        return <FileText size={16} color="var(--text-muted)" />;
    }
  };

  const renderPersonalizedPreview = (text: string) => {
    return text
      .replace(/{{company}}/g, companyName)
      .replace(/{{firstName}}/g, contactName.split(' ')[0] || contactName)
      .replace(/{{industry}}/g, 'Tech')
      .replace(/{{senderName}}/g, 'Our Team');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Outreach Templates Library & 15-Day Sequence"
      maxWidth="780px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Search & Filter Header */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Search templates by subject or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '2px' }}>
            {['All', 'Initial Email', 'LinkedIn Message', 'Call Script', 'Follow-up Email', 'Final Follow-up', 'WhatsApp Message'].map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  className={`btn btn-sm ${selectedType === type ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedType(type)}
                  style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                >
                  {type}
                </button>
              )
            )}
          </div>
        </div>

        {/* Templates List */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            <span>Loading outreach templates...</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No templates matching the selected filter.
          </div>
        ) : (
          <div
            style={{
              maxHeight: '440px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              paddingRight: '4px',
            }}
          >
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  transition: 'border-color 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  onSelect(template);
                  onClose();
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getIconForType(template.type)}
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {template.name}
                    </span>
                    {template.sequenceDay && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          color: 'var(--primary-400)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        Day {template.sequenceDay}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(template);
                      onClose();
                    }}
                  >
                    <Check size={13} style={{ marginRight: '4px' }} />
                    Apply Template
                  </button>
                </div>

                {template.subject && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Subject: <span style={{ color: 'var(--text-secondary)' }}>{renderPersonalizedPreview(template.subject)}</span>
                  </div>
                )}

                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '90px',
                    overflowY: 'hidden',
                    lineHeight: '1.4',
                  }}
                >
                  {renderPersonalizedPreview(template.body)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
