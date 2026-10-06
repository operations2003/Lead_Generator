import { Router, Request, Response } from 'express';
import { campaignService } from '../services/campaignService';
import { requireAuth, requirePermission } from '../middleware/auth';
import {
  validateCampaignInput,
  validateCampaignUpdateInput,
} from '../middleware/validate';
import { CampaignStatusType } from '../db/types';

export const campaignRouter = Router();

// Apply auth to all campaign endpoints
campaignRouter.use(requireAuth);

/**
 * GET /api/v1/campaigns
 * List campaigns with metrics, pagination and filtering
 */
campaignRouter.get(
  '/',
  requirePermission('leads:read'),
  async (req: Request, res: Response) => {
    try {
      const {
        search,
        status,
        product,
        leadSource,
        industry,
        location,
        assignedUserId,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;

      const result = campaignService.getCampaigns({
        search: search ? String(search) : undefined,
        status: status ? (String(status) as CampaignStatusType) : undefined,
        product: product ? String(product) : undefined,
        leadSource: leadSource ? String(leadSource) : undefined,
        industry: industry ? String(industry) : undefined,
        location: location ? String(location) : undefined,
        assignedUserId: assignedUserId ? String(assignedUserId) : undefined,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: (err as Error).message,
        code: 'CAMPAIGN_LIST_ERROR',
      });
    }
  }
);

/**
 * GET /api/v1/campaigns/:id
 * Retrieve campaign details with funnel metrics and conversion rates
 */
campaignRouter.get(
  '/:id',
  requirePermission('leads:read'),
  async (req: Request, res: Response) => {
    try {
      const campaign = campaignService.getCampaignById(req.params.id);
      if (!campaign) {
        res.status(404).json({
          success: false,
          message: `Campaign with id "${req.params.id}" not found`,
          code: 'CAMPAIGN_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: campaign,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: (err as Error).message,
        code: 'CAMPAIGN_FETCH_ERROR',
      });
    }
  }
);

/**
 * GET /api/v1/campaigns/:id/leads
 * Retrieve all leads enrolled in this campaign
 */
campaignRouter.get(
  '/:id/leads',
  requirePermission('leads:read'),
  async (req: Request, res: Response) => {
    try {
      const campaign = campaignService.getCampaignById(req.params.id);
      if (!campaign) {
        res.status(404).json({
          success: false,
          message: `Campaign with id "${req.params.id}" not found`,
          code: 'CAMPAIGN_NOT_FOUND',
        });
        return;
      }

      const leads = campaignService.getCampaignLeads(req.params.id);
      res.status(200).json({
        success: true,
        data: leads,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: (err as Error).message,
        code: 'CAMPAIGN_LEADS_ERROR',
      });
    }
  }
);

/**
 * POST /api/v1/campaigns
 * Create a new outreach campaign
 */
campaignRouter.post(
  '/',
  requirePermission('leads:write'),
  validateCampaignInput,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const campaign = campaignService.createCampaign(
        {
          name: req.body.name,
          product: req.body.product,
          targetAudience: req.body.targetAudience,
          industry: req.body.industry,
          location: req.body.location,
          leadSource: req.body.leadSource,
          startDate: req.body.startDate,
          endDate: req.body.endDate,
          status: req.body.status,
          assignedUserId: req.body.assignedUserId,
          notes: req.body.notes,
        },
        userId
      );

      res.status(201).json({
        success: true,
        data: campaign,
        message: 'Campaign created successfully',
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: (err as Error).message,
        code: 'CAMPAIGN_CREATE_ERROR',
      });
    }
  }
);

/**
 * PATCH /api/v1/campaigns/:id
 * Update an existing campaign
 */
campaignRouter.patch(
  '/:id',
  requirePermission('leads:write'),
  validateCampaignUpdateInput,
  async (req: Request, res: Response) => {
    try {
      const campaign = campaignService.updateCampaign(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: campaign,
        message: 'Campaign updated successfully',
      });
    } catch (err) {
      const message = (err as Error).message;
      const status = message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        message,
        code: 'CAMPAIGN_UPDATE_ERROR',
      });
    }
  }
);

/**
 * PUT /api/v1/campaigns/:id
 * Put update support for frontend client compatibility
 */
campaignRouter.put(
  '/:id',
  requirePermission('leads:write'),
  validateCampaignUpdateInput,
  async (req: Request, res: Response) => {
    try {
      const campaign = campaignService.updateCampaign(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: campaign,
        message: 'Campaign updated successfully',
      });
    } catch (err) {
      const message = (err as Error).message;
      const status = message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        message,
        code: 'CAMPAIGN_UPDATE_ERROR',
      });
    }
  }
);

/**
 * PATCH /api/v1/campaigns/:id/archive
 * Archive campaign
 */
campaignRouter.patch(
  '/:id/archive',
  requirePermission('leads:write'),
  async (req: Request, res: Response) => {
    try {
      const campaign = campaignService.archiveCampaign(req.params.id);
      res.status(200).json({
        success: true,
        data: campaign,
        message: 'Campaign archived successfully',
      });
    } catch (err) {
      res.status(404).json({
        success: false,
        message: (err as Error).message,
        code: 'CAMPAIGN_NOT_FOUND',
      });
    }
  }
);

/**
 * DELETE /api/v1/campaigns/:id
 * Delete campaign
 */
campaignRouter.delete(
  '/:id',
  requirePermission('leads:write'),
  async (req: Request, res: Response) => {
    try {
      const success = campaignService.deleteCampaign(req.params.id);
      if (!success) {
        res.status(404).json({
          success: false,
          message: `Campaign with id "${req.params.id}" not found`,
          code: 'CAMPAIGN_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Campaign deleted successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: (err as Error).message,
        code: 'CAMPAIGN_DELETE_ERROR',
      });
    }
  }
);
