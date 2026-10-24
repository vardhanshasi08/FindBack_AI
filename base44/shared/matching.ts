const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

// AI matching engine.
//
// Score method (documented for the report and shown in the UI):
//   final = round(0.65 * Gemini overall assessment + 0.35 * deterministic field score)
//   deterministic field score = category 20% + item name/description text 30%
//                             + colour 15% + location 20% + date/time 15%
// Gemini is asked for per-dimension 0-100 ratings plus one short factual explanation.
// Nothing secret (ownership detail, OTP, tokens) is ever sent to the model: the engine
// only reads the public report fields listed below.

import {
  CATEGORIES,
  MAX_CANDIDATES,
  MAX_CANDIDATE_IMAGES,
  MATCHABLE_STATUSES,
  MATCH_THRESHOLD,
  nowIso,
  advanceStatus,
  makeCode,
} from './constants.ts';
import { HttpError, withTimeout } from './http.ts';
import { logEvent } from './history.ts';
import { notify } from './notify.ts';

const AI_MODEL = 'gemini_3_8_flash';
const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'and', 'with', 'in', 'on', 'at', 'is', 'it', 'to', 'for', 'near', 'my', 'was', 'were', 'this', 'that']);

export const SCORE_METHOD_TEXT =
  'Final score = 65% Gemini assessment (category, text, colour, photo, location and time) + 35% deterministic field comparison (category 20%, item name and description 30%, colour 15%, location 20%, date/time 15%).';

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value) {
  return new Set(normalize(value).split(' ').filter((w) => w.length > 1 && !STOPWORDS.has(w)));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

function clamp(value, min = 0, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function categoryScore(a, b) {
  if (!a || !b) return 50;
  if (a === b) return 100;
  if (a === 'Other' || b === 'Other') return 55;
  return 25;
}

export function textScore(a, b) {
  const nameJ = jaccard(tokenSet(a.item_name), tokenSet(b.item_name));
  const descJ = jaccard(tokenSet(`${a.item_name} ${a.description}`), tokenSet(`${b.item_name} ${b.description}`));
  if (normalize(a.item_name) && normalize(a.item_name) === normalize(b.item_name)) return 100;
  return clamp((nameJ * 0.65 + descJ * 0.35) * 100);
}

export function colorScore(a, b) {
  const x = normalize(a.color);
  const y = normalize(b.color);
  if (!x && !y) return 50;
  if (!x || !y) return 55;
  if (x === y) return 100;
  if (x.includes(y) || y.includes(x)) return 85;
  return 20;
}

export function locationScore(a, b, fieldA, fieldB) {
  const x = normalize(a[fieldA]);
  const y = normalize(b[fieldB]);
  if (!x && !y) return 50;
  if (!x || !y) return 45;
  if (x === y) return 100;
  if (x.includes(y) || y.includes(x)) return 90;
  return clamp(10 + jaccard(tokenSet(x), tokenSet(y)) * 80, 10, 95);
}

export function timeScore(a, b, fieldA, fieldB) {
  const t1 = new Date(a[fieldA] || 0).getTime();
  const t2 = new Date(b[fieldB] || 0).getTime();
  if (!t1 || !t2) return 50;
  const hours = Math.abs(t1 - t2) / 3600000;
  if (hours <= 24) return 100;
  if (hours <= 72) return 85;
  if (hours <= 24 * 7) return 70;
  if (hours <= 24 * 30) return 45;
  if (hours <= 24 * 90) return 25;
  return 10;
}

export function deterministicScore(lost, found) {
  const parts = {
    category: categoryScore(lost.category, found.category),
    text: textScore(lost, found),
    color: colorScore(lost, found),
    location: locationScore(lost, found, 'lost_location', 'found_location'),
    time: timeScore(lost, found, 'lost_datetime', 'found_datetime'),
  };
  const total = clamp(parts.category * 0.2 + parts.text * 0.3 + parts.color * 0.15 + parts.location * 0.2 + parts.time * 0.15);
  return { total, parts };
}

async function signFile(base44, fileUri) {
  if (!fileUri) return null;
  try {
    const res = await db.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 900 });
    return (res && (res.signed_url || res.signedUrl)) || null;
  } catch (error) {
    return null;
  }
}

function describeReport(label, report, kind) {
  const location = kind === 'lost' ? report.lost_location : report.found_location;
  const when = kind === 'lost' ? report.lost_datetime : report.found_datetime;
  return [
    `${label} — report code ${report.report_code || 'unknown'}`,
    `Item name: ${report.item_name}`,
    `Category: ${report.category}`,
    `Description: ${report.description}`,
    `Colour: ${report.color || 'not specified'}`,
    `Visible characteristics: ${report.visible_characteristics || 'not specified'}`,
    `${kind === 'lost' ? 'Lost' : 'Found'} location: ${location}`,
    `${kind === 'lost' ? 'Lost' : 'Found'} date/time: ${when}`,
  ].join('\n');
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    assessments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          candidate_code: { type: 'string' },
          overall: { type: 'number' },
          text_similarity: { type: 'number' },
          category_compatibility: { type: 'number' },
          color_similarity: { type: 'number' },
          visual_similarity: { type: 'number' },
          location_similarity: { type: 'number' },
          time_similarity: { type: 'number' },
          explanation: { type: 'string' },
          conflicting_evidence: { type: 'string' },
        },
        required: ['candidate_code', 'overall', 'explanation'],
      },
    },
  },
  required: ['assessments'],
};

async function callGemini(base44, prompt, fileUrls) {
  const payload = { prompt, response_json_schema: RESPONSE_SCHEMA };
  if (fileUrls.length) payload.file_urls = fileUrls;
  try {
    return await withTimeout(
      db.asServiceRole.integrations.Core.InvokeLLM({ ...payload, model: AI_MODEL }),
      45000,
      'AI matching'
    );
  } catch (error) {
    const message = String((error && error.message) || '');
    if (!/model/i.test(message)) throw error;
    // One retry on automatic model selection if the explicit model id is rejected.
    return await withTimeout(db.asServiceRole.integrations.Core.InvokeLLM(payload), 45000, 'AI matching');
  }
}

function parseAssessments(raw) {
  let data = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (error) {
      throw new HttpError(502, 'The AI returned a response that could not be read.');
    }
  }
  const list = data && Array.isArray(data.assessments) ? data.assessments : null;
  if (!list) throw new HttpError(502, 'The AI returned a response that could not be read.');
  const map = new Map();
  for (const item of list) {
    const code = String(item.candidate_code || '').trim().toUpperCase();
    if (!code) continue;
    map.set(code, {
      overall: clamp(item.overall),
      text: clamp(item.text_similarity),
      category: clamp(item.category_compatibility),
      color: clamp(item.color_similarity),
      visual: clamp(item.visual_similarity),
      location: clamp(item.location_similarity),
      time: clamp(item.time_similarity),
      explanation: String(item.explanation || '').trim().slice(0, 400),
      conflicting: String(item.conflicting_evidence || '').trim().slice(0, 240),
    });
  }
  return map;
}

function pickCandidates(all, report) {
  const list = Array.isArray(all) ? all : (all && all.items) || [];
  return list
    .filter((c) => c && c.id && MATCHABLE_STATUSES.includes(c.status))
    .filter((c) => c.category === report.category || c.category === 'Other' || report.category === 'Other')
    .slice(0, MAX_CANDIDATES);
}

export async function runMatchingForReport(base44, { reportType, reportId, actor }) {
  const isLost = reportType === 'lost';
  const primaryEntity = isLost ? db.asServiceRole.entities.LostReport : db.asServiceRole.entities.FoundReport;
  const oppositeEntity = isLost ? db.asServiceRole.entities.FoundReport : db.asServiceRole.entities.LostReport;

  const report = await primaryEntity.get(reportId);
  if (!report) throw new HttpError(404, 'Report not found.');
  const ownerId = isLost ? report.owner_id : report.finder_id;
  if (!actor || (ownerId !== actor.id && actor.role !== 'admin')) {
    throw new HttpError(403, 'You can only run matching for your own reports.');
  }

  const candidatesPage = await oppositeEntity.filter({}, { sort: '-created_date', limit: 40 });
  const candidates = pickCandidates(candidatesPage, report);

  if (!candidates.length) {
    await primaryEntity.update(report.id, { match_status: 'completed', match_error: '', matched_at: nowIso() });
    return { match_status: 'completed', evaluated: 0, qualifying: 0, best_score: null, matches: [] };
  }

  const candidateCodes = candidates.map((c) => c.report_code).filter(Boolean);
  const ids = candidates.map((c) => c.id);
  const existingFilter = isLost
    ? { lost_report_id: report.id, found_report_id: { $in: ids } }
    : { lost_report_id: { $in: ids }, found_report_id: report.id };
  const existingPage = await db.asServiceRole.entities.AIMatch.filter(existingFilter, { limit: 50 });
  const existing = Array.isArray(existingPage) ? existingPage : (existingPage && existingPage.items) || [];
  const existingByPair = new Map();
  for (const row of existing) {
    const key = isLost ? `${report.id}|${row.found_report_id}` : `${row.lost_report_id}|${report.id}`;
    existingByPair.set(key, row);
  }

  // Photographs: primary first, then candidates that have one (bounded).
  const fileUrls = [];
  const photoMap = [];
  const primaryPhoto = await signFile(base44, report.image_file_uri);
  if (primaryPhoto) {
    fileUrls.push(primaryPhoto);
    photoMap.push(`image #${fileUrls.length} = PRIMARY report (${report.report_code}) photo`);
  }
  let candidatePhotos = 0;
  for (const c of candidates) {
    if (candidatePhotos >= MAX_CANDIDATE_IMAGES) break;
    const url = await signFile(base44, c.image_file_uri);
    if (!url) continue;
    fileUrls.push(url);
    candidatePhotos += 1;
    photoMap.push(`image #${fileUrls.length} = candidate ${c.report_code} photo`);
  }

  const prompt = [
    'You compare lost-and-found reports to estimate how likely two reports describe the same physical item.',
    'Compare the PRIMARY report against EACH candidate report independently and return one assessment per candidate.',
    'Scoring rules:',
    '- overall is an integer 0-100 combining category compatibility, item name and description similarity, colour and visible characteristics, photograph similarity, location proximity and date/time proximity.',
    '- Do NOT give a high overall score only because the categories match. If the evidence conflicts, lower the score.',
    '- Only rate visual_similarity when photographs are provided for BOTH reports; otherwise return 0 and say the photo could not be compared.',
    '- explanation must be one or two short factual sentences about the evidence. Never claim that anyone owns the item.',
    '- Use the candidate report code as candidate_code, exactly as given.',
    '',
    describeReport('PRIMARY', report, isLost ? 'lost' : 'found'),
    '',
    ...candidates.map((c) => describeReport('CANDIDATE', c, isLost ? 'found' : 'lost')),
    '',
    photoMap.length ? `Photographs supplied in this order:\n${photoMap.join('\n')}` : 'No photographs are available for these reports.',
    '',
    `Return assessments for all ${candidates.length} candidate(s): ${candidateCodes.join(', ')}.`,
  ].join('\n');

  let geminiMap;
  let aiStatus = 'completed';
  let aiError = '';
  try {
    const raw = await callGemini(base44, prompt, fileUrls);
    geminiMap = parseAssessments(raw);
  } catch (error) {
    const message = String((error && error.message) || 'AI matching failed.').slice(0, 300);
    await primaryEntity.update(report.id, { match_status: 'failed', match_error: message });
    await logEvent(base44, {
      action: 'AI_MATCH_FAILED',
      summary: `AI matching failed for ${report.report_code}: ${message}`,
      actor,
      lost_report_id: isLost ? report.id : '',
      found_report_id: isLost ? '' : report.id,
      owner_id: isLost ? report.owner_id : '',
      finder_id: isLost ? '' : report.finder_id,
      metadata: { candidates: candidates.length },
    });
    return { match_status: 'failed', error: message, evaluated: 0, qualifying: 0, best_score: null, matches: [] };
  }

  const lostReport = isLost ? report : null;
  const foundReport = isLost ? null : report;
  const results = [];
  let qualifyingCount = 0;
  let best = null;

  for (const candidate of candidates) {
    const lost = isLost ? report : candidate;
    const found = isLost ? candidate : report;
    const det = deterministicScore(lost, found);
    const ai = geminiMap.get(String(candidate.report_code || '').toUpperCase());
    if (!ai) aiStatus = 'partial';
    const finalScore = ai && ai.overall !== null
      ? clamp(0.65 * ai.overall + 0.35 * det.total)
      : det.total;
    const isQualifying = finalScore >= MATCH_THRESHOLD;
    if (isQualifying) qualifyingCount += 1;
    if (!best || finalScore > best.score) best = { score: finalScore, matchId: null, is_qualifying: isQualifying };

    const explanation = ai
      ? ai.explanation || 'The AI did not return an explanation for this pair.'
      : 'The AI returned no assessment for this pair, so this score uses report fields only (category, text, colour, location, time).';

    const payload = {
      lost_report_id: lost.id,
      found_report_id: found.id,
      lost_report_code: lost.report_code || '',
      found_report_code: found.report_code || '',
      owner_id: lost.owner_id,
      finder_id: found.finder_id,
      item_name: lost.item_name,
      found_item_name: found.item_name,
      score: finalScore,
      gemini_score: ai ? ai.overall : null,
      deterministic_score: det.total,
      explanation,
      method: SCORE_METHOD_TEXT,
      dimensions: {
        deterministic: det.parts,
        ai: ai
          ? {
              overall: ai.overall,
              text: ai.text,
              category: ai.category,
              color: ai.color,
              visual: ai.visual,
              location: ai.location,
              time: ai.time,
              conflicting_evidence: ai.conflicting || '',
            }
          : null,
      },
      processing_status: ai ? 'completed' : 'partial',
      error_message: ai ? '' : 'The AI returned no assessment for this pair.',
      is_qualifying: isQualifying,
    };

    const pairKey = isLost ? `${report.id}|${candidate.id}` : `${candidate.id}|${report.id}`;
    const previous = existingByPair.get(pairKey);
    let row;
    if (previous) {
      row = await db.asServiceRole.entities.AIMatch.update(previous.id, payload);
      if (!row || !row.id) row = { ...previous, ...payload };
    } else {
      row = await db.asServiceRole.entities.AIMatch.create(payload);
    }
    if (best && best.score === finalScore) best.matchId = row.id;

    // A qualifying pair always shares the found report with its matched owner, so the owner
    // can open the report the notification points at. Idempotent and non-fatal.
    if (isQualifying) {
      const foundRecord = isLost ? candidate : report;
      try {
        const linked = Array.isArray(foundRecord.linked_owner_ids) ? foundRecord.linked_owner_ids : [];
        if (!linked.includes(lost.owner_id)) {
          await db.asServiceRole.entities.FoundReport.update(foundRecord.id, {
            linked_owner_ids: [...linked, lost.owner_id],
          });
        }
      } catch (linkError) {
        // The match row is already stored; sharing is retried on the next matching run.
      }
    }

    const newlyQualifying = isQualifying && (!previous || !previous.is_qualifying);
    if (newlyQualifying) {
      await notify(base44, {
        recipient_id: lost.owner_id,
        type: 'MATCH_FOUND',
        title: 'Potential match found',
        message: `Potential match found for your lost item "${lost.item_name}". AI similarity score ${finalScore}/100 against found report ${found.report_code}. Review the found report and decide whether to request a claim.`,
        related_entity_type: 'AIMatch',
        related_entity_id: row.id,
        link: `/matches/${row.id}`,
      });
      await db.asServiceRole.entities.AIMatch.update(row.id, { notified: true });
    }

    results.push({ id: row.id, score: finalScore, is_qualifying: isQualifying, explanation, found_report_code: found.report_code, owner_response: previous ? previous.owner_response : 'none' });
  }

  const anyQualifying = qualifyingCount > 0;
  await primaryEntity.update(report.id, {
    match_status: aiStatus === 'partial' ? 'partial' : 'completed',
    match_error: '',
    matched_at: nowIso(),
    ...(anyQualifying ? { status: advanceStatus(report.status, 'MATCH_FOUND') } : {}),
  });

  if (isLost && anyQualifying) {
    for (const r of results.filter((x) => x.is_qualifying)) {
      const candidate = candidates.find((c) => c.report_code === r.found_report_code);
      if (candidate) {
        await oppositeEntity.update(candidate.id, { status: advanceStatus(candidate.status, 'MATCH_FOUND') });
      }
    }
  }

  await logEvent(base44, {
    action: 'AI_MATCH_RUN',
    summary: `AI compared ${candidates.length} candidate report(s) for ${report.report_code}. Best score ${best ? best.score : 0}/100, ${qualifyingCount} above the ${MATCH_THRESHOLD}/100 threshold.`,
    actor,
    lost_report_id: isLost ? report.id : '',
    found_report_id: isLost ? '' : report.id,
    owner_id: isLost ? report.owner_id : '',
    finder_id: isLost ? '' : report.finder_id,
    metadata: { candidates: candidates.length, qualifying: qualifyingCount, threshold: MATCH_THRESHOLD },
  });

  return {
    match_status: aiStatus,
    evaluated: candidates.length,
    qualifying: qualifyingCount,
    threshold: MATCH_THRESHOLD,
    best_score: best ? best.score : null,
    matches: results,
  };
}

export { MATCH_THRESHOLD, CATEGORIES, makeCode };