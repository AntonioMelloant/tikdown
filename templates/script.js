/* ============================================
   VIDDROP — JavaScript
   Tab switching, UI interactions, mock download
   ============================================ */

/* ============================================
   PARTICLE CONSTELLATION SYSTEM
   ============================================ */
(function () {
  const canvas = document.getElementById('particles-canvas');
  const ctx    = canvas.getContext('2d');

  const PALETTE = {
    tiktok:    { r: 37,  g: 244, b: 238 },
    instagram: { r: 253, g: 29,  b: 29  },
  };

  let targetColor  = { ...PALETTE.tiktok };
  let currentColor = { ...PALETTE.tiktok };

  const N_PARTICLES = 60;
  const MAX_DIST    = 140;
  const MOUSE_R     = 120;

  let W = 0, H = 0;
  const mouse = { x: -9999, y: -9999 };
  let particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor(initial) {
      this.reset(initial);
    }
    reset(initial) {
      this.x     = Math.random() * W;
      this.y     = initial ? Math.random() * H : -10;
      this.vx    = (Math.random() - 0.5) * 0.4;
      this.vy    = Math.random() * 0.28 + 0.08;
      this.r     = Math.random() * 1.8 + 0.5;
      this.base  = Math.random() * 0.45 + 0.15;
      this.ph    = Math.random() * Math.PI * 2;
      this.ps    = Math.random() * 0.018 + 0.007;
    }
    update() {
      this.ph += this.ps;
      // mouse repulsion
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < MOUSE_R && d > 0) {
        const f = (MOUSE_R - d) / MOUSE_R;
        this.x += (dx / d) * f * 2.2;
        this.y += (dy / d) * f * 2.2;
      }
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -10)   this.x = W + 10;
      if (this.x > W + 10) this.x = -10;
      if (this.y > H + 10) this.reset(false);
    }
    draw(r, g, b) {
      const a = this.base * (0.65 + 0.35 * Math.sin(this.ph));
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fill();
    }
  }

  function init() {
    particles = Array.from({ length: N_PARTICLES }, (_, i) => new Particle(true));
  }

  function lerp() {
    const s = 0.022;
    currentColor.r += (targetColor.r - currentColor.r) * s;
    currentColor.g += (targetColor.g - currentColor.g) * s;
    currentColor.b += (targetColor.b - currentColor.b) * s;
  }

  function drawLines(r, g, b) {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - d / MAX_DIST) * 0.2})`;
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    lerp();
    const r = Math.round(currentColor.r);
    const g = Math.round(currentColor.g);
    const b = Math.round(currentColor.b);
    drawLines(r, g, b);
    particles.forEach(p => { p.update(); p.draw(r, g, b); });
    requestAnimationFrame(loop);
  }

  // Public: called by switchTab()
  window.setParticleTheme = function (tab) {
    if (PALETTE[tab]) targetColor = { ...PALETTE[tab] };
  };

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  resize();
  init();
  loop();
})();

/* ============================================
   SHOOTING STARS
   ============================================ */
(function () {
  function shoot() {
    const star  = document.createElement('div');
    const x     = Math.random() * window.innerWidth;
    const y     = Math.random() * window.innerHeight * 0.65;
    const angle = Math.random() * 30 + 12;
    const len   = Math.random() * 130 + 50;
    const col   = (typeof currentTab !== 'undefined' && currentTab === 'instagram')
      ? '#fd1d1d' : '#25f4ee';

    Object.assign(star.style, {
      position: 'fixed', left: x + 'px', top: y + 'px',
      width: len + 'px', height: '1.5px',
      background: `linear-gradient(90deg, transparent, ${col})`,
      transform: `rotate(${angle}deg)`,
      transformOrigin: 'left center',
      pointerEvents: 'none', zIndex: '0',
      opacity: '0', borderRadius: '2px',
    });
    document.body.appendChild(star);

    const anim = star.animate([
      { opacity: 0,   transform: `rotate(${angle}deg) translateX(0px)`,        offset: 0   },
      { opacity: 0.85,transform: `rotate(${angle}deg) translateX(0px)`,        offset: 0.12 },
      { opacity: 0,   transform: `rotate(${angle}deg) translateX(${len * 2}px)`, offset: 1 },
    ], { duration: 750 + Math.random() * 650, easing: 'ease-in' });

    anim.onfinish = () => star.remove();
  }

  function schedule() {
    shoot();
    setTimeout(schedule, 2000 + Math.random() * 3000);
  }
  setTimeout(schedule, 800);
})();


/* ============================================
   APP LOGIC
   ============================================ */

// ---- STATE ----
let currentTab = 'tiktok';
let isLoading  = false;

// ---- THEME CONFIGS ----
const THEMES = {
  tiktok: {
    title:       'Baixar do TikTok',
    subtitle:    "Cole o link e baixe em alta qualidade, sem marca d'água",
    placeholder: 'https://www.tiktok.com/@user/video/...',
    platform:    'TikTok',
    thumb:       '🎵',
    options: [
      { icon: '🎬', label: 'Vídeo HD',     sub: "Sem marca d'água · 1080p", badge: '⬇ MP4' },
      { icon: '🎬', label: 'Vídeo SD',     sub: "Sem marca d'água · 720p",  badge: '⬇ MP4' },
      { icon: '🎵', label: 'Apenas Áudio', sub: 'Extrair trilha sonora',    badge: '⬇ MP3' },
    ],
  },
  instagram: {
    title:       'Baixar do Instagram',
    subtitle:    'Fotos e vídeos do Instagram em alta qualidade',
    placeholder: 'https://instagram.com/p/ABC123def/...',
    platform:    'Instagram',
    thumb:       '📸',
    options: [
      { icon: '🎬', label: 'Vídeo Original',  sub: 'Qualidade máxima disponível', badge: '⬇ MP4' },
      { icon: '🖼',  label: 'Foto / Carrossel', sub: 'Todas as imagens do post',   badge: '⬇ JPG' },
      { icon: '📖',  label: 'Story / Reel',    sub: 'Vídeo completo',              badge: '⬇ MP4' },
    ],
  },
};

// ---- ELEMENTS ----
const body           = document.body;
const tabTikTok      = document.getElementById('tab-tiktok');
const tabIG          = document.getElementById('tab-instagram');
const heroTitle      = document.getElementById('hero-title');
const heroSub        = document.getElementById('hero-subtitle');
const urlInput       = document.getElementById('video-url');
const clearBtn       = document.getElementById('clear-btn');
const inputCard      = document.getElementById('input-card');
const loadingEl      = document.getElementById('loading-state');
const resultEl       = document.getElementById('result-panel');
const errorEl        = document.getElementById('error-state');
const resultPlatform = document.getElementById('result-platform');
const resultTitle    = document.getElementById('result-title');
const resultAuthor   = document.getElementById('result-author');
const resultOptions  = document.getElementById('result-options');
const thumbPlaceholder = document.getElementById('thumb-placeholder');

// ---- INIT ----
body.classList.add('theme-tiktok');

// ---- TAB SWITCH ----
function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;
  const cfg = THEMES[tab];

  // Flash class
  body.classList.add('switching');
  setTimeout(() => body.classList.remove('switching'), 600);

  // Theme
  body.classList.remove('theme-tiktok', 'theme-instagram');
  body.classList.add(`theme-${tab}`);

  // Particle color
  if (window.setParticleTheme) window.setParticleTheme(tab);

  // Tabs
  tabTikTok.classList.toggle('active', tab === 'tiktok');
  tabIG.classList.toggle('active',     tab === 'instagram');
  tabTikTok.setAttribute('aria-selected', tab === 'tiktok');
  tabIG.setAttribute('aria-selected',     tab === 'instagram');

  // Hero text fade
  heroTitle.style.opacity   = '0';
  heroTitle.style.transform = 'translateY(6px)';
  heroSub.style.opacity     = '0';
  setTimeout(() => {
    heroTitle.textContent = cfg.title;
    heroSub.textContent   = cfg.subtitle;
    heroTitle.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    heroTitle.style.opacity    = '1';
    heroTitle.style.transform  = 'translateY(0)';
    heroSub.style.transition   = 'opacity 0.35s ease';
    heroSub.style.opacity      = '1';
  }, 120);

  // Input
  urlInput.placeholder   = cfg.placeholder;
  urlInput.value         = '';
  clearBtn.style.display = 'none';

  resetState(false);
}

// ---- INPUT HANDLING ----
urlInput.addEventListener('input', () => {
  clearBtn.style.display = urlInput.value.trim().length > 0 ? 'block' : 'none';
});
urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleDownload(); });

function clearInput() {
  urlInput.value = '';
  clearBtn.style.display = 'none';
  urlInput.focus();
}

// ---- DOWNLOAD HANDLER ----
function handleDownload() {
  const url = urlInput.value.trim();
  if (!url)                    { shakeInput(); return; }
  if (!isValidUrl(url))        { showError('Link inválido. Cole a URL completa.'); return; }
  if (!isMatchingPlatform(url)){
    showError(`Este link não parece ser do ${currentTab === 'tiktok' ? 'TikTok' : 'Instagram'}.`);
    return;
  }
  startLoading();
}

function isValidUrl(str) {
  try { const u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}

function isMatchingPlatform(url) {
  const l = url.toLowerCase();
  return currentTab === 'tiktok'
    ? l.includes('tiktok.com') || l.includes('vm.tiktok') || l.includes('vt.tiktok')
    : l.includes('instagram.com') || l.includes('instagr.am');
}

// ---- SHAKE ----
function shakeInput() {
  inputCard.style.animation = 'none';
  inputCard.offsetHeight;
  inputCard.style.animation = 'shake 0.45s ease';
  inputCard.addEventListener('animationend', () => { inputCard.style.animation = ''; }, { once: true });
  if (!document.getElementById('shake-kf')) {
    const s = document.createElement('style');
    s.id = 'shake-kf';
    s.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}30%{transform:translateX(8px)}45%{transform:translateX(-6px)}60%{transform:translateX(6px)}75%{transform:translateX(-3px)}90%{transform:translateX(3px)}}`;
    document.head.appendChild(s);
  }
}

// ---- LOADING ----
function startLoading() {
  isLoading = true;
  inputCard.style.display = 'none';
  loadingEl.style.display = 'flex';
  resultEl.style.display  = 'none';
  errorEl.style.display   = 'none';
  setTimeout(showResult, 1500 + Math.random() * 900);
}

// ---- RESULT ----
function showResult() {
  isLoading = false;
  loadingEl.style.display = 'none';
  const cfg = THEMES[currentTab];
  const url = urlInput.value.trim();

  let username = '@videocreator';
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    if (parts.length) username = '@' + parts[0].replace('@', '').slice(0, 20);
  } catch {}

  resultPlatform.textContent   = cfg.platform;
  resultTitle.textContent      = 'Vídeo encontrado com sucesso';
  resultAuthor.textContent     = username;
  thumbPlaceholder.textContent = cfg.thumb;

  resultOptions.innerHTML = '';
  cfg.options.forEach((opt, i) => {
    const btn = document.createElement('a');
    btn.className = 'option-btn';
    btn.href = '#';
    btn.setAttribute('role', 'button');
    btn.id = `option-${currentTab}-${i}`;
    btn.onclick = e => { e.preventDefault(); triggerFakeDownload(opt.label, btn); };
    btn.innerHTML = `
      <div class="option-info">
        <div class="option-icon">${opt.icon}</div>
        <div>
          <div class="option-label">${opt.label}</div>
          <div class="option-sublabel">${opt.sub}</div>
        </div>
      </div>
      <span class="option-dl">${opt.badge}</span>
    `;
    btn.style.opacity   = '0';
    btn.style.transform = 'translateY(8px)';
    resultOptions.appendChild(btn);
    setTimeout(() => {
      btn.style.transition = 'opacity 0.3s ease, transform 0.3s ease, border-color 0.25s, background 0.25s';
      btn.style.opacity    = '1';
      btn.style.transform  = 'translateY(0)';
    }, i * 80 + 50);
  });

  resultEl.style.display = 'flex';
}

// ---- FAKE DOWNLOAD ----
function triggerFakeDownload(label, btn) {
  const dl = btn.querySelector('.option-dl');
  const original = dl.textContent;
  dl.textContent = '⏳';
  setTimeout(() => {
    dl.textContent = '✓ Baixado!';
    btn.style.borderColor = 'color-mix(in srgb, var(--accent) 60%, transparent)';
    setTimeout(() => { dl.textContent = original; }, 2500);
  }, 1200);
}

// ---- ERROR ----
function showError(msg) {
  inputCard.style.display = 'none';
  loadingEl.style.display = 'none';
  resultEl.style.display  = 'none';
  errorEl.style.display   = 'flex';
  document.getElementById('error-msg').textContent = msg;
}

// ---- RESET ----
function resetState(focusInput = true) {
  isLoading = false;
  inputCard.style.display = 'flex';
  loadingEl.style.display = 'none';
  resultEl.style.display  = 'none';
  errorEl.style.display   = 'none';
  if (focusInput) {
    urlInput.value = '';
    clearBtn.style.display = 'none';
    setTimeout(() => urlInput.focus(), 50);
  }
}

// ---- PASTE ----
urlInput.addEventListener('paste', () => {
  setTimeout(() => { if (urlInput.value.trim()) clearBtn.style.display = 'block'; }, 10);
});

// ---- FOCUS GLOW ----
urlInput.addEventListener('focus', () => inputCard.classList.add('focused'));
urlInput.addEventListener('blur',  () => inputCard.classList.remove('focused'));

// ---- HERO TRANSITIONS ----
heroTitle.style.transition = 'opacity 0.35s ease, transform 0.35s ease, background 0.5s ease';
heroSub.style.transition   = 'opacity 0.35s ease, color 0.5s ease';
