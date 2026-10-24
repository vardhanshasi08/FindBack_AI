const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireUser } from '../../shared/auth.ts';
import { fail, optionalText, HttpError } from '../../shared/http.ts';
import { MATCH_THRESHOLD, makeCode, nowIso } from '../../shared/constants.ts';
import { logEvent } from '../../shared/history.ts';
import { notify, notifyAdmins } from '../../shared/notify.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await req.json().catch(() => ({}));
    if (!body.match_id) throw new HttpError(400, 'match_id is required.');

    const match = await db.asServiceRole.entities.AIMatch.get(body.match_id);
    if (!match) throw new HttpError(404, 'That match could not be found.');
    if (match.owner_id !== user.id) {
      throw new HttpError(403, 'Only the owner of the lost report can request this claim.');
    }
    if (match.processing_status === 'failed') {
      throw new HttpError(400, 'AI matching did not finish for this pair. Re-run matching first.');
    }
    if (!match.is_qualifying || Number(match.score) < MATCH_THRESHOLD) {
      throw new HttpError(400, `This match is below the ${MATCH_THRESHOLD}/100 similarity threshold, so it cannot be claimed.`);
    }
    if (match.owner_response === 'claimed') throw new HttpError(400, 'You have already requested this claim.');

    const existingPage = await db.asServiceRole.entities.RecoveryCase.filter({ match_id: match.id }, { limit: 5 });
    const existing = Array.isArray(existingPage) ? existingPage : (existingPage && existingPage.items) || [];
    if (existing.length) throw new HttpError(400, 'A claim already exists for this match.');

    const lost = await db.asServiceRole.entities.LostReport.get(match.lost_report_id);
    const found = await db.asServiceRole.entities.FoundReport.get(match.found_report_id);
    if (!lost || !found) throw new HttpError(400, 'The linked reports could not be found.');
    if (lost.owner_id !== user.id) throw new HttpError(403, 'This lost report does not belong to you.');

    const now = nowIso();
    const recoveryCase = await db.asServiceRole.entities.RecoveryCase.create({
      case_code: makeCode('FB'),
      match_id: match.id,
      lost_report_id: lost.id,
      found_report_id: found.id,
      owner_id: lost.owner_id,
      finder_id: found.finder_id,
      owner_name: lost.owner_name || user.full_name || '',
      finder_name: found.finder_name || '',
      item_name: lost.item_name,
      match_score: Number(match.score),
      claim_status: 'CLAIM_PENDING',
      case_status: 'CLAIM_PENDING',
      claimed_at: now,
    });

    await db.asServiceRole.entities.AIMatch.update(match.id, {
      owner_response: 'claimed',
      owner_note: optionalText(body.note, 400),
      responded_at: now,
    });
    await db.asServiceRole.entities.LostReport.update(lost.id, { status: 'CLAIM_PENDING' });
    await db.asServiceRole.entities.FoundReport.update(found.id, { status: 'CLAIM_PENDING' });

    await logEvent(base44, {
      action: 'CLAIM_REQUESTED',
      summary: `Claim ${recoveryCase.case_code} requested for lost report ${lost.report_code} and found report ${found.report_code} (AI score ${match.score}/100).`,
      actor: user,
      case_id: recoveryCase.id,
      case_code: recoveryCase.case_code,
      match_id: match.id,
      lost_report_id: lost.id,
      found_report_id: found.id,
      owner_id: lost.owner_id,
      finder_id: found.finder_id,
      previous_status: 'MATCH_FOUND',
      new_status: 'CLAIM_PENDING',
      metadata: { score: Number(match.score) },
    });

    await notifyAdmins(base44, {
      type: 'CLAIM_SUBMITTED',
      title: 'New claim request',
      message: `${lost.owner_name || 'A user'} requested a claim for "${lost.item_name}" against found report ${found.report_code} (AI score ${match.score}/100). Review the claim and approve or reject it.`,
      related_entity_type: 'RecoveryCase',
      related_entity_id: recoveryCase.id,
      link: `/admin/claims/${recoveryCase.id}`,
    });

    await notify(base44, {
      recipient_id: user.id,
      type: 'CLAIM_SUBMITTED',
      title: 'Claim request submitted',
      message: `Your claim ${recoveryCase.case_code} is pending Global Admin review. You will be notified when a decision is made.`,
      related_entity_type: 'RecoveryCase',
      related_entity_id: recoveryCase.id,
      link: `/cases/${recoveryCase.id}`,
    });

    return Response.json({ case: recoveryCase });
  } catch (error) {
    return fail(error);
  }
}