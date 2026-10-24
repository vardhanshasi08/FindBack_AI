const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireUser } from '../../shared/auth.ts';
import { fail, requireText, HttpError } from '../../shared/http.ts';
import { OTP_MIN_ATTEMPT_GAP_MS, nowIso } from '../../shared/constants.ts';
import { attemptsLeft, hashOtp, otpState, safeEqual } from '../../shared/otp.ts';
import { logEvent } from '../../shared/history.ts';
import { notify } from '../../shared/notify.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await req.json().catch(() => ({}));

    const caseId = body.case_id;
    if (!caseId) throw new HttpError(400, 'case_id is required.');
    const code = requireText(body.code, 'Handover code', { min: 6, max: 6 });
    if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'The handover code is six digits.');

    const recoveryCase = await db.asServiceRole.entities.RecoveryCase.get(caseId);
    if (!recoveryCase) throw new HttpError(404, 'That recovery case could not be found.');
    if (recoveryCase.finder_id !== user.id) {
      throw new HttpError(403, 'Only the finder who reported the item can confirm the handover.');
    }
    if (recoveryCase.claim_status !== 'CLAIM_APPROVED') {
      throw new HttpError(400, 'This claim is not approved, so the handover cannot be completed.');
    }
    if (recoveryCase.case_status === 'RETURNED') {
      throw new HttpError(400, 'This case is already closed as returned.');
    }
    if (recoveryCase.case_status !== 'HANDOVER_SCHEDULED') {
      throw new HttpError(400, 'Set the handover details before confirming the handover.');
    }

    const otpPage = await db.asServiceRole.entities.HandoverOtp.filter({ case_id: caseId }, { sort: '-created_date', limit: 1 });
    const otpList = Array.isArray(otpPage) ? otpPage : (otpPage && otpPage.items) || [];
    const otp = otpList[0];
    if (!otp) throw new HttpError(400, 'No handover code has been generated yet. Ask the owner to generate one.');

    const state = otpState(otp);
    if (!state.usable) throw new HttpError(400, state.reason);

    const now = Date.now();
    if (otp.last_attempt_at && now - new Date(otp.last_attempt_at).getTime() < OTP_MIN_ATTEMPT_GAP_MS) {
      throw new HttpError(429, 'Please wait a couple of seconds before trying the code again.');
    }

    const candidateHash = await hashOtp(code, otp.otp_salt);
    if (!safeEqual(candidateHash, otp.otp_hash)) {
      const failed = (otp.failed_attempts || 0) + 1;
      await db.asServiceRole.entities.HandoverOtp.update(otp.id, {
        failed_attempts: failed,
        last_attempt_at: new Date(now).toISOString(),
      });
      await logEvent(base44, {
        action: 'OTP_MISMATCH',
        summary: `Incorrect handover code entered for ${recoveryCase.case_code} (attempt ${failed}). Case stays open.`,
        actor: user,
        case_id: caseId,
        case_code: recoveryCase.case_code,
        lost_report_id: recoveryCase.lost_report_id,
        found_report_id: recoveryCase.found_report_id,
        owner_id: recoveryCase.owner_id,
        finder_id: recoveryCase.finder_id,
        metadata: { attempt: failed },
      });
      const left = Math.max(0, 5 - failed);
      throw new HttpError(
        400,
        left > 0
          ? 'That handover code is not correct. The case stays open — check the code with the owner and try again.'
          : 'That handover code is not correct and the attempt limit is reached. Ask the owner to generate a new code.'
      );
    }

    // Single-use guard: only the request that flips consumed false -> true may close the case.
    const stamp = nowIso();
    await db.asServiceRole.entities.HandoverOtp.updateMany(
      { id: otp.id, consumed: false },
      { $set: { consumed: true, consumed_at: stamp, last_attempt_at: stamp } }
    );
    const after = await db.asServiceRole.entities.HandoverOtp.get(otp.id);
    if (!after || !after.consumed || after.consumed_at !== stamp) {
      throw new HttpError(409, 'This handover code was already used. The case is closed.');
    }

    const closedCase = await db.asServiceRole.entities.RecoveryCase.update(caseId, {
      case_status: 'RETURNED',
      returned_at: stamp,
    });
    await db.asServiceRole.entities.LostReport.update(recoveryCase.lost_report_id, { status: 'RETURNED' });
    await db.asServiceRole.entities.FoundReport.update(recoveryCase.found_report_id, { status: 'RETURNED' });
    // The match row is bookkeeping here: a missing row must never stop the case closing.
    try {
      const match = await db.asServiceRole.entities.AIMatch.get(recoveryCase.match_id);
      if (match) {
        await db.asServiceRole.entities.AIMatch.update(match.id, {
          final_status: 'RETURNED',
          finalized_at: stamp,
          owner_response: 'claimed',
        });
      }
    } catch (matchError) {
      // Continue: the case, the reports and both notifications still complete.
    }

    const handoversPage = await db.asServiceRole.entities.Handover.filter({ case_id: caseId }, { limit: 5 });
    const handovers = Array.isArray(handoversPage) ? handoversPage : (handoversPage && handoversPage.items) || [];
    for (const h of handovers) {
      await db.asServiceRole.entities.Handover.update(h.id, { schedule_status: 'COMPLETED' });
    }

    await logEvent(base44, {
      action: 'CASE_RETURNED',
      summary: `Handover verified for ${recoveryCase.case_code}. The finder confirmed the code and the case is closed as RETURNED.`,
      actor: user,
      case_id: caseId,
      case_code: recoveryCase.case_code,
      match_id: recoveryCase.match_id,
      lost_report_id: recoveryCase.lost_report_id,
      found_report_id: recoveryCase.found_report_id,
      owner_id: recoveryCase.owner_id,
      finder_id: recoveryCase.finder_id,
      previous_status: 'HANDOVER_SCHEDULED',
      new_status: 'RETURNED',
      metadata: { score: Number(recoveryCase.match_score || 0) },
    });

    await notify(base44, {
      recipient_id: recoveryCase.owner_id,
      type: 'ITEM_RETURNED',
      title: 'Item returned — case closed',
      message: `Your item "${recoveryCase.item_name}" (case ${recoveryCase.case_code}) was handed over and the case is now closed as returned.`,
      related_entity_type: 'RecoveryCase',
      related_entity_id: caseId,
      link: `/cases/${caseId}`,
    });
    await notify(base44, {
      recipient_id: recoveryCase.finder_id,
      type: 'HANDOVER_COMPLETED',
      title: 'Handover completed',
      message: `The handover code for "${recoveryCase.item_name}" (case ${recoveryCase.case_code}) was verified. The case is closed as returned. Thank you.`,
      related_entity_type: 'RecoveryCase',
      related_entity_id: caseId,
      link: `/cases/${caseId}`,
    });

    return Response.json({
      success: true,
      case_status: 'RETURNED',
      returned_at: stamp,
      case: closedCase,
      attempts_left: attemptsLeft(otp),
    });
  } catch (error) {
    return fail(error);
  }
}