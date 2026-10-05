import React, { useState } from 'react';
import {
  PageHeader,
  Card,
  FormField,
  TextInput,
  SelectInput,
  CheckboxInput,
} from '../components/common';
import { Save, Key, Shield, Database } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [saved, setSaved] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('/api/v1');
  const [apiKey, setApiKey] = useState('sk_live_nexus_9984102938472910');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [leadAssignmentRule, setLeadAssignmentRule] = useState('Round Robin');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <PageHeader
        title="Platform & Integration Settings"
        description="Configure backend service endpoints, API keys, notification rules, and role permissions."
        breadcrumbs={[{ label: 'Home' }, { label: 'Settings', active: true }]}
        actions={
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} />
            <span>{saved ? 'Saved!' : 'Save Configuration'}</span>
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Backend API Configuration */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <Database size={20} style={{ color: 'var(--primary-400)' }} />
            <h3 style={{ fontFamily: 'var(--font-family-heading)', fontSize: '1.1rem', fontWeight: 600 }}>
              Backend API & Service Binding
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <FormField label="Backend Service Base URL" helperText="Base URL for REST endpoints">
              <TextInput
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://api.nexus-leadgen.com/v1"
              />
            </FormField>

            <FormField label="API Integration Secret Key" helperText="Used for authentication headers">
              <TextInput
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                icon={<Key size={16} />}
              />
            </FormField>
          </div>
        </Card>

        {/* Lead Routing & Automation */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <Shield size={20} style={{ color: 'var(--primary-400)' }} />
            <h3 style={{ fontFamily: 'var(--font-family-heading)', fontSize: '1.1rem', fontWeight: 600 }}>
              Lead Assignment & Governance
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <FormField label="Automatic Lead Distribution Rule">
              <SelectInput
                value={leadAssignmentRule}
                onChange={(e) => setLeadAssignmentRule(e.target.value)}
                options={[
                  { label: 'Round Robin (Equal Weight)', value: 'Round Robin' },
                  { label: 'Territory Based', value: 'Territory' },
                  { label: 'Industry Expertise Score', value: 'Expertise' },
                ]}
              />
            </FormField>

            <FormField label="Notification Preferences">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
                <CheckboxInput
                  label="Email notification on new high-score lead"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                />
                <CheckboxInput
                  label="Daily summary digest of upcoming follow-ups"
                  checked={true}
                  onChange={() => {}}
                />
              </div>
            </FormField>
          </div>
        </Card>
      </div>
    </div>
  );
};
