"""Download only official skywind3000/ECDICT artifacts into the ignored cache."""
from pathlib import Path
import hashlib
import json
import shutil
import urllib.parse
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / '.cache'
RELEASE = 'https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict-sqlite-28.zip'


class RestrictedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        host = urllib.parse.urlsplit(newurl).hostname or ''
        if host not in {'github.com', 'raw.githubusercontent.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com'}:
            raise ValueError(f'Unexpected redirect host: {host}')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def download(url, name):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or not (
        parsed.hostname == 'github.com' and parsed.path.startswith('/skywind3000/ECDICT/')
        or parsed.hostname == 'raw.githubusercontent.com' and parsed.path.startswith('/skywind3000/ECDICT/')
    ):
        raise ValueError('Only official skywind3000/ECDICT URLs are allowed')
    if Path(name).name != name:
        raise ValueError('Cache filename must be a basename')
    path = CACHE / name
    if not path.exists():
        print(f'Download {url}', flush=True)
        opener = urllib.request.build_opener(RestrictedRedirect())
        with opener.open(urllib.request.Request(url, headers={'User-Agent': 'LingoVault-CET-data'}), timeout=120) as response, path.with_suffix(path.suffix + '.part').open('wb') as output:
            shutil.copyfileobj(response, output)
        path.with_suffix(path.suffix + '.part').replace(path)
    with path.open('rb') as source:
        checksum = hashlib.file_digest(source, 'sha256').hexdigest()
    return {'url': url, 'file': name, 'bytes': path.stat().st_size, 'sha256': checksum}


if __name__ == '__main__':
    CACHE.mkdir(exist_ok=True)
    metadata = [download(RELEASE, 'ecdict-sqlite-28.zip')]
    metadata.append(download('https://raw.githubusercontent.com/skywind3000/ECDICT/master/LICENSE', 'LICENSE'))
    metadata.append(download('https://raw.githubusercontent.com/skywind3000/ECDICT/master/README.md', 'README.md'))
    with zipfile.ZipFile(CACHE / 'ecdict-sqlite-28.zip') as archive:
        print('Archive:', archive.namelist(), flush=True)
        for item in archive.infolist():
            if item.filename.endswith(('.db', '.sqlite', '.sqlite3')):
                target = CACHE / Path(item.filename).name
                if not target.exists():
                    with archive.open(item) as source, target.open('wb') as output:
                        shutil.copyfileobj(source, output)
    (CACHE / 'download_manifest.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(metadata, ensure_ascii=False, indent=2), flush=True)
