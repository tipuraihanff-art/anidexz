import { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, serverTimestamp, query, orderByChild, limitToLast, remove } from 'firebase/database';
import { db } from '../utils/firebase';

function countWords(s) {
  return (s || '').trim().split(/\s+/).filter(Boolean).length;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

function PostForm({ onPost }) {
  const [name, setName] = useState(() => { try { return localStorage.getItem('comm_name') || ''; } catch { return ''; } });
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const wc = countWords(body);

  async function submit() {
    if (!name.trim() || wc === 0 || wc > 150) return;
    setPosting(true);
    try {
      localStorage.setItem('comm_name', name.trim());
    } catch {}
    await onPost(name.trim(), body.trim());
    setBody('');
    setPosting(false);
  }

  return (
    <>
      <div className="comm-form-row">
        <input className="comm-input" placeholder="Your name" maxLength={40} autoComplete="off" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <textarea className="comm-textarea" rows={4} placeholder="What's on your mind? (max 150 words)" value={body} onChange={e => setBody(e.target.value)} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <span className={`comm-count${wc > 150 ? ' err' : wc > 120 ? ' warn' : ''}`}>{wc} / 150 words</span>
      </div>
      <button className="comm-post-btn" disabled={wc === 0 || wc > 150 || !name.trim() || posting} onClick={submit}>
        {posting ? 'Posting...' : 'Post'}
      </button>
    </>
  );
}

export default function CommunityPage({ onToast }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const commRef = useRef(null);

  useEffect(() => {
    const dbRef = query(ref(db, 'community'), orderByChild('ts'), limitToLast(50));
    commRef.current = dbRef;
    const unsub = onValue(dbRef, snap => {
      const val = snap.val();
      if (!val) { setPosts([]); setLoading(false); return; }
      const arr = Object.entries(val).map(([key, v]) => ({ key, ...v }));
      arr.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      // Auto-delete posts older than 7 days
      const weekAgo = Date.now() - 7 * 86400000;
      arr.forEach(p => { if (p.ts && p.ts < weekAgo) remove(ref(db, `community/${p.key}`)); });
      setPosts(arr.filter(p => !p.ts || p.ts >= weekAgo));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function doPost(name, body) {
    await push(ref(db, 'community'), { name, body, ts: Date.now() });
    onToast?.('✓ Posted!');
  }

  return (
    <>
      <div className="comm-page">
        {/* Sidebar */}
        <div className="comm-sidebar">
          <div className="comm-sidebar-box">
            <h2 className="comm-title">Community</h2>
            <p className="comm-sub">Share your anime thoughts — text only, max 150 words. Posts auto-delete after 7 days.</p>
            <div className="comm-sidebar-divider" />
            <div className="comm-stat">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>Posts visible to <strong>everyone</strong></span>
            </div>
            <div className="comm-stat">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Auto-deleted after <strong>7 days</strong></span>
            </div>
            <div className="comm-stat">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span>Max <strong>150 words</strong> per post</span>
            </div>
            <div className="comm-sidebar-divider" />
            <PostForm onPost={doPost} />
          </div>
        </div>

        {/* Feed */}
        <div className="comm-feed">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--dim)' }}>Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="comm-empty">No posts yet. Be the first to share your thoughts!</div>
          ) : (
            posts.map(p => (
              <div key={p.key} className="comm-post">
                <div className="comm-post-hdr">
                  <span className="comm-post-name">{p.name || 'Anonymous'}</span>
                  <span className="comm-post-time">{p.ts ? timeAgo(p.ts) : ''}</span>
                </div>
                <div className="comm-post-body">{p.body}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      <button className="comm-fab" onClick={() => setModalOpen(true)}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      {/* Mobile Modal */}
      {modalOpen && (
        <div className="comm-modal-bg" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="comm-modal">
            <div className="comm-modal-hdr">
              <span className="comm-modal-title">New Post</span>
              <button className="comm-modal-close" onClick={() => setModalOpen(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <PostForm onPost={async (name, body) => { await doPost(name, body); setModalOpen(false); }} />
          </div>
        </div>
      )}
    </>
  );
}
