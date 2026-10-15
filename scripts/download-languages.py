"""Bundle the three primary OCR languages from the pinned Tesseract.js data release."""
import gzip
import hashlib
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

DEST = Path(__file__).resolve().parents[1] / 'libs' / 'traineddata'
DEST.mkdir(exist_ok=True)

def download(language):
    target = DEST / f'{language}.traineddata.gz'
    url = f'https://tessdata.projectnaptha.com/4.0.0/{target.name}'
    for attempt in range(3):
        try:
            data = target.read_bytes() if attempt == 0 and target.exists() else urllib.request.urlopen(url, timeout=60).read()
            assert len(gzip.decompress(data)) > 100000, 'Incomplete language data'
            target.write_bytes(data)
            print(f'{language}: {len(data)} bytes, sha256 {hashlib.sha256(data).hexdigest()}', flush=True)
            return
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2)

with ThreadPoolExecutor(max_workers=3) as pool:
    list(pool.map(download, ['eng', 'fra', 'ara']))
