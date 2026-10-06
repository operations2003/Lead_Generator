import { ProductType, LeadPriorityType } from '../db/types';

export interface QualificationSignalsInput {
  product: ProductType;
  hiringVolume: 'High' | 'Medium' | 'Low' | 'None';
  hiringMultipleRoles: boolean;
  manualHrProcesses: boolean;
  existingTools?: string | null;
  companySize?: string | null;
  decisionMakerIdentified?: boolean;
}

export interface QualificationContactContext {
  id?: string | null;
  name?: string | null;
  title?: string | null;
  department?: string | null;
  decisionMaker?: boolean;
}

export interface QualificationCompanyContext {
  id?: string;
  name?: string;
  productFit?: 'High' | 'Medium' | 'Low' | null;
  employeeCount?: number;
  industry?: string | null;
}

export interface QualificationConfig {
  highScoreThreshold: number;
  mediumScoreThreshold: number;
  weights: {
    decisionMakerVerified: number;
    hiringVolumeHigh: number;
    hiringVolumeMedium: number;
    hiringMultipleRoles: number;
    manualHrProcesses: number;
    companyProductFitHigh: number;
    companyProductFitMedium: number;
  };
}

export const DEFAULT_QUALIFICATION_CONFIG: QualificationConfig = {
  highScoreThreshold: 70,
  mediumScoreThreshold: 40,
  weights: {
    decisionMakerVerified: 25,
    hiringVolumeHigh: 20,
    hiringVolumeMedium: 10,
    hiringMultipleRoles: 15,
    manualHrProcesses: 20,
    companyProductFitHigh: 20,
    companyProductFitMedium: 10,
  },
};

export interface QualificationBreakdownItem {
  factor: string;
  points: number;
  description: string;
}

export interface QualificationResult {
  score: number;
  calculatedPriority: LeadPriorityType;
  hasAppropriateContact: boolean;
  fitSignalsRating: 'Strong' | 'Moderate' | 'Weak';
  scoreBreakdown: QualificationBreakdownItem[];
  qualificationNotes: string;
  isHighPriorityAllowed: boolean;
  validationReason?: string;
}

/**
 * Checks if contact role aligns with target product buyer personas.
 */
export function isContactRoleAppropriate(
  title?: string | null,
  product?: ProductType
): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();

  const higherIqKeywords = [
    'recruit', 'talent', 'sourc', 'people', 'engineer', 'tech', 'cto', 'founder', 'ceo'
  ];
  const hrmsKeywords = [
    'hr', 'people', 'human resource', 'payroll', 'finance', 'cfo', 'operat', 'ceo', 'founder'
  ];

  if (product === 'Higher IQ') {
    return higherIqKeywords.some((kw) => lower.includes(kw));
  }
  if (product === 'HRMS Portal') {
    return hrmsKeywords.some((kw) => lower.includes(kw));
  }
  return higherIqKeywords.some((kw) => lower.includes(kw)) || hrmsKeywords.some((kw) => lower.includes(kw));
}

/**
 * Core Lead Qualification & Scoring Business Logic Engine.
 * Evaluates signals, contact availability, and calculates verified priority.
 */
export function evaluateLeadQualification(
  signals: QualificationSignalsInput,
  contact?: QualificationContactContext | null,
  company?: QualificationCompanyContext | null,
  config: QualificationConfig = DEFAULT_QUALIFICATION_CONFIG
): QualificationResult {
  let score = 0;
  const breakdown: QualificationBreakdownItem[] = [];

  // 1. Decision Maker & Appropriate Contact Verification
  const hasContact = Boolean(contact && contact.id);
  const isDecisionMaker = Boolean(
    (contact && contact.decisionMaker) || signals.decisionMakerIdentified
  );
  const hasAppropriateContact = hasContact && isDecisionMaker;

  if (hasAppropriateContact) {
    const pts = config.weights.decisionMakerVerified;
    score += pts;
    breakdown.push({
      factor: 'Decision Maker Identified',
      points: pts,
      description: `Verified buyer (${contact?.name ? contact.name + ' - ' : ''}${contact?.title || 'Decision Maker'}) with purchasing authority.`,
    });
  } else if (hasContact && !isDecisionMaker) {
    breakdown.push({
      factor: 'Contact Present (Non-Decision Maker)',
      points: 5,
      description: 'Contact attached but not marked as key decision maker.',
    });
    score += 5;
  } else {
    breakdown.push({
      factor: 'Missing Contact',
      points: 0,
      description: 'No decision maker contact linked yet.',
    });
  }

  // 2. Hiring Volume
  if (signals.hiringVolume === 'High') {
    const pts = config.weights.hiringVolumeHigh;
    score += pts;
    breakdown.push({
      factor: 'High Hiring Volume',
      points: pts,
      description: 'Active recruitment surge (10+ openings); strong immediate need for hiring velocity.',
    });
  } else if (signals.hiringVolume === 'Medium') {
    const pts = config.weights.hiringVolumeMedium;
    score += pts;
    breakdown.push({
      factor: 'Moderate Hiring Volume',
      points: pts,
      description: 'Moderate hiring volume (3-9 openings).',
    });
  }

  // 3. Hiring Across Multiple Roles
  if (signals.hiringMultipleRoles) {
    const pts = config.weights.hiringMultipleRoles;
    score += pts;
    breakdown.push({
      factor: 'Multiple Active Roles',
      points: pts,
      description: 'Hiring simultaneously across multiple departments/functions.',
    });
  }

  // 4. Manual HR Processes
  if (signals.manualHrProcesses) {
    const pts = config.weights.manualHrProcesses;
    score += pts;
    breakdown.push({
      factor: 'Manual HR Processes',
      points: pts,
      description: 'Bottlenecks with spreadsheets, manual evaluations, or fragmented software.',
    });
  }

  // 5. Company Level Fit
  if (company?.productFit === 'High') {
    const pts = config.weights.companyProductFitHigh;
    score += pts;
    breakdown.push({
      factor: 'High Target Account Fit',
      points: pts,
      description: 'Company IT stack and headcount strongly align with ideal customer profile.',
    });
  } else if (company?.productFit === 'Medium') {
    const pts = config.weights.companyProductFitMedium;
    score += pts;
    breakdown.push({
      factor: 'Medium Target Account Fit',
      points: pts,
      description: 'Company profile aligns with core solution use-cases.',
    });
  }

  // Clamp score
  const finalScore = Math.min(100, Math.max(0, score));

  // Determine fit signals rating
  let fitSignalsRating: 'Strong' | 'Moderate' | 'Weak' = 'Weak';
  if (finalScore >= config.highScoreThreshold) {
    fitSignalsRating = 'Strong';
  } else if (finalScore >= config.mediumScoreThreshold) {
    fitSignalsRating = 'Moderate';
  }

  // Determine calculated priority according to business rules:
  // "High priority should reflect strong fit signals AND having the appropriate contact available."
  let calculatedPriority: LeadPriorityType;
  let isHighPriorityAllowed = false;
  let validationReason: string | undefined;

  if (finalScore >= config.highScoreThreshold) {
    if (hasAppropriateContact) {
      calculatedPriority = 'High';
      isHighPriorityAllowed = true;
    } else {
      // Strong signals, but missing appropriate contact -> Downgraded to Medium!
      calculatedPriority = 'Medium';
      isHighPriorityAllowed = false;
      validationReason =
        'Strong fit signals detected, but High priority requires a verified decision maker contact attached.';
    }
  } else if (finalScore >= config.mediumScoreThreshold) {
    calculatedPriority = 'Medium';
    isHighPriorityAllowed = false;
    validationReason = 'Moderate fit signals indicate standard pipeline priority.';
  } else {
    calculatedPriority = 'Low';
    isHighPriorityAllowed = false;
    validationReason = 'Score is below qualification threshold; assigned Low priority.';
  }

  // Generate automated qualification summary notes
  const notesParts: string[] = [];
  notesParts.push(`Fit: ${fitSignalsRating} (${finalScore}/100 pts) for ${signals.product}.`);
  if (hasAppropriateContact) {
    notesParts.push(`Decision maker attached: ${contact?.name || 'Verified'}.`);
  } else {
    notesParts.push('Decision maker contact missing or unverified.');
  }
  if (signals.hiringVolume === 'High') notesParts.push('High volume hiring detected.');
  if (signals.manualHrProcesses) notesParts.push('Manual HR/sourcing bottlenecks identified.');

  return {
    score: finalScore,
    calculatedPriority,
    hasAppropriateContact,
    fitSignalsRating,
    scoreBreakdown: breakdown,
    qualificationNotes: notesParts.join(' '),
    isHighPriorityAllowed,
    validationReason,
  };
}

/**
 * Validates and reconciles requested priority against backend business rules.
 */
export function validateAndReconcilePriority(
  requestedPriority: LeadPriorityType | undefined,
  qualificationResult: QualificationResult
): { priority: LeadPriorityType; adjusted: boolean; reason?: string } {
  if (!requestedPriority) {
    return { priority: qualificationResult.calculatedPriority, adjusted: false };
  }

  // Business Rule: High priority strictly requires strong signals and appropriate contact
  if (requestedPriority === 'High' && !qualificationResult.isHighPriorityAllowed) {
    return {
      priority: qualificationResult.calculatedPriority,
      adjusted: true,
      reason:
        qualificationResult.validationReason ||
        'Cannot assign High priority: High priority requires strong qualification signals and an appropriate decision-maker contact.',
    };
  }

  return { priority: requestedPriority, adjusted: false };
}
