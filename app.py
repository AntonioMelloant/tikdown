from flask import Flask, render_template, request, jsonify, send_file
import subprocess
import os
import json
from pathlib import Path

app = Flask(__name__)

# Criar pasta de downloads
DOWNLOADS_FOLDER = 'downloads'
os.makedirs(DOWNLOADS_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = DOWNLOADS_FOLDER

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/download', methods=['POST'])
def download():
    try:
        data = request.json
        url = data.get('url', '').strip()
        quality = data.get('quality', '4K')
        
        # Validar URL
        if not url or not any(x in url for x in ['tiktok.com', 'vm.tiktok', 'vt.tiktok']):
            return jsonify({'error': 'URL inválida'}), 400
        
        # Limpar pasta (opcional, remove vídeos antigos)
        clean_downloads()
        
        # Definir qualidade
        quality_map = {
            '4K': 'bestvideo+bestaudio/best',
            '1080p': 'best[height<=1080]',
            '720p': 'best[height<=720]',
            'MP3': 'bestaudio/best'
        }
        
        format_choice = quality_map.get(quality, 'best')
        
        # Output
        output_ext = '.mp3' if quality == 'MP3' else '.mp4'
        output_path = os.path.join(
            DOWNLOADS_FOLDER, 
            '%(title)s' + output_ext
        )
        
        # Comando yt-dlp
        cmd = [
            'yt-dlp',
            '-f', format_choice,
            '-o', output_path,
            '--no-warnings',
            '-q',
            url
        ]
        
        if quality == 'MP3':
            cmd.extend(['-x', '--audio-format', 'mp3'])
        
        # Executar download
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode != 0:
            return jsonify({'error': 'Erro ao baixar. Tente outro vídeo.'}), 400
        
        # Encontrar arquivo baixado
        files = os.listdir(DOWNLOADS_FOLDER)
        if not files:
            return jsonify({'error': 'Erro ao salvar arquivo'}), 400
        
        latest_file = max(
            [os.path.join(DOWNLOADS_FOLDER, f) for f in files],
            key=os.path.getctime
        )
        
        filename = os.path.basename(latest_file)
        file_size = os.path.getsize(latest_file) / (1024 * 1024)  # MB
        
        return jsonify({
            'success': True,
            'filename': filename,
            'size': f'{file_size:.1f}MB',
            'quality': quality
        })
    
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Timeout - vídeo muito grande'}), 408
    except Exception as e:
        return jsonify({'error': f'Erro: {str(e)}'}), 500

@app.route('/api/get-file/<filename>')
def get_file(filename):
    try:
        filepath = os.path.join(DOWNLOADS_FOLDER, filename)
        
        # Segurança: checar se arquivo está na pasta certa
        if not os.path.abspath(filepath).startswith(os.path.abspath(DOWNLOADS_FOLDER)):
            return jsonify({'error': 'Acesso negado'}), 403
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'Arquivo não encontrado'}), 404
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def clean_downloads():
    """Remove arquivos com mais de 1 hora"""
    import time
    now = time.time()
    for f in os.listdir(DOWNLOADS_FOLDER):
        path = os.path.join(DOWNLOADS_FOLDER, f)
        if os.path.isfile(path) and now - os.path.getctime(path) > 3600:
            try:
                os.remove(path)
            except:
                pass
