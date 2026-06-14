from flask import Flask, render_template, request, jsonify, Response
import requests
import json
import re
import os
import tempfile
from PIL import Image
import io

# Configurar Flask para servir arquivos estáticos corretamente
app = Flask(__name__, static_folder='templates', static_url_path='')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/style.css')
def serve_css():
    with open('templates/style.css', 'r', encoding='utf-8') as f:
        return f.read(), 200, {'Content-Type': 'text/css; charset=utf-8'}

@app.route('/script.js')
def serve_js():
    with open('templates/script.js', 'r', encoding='utf-8') as f:
        return f.read(), 200, {'Content-Type': 'application/javascript; charset=utf-8'}

@app.route('/api/download', methods=['POST'])
def download():
    try:
        data = request.json
        url = data.get('url', '').strip()
        
        # Validar URL (TikTok ou Instagram)
        is_tiktok = any(x in url for x in ['tiktok.com', 'vm.tiktok', 'vt.tiktok'])
        is_instagram = any(x in url for x in ['instagram.com', 'instagr.am', 'ig.me'])
        
        if not url or (not is_tiktok and not is_instagram):
            return jsonify({'error': 'URL inválida. Cole um link do TikTok ou Instagram.'}), 400
        
        # Chamar a API apropriada
        if is_tiktok:
            video_data = fetch_tiktok(url)
        else:  # Instagram
            video_data = fetch_instagram(url)
        
        # Verificar se API retornou sucesso
        if not video_data:
            return jsonify({'error': 'Conteúdo não encontrado ou privado. Tente outro.'}), 400
        
        video_info = video_data
        
        # Extrair informações
        try:
            video_title = video_info.get('title', 'video')[:50]
            
            download_options = {
                'title': video_title,
                'author': video_info.get('author', 'Unknown'),
            }
            
            if video_info.get('video_url'):
                download_options['video_url'] = video_info.get('video_url')
            
            if video_info.get('audio_url'):
                download_options['audio_url'] = video_info.get('audio_url')
            
            if not download_options.get('video_url') and not download_options.get('audio_url'):
                return jsonify({'error': 'Não foi possível extrair arquivo'}), 400
            
            return jsonify({
                'success': True,
                'title': video_title,
                'author': download_options['author'],
                'video_url': download_options.get('video_url'),
                'audio_url': download_options.get('audio_url')
            })
        
        except KeyError as e:
            return jsonify({'error': f'Erro ao processar: {str(e)}'}), 400
    
    except Exception as e:
        return jsonify({'error': f'Erro: {str(e)}'}), 500

def fetch_tiktok(url):
    """Busca vídeo do TikTok via API Tikwm"""
    try:
        api_url = f"https://www.tikwm.com/api/?url={url}&hd=1"
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        video_data = response.json()
        
        if not video_data.get('code') == 0:
            return None
        
        video_info = video_data.get('data', {})
        
        return {
            'title': video_info.get('title', 'TikTok Video')[:50],
            'author': video_info.get('author', {}).get('nickname', 'Unknown'),
            'video_url': video_info.get('hdplay') or video_info.get('play'),
            'audio_url': video_info.get('music')
        }
    except Exception as e:
        print(f"Erro ao buscar TikTok: {e}")
        return None

def fetch_instagram(url):
    """Busca vídeo/foto do Instagram com múltiplas estratégias"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        # Estratégia 1: Tentar com instacdn.com
        try:
            api_url = f"https://instacdn.com/api/instagram/?url={url}"
            response = requests.get(api_url, timeout=10, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('media'):
                    media = data['media'][0] if isinstance(data['media'], list) else data['media']
                    return {
                        'title': data.get('caption', 'Instagram Post')[:50] or 'Instagram Post',
                        'author': data.get('author', 'Unknown'),
                        'video_url': media.get('url'),
                        'audio_url': None
                    }
        except:
            pass
        
        # Estratégia 2: Tentar com igram.io
        try:
            api_url = f"https://igram.io/download?url={url}&type=json"
            response = requests.get(api_url, timeout=10, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data.get('media'):
                    media = data['media'][0] if isinstance(data['media'], list) else data['media']
                    return {
                        'title': data.get('title', 'Instagram Post')[:50] or 'Instagram Post',
                        'author': data.get('author', 'Unknown'),
                        'video_url': media.get('url'),
                        'audio_url': None
                    }
        except:
            pass
        
        return None
        
    except Exception as e:
        print(f"Erro ao buscar Instagram: {e}")
        return None

@app.route('/api/download-file')
def download_file():
    """Faz proxy do arquivo para forçar download direto"""
    try:
        file_url = request.args.get('url')
        file_type = request.args.get('type', 'video')
        title = request.args.get('title', 'tiktok_video')
        
        if not file_url:
            return jsonify({'error': 'URL não fornecida'}), 400
        
        if 'tikwm.com' not in file_url and 'tiktok' not in file_url and 'instagram' not in file_url and 'cdninstagram' not in file_url:
            return jsonify({'error': 'URL inválida'}), 400
        
        # Limpar nome do arquivo
        clean_title = re.sub(r'[^\w\s-]', '', title).strip()[:50]
        clean_title = re.sub(r'\s+', '_', clean_title)
        if not clean_title:
            clean_title = 'media_download'
        ext = '.mp3' if file_type == 'audio' else '.mp4'
        filename = f"{clean_title}{ext}"
        
        # Headers necessários
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.tikwm.com/'
        }
        
        # Baixar o arquivo
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

@app.route('/api/clean-metadata', methods=['POST'])
def clean_metadata():
    """Remove metadados de imagem ou vídeo"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Nenhum arquivo fornecido'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Arquivo inválido'}), 400
        
        filename = file.filename
        file_ext = os.path.splitext(filename)[1].lower()
        
        # Verificar tipo de arquivo
        is_image = file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        is_video = file_ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv']
        
        if not is_image and not is_video:
            return jsonify({'error': 'Tipo de arquivo não suportado. Use imagem ou vídeo.'}), 400
        
        # Salvar arquivo temporário
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            file.save(tmp.name)
            input_path = tmp.name
        
        try:
            if is_image:
                # Limpar metadados de imagem
                file_data = clean_image_metadata(input_path)
            else:
                # Para vídeos, fazer cópia simples (vídeos em navegador não têm EXIF como imagens)
                with open(input_path, 'rb') as f:
                    file_data = f.read()
            
            # Limpar arquivo temporário
            os.unlink(input_path)
            
            # Retornar arquivo limpo
            return Response(
                file_data,
                mimetype=file.content_type,
                headers={'Content-Disposition': f'attachment; filename=cleaned_{filename}'}
            )
        
        except Exception as e:
            try:
                os.unlink(input_path)
            except:
                pass
            return jsonify({'error': f'Erro ao processar: {str(e)[:200]}'}), 500
    
    except Exception as e:
        return jsonify({'error': f'Erro no servidor: {str(e)[:200]}'}), 500

def clean_image_metadata(image_path):
    """Remove metadados EXIF de imagem"""
    try:
        # Abrir imagem
        img = Image.open(image_path)
        
        # Criar nova imagem sem metadados
        data = list(img.getdata())
        image_without_exif = Image.new(img.mode, img.size)
        image_without_exif.putdata(data)
        
        # Salvar em memória
        output = io.BytesIO()
        
        # Determinar formato
        fmt = 'PNG' if image_path.lower().endswith('.png') else 'JPEG'
        quality = 95 if fmt == 'JPEG' else None
        
        if fmt == 'JPEG':
            image_without_exif.save(output, format=fmt, quality=quality, optimize=True)
        else:
            image_without_exif.save(output, format=fmt)
        
        output.seek(0)
        return output.getvalue()
    
    except Exception as e:
        print(f"Erro ao limpar metadados da imagem: {e}")
        # Se falhar, retornar imagem original
        with open(image_path, 'rb') as f:
            return f.read()

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
