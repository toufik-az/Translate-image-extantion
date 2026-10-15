# Restore the pinned browser runtime. Restore bundled models with scripts/download-languages.py.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$taskLibPath = Join-Path $PSScriptRoot 'libs'
New-Item -ItemType Directory -Force -Path $taskLibPath | Out-Null
$files = @{
  'tesseract.min.js' = 'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js'
  'worker.min.js' = 'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/worker.min.js'
  'tesseract-core.wasm.js' = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@4.0.4/tesseract-core.wasm.js'
  'tesseract-core-simd.wasm.js' = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@4.0.4/tesseract-core-simd.wasm.js'
  'LICENSE-tesseract.txt' = 'https://www.apache.org/licenses/LICENSE-2.0.txt'
}
foreach ($file in $files.GetEnumerator()) {
  Write-Host "Downloading $($file.Key)"
  Invoke-WebRequest -UseBasicParsing -Uri $file.Value -OutFile (Join-Path $taskLibPath $file.Key)
}
Write-Host 'Runtime restored. Load manifest.json in Firefox, then choose a specific source language.'
