const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireAdmin } from '../../shared/auth.ts';
import { fail, requireText, HttpError } from '../../shared/http.ts';
import { nowIso } from '../../shared/constants.ts';
import { logEvent } from '../../shared/history.ts';
import { notify } from '../../shared/notify.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await requireAdmin(base44);
    const body = await req.json().catch(() => ({}));

    const caseId = body.case_id;
    if (!caseId) throw new HttpError(400, 'case_id is required.');
    const decision = body.decision;
    if (decision !== 'approve' && decision !== 'reject') {
      throw new HttpError(400, 'decision must be "approve" or "reject".');
    }

    const recoveryCase = await db.asServiceRole.entities.RecoveryCase.get(caseId);
    if (!recoveryCase) throw new HttpError(404, 'That recovery case could not be found.');
    if (recoveryCase.case_status === 'RETURNED') {
      throw new HttpError(400, 'This case is already closed as returned.');
    }
    if (recoveryCase.claim_status !== 'CLAIM_PENDING') {
      throw new HttpError(400, `This claim has already been decided (${recoveryCase.claim_status}).`);
    }

    const now = nowIso();

    if (decision === 'reject') {
      const reason = requireText(body.rejection_reason, 'A rejection reason', { min: 5, max: 500 });
      const updated = await db.asServiceRole.entities.RecoveryCase.update(caseId, {
        claim_status: 'CLAIM_REJECTED',
        case_status: 'CLAIM_REJECTED',
        admin_decision: 'rejected',
        rejection_reason: reason,
        rejected_at: now,
      });
      await db.asServiceRole.entities.LostReport.update(recoveryCase.lost_report_id, { status: 'CLAIM_REJECTED' });
      await db.asServiceRole.entities.FoundReport.update(recoveryCase.found_report_id, { status: 'FOUND_REPORTED' });

      await logEvent(base44, {
        action: 'CLAIM_REJECTED',
        summary: `Global Admin rejected claim ${recoveryCase.case_code}. Reason: ${reason}`,
        actor: admin,
        case_id: caseId,
        case_code: recoveryCase.case_code,
        match_id: recoveryCase.match_id,
        lost_report_id: recoveryCase.lost_report_id,
        found_report_id: recoveryCase.found_report_id,
        owner_id: recoveryCase.owner_id,
        finder_id: recoveryCase.finder_id,
        previous_status: 'CLAIM_PENDING',
        new_status: 'CLAIM_REJECTED',
        metadata: { reason },
      });

      await notify(base44, {
        recipient_id: recoveryCase.owner_id,
        type: 'CLAIM_REJECTED',
        title: 'Claim rejected',
        message: `Your claim ${recoveryCase.case_code} for "${recoveryCase.item_name}" was rejected by the Global Admin. Reason: ${reason}`,
        related_entity_type: 'RecoveryCase',
        related_entity_id: caseId,
        link: `/cases/${caseId}`,
      });

      return Response.json({ case: updated, decision: 'rejected' });
    }

    const updated = await db.asServiceRole.entities.RecoveryCase.update(caseId, {
      claim_status: 'CLAIM_APPROVED',
      case_status: 'AWAITING_HANDOVER_DETAILS',
      admin_decision: 'approved',
      rejection_reason: '',
      approved_at: now,
    });
    await db.asServiceRole.entities.LostReport.update(recoveryCase.lost_report_id, { status: 'CLAIM_APPROVED' });
    await db.asServiceRole.entities.FoundReport.update(recoveryCase.found_report_id, { status: 'CLAIM_APPROVED' });

    await logEvent(base44, {
      action: 'CLAIM_APPROVED',
      summary: `Global Admin approved claim ${recoveryCase.case_code} for "${recoveryCase.item_name}". Awaiting handover details from the finder.`,
      actor: admin,
      case_id: caseId,
      case_code: recoveryCase.case_code,
      match_id: recoveryCase.match_id,
      lost_report_id: recoveryCase.lost_report_id,
      found_report_id: recoveryCase.found_report_id,
      owner_id: recoveryCase.owner_id,
      finder_id: recoveryCase.finder_id,
      previous_status: 'CLAIM_PENDING',
      new_status: 'AWAITING_HANDOVER_DETAILS',
      metadata: { score: Number(recoveryCase.match_score || 0) },
    });

    await notify(base44, {
      recipient_id: recoveryCase.finder_id,
      type: 'CLAIM_APPROVED',
      title: 'Claim approved — enter handover details',
      message: `The Global Admin approved the claim ${recoveryCase.case_code} for "${recoveryCase.item_name}". Please enter the handover location, date and time so the owner can collect the item.`,
      related_entity_type: 'RecoveryCase',
      related_entity_id: caseId,
      link: `/cases/${caseId}`,
    });
    await notify(base44, {
      recipient_id: recoveryCase.owner_id,
      type: 'CLAIM_APPROVED',
      title: 'Your claim was approved',
      message: `Your claim ${recoveryCase.case_code} for "${recoveryCase.item_name}" was approved. The finder will add the handover location, date and time next.`,
      related_entity_type: 'RecoveryCase',
      related_entity_id: caseId,
      link: `/cases/${caseId}`,
    });

    return Response.json({ case: updated, decision: 'approved' });
  } catch (error) {
    return fail(error);
  }
}