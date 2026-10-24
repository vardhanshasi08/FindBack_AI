const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

// Persistent in-app notifications. Never carry OTP values or ownership secrets.

export async function notify(base44, payload) {
  if (!payload || !payload.recipient_id) return null;
  return db.asServiceRole.entities.Notification.create({
    recipient_id: payload.recipient_id,
    type: payload.type || 'GENERAL',
    title: payload.title || 'FindBack AI',
    message: payload.message || '',
    related_entity_type: payload.related_entity_type || '',
    related_entity_id: payload.related_entity_id || '',
    link: payload.link || '',
    is_read: false,
  });
}

export async function adminUserIds(base44) {
  try {
    const users = await db.asServiceRole.entities.User.list();
    const list = Array.isArray(users) ? users : (users && users.items) || [];
    return list.filter((u) => u.role === 'admin').map((u) => u.id);
  } catch (error) {
    return [];
  }
}

export async function notifyAdmins(base44, payload) {
  const ids = await adminUserIds(base44);
  const results = [];
  for (const id of ids) {
    results.push(await notify(base44, { ...payload, recipient_id: id }));
  }
  return results;
}