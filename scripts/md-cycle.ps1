param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("cbpay", "cbpay-admin", "qbank")]
    [string]$Site,
    [Parameter(Mandatory = $true)]
    [string]$Slug,
    [string]$Branch = "",
    [string]$Clone = "",
    [string[]]$ClaimPaths = @(),
    [string]$QxClaim = "C:\Users\satur\QBANK\Qxchange\scripts\qx-claim.ps1"
)

$ErrorActionPreference = "Stop"

$clones = @{
    "cbpay"       = "C:\Users\satur\QBANK\mintlify-docs-cbpay"
    "cbpay-admin" = "C:\Users\satur\QBANK\mintlify-docs-cbpay-admin"
    "qbank"       = "C:\Users\satur\QBANK\mintlify-docs-qbank2"
}

if (-not $Clone) {
    $Clone = $clones[$Site]
}

# git worktree add — ciclo aislado fuera del árbol principal
git -C $Clone pull --ff-only
if (-not $?) { exit 1 }

$dirty = git -C $Clone status --porcelain
if ($dirty) {
    Write-Error "clone is dirty; stop and clean main first (never commit blindly)"
    exit 1
}

if (-not $Branch) {
    $Branch = "docs/$Slug"
}

$wt = Join-Path $env:LOCALAPPDATA "Temp\md-$Site-$Slug"

git -C $Clone worktree add $wt -b $Branch main
if (-not $?) { exit 1 }

# --worktree escribe config.worktree (Git sí lo lee). --file …/config
# sin extensions.worktreeConfig deja hooksPath muerto.
git -C $wt config extensions.worktreeConfig true
if (-not $?) { exit 1 }
git -C $wt config --worktree core.hooksPath .githooks
if (-not $?) { exit 1 }

# qx-claim espejo (canonico en Qxchange; claims en el .git del clon docs).
if ($ClaimPaths.Count -gt 0) {
    & $QxClaim -Mode claim -Clone $Clone -Owner "$Site-$Slug" -Worktree $wt -Branch $Branch -Paths $ClaimPaths
    if ($LASTEXITCODE -ne 0) {
        try { git -C $Clone worktree remove --force -- "$wt" 2>&1 | Out-Null } catch { }
        try { git -C $Clone branch -D -- "$Branch" 2>&1 | Out-Null } catch { }
        Write-Error "qx-claim BLOCKED: otro ciclo toca esos paths (worktree revertido)"
        exit 1
    }
    Write-Host "qx-claim: CLAIMED $($ClaimPaths.Count) paths"
}

Write-Host "File → Open Folder → $wt"
