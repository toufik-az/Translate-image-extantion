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
    for folder in ['shared', 'background', 'content', 'popup', 'options', 'icons', 'libs']:
        for file in (root / folder).rglob('*'):
            if file.is_file():
                archive.write(file, file.relative_to(root).as_posix())
print(destination)
