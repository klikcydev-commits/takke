<#
.SYNOPSIS
  When system RAM use is above a threshold, terminates all Node.js processes (taskkill /F /IM node.exe).

.PARAMETER ThresholdPercent
  Physical RAM used % at or above which Node is killed. Default: 90

.PARAMETER IntervalSeconds
  How often to re-check in watch mode. Default: 15

.PARAMETER Once
  Check once and exit (no loop). Useful for Task Scheduler.

.EXAMPLE
  .\scripts\kill-node-on-high-ram.ps1
  Watch forever; kill node when RAM >= 90%.

.EXAMPLE
  .\scripts\kill-node-on-high-ram.ps1 -ThresholdPercent 85 -Once
  One shot: if RAM >= 85%, kill node.
#>
param(
  [ValidateRange(1, 99)]
  [int] $ThresholdPercent = 90,

  [ValidateRange(1, 3600)]
  [int] $IntervalSeconds = 15,

  [switch] $Once
)

function Get-RamUsedPercent {
  $os = Get-CimInstance -ClassName Win32_OperatingSystem
  $totalKb = [double] $os.TotalVisibleMemorySize
  $freeKb = [double] $os.FreePhysicalMemory
  if ($totalKb -le 0) { return 0 }
  return [math]::Round(100.0 * ($totalKb - $freeKb) / $totalKb, 1)
}

function Stop-AllNode {
  $before = @(Get-Process -Name node -ErrorAction SilentlyContinue).Count
  if ($before -eq 0) {
    Write-Host "$(Get-Date -Format o) No node.exe processes running."
    return
  }
  cmd /c "taskkill /F /IM node.exe" 2>&1 | Out-Null
  Write-Host "$(Get-Date -Format o) RAM high — terminated node.exe (had $before process(es))."
}

do {
  $pct = Get-RamUsedPercent
  Write-Host "$(Get-Date -Format o) RAM used: ${pct}% (threshold: ${ThresholdPercent}%)"

  if ($pct -ge $ThresholdPercent) {
    Stop-AllNode
  }

  if ($Once) { break }
  Start-Sleep -Seconds $IntervalSeconds
} while ($true)
