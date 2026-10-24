const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireUser } from '../../shared/auth.ts';
import { fail, requireText, optionalText, HttpError, isValidIso } from '../../shared/http.ts';
import { CATEGORIES, LOST_STATUS, makeCode, nowIso } from '../../shared/constants.ts';
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
    const lost_location = requireText(body.lost_location, 'Lost location', { min: 3, max: 200 });
    const lost_datetime = requireText(body.lost_datetime, 'Lost date and time', { min: 4, max: 60 });
    if (!isValidIso(lost_datetime)) throw new HttpError(400, 'Lost date and time is not a valid date.');
    if (new Date(lost_datetime).getTime() > Date.now() + 86400000) {
      throw new HttpError(400, 'Lost date and time cannot be in the future.');
    }
    const secret_detail = requireText(body.secret_detail, 'Secret ownership detail', { min: 3, max: 500 });

    const report = await db.asServiceRole.entities.LostReport.create({
      report_code: makeCode('LR'),
      owner_id: user.id,
      owner_name: user.full_name || user.email || 'FindBack AI user',
      owner_email: user.email || '',
      item_name,
      category,
      description,
      image_file_uri: optionalText(body.image_file_uri, 600),
      color: optionalText(body.color, 60),
      visible_characteristics: optionalText(body.visible_characteristics, 500),
      lost_location,
      lost_datetime,
      additional_notes: optionalText(body.additional_notes, 1000),
      has_secret_detail: true,
      status: LOST_STATUS,
      match_status: 'not_run',
    });

    await db.asServiceRole.entities.OwnershipSecret.create({
      lost_report_id: report.id,
      owner_id: user.id,
      secret_detail,
    });

    await logEvent(base44, {
      action: 'LOST_REPORT_SUBMITTED',
      summary: `Lost report ${report.report_code} submitted for "${item_name}" (${lost_location}).`,
      actor: user,
      lost_report_id: report.id,
      owner_id: user.id,
      new_status: LOST_STATUS,
      metadata: { category },
    });

    await notify(base44, {
      recipient_id: user.id,
      type: 'REPORT_SUBMITTED',
      title: 'Lost report submitted',
      message: `Your lost report ${report.report_code} for "${item_name}" is saved. AI matching starts in a moment.`,
      related_entity_type: 'LostReport',
      related_entity_id: report.id,
      link: `/reports/lost/${report.id}`,
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