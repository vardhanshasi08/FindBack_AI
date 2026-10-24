import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireUser } from '../../shared/auth.ts';
import { fail, HttpError } from '../../shared/http.ts';
import { runMatchingForReport } from '../../shared/matching.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await req.json().catch(() => ({}));

    const reportType = body.report_type;
    if (reportType !== 'lost' && reportType !== 'found') {
      throw new HttpError(400, 'report_type must be "lost" or "found".');
    }
    if (!body.report_id) throw new HttpError(400, 'report_id is required.');

    const result = await runMatchingForReport(base44, {
      reportType,
      reportId: body.report_id,
      actor: user,
    });

    return Response.json(result);
  } catch (error) {
    return fail(error);
  }
}