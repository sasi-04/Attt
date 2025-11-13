# PowerShell script to download and install Visual C++ Build Tools
# This requires administrator privileges

Write-Host "Downloading Visual C++ Build Tools installer..." -ForegroundColor Yellow

$url = "https://aka.ms/vs/17/release/vs_buildtools.exe"
$output = "$env:TEMP\vs_buildtools.exe"

try {
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    Write-Host "Download complete. Starting installation..." -ForegroundColor Green
    Write-Host "This will open the Visual Studio Installer. Please:" -ForegroundColor Yellow
    Write-Host "1. Select 'Desktop development with C++' workload" -ForegroundColor Yellow
    Write-Host "2. Click Install" -ForegroundColor Yellow
    Write-Host "3. Wait for installation to complete (this may take 10-20 minutes)" -ForegroundColor Yellow
    Write-Host ""
    
    Start-Process $output -Wait
    Write-Host "Installation complete! Now run: py -3.11 -m pip install insightface" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Please download manually from: https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Yellow
}











