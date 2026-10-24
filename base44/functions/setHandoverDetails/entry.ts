const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireUser } from '../../shared/auth.ts';
import { fail, requireText, optionalText, HttpError } from '../../shared/http.ts';
import { nowIso } from '../../shared/constants.ts';
import { logEvent } from '../../shared/history.ts';
import { notify } from '../../shared/notify.ts';

const ALLOWED_STATUSES = ['AWAITING_HANDOVER_DETAILS', 'HANDOVER_SCHEDULED'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await req.json().catch(() => ({}));

    const caseId = body.case_id;
    if (!caseId) throw new HttpError(400, 'case_id is required.');

    const recoveryCase = await db.asServiceRole.entities.RecoveryCase.get(caseId);
    if (!recoveryCase) throw new HttpError(404, 'That recovery case could not be found.');
    if (recoveryCase.finder_id !== user.id) {
      throw new HttpError(403, 'Only the finder who reported the item can set the handover details.');
    }
    if (recoveryCase.claim_status !== 'CLAIM_APPROVED') {
      throw new HttpError(400, 'Handover details can only be set after the Global Admin approves the claim.');
    }
    if (recoveryCase.case_status === 'RETURNED') {
      throw new HttpError(400, 'This case is already closed as returned.');
    }
    if (!ALLOWED_STATUSES.includes(recoveryCase.case_status)) {
      throw new HttpError(400, `Handover details cannot be changed while the case is ${recoveryCase.case_status}.`);
    }

    const location = requireText(body.location, 'Handover location', { min: 3, max: 200 });
    const handover_date = requireText(body.handover_date, 'Handover date', { min: 8, max: 20 });
    const handover_time = requireText(body.handover_time, 'Handover time', { min: 4, max: 10 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(handover_date)) throw new HttpError(400, 'Handover date must use the YYYY-MM-DD format.');
    if (!/^\d{2}:\d{2}$/.test(handover_time)) throw new HttpError(400, 'Handover time must use the HH:MM format.');
    const when = new Date(`${handover_date}T${handover_time}:00`);
    if (Number.isNaN(when.getTime())) throw new HttpError(400, 'The handover date and time could not be read.');
    if (when.getTime() < Date.now() - 3600000) throw new HttpError(400, 'The handover date and time cannot be in the past.');

    const instructions = optionalText(body.instructions, 600);
    const existingPage = await db.asServiceRole.entities.Handover.filter({ case_id: caseId }, { limit: 5 });
    const existing = Array.isArray(existingPage) ? existingPage : (existingPage && existingPage.items) || [];
    const current = existing[0];
    const isUpdate = !!current;
    const now = nowIso();

    const payload = {
      case_id: caseId,
      owner_id: recoveryCase.owner_id,
      finder_id: recoveryCase.finder_id,
      location,
      handover_date,
      handover_time,
      instructions,
      schedule_status: 'SCHEDULED',
      revision: (current ? current.revision || 1 : 0) + 1,
    };

    const handover = current
      ? await db.asServiceRole.entities.Handover.update(current.id, payload)
      : await db.asServiceRole.entities.Handover.create(payload);

    const updatedCase = await db.asServiceRole.entities.RecoveryCase.update(caseId, {
      case_status: 'HANDOVER_SCHEDULED',
    });

    await logEvent(base44, {
      action: isUpdate ? 'HANDOVER_UPDATED' : 'HANDOVER_SCHEDULED',
      summary: `Handover for ${recoveryCase.case_code} ${isUpdate ? 'updated' : 'scheduled'} at ${location} on ${handover_date} at ${handover_time}.`,
      actor: user,
      case_id: caseId,
      case_code: recoveryCase.case_code,
      match_id: recoveryCase.match_id,
      lost_report_id: recoveryCase.lost_report_id,
      found_report_id: recoveryCase.found_report_id,
      owner_id: recoveryCase.owner_id,
      finder_id: recoveryCase.finder_id,
      previous_status: recoveryCase.case_status,
      new_status: 'HANDOVER_SCHEDULED',
      metadata: { location, handover_date, handover_time },
    });

    await notify(base44, {
      recipient_id: recoveryCase.owner_id,
      type: isUpdate ? 'HANDOVER_UPDATED' : 'HANDOVER_SCHEDULED',
      title: isUpdate ? 'Handover details changed' : 'Handover scheduled',
      message: isUpdate
        ? `The handover for "${recoveryCase.item_name}" (${recoveryCase.case_code}) was changed to ${location} on ${handover_date} at ${handover_time}.`
        : `Your item "${recoveryCase.item_name}" (${recoveryCase.case_code}) can be collected at ${location} on ${handover_date} at ${handover_time}. Check the item's secret ownership detail together before completing the handover.`,
      related_entity_type: 'RecoveryCase',
      related_entity_id: caseId,
      link: `/cases/${caseId}`,
    });
    if (isUpdate) {
      await notify(base44, {
        recipient_id: recoveryCase.finder_id,
        type: 'HANDOVER_UPDATED',
        title: 'Handover details updated',
        message: `Your updated handover for ${recoveryCase.case_code} is saved: ${location} on ${handover_date} at ${handover_time}.`,
        related_entity_type: 'RecoveryCase',
        related_entity_id: caseId,
        link: `/cases/${caseId}`,
      });
    }

    return Response.json({ handover, case: updatedCase });
  } catch (error) {
    return fail(error);
  }
}