<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AniDexZ — Official Hub</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --blue: #2563eb;
    --blue-dark: #1d4ed8;
    --blue-glow: rgba(37, 99, 235, 0.18);
    --green: #22c55e;
    --bg: #ffffff;
    --border: rgba(37,99,235,0.1);
    --text: #111827;
    --muted: #6b7280;
    --subtle: #d1d5db;
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background: #ffffff;
    color: var(--text);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 70% 40% at 50% 0%, rgba(37,99,235,0.07) 0%, transparent 70%),
      radial-gradient(ellipse 40% 30% at 90% 90%, rgba(99,102,241,0.05) 0%, transparent 60%);
    pointer-events: none;
  }

  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 460px;
    background: #ffffff;
    border: 1px solid rgba(37,99,235,0.12);
    border-radius: 24px;
    padding: 36px 32px;
    box-shadow:
      0 0 0 1px rgba(37,99,235,0.04),
      0 20px 60px rgba(37,99,235,0.1),
      0 4px 16px rgba(0,0,0,0.05);
    animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
    transform: translateY(20px);
  }

  @keyframes fadeUp {
    to { opacity: 1; transform: translateY(0); }
  }

  .top-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(37,99,235,0.07);
    border: 1px solid rgba(37,99,235,0.18);
    border-radius: 100px;
    padding: 5px 14px;
    margin-bottom: 22px;
    animation: fadeUp 0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both;
  }
  .top-badge-dot {
    width: 6px; height: 6px;
    background: var(--blue);
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(37,99,235,0.5);
  }
  .top-badge-text {
    font-family: 'Syne', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--blue);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    animation: fadeUp 0.6s 0.15s cubic-bezier(0.16,1,0.3,1) both;
  }
  .brand-icon {
    width: 38px; height: 38px;
    background: linear-gradient(135deg, var(--blue), #6366f1);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 14px rgba(37,99,235,0.3);
  }
  .brand-icon svg {
    width: 20px; height: 20px;
    fill: none;
    stroke: #fff;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .brand-name {
    font-family: 'Syne', sans-serif;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #6366f1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .headline {
    font-family: 'Syne', sans-serif;
    font-size: 21px;
    font-weight: 700;
    line-height: 1.3;
    color: #111827;
    margin-bottom: 10px;
    animation: fadeUp 0.6s 0.2s cubic-bezier(0.16,1,0.3,1) both;
  }
  .headline span {
    background: linear-gradient(90deg, #2563eb, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .description {
    font-size: 13.5px;
    font-weight: 300;
    color: #6b7280;
    line-height: 1.7;
    margin-bottom: 24px;
    animation: fadeUp 0.6s 0.25s cubic-bezier(0.16,1,0.3,1) both;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 24px;
    animation: fadeUp 0.6s 0.3s cubic-bezier(0.16,1,0.3,1) both;
  }
  .stat-item {
    background: rgba(37,99,235,0.04);
    border: 1px solid rgba(37,99,235,0.1);
    border-radius: 12px;
    padding: 12px 8px;
    text-align: center;
  }
  .stat-value {
    font-family: 'Syne', sans-serif;
    font-size: 18px;
    font-weight: 800;
    color: var(--blue);
    letter-spacing: -0.5px;
  }
  .stat-label {
    font-size: 10px;
    color: var(--muted);
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }

  .divider {
    height: 1px;
    background: rgba(37,99,235,0.08);
    margin-bottom: 20px;
    animation: fadeUp 0.6s 0.35s cubic-bezier(0.16,1,0.3,1) both;
  }

  .features {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 22px;
    animation: fadeUp 0.6s 0.38s cubic-bezier(0.16,1,0.3,1) both;
  }
  .feature-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(37,99,235,0.05);
    border: 1px solid rgba(37,99,235,0.12);
    border-radius: 100px;
    padding: 6px 13px;
    font-size: 12px;
    color: #374151;
    font-weight: 500;
    transition: all 0.2s;
  }
  .feature-chip:hover {
    background: rgba(37,99,235,0.1);
    border-color: rgba(37,99,235,0.25);
  }
  .feature-chip svg {
    width: 11px; height: 11px;
    stroke: var(--blue);
    fill: none;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
    flex-shrink: 0;
  }

  .cta-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-decoration: none;
    background: linear-gradient(135deg, var(--blue) 0%, #3b82f6 100%);
    border: 1px solid rgba(37,99,235,0.3);
    padding: 15px 18px;
    border-radius: 14px;
    box-shadow:
      0 4px 20px var(--blue-glow),
      inset 0 1px 0 rgba(255,255,255,0.2);
    transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
    margin-bottom: 12px;
    animation: fadeUp 0.6s 0.42s cubic-bezier(0.16,1,0.3,1) both;
    position: relative;
    overflow: hidden;
  }
  .cta-button::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%);
    pointer-events: none;
  }
  .cta-button:hover {
    transform: translateY(-2px) scale(1.01);
    box-shadow: 0 8px 30px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.2);
  }
  .cta-button:active { transform: translateY(0) scale(0.99); }

  .cta-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .cta-icon {
    width: 36px; height: 36px;
    background: rgba(255,255,255,0.18);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .cta-icon svg {
    width: 17px; height: 17px;
    stroke: #fff;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .cta-text-main {
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    display: block;
  }
  .cta-text-sub {
    font-size: 11px;
    color: rgba(255,255,255,0.7);
    font-weight: 300;
    display: block;
    margin-top: 2px;
  }

  .live-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0,0,0,0.15);
    border: 1px solid rgba(34,197,94,0.35);
    padding: 5px 11px;
    border-radius: 100px;
    flex-shrink: 0;
  }
  .live-dot {
    width: 7px; height: 7px;
    background: var(--green);
    border-radius: 50%;
    position: relative;
    box-shadow: 0 0 6px var(--green);
  }
  .live-dot::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--green);
    border-radius: 50%;
    animation: livePulse 1.8s ease-in-out infinite;
  }
  @keyframes livePulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(2.8); opacity: 0; }
  }
  .live-text {
    font-family: 'Syne', sans-serif;
    font-size: 10px;
    font-weight: 700;
    color: #86efac;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .notice {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: rgba(234,179,8,0.05);
    border: 1px solid rgba(234,179,8,0.2);
    border-radius: 12px;
    padding: 12px 14px;
    animation: fadeUp 0.6s 0.5s cubic-bezier(0.16,1,0.3,1) both;
  }
  .notice-svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
  .notice-svg svg {
    width: 14px; height: 14px;
    stroke: #b45309;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .notice-text {
    font-size: 12px;
    color: #6b7280;
    line-height: 1.6;
    font-weight: 300;
  }
  .notice-text strong {
    color: #b45309;
    font-weight: 600;
  }

  .card-footer {
    margin-top: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    animation: fadeUp 0.6s 0.55s cubic-bezier(0.16,1,0.3,1) both;
  }
  .footer-dot { width: 3px; height: 3px; background: var(--subtle); border-radius: 50%; }
  .footer-text { font-size: 11px; color: var(--muted); font-weight: 400; }
</style>
</head>
<body>

<div class="card">

  <div class="top-badge">
    <span class="top-badge-dot"></span>
    <span class="top-badge-text">Official Backup Hub</span>
  </div>

  <div class="brand">
    <div class="brand-icon">
      <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    </div>
    <span class="brand-name">AniDexZ</span>
  </div>

  <h1 class="headline">Your Anime Community,<br><span>Always Online</span></h1>

  <p class="description">
    Bookmark this page and never lose access again. AniDexZ is your dedicated backup hub for anime streaming, news, and community — even when the main domain goes down.
  </p>

  <div class="stats">
    <div class="stat-item">
      <div class="stat-value">17K+</div>
      <div class="stat-label">Anime</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">24/7</div>
      <div class="stat-label">Uptime</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">Free</div>
      <div class="stat-label">Access</div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="features">
    <div class="feature-chip">
      <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      Fast Streaming
    </div>
    <div class="feature-chip">
      <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
      Multi-Sub
    </div>
    <div class="feature-chip">
      <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
      Mobile Friendly
    </div>
    <div class="feature-chip">
      <svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
      Latest Releases
    </div>
  </div>

  <a href="https://anidexz.blogspot.com" target="_top" class="cta-button">
    <div class="cta-left">
      <div class="cta-icon">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      </div>
      <div>
        <span class="cta-text-main">anidexz.blogspot.com</span>
        <span class="cta-text-sub">Tap to visit the official backup site</span>
      </div>
    </div>
    <div class="live-pill">
      <span class="live-dot"></span>
      <span class="live-text">Live</span>
    </div>
  </a>

  <div class="notice">
    <div class="notice-svg">
      <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    </div>
    <p class="notice-text">
      <strong>Pro tip:</strong> Bookmark this link now so you always have instant access — even if the primary domain changes or goes offline temporarily.
    </p>
  </div>

  <div class="card-footer">
    <span class="footer-text">AniDexZ</span>
    <span class="footer-dot"></span>
    <span class="footer-text">Backup Hub</span>
    <span class="footer-dot"></span>
    <span class="footer-text">Always Free</span>
  </div>

</div>

</body>
</html>
