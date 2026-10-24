const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

// Append-only case history / audit trail. Never store OTP values or secrets here.

export async function logEvent(base44, event) {
  const record = {
    action: event.action,
    summary: event.summary || event.action,
    actor_id: event.actor ? event.actor.id : '',
    actor_name: event.actor ? event.actor.full_name || event.actor.email || '' : '',
    actor_role: event.actor ? event.actor.role || 'user' : 'system',
    metadata: event.metadata || {},
  };
  const passthrough = [
    'case_id',
    'case_code',
    'match_id',
    'lost_report_id',
    'found_report_id',
    'owner_id',
    'finder_id',
    'previous_status',
    'new_status',
  ];
  for (const key of passthrough) {
    if (event[key]) record[key] = event[key];
  }
  try {
    return await db.asServiceRole.entities.CaseHistory.create(record);
  } catch (error) {
    return null;
  }
}