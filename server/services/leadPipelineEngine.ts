import { LeadStageType } from '../db/types';

export const PIPELINE_STAGES: LeadStageType[] = [
  'New',
  'Contacted',
  'Replied',
  'Demo Booked',
  'Demo Done',
  'Won',
  'Lost',
];

export const VALID_LOST_REASONS = [
  'Budget Constraints / No Funds',
  'Competitor Chosen',
  'No Response / Ghosted',
  'Timing Not Right / Deferred',
  'Product Feature Gap / Unmet Requirements',
  'No Authority / Decision-Maker Blocked',
  'Internal Solution Built',
  'Company Reorganizing / Hiring Freeze',
  'Other',
];

/**
 * Valid stage transition rules:
 * Defines permissible forward and backward stage progressions.
 *
 * Rules:
 * - 'New' can transition to 'Contacted', or straight to 'Lost' / 'Archived'.
 * - 'Contacted' can transition to 'Replied', back to 'New', or 'Lost' / 'Archived'.
 * - 'Replied' can transition to 'Demo Booked', back to 'Contacted', or 'Lost' / 'Archived'.
 * - 'Demo Booked' can transition to 'Demo Done', back to 'Replied', or 'Lost' / 'Archived'.
 * - 'Demo Done' can transition to 'Won', 'Lost', back to 'Demo Booked', or 'Archived'.
 * - 'Won' is a terminal success stage, can only be re-opened to 'Demo Done' or 'Contacted' with supervisor/admin rights.
 * - 'Lost' can transition back to 'New' or 'Contacted' for re-engagement.
 * - Any stage can transition to 'Lost' or 'Archived'.
 */
export const ALLOWED_STAGE_TRANSITIONS: Record<LeadStageType, LeadStageType[]> = {
  New: ['Contacted', 'Replied', 'Demo Booked', 'Lost', 'Archived'],
  Contacted: ['New', 'Replied', 'Demo Booked', 'Lost', 'Archived'],
  Replied: ['Contacted', 'Demo Booked', 'Demo Done', 'Lost', 'Archived'],
  'Demo Booked': ['Replied', 'Demo Done', 'Lost', 'Archived'],
  'Demo Done': ['Demo Booked', 'Won', 'Lost', 'Archived'],
  Won: ['Demo Done', 'Archived'], // Re-opening closed deal
  Lost: ['New', 'Contacted', 'Archived'], // Re-activating lost deal
  Archived: ['New', 'Contacted', 'Replied', 'Demo Booked', 'Demo Done', 'Won', 'Lost'],
};

export interface StageTransitionValidationResult {
  isValid: boolean;
  reason?: string;
  isWon: boolean;
  isLost: boolean;
  requiresLostReason: boolean;
}

export function validateStageTransition(
  fromStage: LeadStageType,
  toStage: LeadStageType,
  lostReason?: string | null
): StageTransitionValidationResult {
  if (fromStage === toStage) {
    return {
      isValid: true,
      isWon: toStage === 'Won',
      isLost: toStage === 'Lost',
      requiresLostReason: false,
    };
  }

  // Validate toStage is a known stage
  if (!PIPELINE_STAGES.includes(toStage) && toStage !== 'Archived') {
    return {
      isValid: false,
      reason: `"${toStage}" is not a recognized pipeline stage. Allowed: ${PIPELINE_STAGES.join(', ')}`,
      isWon: false,
      isLost: false,
      requiresLostReason: false,
    };
  }

  const allowedNext = ALLOWED_STAGE_TRANSITIONS[fromStage] || [];
  if (!allowedNext.includes(toStage)) {
    return {
      isValid: false,
      reason: `Invalid stage transition from "${fromStage}" to "${toStage}". Valid progressions: ${allowedNext.join(', ')}`,
      isWon: toStage === 'Won',
      isLost: toStage === 'Lost',
      requiresLostReason: toStage === 'Lost',
    };
  }

  // Lost handling: Must provide a lost reason when transitioning to Lost
  if (toStage === 'Lost') {
    if (!lostReason || !lostReason.trim()) {
      return {
        isValid: false,
        reason: 'A valid reason is required when transitioning a lead to "Lost".',
        isWon: false,
        isLost: true,
        requiresLostReason: true,
      };
    }
  }

  return {
    isValid: true,
    isWon: toStage === 'Won',
    isLost: toStage === 'Lost',
    requiresLostReason: toStage === 'Lost',
  };
}
