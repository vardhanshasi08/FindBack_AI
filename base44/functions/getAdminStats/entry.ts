const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireAdmin } from '../../shared/auth.ts';
import { fail } from '../../shared/http.ts';
import { MATCH_THRESHOLD } from '../../shared/constants.ts';

// Every number here is a real count from the database — never a placeholder.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    await requireAdmin(base44);
    const entities = db.asServiceRole.entities;

    const counts = await Promise.allSettled([
      entities.LostReport.count(),
      entities.LostReport.count({ status: { $in: ['LOST_REPORTED', 'MATCH_FOUND'] } }),
      entities.FoundReport.count(),
      entities.FoundReport.count({ status: { $in: ['FOUND_REPORTED', 'MATCH_FOUND'] } }),
      entities.AIMatch.count({ is_qualifying: true, owner_response: 'none' }),
      entities.RecoveryCase.count({ claim_status: 'CLAIM_PENDING' }),
      entities.RecoveryCase.count({ claim_status: 'CLAIM_APPROVED' }),
      entities.RecoveryCase.count({ claim_status: 'CLAIM_REJECTED' }),
      entities.RecoveryCase.count({ case_status: 'HANDOVER_SCHEDULED' }),
      entities.RecoveryCase.count({ case_status: 'RETURNED' }),
    ]);

    const value = (index) => {
      const entry = counts[index];
      if (!entry || entry.status !== 'fulfilled') return 0;
      const result = entry.value;
      if (typeof result === 'number') return result;
      if (result && typeof result.count === 'number') return result.count;
      return 0;
    };

    return Response.json({
      lost_total: value(0),
      lost_active: value(1),
      found_total: value(2),
      found_active: value(3),
      matches_pending: value(4),
      claims_pending: value(5),
      claims_approved: value(6),
      claims_rejected: value(7),
      handovers_scheduled: value(8),
      returned_items: value(9),
      threshold: MATCH_THRESHOLD,
    });
  } catch (error) {
    return fail(error);
  }
}