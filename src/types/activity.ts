export type ActivityType = 'Email' | 'LinkedIn' | 'Phone' | 'WhatsApp' | 'Demo' | 'Other';

export interface Activity {
  id: string;
  lead_id: string;
  user_id: string;
  type: ActivityType;
  subject?: string | null;
  notes: string;
  activity_date: string;
  cadence_day?: number | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  lead_title?: string;
  company_name?: string;
  contact_name?: string | null;
}

export interface CreateActivityPayload {
  leadId: string;
  type: ActivityType;
  subject?: string;
  notes: string;
  activityDate?: string;
  cadenceDay?: number;
  scheduleFollowUp?: {
    title: string;
    type?: ActivityType;
    dueDate: string;
    notes?: string;
    cadenceDay?: number;
  };
}

export interface UpdateActivityPayload {
  type?: ActivityType;
  subject?: string;
  notes?: string;
  activityDate?: string;
  cadenceDay?: number;
}

export interface CadenceStep {
  day: number;
  type: ActivityType;
  title: string;
  description: string;
}

export const CADENCE_STEPS: CadenceStep[] = [
  {
    day: 1,
    type: 'Email',
    title: 'Day 1: Initial Value Pitch Email',
    description: 'Send concise personalized email highlighting specific company pain points and solution fit.',
  },
  {
    day: 3,
    type: 'LinkedIn',
    title: 'Day 3: LinkedIn Connection & Context Note',
    description: 'Connect with decision maker; reference previous email and relevant IT insights.',
  },
  {
    day: 6,
    type: 'Phone',
    title: 'Day 6: Alignment Discovery Call',
    description: 'Brief 5-minute phone call to verify current hiring bottlenecks and tooling stack.',
  },
  {
    day: 10,
    type: 'Email',
    title: 'Day 10: Value Case Study Email',
    description: 'Share case study demonstrating ROI and hiring velocity improvements.',
  },
  {
    day: 15,
    type: 'Email',
    title: 'Day 15: Final Follow-up / Break-up Note',
    description: 'Polite final touchpoint inquiring whether to close file or revisit next quarter.',
  },
];
