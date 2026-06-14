// State
let currentVideoData = null;
let cleanedFileBlob = null;
let selectedFile = null;

// DOM
const videoUrlInput = document.getElementById('video-url');
const clearBtn = document.getElementById('clear-btn');
const downloadBtn = document.getElementById('download-btn');
const loadingState = document.getElementById('loading-state');
const resultPanel = document.getElementById('result-panel');
const errorState = document.getElementById('error-state');
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const cleanBtn = document.getElementById('clean-btn');
const fileInfo = document.getElementById('file-info');
const cleanLoading = document.getElementById('clean-loading');
const cleanResult = document.getElementById('clean-result');
const cleanError = document.getElementById('clean-error');

// Initialize
initializeParticles();

// Tab switching
function switchTab(tab) {
  const panels = document.querySelectorAll('.tab-panel');
  const buttons = document.querySelectorAll('.tab-btn');
  
  panels.forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  buttons.forEach(b => b.classList.remove('active'));
  
  document.getElementById(`panel-${tab}`).classList.add('active');
  document.getElementById(`panel-${tab}`).style.display = 'block';
  document.getElementById(`tab-${tab}`).classList.add('active');
  
  if (tab === 'download') {
    resetDownload();
  } else {
    resetClean();
  }
}

// Event listeners
videoUrlInput.addEventListener('input', handleInput);
videoUrlInput.addEventListener('paste', handlePaste);
videoUrlInput.addEventListener('keydown', handleKeyDown);
clearBtn.addEventListener('click', clearInput);

// Particles
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

// ===== DOWNLOAD MODE =====

function handleInput(e) {
  clearBtn.style.display = e.target.value.trim().length > 0 ? 'block' : 'none';
}

function handlePaste() {
  setTimeout(() => {
    const url = videoUrlInput.value.trim();
    if (isValidUrl(url)) {
      handleDownload();
    }
  }, 10);
}

function handleKeyDown(e) {
  if (e.key === 'Enter') {
    handleDownload();
  }
}

function clearInput() {
  videoUrlInput.value = '';
  clearBtn.style.display = 'none';
  videoUrlInput.focus();
  resetDownload();
}

function isValidUrl(url) {
  return url.includes('tiktok.com') || url.includes('vm.tiktok') || url.includes('vt.tiktok');
}

async function handleDownload() {
  const url = videoUrlInput.value.trim();
  
  if (!url || !isValidUrl(url)) {
    showDownloadError('Cole um link válido do TikTok');
    return;
  }
  
  showDownloadLoading();
  
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
    
    showDownloadResult(data);
  } catch (error) {
    showDownloadError(error.message);
  }
}

function showDownloadLoading() {
  loadingState.style.display = 'flex';
  resultPanel.style.display = 'none';
  errorState.style.display = 'none';
}

function showDownloadResult(data) {
  document.getElementById('result-title').textContent = data.title;
  document.getElementById('result-author').textContent = `@${data.author}`;
  
  const resultOptions = document.getElementById('result-options');
  resultOptions.innerHTML = '';
  
  if (data.video_url) {
    const btn = document.createElement('button');
    btn.className = 'result-option';
    btn.innerHTML = `<span class="option-label"><span class="option-icon">🎬</span>Vídeo HD</span><span class="option-note">Sem marca d'água</span>`;
    btn.onclick = () => downloadFile(data.video_url, data.title, 'video');
    resultOptions.appendChild(btn);
  }
  
  if (data.audio_url) {
    const btn = document.createElement('button');
    btn.className = 'result-option';
    btn.innerHTML = `<span class="option-label"><span class="option-icon">🎵</span>Áudio</span><span class="option-note">MP3</span>`;
    btn.onclick = () => downloadFile(data.audio_url, data.title, 'audio');
    resultOptions.appendChild(btn);
  }
  
  loadingState.style.display = 'none';
  resultPanel.style.display = 'block';
  errorState.style.display = 'none';
}

function showDownloadError(message) {
  document.getElementById('error-msg').textContent = message;
  loadingState.style.display = 'none';
  resultPanel.style.display = 'none';
  errorState.style.display = 'flex';
}

function resetDownload() {
  videoUrlInput.value = '';
  clearBtn.style.display = 'none';
  loadingState.style.display = 'none';
  resultPanel.style.display = 'none';
  errorState.style.display = 'none';
  document.getElementById('features-strip').style.display = 'flex';
}

function downloadFile(url, title, type) {
  const ext = type === 'audio' ? '.mp3' : '.mp4';
  const cleanTitle = title.substring(0, 50).replace(/[^\w\s-]/g, '');
  
  window.open(
    `/api/download-file?url=${encodeURIComponent(url)}&type=${type}&title=${encodeURIComponent(cleanTitle)}`,
    '_blank'
  );
}

// ===== CLEAN METADATA MODE =====

function handleDragOver(e) {
  e.preventDefault();
  uploadArea.style.borderColor = '#25f4ee';
  uploadArea.style.background = 'rgba(37, 244, 238, 0.08)';
}

function handleDragLeave(e) {
  uploadArea.style.borderColor = '';
  uploadArea.style.background = '';
}

function handleDrop(e) {
  e.preventDefault();
  uploadArea.style.borderColor = '';
  uploadArea.style.background = '';
  
  if (e.dataTransfer.files.length > 0) {
    selectedFile = e.dataTransfer.files[0];
    updateFileInfo();
  }
}

function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    selectedFile = e.target.files[0];
    updateFileInfo();
  }
}

function updateFileInfo() {
  if (selectedFile) {
    const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
    fileInfo.textContent = `📄 ${selectedFile.name} (${sizeMB} MB)`;
    fileInfo.style.display = 'block';
    cleanBtn.style.display = 'flex';
  } else {
    fileInfo.style.display = 'none';
    cleanBtn.style.display = 'none';
  }
}

async function handleClean() {
  if (!selectedFile) {
    showCleanError('Selecione um arquivo');
    return;
  }
  
  cleanLoading.style.display = 'flex';
  cleanResult.style.display = 'none';
  cleanError.style.display = 'none';
  
  try {
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    const response = await fetch('/api/clean-metadata', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Erro ao limpar');
    }
    
    cleanedFileBlob = await response.blob();
    cleanLoading.style.display = 'none';
    cleanResult.style.display = 'block';
  } catch (error) {
    showCleanError(error.message);
  }
}

function showCleanError(message) {
  document.getElementById('clean-error-msg').textContent = message;
  cleanLoading.style.display = 'none';
  cleanResult.style.display = 'none';
  cleanError.style.display = 'flex';
}

function downloadCleanedFile() {
  if (!cleanedFileBlob) return;
  
  const ext = selectedFile.name.split('.').pop();
  const name = selectedFile.name.replace(/\.[^/.]+$/, '') + '_limpo.' + ext;
  
  const url = window.URL.createObjectURL(cleanedFileBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function resetClean() {
  selectedFile = null;
  cleanedFileBlob = null;
  fileInput.value = '';
  fileInfo.style.display = 'none';
  cleanBtn.style.display = 'none';
  cleanLoading.style.display = 'none';
  cleanResult.style.display = 'none';
  cleanError.style.display = 'none';
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  resetDownload();
});
