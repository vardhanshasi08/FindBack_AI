const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireUser, isAdmin } from '../../shared/auth.ts';
import { fail, HttpError } from '../../shared/http.ts';
import { logEvent } from '../../shared/history.ts';

// The only way the protected ownership detail leaves the database:
// the owner of that lost report, or the single Global Admin during claim review.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await req.json().catch(() => ({}));
    if (!body.lost_report_id) throw new HttpError(400, 'lost_report_id is required.');

    const report = await db.asServiceRole.entities.LostReport.get(body.lost_report_id);
    if (!report) throw new HttpError(404, 'That lost report could not be found.');

    const admin = isAdmin(user);
    if (!admin && report.owner_id !== user.id) {
      throw new HttpError(403, 'The ownership detail is only available to the owner and the Global Admin.');
    }

    const page = await db.asServiceRole.entities.OwnershipSecret.filter({ lost_report_id: report.id }, { limit: 1 });
    const list = Array.isArray(page) ? page : (page && page.items) || [];
    const secret = list[0];

    if (admin) {
      await logEvent(base44, {
        action: 'SECRET_VIEWED',
        summary: `Global Admin viewed the protected ownership detail for lost report ${report.report_code} during claim review.`,
        actor: user,
        lost_report_id: report.id,
        owner_id: report.owner_id,
        metadata: {},
      });
    }

    return Response.json({
      lost_report_id: report.id,
      report_code: report.report_code || '',
      item_name: report.item_name || '',
      secret_detail: secret ? secret.secret_detail : '',
    });
  } catch (error) {
    return fail(error);
  }
}