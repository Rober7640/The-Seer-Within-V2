// Backend-deck shipments — the admin API. Mounted at /api/admin/shipments by
// ./index.ts, AFTER `router.use(requireAdmin)`, so every route here needs an admin token.
//
//   GET  /api/admin/shipments?status=pending|shipped|cancelled&offer=<key>&limit=<n>
//   POST /api/admin/shipments/:id/shipped  { carrier, trackingNumber, trackingUrl (https) }
//   POST /api/admin/shipments/:id/cancel   { reason }            (pending only)
//
// API only. How packing is run — who packs, how they see orders — is the operator's call;
// there is deliberately no admin page here. Logic: server/lib/beShipmentAdmin.ts.

import { Router, type Request, type Response } from 'express';
import { isBackendOfferKey } from '@shared/backendOffers';
import {
  cancelShipment,
  isShipmentStatus,
  listShipments,
  markShipmentShipped,
  parseCancelReason,
  parseShippedInput,
} from '../../lib/beShipmentAdmin';
import logger from '../../lib/logger';

const router = Router();

/** A uuid, or anything shaped like an id. Everything else cannot exist. */
const SHIPMENT_ID = /^[A-Za-z0-9_-]{1,100}$/;

router.get('/', async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined;
  const offer = typeof req.query.offer === 'string' && req.query.offer ? req.query.offer : undefined;
  if (status !== undefined && !isShipmentStatus(status)) {
    return res.status(400).json({ error: 'status must be pending, shipped or cancelled.' });
  }
  if (offer !== undefined && !isBackendOfferKey(offer)) {
    return res.status(400).json({ error: 'offer must be a backend offer key.' });
  }
  const rawLimit = Number(req.query.limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 200;

  try {
    const shipments = await listShipments({ status, offer, limit });
    return res.json({ shipments });
  } catch (err) {
    logger.error('admin/shipments list failed:', err);
    return res.status(500).json({ error: 'Could not list shipments.' });
  }
});

router.post('/:id/shipped', async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  if (!SHIPMENT_ID.test(id)) return res.status(404).json({ error: 'Shipment not found.' });

  const parsed = parseShippedInput(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const result = await markShipmentShipped(id, parsed.value);
    if (!result.ok) {
      return res
        .status(result.code === 'not_found' ? 404 : 409)
        .json({ error: result.message, code: result.code });
    }
    logger.info('admin/shipments: mark shipped', {
      shipment: id,
      admin: req.adminEmail,
      listWritten: result.listWritten,
      alreadyShipped: result.alreadyShipped,
    });
    if (!result.listWritten) {
      return res.status(502).json({
        error: 'Marked shipped, but the AWeber write that sends her tracking email failed. POST again to retry.',
        listError: result.listError,
        shipment: result.shipment,
      });
    }
    return res.json({ shipment: result.shipment, listWritten: true, alreadyShipped: result.alreadyShipped });
  } catch (err) {
    logger.error('admin/shipments mark shipped failed:', err);
    return res.status(500).json({ error: 'Could not mark the shipment shipped.' });
  }
});

router.post('/:id/cancel', async (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  if (!SHIPMENT_ID.test(id)) return res.status(404).json({ error: 'Shipment not found.' });

  const parsed = parseCancelReason(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    const result = await cancelShipment(id, parsed.value);
    if (!result.ok) {
      return res
        .status(result.code === 'not_found' ? 404 : 409)
        .json({ error: result.message, code: result.code });
    }
    logger.info('admin/shipments: cancelled', { shipment: id, admin: req.adminEmail });
    return res.json({ shipment: result.shipment });
  } catch (err) {
    logger.error('admin/shipments cancel failed:', err);
    return res.status(500).json({ error: 'Could not cancel the shipment.' });
  }
});

export default router;
