const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireUser } from '../../shared/auth.ts';
import { fail, HttpError } from '../../shared/http.ts';
import { OTP_MAX_ISSUES, OTP_MIN_INTERVAL_MS, OTP_TTL_MS, nowIso } from '../../shared/constants.ts';
import { generateOtpCode, hashOtp, randomHex } from '../../shared/otp.ts';
import { logEvent } from '../../shared/history.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await req.json().catch(() => ({}));
    const caseId = body.case_id;
    if (!caseId) throw new HttpError(400, 'case_id is required.');

    const recoveryCase = await db.asServiceRole.entities.RecoveryCase.get(caseId);
    if (!recoveryCase) throw new HttpError(404, 'That recovery case could not be found.');
    if (recoveryCase.owner_id !== user.id) {
      throw new HttpError(403, 'Only the owner of the lost item can generate the handover code.');
    }
    if (recoveryCase.claim_status !== 'CLAIM_APPROVED') {
      throw new HttpError(400, 'A handover code can only be generated for an approved claim.');
    }
    if (recoveryCase.case_status !== 'HANDOVER_SCHEDULED') {
      throw new HttpError(400, 'The finder has to set the handover date and time before a code can be generated.');
    }

    const existingPage = await db.asServiceRole.entities.HandoverOtp.filter({ case_id: caseId }, { limit: 5 });
    const existingList = Array.isArray(existingPage) ? existingPage : (existingPage && existingPage.items) || [];
    const existing = existingList[0];
    const now = Date.now();

    if (existing && existing.consumed) {
      throw new HttpError(400, 'This case is already closed — the handover code was used.');
    }
    if (existing && existing.issued_at && now - new Date(existing.issued_at).getTime() < OTP_MIN_INTERVAL_MS) {
      throw new HttpError(429, 'Please wait a few seconds before generating a new code.');
    }
    const issueCount = (existing ? existing.issue_count || 0 : 0) + 1;
    if (issueCount > OTP_MAX_ISSUES) {
      throw new HttpError(429, 'The maximum number of codes for this case has been reached. Contact support through the Global Admin.');
    }

    // A new code always replaces the previous one, so an older code can never be replayed.
    const code = generateOtpCode();
    const salt = randomHex(16);
    const otpHash = await hashOtp(code, salt);
    const nowStamp = new Date(now).toISOString();
    const expiresAt = new Date(now + OTP_TTL_MS).toISOString();

    const payload = {
      case_id: caseId,
      owner_id: recoveryCase.owner_id,
      finder_id: recoveryCase.finder_id,
      otp_hash: otpHash,
      otp_salt: salt,
      otp_expires_at: expiresAt,
      issued_at: nowStamp,
      issue_count: issueCount,
      failed_attempts: 0,
      last_attempt_at: '',
      consumed: false,
      consumed_at: '',
    };

    let otpRecord;
    if (existing) {
      otpRecord = await db.asServiceRole.entities.HandoverOtp.update(existing.id, payload);
    } else {
      otpRecord = await db.asServiceRole.entities.HandoverOtp.create(payload);
    }

    await logEvent(base44, {
      action: 'OTP_ISSUED',
      summary: `Owner generated a handover code for ${recoveryCase.case_code} (valid ${Math.round(OTP_TTL_MS / 60000)} minutes, issue #${issueCount}).`,
      actor: user,
      case_id: caseId,
      case_code: recoveryCase.case_code,
      lost_report_id: recoveryCase.lost_report_id,
      found_report_id: recoveryCase.found_report_id,
      owner_id: recoveryCase.owner_id,
      finder_id: recoveryCase.finder_id,
      metadata: { issue_count: issueCount, expires_at: expiresAt },
    });

    return Response.json({
      code,
      expires_at: expiresAt,
      issued_at: nowStamp,
      issue_count: issueCount,
      ttl_seconds: Math.round(OTP_TTL_MS / 1000),
      otp_id: otpRecord && otpRecord.id,
      issued_now: nowIso(),
    });
  } catch (error) {
    return fail(error);
  }
}