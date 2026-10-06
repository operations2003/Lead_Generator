// Database configuration and types
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login_at: string | null;
  login_count: number;
  password_changed_at: string;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface PermissionRecord {
  id: string;
  name: string;
  description: string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  is_revoked: number;
  created_at: string;
  last_activity_at: string;
}

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  normalized_name: string;
  website: string;
  normalized_domain: string;
  industry: string;
  location: string;
  employee_size: string;
  employee_count: number;
  hiring_signals: string | null;
  current_tools: string | null;
  product_fit: 'High' | 'Medium' | 'Low';
  lead_relevance_score: number;
  notes: string | null;
  status: 'Prospect' | 'Researching' | 'Contacted' | 'Qualified' | 'Customer' | 'Archived' | 'Unqualified';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactRecord {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  department: string | null;
  decision_maker: number;
  linkedin_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadRecord {
  id: string;
  company_id: string;
  contact_id: string | null;
  title: string;
  value: number;
  status: string;
  priority: string;
  source: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

