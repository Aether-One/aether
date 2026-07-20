# Aether CLI Installer for Windows
# Usage: irm https://raw.githubusercontent.com/aether-one/aether/main/scripts/install.ps1 | iex
$ErrorActionPreference = "Stop"

$Repo = "aether-one/aether"
$BinaryName = "aether.exe"

# Install directory
$InstallDir = "$env:LOCALAPPDATA\Aether\bin"

# Detect architecture
function Get-Arch {
    if ([Environment]::Is64BitOperatingSystem) {
        # Check if running on ARM64
        $cpuArch = $env:PROCESSOR_ARCHITECTURE
        if ($cpuArch -eq "ARM64") {
            return "arm64"
        }
        return "x64"
    }
    throw "Unsupported architecture: 32-bit systems are not supported."
}

# Get latest version
function Get-LatestVersion {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ "User-Agent" = "aether-installer" }
    return $release.tag_name
}

# Main
function Install-Aether {
    Write-Host ""
    Write-Host "  Aether CLI Installer" -ForegroundColor Cyan
    Write-Host ""

    $Arch = Get-Arch
    Write-Host "  > Detected platform: win-$Arch" -ForegroundColor Gray

    # Get version
    $Version = Get-LatestVersion
    if (-not $Version) {
        throw "Could not determine latest version. Check your internet connection."
    }
    Write-Host "  > Latest version: $Version" -ForegroundColor Gray

    # Build download URL
    $AssetName = "aether-win-${Arch}.exe"
    $DownloadUrl = "https://github.com/$Repo/releases/download/$Version/$AssetName"
    Write-Host "  > Downloading $AssetName..." -ForegroundColor Gray

    # Ensure install directory exists
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    $OutputPath = Join-Path $InstallDir $BinaryName

    # Download
    try {
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $OutputPath -UseBasicParsing
    }
    catch {
        throw ("Download failed. Asset may not exist for your platform: win-$Arch. " + $_.Exception.Message)
    }

    # Verify it runs
    try {
        $null = & $OutputPath --version 2>&1
    }
    catch {
        Remove-Item $OutputPath -Force -ErrorAction SilentlyContinue
        throw "Downloaded binary failed to execute."
    }

    # Add to PATH if not already there
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($UserPath -notlike "*$InstallDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$InstallDir;$UserPath", "User")
        Write-Host "  > Added $InstallDir to PATH" -ForegroundColor Gray
    }

    # Also update current session PATH
    if ($env:Path -notlike "*$InstallDir*") {
        $env:Path = "$InstallDir;$env:Path"
    }

    # Get installed version
    $InstalledVersion = & $OutputPath --version 2>&1

    Write-Host ""
    Write-Host "  Aether CLI installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Version:  $InstalledVersion" -ForegroundColor White
    Write-Host "  Location: $OutputPath" -ForegroundColor White
    Write-Host ""
    Write-Host "  Run " -NoNewline
    Write-Host "aether" -ForegroundColor Cyan -NoNewline
    Write-Host " to get started."
    Write-Host ""
    Write-Host "  Note: Restart your terminal if 'aether' is not found." -ForegroundColor Yellow
    Write-Host ""
}

Install-Aether
