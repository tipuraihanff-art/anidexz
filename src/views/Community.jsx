import React, { useState, useEffect } from 'react'
import { ref, push, onValue, query, orderByChild, limitToLast, endAt, get, remove } from 'firebase/database'
import { db } from '../firebase.js'
import { relTime } from '../helpers.js'
import { Spin } from '../components/Shared.jsx'

function countWords(s) { return s.trim() === '' ? 0 : s.trim().split(/\s+/).length }

function CommCard({ data }) {
  return (
    <div className="comm-card">
      <div className="comm-card-hdr">
        <div className="comm-avatar">{(data.name || '?')[0].toUpperCase()}</div>
        <span className="comm-author">{data.name}</span>
        <span className="comm-time">{relTime(data.ts)}</span>
      </div>
      <div className="comm-body">{data.body}</div>
    </div>
  )
}

function PostForm() {
  const [name, setName] = useState(() => { try { return localStorage.getItem('comm_name') || '' } catch { return '' } })
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const wc = countWords(body)

  function doPost() {
    if (!name.trim() || !body.trim() || wc > 150) return
    setPosting(true)
    push(ref(db, 'community'), { name: name.trim(), body: body.trim(), ts: Date.now() })
      .then(() => {
        try { localStorage.setItem('comm_name', name.trim()) } catch {}
        setBody('')
        setPosting(false)
      })
      .catch(e => { alert('Failed: ' + e.message); setPosting(false) })
  }

  return (
    <>
      <div className="comm-form-row">
        <input className="comm-input" placeholder="Your name" maxLength={40} value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
      </div>
      <textarea className="comm-textarea" placeholder="What's on your mind?" rows={4} value={body} onChange={e => setBody(e.target.value)} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
        <span className={`comm-count${wc > 150 ? ' err' : wc > 120 ? ' warn' : ''}`}>{wc} / 150 words</span>
      </div>
      <button className="comm-post-btn" disabled={wc === 0 || wc > 150 || !name.trim() || posting} onClick={doPost}>
        {posting ? 'Posting...' : 'Post'}
      </button>
    </>
  )
}

function Modal({ onClose }) {
  const [name, setName] = useState(() => { try { return localStorage.getItem('comm_name') || '' } catch { return '' } })
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const wc = countWords(body)

  function doPost() {
    if (!name.trim() || !body.trim() || wc > 150) return
    setPosting(true)
    push(ref(db, 'community'), { name: name.trim(), body: body.trim(), ts: Date.now() })
      .then(() => {
        try { localStorage.setItem('comm_name', name.trim()) } catch {}
        onClose()
      })
      .catch(e => { alert('Failed: ' + e.message); setPosting(false) })
  }

  return (
    <div className="comm-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="comm-modal">
        <div className="comm-modal-hdr">
          <span className="comm-modal-title">New Post</span>
          <button className="comm-modal-close" onClick={onClose}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="comm-form-row" style={{ marginBottom: '10px' }}>
          <input className="comm-input" placeholder="Your name" maxLength={40} value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
        </div>
        <textarea className="comm-textarea" placeholder="What's on your mind? (max 150 words)" rows={5} value={body} onChange={e => setBody(e.target.value)} />
        <div className="comm-form-footer" style={{ marginTop: '10px' }}>
          <span className={`comm-count${wc > 150 ? ' err' : wc > 120 ? ' warn' : ''}`}>{wc} / 150 words</span>
          <button className="comm-post-btn" style={{ width: 'auto' }} disabled={wc === 0 || wc > 150 || !name.trim() || posting} onClick={doPost}>
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Community() {
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900)

  useEffect(() => {
    const dbRef = ref(db, 'community')

    // Cleanup old posts (>7 days)
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    get(query(dbRef, orderByChild('ts'), endAt(cutoff)))
      .then(snap => { snap.forEach(child => remove(child.ref)) })
      .catch(() => {})

    // Subscribe - onValue returns unsubscribe function directly
    const postsQ = query(dbRef, orderByChild('ts'), limitToLast(50))
    const unsubscribe = onValue(
      postsQ,
      snap => {
        const list = []
        snap.forEach(child => list.push({ key: child.key, ...child.val() }))
        setPosts(list.reverse())
        setLoadingPosts(false)
      },
      () => { setLoadingPosts(false) }
    )

    const onResize = () => setIsMobile(window.innerWidth <= 900)
    window.addEventListener('resize', onResize)

    return () => {
      unsubscribe()  // call the returned function to detach listener
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <>
      <div className="comm-page">
        <div className="comm-sidebar">
          <div className="comm-sidebar-box">
            <h2 className="comm-title">Community</h2>
            <p className="comm-sub">Share your anime thoughts. Text only, max 150 words. Auto-deletes after 7 days.</p>
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
            <PostForm />
          </div>
        </div>

        <div className="comm-feed-wrap">
          <div className="comm-mob-hdr">
            <h2>Community</h2>
            <p>Text only. Max 150 words. Posts delete after 7 days.</p>
          </div>
          <div className="comm-feed-hdr">
            <span className="comm-feed-title">Latest Posts</span>
          </div>
          <div className="comm-feed">
            {loadingPosts ? (
              <div className="comm-loader"><Spin /></div>
            ) : !posts.length ? (
              <div className="comm-empty">No posts yet. Be the first!</div>
            ) : (
              posts.map(p => <CommCard key={p.key} data={p} />)
            )}
          </div>
        </div>
      </div>

      {isMobile && (
        <button className="comm-fab" onClick={() => setShowModal(true)} title="New Post">
          <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}

      {showModal && <Modal onClose={() => setShowModal(false)} />}
    </>
  )
}
