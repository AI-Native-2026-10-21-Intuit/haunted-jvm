/* Standalone runtime: provides window.claude.use('db'|'room'|'user'|'sample')
   on top of this app's own WebSocket server, so the game code is unchanged. */
(function () {
  const params = new URLSearchParams(location.search);
  let hostKey = null;
  try {
    if (params.has('host')) { sessionStorage.setItem('hj:host', params.get('host')); params.delete('host');
      history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash); }
    hostKey = sessionStorage.getItem('hj:host');
  } catch (e) { hostKey = params.get('host'); }
  const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} } };

  let ws = null, me = null, rid = 0, sid = 0, backoff = 500;
  const pending = new Map(), subs = new Map(), roomL = {};
  let resolveReady; const ready = new Promise(r => (resolveReady = r));
  const status = (on) => { document.documentElement.dataset.conn = on ? 'up' : 'down'; };

  function connect() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = () => { backoff = 500; ws.send(JSON.stringify({ t: 'hello', token: store.get('hj:token'), hostKey })); };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data) } catch (e) { return }
      if (m.t === 'welcome') {
        me = m; store.set('hj:token', m.token); status(true); resolveReady(true);
        for (const s of subs.values()) send({ t: 'sub', sid: s.sid, kind: s.kind, path: s.path, where: s.where });
      } else if (m.t === 'res') {
        const p = pending.get(m.rid); if (!p) return; pending.delete(m.rid);
        m.ok ? p.ok(m) : p.fail({ code: m.code || 'denied' });
      } else if (m.t === 'snap') {
        const s = subs.get(m.sid); if (!s) return;
        if (m.doc) s.cb({ id: m.doc.id, exists: m.doc.exists, data: () => m.doc.data || undefined, metadata: {} });
        else s.cb({ docs: m.docs.map(d => ({ id: d.id, exists: true, data: () => d.data, metadata: {} })), size: m.docs.length, empty: !m.docs.length, docChanges: () => [], metadata: {} });
      } else if (m.t === 'room') { (roomL[m.topic] || []).forEach(f => { try { f(m.data) } catch (e) {} }); }
    };
    ws.onclose = () => {
      status(false);
      for (const p of pending.values()) p.fail({ code: 'unavailable' }); pending.clear();
      setTimeout(connect, backoff); backoff = Math.min(8000, backoff * 2);
    };
  }
  function send(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }
  function req(m) {
    return ready.then(() => new Promise((ok, fail) => {
      if (!ws || ws.readyState !== 1) return fail({ code: 'unavailable' });
      const id = ++rid; pending.set(id, { ok, fail }); send({ ...m, rid: id });
      setTimeout(() => { if (pending.has(id)) { pending.delete(id); fail({ code: 'unavailable' }) } }, 10000);
    }));
  }
  function subscribe(kind, path, where, cb) {
    const s = { sid: ++sid, kind, path, where, cb }; subs.set(s.sid, s);
    ready.then(() => send({ t: 'sub', sid: s.sid, kind, path, where }));
    return () => { subs.delete(s.sid); send({ t: 'unsub', sid: s.sid }); };
  }
  const docRef = path => ({
    id: path.split('/')[1], path,
    get: () => req({ t: 'get', path }).then(r => ({ id: path.split('/')[1], exists: r.doc.exists, data: () => r.doc.data || undefined, metadata: {} })),
    set: data => req({ t: 'set', path, data }).then(() => {}),
    update: data => req({ t: 'update', path, data }).then(() => {}),
    delete: () => req({ t: 'delete', path }).then(() => {}),
    onSnapshot: (next, err) => subscribe('doc', path, [], next),
  });
  const query = (col, where) => ({
    path: col,
    where: (f, op, v) => query(col, where.concat([[f, op, v]])),
    orderBy() { return this }, limit() { return this },
    doc: id => docRef(col + '/' + id),
    onSnapshot: (next, err) => subscribe('col', col, where, next),
  });
  const db = { doc: docRef, collection: col => query(col, []) };
  const room = { emit: (topic, data) => send({ t: 'emit', topic, data }), on: (topic, fn) => { (roomL[topic] = roomL[topic] || []).push(fn) } };
  const user = { id: async () => me && me.id, canEdit: async () => !!(me && me.isHost), isOwner: async () => !!(me && me.isHost) };
  const sample = {
    json: async (prompt, opts) => {
      const r = await fetch('/api/grade', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: me && me.token, code: opts && opts.code }) });
      if (!r.ok) throw { code: 'unavailable' };
      return r.json();
    }
  };
  window.claude = {
    use: async name => {
      const ok = await Promise.race([ready, new Promise(r => setTimeout(() => r(false), 8000))]);
      if (!ok) return null;
      if (name === 'db') return db; if (name === 'room') return room; if (name === 'user') return user;
      if (name === 'sample') return me && me.grading ? sample : null;
      return null;
    }
  };
  connect();
})();
