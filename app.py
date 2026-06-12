from flask import Flask, render_template, request, jsonify, redirect
import requests
import json

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/download', methods=['POST'])
def download():
    try:
        data = request.json
        url = data.get('url', '').strip()
        
        # Validar URL
        if not url or not any(x in url for x in ['tiktok.com', 'vm.tiktok', 'vt.tiktok']):
            return jsonify({'error': 'URL inválida'}), 400
        
        # Chamar API Tikwm (hd=1 para melhor qualidade)
        api_url = f"https://www.tikwm.com/api/?url={url}&hd=1"
        
        try:
            response = requests.get(api_url, timeout=10)
            response.raise_for_status()
            video_data = response.json()
        except requests.exceptions.Timeout:
            return jsonify({'error': 'Timeout - servidor lento, tente novamente'}), 408
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Erro ao conectar: {str(e)}'}), 500
        
        # Verificar se API retornou sucesso
        if not video_data.get('code') == 0:
            return jsonify({'error': 'Vídeo não encontrado ou privado. Tente outro.'}), 400
        
        video_info = video_data.get('data', {})
        
        # Extrair informações do vídeo
        try:
            video_title = video_info.get('title', 'video')[:50]  # Limitar tamanho do título
            
            # Preparar opções de download
            download_options = {
                'title': video_title,
                'author': video_info.get('author', {}).get('nickname', 'Unknown'),
            }
            
            # Video link (sem marca d'água - tenta HD primeiro)
            video_link = video_info.get('hdplay') or video_info.get('play')
            if video_link:
                download_options['video_url'] = video_link
            
            # Audio (MP3)
            if video_info.get('music'):
                download_options['audio_url'] = video_info.get('music')
            
            # Verificar se tem pelo menos um arquivo
            if not download_options.get('video_url') and not download_options.get('audio_url'):
                return jsonify({'error': 'Não foi possível extrair arquivo do vídeo'}), 400
            
            return jsonify({
                'success': True,
                'title': video_title,
                'author': download_options['author'],
                'video_url': download_options.get('video_url'),
                'audio_url': download_options.get('audio_url')
            })
        
        except KeyError as e:
            return jsonify({'error': f'Erro ao processar vídeo: {str(e)}'}), 400
    
    except Exception as e:
        return jsonify({'error': f'Erro: {str(e)}'}), 500

@app.route('/api/download-file')
def download_file():
    """Faz proxy do arquivo para forçar download direto (sem abrir nova aba)"""
    try:
        from flask import Response
        
        file_url = request.args.get('url')
        file_type = request.args.get('type', 'video')
        title = request.args.get('title', 'tiktok_video')
        
        if not file_url:
            return jsonify({'error': 'URL não fornecida'}), 400
        
        if 'tikwm.com' not in file_url and 'tiktok' not in file_url:
            return jsonify({'error': 'URL inválida'}), 400
        
        # Limpar nome do arquivo (remove caracteres especiais)
        import re
        clean_title = re.sub(r'[^\w\s-]', '', title).strip()[:50]
        clean_title = re.sub(r'\s+', '_', clean_title)  # espaços -> underline
        if not clean_title:
            clean_title = 'tiktok_video'
        ext = '.mp3' if file_type == 'audio' else '.mp4'
        filename = f"{clean_title}{ext}"
        
        # Headers necessários (CDN bloqueia requisições sem User-Agent)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.tikwm.com/'
        }
        
        # Baixar o arquivo do CDN e repassar pro usuário
        cdn_response = requests.get(file_url, stream=True, timeout=30, headers=headers)
        cdn_response.raise_for_status()
        
        return Response(
            cdn_response.iter_content(chunk_size=8192),
            content_type=cdn_response.headers.get('Content-Type', 'video/mp4'),
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
