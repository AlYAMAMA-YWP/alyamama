$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $PSScriptRoot "web"

if (!(Test-Path $target)) {
    New-Item -ItemType Directory -Path $target -Force | Out-Null
}

$files = @(
    "index.html",
    "app.js",
    "styles.css",
    "manifest.json",
    "icon.svg",
    "reset.html"
)

foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $target $file) -Force
}

Write-Host "Web assets synced to iOS starter."
