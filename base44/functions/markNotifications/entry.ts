const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireUser } from '../../shared/auth.ts';
import { fail, HttpError } from '../../shared/http.ts';
import { nowIso } from '../../shared/constants.ts';

// Marks only the caller's own notifications as read.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await req.json().catch(() => ({}));
    const stamp = nowIso();
    const mine = { recipient_id: user.id };

    if (body.all === true) {
      await db.asServiceRole.entities.Notification.updateMany(
        { ...mine, is_read: false },
        { $set: { is_read: true, read_at: stamp } }
      );
      return Response.json({ updated: 'all', read_at: stamp });
    }

    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string' && id).slice(0, 200) : [];
    if (!ids.length) throw new HttpError(400, 'Provide ids or all: true.');

    const page = await db.asServiceRole.entities.Notification.filter({ id: { $in: ids } }, { limit: 200 });
    const list = Array.isArray(page) ? page : (page && page.items) || [];
    const allowed = list.filter((n) => n.recipient_id === user.id).map((n) => n.id);
    if (!allowed.length) throw new HttpError(403, 'Those notifications do not belong to you.');

    await db.asServiceRole.entities.Notification.updateMany(
      { id: { $in: allowed }, recipient_id: user.id },
      { $set: { is_read: true, read_at: stamp } }
    );

    return Response.json({ updated: allowed.length, read_at: stamp });
  } catch (error) {
    return fail(error);
  }
}