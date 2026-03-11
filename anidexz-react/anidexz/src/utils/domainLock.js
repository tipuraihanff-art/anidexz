const ALLOWED = [
  'anidexz.vercel.app',
  'www.anidexz.vercel.app',
  'anidexz.com',
  'www.anidexz.com',
];

export function checkDomainLock() {
  const host = window.location.hostname;
  // Allow localhost in dev
  if (host === 'localhost' || host === '127.0.0.1') return true;

  if (!ALLOWED.includes(host)) {
    document.documentElement.innerHTML = '';
    document.write(`<style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#05050a;color:#6666aa;font-family:sans-serif;
        display:flex;align-items:center;justify-content:center;
        min-height:100vh;text-align:center;flex-direction:column;gap:12px}
    </style>
    <h2 style="color:#7c3aed;font-size:22px">Access Denied</h2>
    <p>This page cannot be accessed directly.<br>Please visit the official site.</p>`);
    return false;
  }

  // Session token check
  const TOKEN_KEY = '_anz_session';
  const VALID_TOKEN = '_anz_' + btoa(host).replace(/=/g, '');
  try {
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (!stored) {
      sessionStorage.setItem(TOKEN_KEY, VALID_TOKEN);
    } else if (stored !== VALID_TOKEN) {
      document.documentElement.innerHTML = '';
      return false;
    }
  } catch {
    // sessionStorage blocked — still allow, server env handles it
  }

  return true;
}
