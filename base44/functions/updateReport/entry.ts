const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireUser, isAdmin } from '../../shared/auth.ts';
import { fail, requireText, optionalText, HttpError, isValidIso } from '../../shared/http.ts';
import { CATEGORIES, EDITABLE_REPORT_STATUSES, nowIso } from '../../shared/constants.ts';
import { logEvent } from '../../shared/history.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await req.json().catch(() => ({}));

    const reportType = body.report_type;
    if (reportType !== 'lost' && reportType !== 'found') throw new HttpError(400, 'report_type must be "lost" or "found".');
    if (!body.report_id) throw new HttpError(400, 'report_id is required.');

    const isLost = reportType === 'lost';
    const entity = isLost ? db.asServiceRole.entities.LostReport : db.asServiceRole.entities.FoundReport;
    const report = await entity.get(body.report_id);
    if (!report) throw new HttpError(404, 'That report could not be found.');

    const ownerField = isLost ? 'owner_id' : 'finder_id';
    if (report[ownerField] !== user.id && !isAdmin(user)) {
      throw new HttpError(403, 'You can only edit your own reports.');
    }
    if (!EDITABLE_REPORT_STATUSES.includes(report.status)) {
      throw new HttpError(400, `This report can no longer be edited while it is ${report.status}.`);
    }

    const item_name = requireText(body.item_name, 'Item name', { min: 2, max: 120 });
    const category = requireText(body.category, 'Category', { min: 2, max: 60 });
    if (!CATEGORIES.includes(category)) throw new HttpError(400, 'Please choose one of the listed categories.');
    const description = requireText(body.description, 'Description', { min: 10, max: 2000 });
    const locationField = isLost ? 'lost_location' : 'found_location';
    const dateField = isLost ? 'lost_datetime' : 'found_datetime';
    const location = requireText(body.location, isLost ? 'Lost location' : 'Found location', { min: 3, max: 200 });
    const datetime = requireText(body.datetime, isLost ? 'Lost date and time' : 'Found date and time', { min: 4, max: 60 });
    if (!isValidIso(datetime)) throw new HttpError(400, 'The date and time could not be read.');
    if (new Date(datetime).getTime() > Date.now() + 86400000) throw new HttpError(400, 'The date and time cannot be in the future.');

    const payload = {
      item_name,
      category,
      description,
      color: optionalText(body.color, 60),
      visible_characteristics: optionalText(body.visible_characteristics, 500),
      [locationField]: location,
      [dateField]: datetime,
    };
    if (isLost) {
      payload.additional_notes = optionalText(body.additional_notes, 1000);
      if (typeof body.image_file_uri === 'string') payload.image_file_uri = optionalText(body.image_file_uri, 600);
    } else {
      payload.additional_observations = optionalText(body.additional_observations, 1000);
      if (typeof body.image_file_uri === 'string') payload.image_file_uri = optionalText(body.image_file_uri, 600);
    }

    const updated = await entity.update(report.id, payload);

    if (isLost && typeof body.secret_detail === 'string' && body.secret_detail.trim().length >= 3) {
      const secret = requireText(body.secret_detail, 'Secret ownership detail', { min: 3, max: 500 });
      const page = await db.asServiceRole.entities.OwnershipSecret.filter({ lost_report_id: report.id }, { limit: 1 });
      const list = Array.isArray(page) ? page : (page && page.items) || [];
      if (list.length) {
        await db.asServiceRole.entities.OwnershipSecret.update(list[0].id, { secret_detail: secret });
      } else {
        await db.asServiceRole.entities.OwnershipSecret.create({
          lost_report_id: report.id,
          owner_id: report.owner_id,
          secret_detail: secret,
        });
      }
      await entity.update(report.id, { has_secret_detail: true });
    }

    await logEvent(base44, {
      action: isLost ? 'LOST_REPORT_UPDATED' : 'FOUND_REPORT_UPDATED',
      summary: `${isLost ? 'Lost' : 'Found'} report ${report.report_code} was edited by its ${isLost ? 'owner' : 'finder'}.`,
      actor: user,
      lost_report_id: isLost ? report.id : '',
      found_report_id: isLost ? '' : report.id,
      owner_id: isLost ? report.owner_id : '',
      finder_id: isLost ? '' : report.finder_id,
      metadata: { edited_at: nowIso() },
    });

    return Response.json({ report: updated });
  } catch (error) {
    return fail(error);
  }
}