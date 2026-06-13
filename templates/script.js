// State management
let currentMode = 'tiktok';
let currentVideoData = null;
 
// DOM elements
const tabTikTok = document.getElementById('tab-tiktok');
const tabInstagram = document.getElementById('tab-instagram');
const videoUrlInput = document.getElementById('video-url');
const clearBtn = document.getElementById('clear-btn');
const downloadBtn = document.getElementById('download-btn');
const inputCard = document.getElementById('input-card');
const loadingState = document.getElementById('loading-state');
const resultPanel = document.getElementById('result-panel');
const errorState = document.getElementById('error-state');
const heroTitle = document.getElementById('hero-title');
const heroSubtitle = document.getElementById('hero-subtitle');
const resultOptions = document.getElementById('result-options');
const resultTitle = document.getElementById('result-title');
const resultAuthor = document.getElementById('result-author');
const resultPlatform = document.getElementById('result-platform');
const resultThumb = document.getElementById('result-thumb');
const thumbPlaceholder = document.getElementById('thumb-placeholder');
const errorMsg = document.getElementById('error-msg');
const inputIcon = document.getElementById('input-icon');
 
// Initialize particles
initializeParticles();
 
// Event listeners
videoUrlInput.addEventListener('input', handleInput);
videoUrlInput.addEventListener('paste', handlePaste);
videoUrlInput.addEventListener('keydown', handleKeyDown);
clearBtn.addEventListener('click', clearInput);
 
// Particles canvas setup
function initializeParticles() {
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const particles = [];
  const particleCount = 30;
  
  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 1;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.opacity = Math.random() * 0.5 + 0.1;
    }
    
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      
      if (this.x < 0) this.x = canvas.width;
      if (this.x > canvas.width) this.x = 0;
      if (this.y < 0) this.y = canvas.height;
      if (this.y > canvas.height) this.y = 0;
    }
    
    draw() {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}
 
// Switch between tabs
function switchTab(mode) {
  currentMode = mode;
  document.body.classList.remove('tiktok-mode', 'instagram-mode');
  document.body.classList.add(mode === 'tiktok' ? 'tiktok-mode' : 'instagram-mode');
  
  tabTikTok.classList.toggle('active', mode === 'tiktok');
  tabInstagram.classList.toggle('active', mode === 'instagram');
  
  if (mode === 'tiktok') {
    heroTitle.textContent = 'Baixar do TikTok';
    heroSubtitle.textContent = 'Cole o link e baixe em alta qualidade, sem marca d\'água';
    videoUrlInput.placeholder = 'https://www.tiktok.com/@user/video/...';
    inputIcon.textContent = '🎵';
    thumbPlaceholder.textContent = '🎬';
  } else {
    heroTitle.textContent = 'Baixar do Instagram';
    heroSubtitle.textContent = 'Fotos e vídeos do Instagram em alta qualidade';
    videoUrlInput.placeholder = 'https://instagram.com/p/ABC123def/...';
    inputIcon.textContent = '📷';
    thumbPlaceholder.textContent = '📷';
  }
  
  resetState();
}
 
// Handle input
function handleInput(e) {
  const hasValue = e.target.value.trim().length > 0;
  clearBtn.style.display = hasValue ? 'block' : 'none';
}
 
// Handle paste
function handlePaste() {
  setTimeout(() => {
    const url = videoUrlInput.value.trim();
    if (isValidUrl(url)) {
      handleDownload();
    }
  }, 10);
}
 
// Handle Enter key
function handleKeyDown(e) {
  if (e.key === 'Enter') {
    handleDownload();
  }
}
 
// Clear input
function clearInput() {
  videoUrlInput.value = '';
  clearBtn.style.display = 'none';
  videoUrlInput.focus();
  resetState();
}
 
// Validate URL
function isValidUrl(url) {
  if (currentMode === 'tiktok') {
    return url.includes('tiktok.com') || url.includes('vm.tiktok') || url.includes('vt.tiktok');
  } else {
    return url.includes('instagram.com') || url.includes('instagr.am') || url.includes('ig.me');
  }
}
 
// Main download handler
async function handleDownload() {
  const url = videoUrlInput.value.trim();
  
  if (!url || !isValidUrl(url)) {
    showError(`Cole um link válido do ${currentMode === 'tiktok' ? 'TikTok' : 'Instagram'}`);
    return;
  }
  
  // Se for Instagram, redireciona pro saveig.app
  if (currentMode === 'instagram') {
    window.open(`https://saveig.app/instagram?url=${encodeURIComponent(url)}`, '_blank');
    return;
  }
  
  // Se for TikTok, processa normalmente
  showLoading();
  
  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao processar');
    }
    
    currentVideoData = data;
    showResult(data);
  } catch (error) {
    showError(error.message);
  }
}
 
// Show loading state
function showLoading() {
  hideAll();
  loadingState.style.display = 'flex';
}
 
// Show result
function showResult(data) {
  hideAll();
  
  resultTitle.textContent = data.title;
  resultAuthor.textContent = `@${data.author}`;
  resultPlatform.textContent = currentMode === 'tiktok' ? 'TikTok' : 'Instagram';
  
  resultOptions.innerHTML = '';
  
  if (data.video_url) {
    const videoBtn = document.createElement('button');
    videoBtn.className = 'result-option';
    videoBtn.innerHTML = `
      <span class="option-label"><span class="option-icon">🎬</span>Vídeo HD</span>
      <span class="option-note">Sem marca d'água</span>
    `;
    videoBtn.onclick = () => downloadFile(data.video_url, data.title, 'video');
    resultOptions.appendChild(videoBtn);
  }
  
  if (data.audio_url) {
    const audioBtn = document.createElement('button');
    audioBtn.className = 'result-option';
    audioBtn.innerHTML = `
      <span class="option-label"><span class="option-icon">🎵</span>Áudio</span>
      <span class="option-note">MP3</span>
    `;
    audioBtn.onclick = () => downloadFile(data.audio_url, data.title, 'audio');
    resultOptions.appendChild(audioBtn);
  }
  
  resultPanel.style.display = 'block';
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
 
// Show error
function showError(message) {
  hideAll();
  errorMsg.textContent = message;
  errorState.style.display = 'flex';
}
 
// Hide all panels
function hideAll() {
  loadingState.style.display = 'none';
  resultPanel.style.display = 'none';
  errorState.style.display = 'none';
}
 
// Reset to initial state
function resetState() {
  hideAll();
  currentVideoData = null;
  inputCard.style.display = 'flex';
  document.querySelector('.features').style.display = 'flex';
}
 
// Download file
function downloadFile(url, title, type) {
  const ext = type === 'audio' ? '.mp3' : '.mp4';
  const cleanTitle = title.substring(0, 50).replace(/[^\w\s-]/g, '');
  
  window.open(
    `/api/download-file?url=${encodeURIComponent(url)}&type=${type}&title=${encodeURIComponent(cleanTitle)}`,
    '_blank'
  );
}
 
// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('tiktok-mode');
  tabTikTok.classList.add('active');
  resetState();
});
 
