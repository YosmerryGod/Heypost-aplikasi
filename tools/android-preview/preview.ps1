# [ADDED] Local Android Emulator preview launcher for HeyPost.

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$SdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { $null }

function Resolve-AndroidTool([string]$Name, [string]$RelativePath) {
    $Command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($Command) { return $Command.Source }
    if ($SdkRoot) {
        $Candidate = Join-Path $SdkRoot $RelativePath
        if (Test-Path $Candidate) { return $Candidate }
    }
    return $null
}

$Adb = Resolve-AndroidTool "adb" "platform-tools/adb.exe"
if (-not $Adb) {
    throw "Android SDK Platform-Tools tidak ditemukan. Atur ANDROID_HOME/ANDROID_SDK_ROOT dan PATH."
}

$Emulator = Resolve-AndroidTool "emulator" "emulator/emulator.exe"
$DeviceOutput = & $Adb devices
$HasOnlineDevice = @($DeviceOutput | Where-Object { $_ -match "^\S+\s+device$" }).Count -gt 0

if (-not $HasOnlineDevice) {
    if (-not $Emulator) {
        throw "Emulator belum berjalan. Buka Android Studio > Device Manager, lalu jalankan satu Android Virtual Device."
    }
    $AvdName = $env:ANDROID_AVD_NAME
    if (-not $AvdName) {
        $AvailableAvds = @(& $Emulator -list-avds)
        if ($AvailableAvds.Count -eq 1) {
            $AvdName = $AvailableAvds[0]
        } elseif ($AvailableAvds.Count -gt 1) {
            throw "Ada beberapa AVD. Jalankan emulator dari Android Studio atau set ANDROID_AVD_NAME. Tersedia: $($AvailableAvds -join ', ')"
        } else {
            throw "Belum ada Android Virtual Device. Buat AVD melalui Android Studio > Device Manager."
        }
    }
    Write-Host "Menjalankan Android Emulator: $AvdName"
    Start-Process -FilePath $Emulator -ArgumentList @("-avd", $AvdName) -WindowStyle Hidden
    & $Adb wait-for-device
    $BootCompleted = $false
    for ($Attempt = 0; $Attempt -lt 120; $Attempt++) {
        $BootState = (& $Adb shell getprop sys.boot_completed 2>$null | Out-String).Trim()
        if ($BootState -eq "1") { $BootCompleted = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $BootCompleted) { throw "Android Emulator belum selesai boot dalam 4 menit." }
}

Set-Location $ProjectRoot
Write-Host "Menjalankan HeyPost pada Android Emulator..."
& npx --yes @expo/agent-cli@latest run:android
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }