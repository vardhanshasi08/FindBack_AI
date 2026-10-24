const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireUser } from '../../shared/auth.ts';
import { fail, requireText, optionalText, HttpError, isValidIso } from '../../shared/http.ts';
import { CATEGORIES, FOUND_STATUS, makeCode, nowIso } from '../../shared/constants.ts';
import { logEvent } from '../../shared/history.ts';
import { notify } from '../../shared/notify.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await req.json().catch(() => ({}));

    const item_name = requireText(body.item_name, 'Item name', { min: 2, max: 120 });
    const category = requireText(body.category, 'Category', { min: 2, max: 60 });
    if (!CATEGORIES.includes(category)) throw new HttpError(400, 'Please choose one of the listed categories.');
    const description = requireText(body.description, 'Description', { min: 10, max: 2000 });
    const found_location = requireText(body.found_location, 'Found location', { min: 3, max: 200 });
    const found_datetime = requireText(body.found_datetime, 'Found date and time', { min: 4, max: 60 });
    if (!isValidIso(found_datetime)) throw new HttpError(400, 'Found date and time is not a valid date.');
    if (new Date(found_datetime).getTime() > Date.now() + 86400000) {
      throw new HttpError(400, 'Found date and time cannot be in the future.');
    }

    const report = await db.asServiceRole.entities.FoundReport.create({
      report_code: makeCode('FR'),
      finder_id: user.id,
      finder_name: user.full_name || user.email || 'FindBack AI user',
      finder_email: user.email || '',
      item_name,
      category,
      description,
      image_file_uri: optionalText(body.image_file_uri, 600),
      color: optionalText(body.color, 60),
      visible_characteristics: optionalText(body.visible_characteristics, 500),
      found_location,
      found_datetime,
      additional_observations: optionalText(body.additional_observations, 1000),
      linked_owner_ids: [],
      status: FOUND_STATUS,
      match_status: 'not_run',
    });

    await logEvent(base44, {
      action: 'FOUND_REPORT_SUBMITTED',
      summary: `Found report ${report.report_code} submitted for "${item_name}" (${found_location}).`,
      actor: user,
      found_report_id: report.id,
      finder_id: user.id,
      new_status: FOUND_STATUS,
      metadata: { category },
    });

    await notify(base44, {
      recipient_id: user.id,
      type: 'REPORT_SUBMITTED',
      title: 'Found report submitted',
      message: `Your found report ${report.report_code} for "${item_name}" is saved. AI matching is looking for the owner now.`,
      related_entity_type: 'FoundReport',
      related_entity_id: report.id,
      link: `/reports/found/${report.id}`,
    });

    return Response.json({
      report,
      report_id: report.id,
      report_code: report.report_code,
      submitted_at: nowIso(),
    });
  } catch (error) {
    return fail(error);
  }
}