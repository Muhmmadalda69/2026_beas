# Download bundled fonts for offline use.
# Run once from the mobile/ directory:
#   powershell -ExecutionPolicy Bypass -File scripts/download_fonts.ps1

$dest = "$PSScriptRoot\..\assets\fonts"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$fonts = @(
    # Inter (UI body font)
    @{ url = "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.ttf"; file = "Inter-Regular.ttf" }
    @{ url = "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Medium.ttf"; file = "Inter-Medium.ttf" }
    @{ url = "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-SemiBold.ttf"; file = "Inter-SemiBold.ttf" }
    @{ url = "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.ttf"; file = "Inter-Bold.ttf" }
    # Playfair Display (display/heading font)
    @{ url = "https://github.com/clauseggers/Playfair/raw/master/fonts/ttf/PlayfairDisplay-Regular.ttf"; file = "PlayfairDisplay-Regular.ttf" }
    @{ url = "https://github.com/clauseggers/Playfair/raw/master/fonts/ttf/PlayfairDisplay-Bold.ttf"; file = "PlayfairDisplay-Bold.ttf" }
    # Noto Sans Sundanese (Aksara Sunda glyphs — critical)
    @{ url = "https://github.com/notofonts/sundanese/raw/main/fonts/ttf/NotoSansSundanese-Regular.ttf"; file = "NotoSansSundanese-Regular.ttf" }
)

foreach ($f in $fonts) {
    $path = Join-Path $dest $f.file
    if (Test-Path $path) {
        Write-Host "  skip  $($f.file) (already exists)"
        continue
    }
    Write-Host "  fetch $($f.file)..."
    try {
        Invoke-WebRequest -Uri $f.url -OutFile $path -UseBasicParsing -ErrorAction Stop
        Write-Host "    OK"
    } catch {
        Write-Warning "  FAILED $($f.file): $_"
    }
}

Write-Host ""
Write-Host "Done. Run 'flutter pub get' then 'flutter run' to test."
