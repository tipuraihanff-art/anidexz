import React, { useState } from 'react'
import { useApp } from '../AppContext.jsx'

const TOP = ["Jujutsu Kaisen","One Piece","Demon Slayer","Attack on Titan","Frieren","Solo Leveling","Bleach","Naruto","Dragon Ball","Black Clover"]

const FAQS = [
  ['Is anidexz completely free?', 'Yes, anidexz is 100% free. No subscription, no registration, no payment. Just open and watch.'],
  ['Do I need an account?', 'No account needed. Watch history and My List are saved locally on your device.'],
  ['Does anidexz have dubbed anime?', 'Yes! Use the SUB / DUB toggle on any watch page to switch instantly.'],
  ['How often are episodes updated?', 'New episodes added daily, within hours of Japan broadcast.'],
  ['What quality is available?', 'Up to 1080p HD, auto-adjusts to your connection speed.'],
  ['Does it work on mobile?', 'Yes, fully responsive on phones, tablets, and desktops.'],
]

export default function Landing() {
  const { go } = useApp()
  const [q, setQ] = useState('')
  const [openFaq, setOpenFaq] = useState(null)

  function doSearch() {
    if (q.trim()) go('search', { q: q.trim() })
  }

  return (
    <div className="lnd-wrap">
      <nav className="lnd-nav">
        <button className="lnd-nl active" onClick={() => go('home')}>Home</button>
        <button className="lnd-nl" onClick={() => go('movies')}>Movies</button>
        <button className="lnd-nl" onClick={() => go('trending')}>TV Series</button>
        <button className="lnd-nl" onClick={() => go('trending')}>Most Popular</button>
        <button className="lnd-nl" onClick={() => go('trending')}>Top Airing</button>
        <button className="lnd-nl" onClick={() => go('domains')}>Domains</button>
      </nav>

      {/* HERO - NEW BACKGROUND + OLD IMAGE (SIZE FIXED - NO MORE STRETCHING) */}
      <div 
        className="lnd-hero"
        style={{
          backgroundImage: `url('https://iili.io/qMTrWzv.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="lnd-card">
          {/* Left side - Search section */}
          <div className="lnd-card-left">
            <div className="lnd-logo"><b>ani</b>dexz</div>
            
            <div className="lnd-search-row">
              <input 
                className="lnd-inp" 
                type="text" 
                placeholder="Search anime..." 
                value={q} 
                onChange={e => setQ(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && doSearch()} 
              />
              <button className="lnd-sbtn" onClick={doSearch}>
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>

            <div className="lnd-topsearch">
              <span className="lnd-tslabel">Top search: </span>
              {TOP.map((t, i) => (
                <button 
                  key={t} 
                  className="lnd-ts" 
                  onClick={() => go('search', { q: t })}
                >
                  {t}{i < TOP.length - 1 ? ',' : ''}
                </button>
              ))}
            </div>

            <button className="lnd-watchbtn" onClick={() => go('home')}>Watch anime</button>
          </div>

          {/* RIGHT SIDE - OLD IMAGE WITH FIXED SIZE (no stretching anymore) */}
          <div className="lnd-card-right">
            <img 
              className="lnd-hero-img" 
              src="https://iili.io/qMIDlzF.png" 
              alt="Anime Hero"
              style={{
                maxWidth: '520px',      // ← This stops it from being too big
                width: '100%',          // responsive on smaller screens
                height: 'auto',
                objectFit: 'contain',   // keeps proportions perfect
                display: 'block'
              }}
            />
          </div>
        </div>
      </div>

      <div className="lnd-about">
        <div className="lnd-about-inner">
          <h2 className="lnd-about-h">anidexz - The best site to watch anime online for Free</h2>
          <p className="lnd-about-p">Did you know the monthly search volume for anime-related topics exceeds 1 billion times? Anime is famous worldwide and we built anidexz to be the best free anime streaming site for all fans.</p>
          
          <div className="lnd-qa">
            <div className="lnd-q"><span className="lnd-qn">1/</span> What is anidexz?</div>
            <p className="lnd-about-p">anidexz is a free site to watch anime. Stream subbed or dubbed anime in HD quality without registration or payment.</p>
            
            <div className="lnd-q"><span className="lnd-qn">2/</span> Is anidexz safe?</div>
            <p className="lnd-about-p">Yes. We run minimal ads and scan them 24/7. If you spot anything suspicious, contact us and we will remove it immediately.</p>
            
            <div className="lnd-q"><span className="lnd-qn">3/</span> What makes anidexz the best free anime site?</div>
            <p className="lnd-about-p">Safety, huge library across all genres, HD up to 1080p, Sub &amp; Dub, daily updates, mobile &amp; desktop friendly.</p>
          </div>
        </div>
      </div>

      <div className="lnd-faq-section">
        <div className="lnd-about-inner">
          <h2 className="lnd-about-h">Frequently Asked Questions</h2>
          <div className="lnd-faq-list">
            {FAQS.map(([question, answer], i) => (
              <div key={i} className={'lnd-faq-item' + (openFaq === i ? ' open' : '')}>
                <div className="lnd-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{question}</span>
                  <svg className="lnd-faq-arr" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <div className="lnd-faq-a">{answer}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
