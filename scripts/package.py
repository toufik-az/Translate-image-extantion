"""Build an XPI containing every runtime dependency, with files at the archive root."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
destination = root / 'dist' / f'manga-translator-{manifest["version"]}.xpi'
destination.parent.mkdir(exist_ok=True)
with ZipFile(destination, 'w', ZIP_DEFLATED) as archive:
    archive.write(root / 'manifest.json', 'manifest.json')
    archive.write(root / 'PRIVACY.md', 'PRIVACY.md')
    for folder in ['shared', 'background', 'content', 'popup', 'options', 'icons', 'libs']:
        for file in (root / folder).rglob('*'):
            if file.is_file():
                # Keep development helpers and the unused alternate OCR core
                # out of the installable extension, even if they exist locally.
                if folder == 'icons' and file.suffix != '.png':
                    continue
                if folder == 'libs' and file.name == 'tesseract-core.wasm.js':
                    continue
                archive.write(file, file.relative_to(root).as_posix())
print(destination)
