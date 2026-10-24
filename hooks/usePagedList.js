const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useCallback, useEffect, useState } from 'react';

/**
 * One page of records at a time, server-filtered, with a "load more" cursor.
 * Every change to the query object re-runs the query on the server.
 *
 * The entity is passed by NAME and resolved on each call: the SDK hands back a new
 * object on every `db.entities.X` access, so holding a reference in a dependency
 * array would re-fire the effect on every render.
 */
export default function usePagedList(entityName, baseQuery = {}, options = {}) {
  const { sort = '-created_date', pageSize = 12, enabled = true } = options;
  const key = JSON.stringify(baseQuery);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [token, setToken] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      setHasMore(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);