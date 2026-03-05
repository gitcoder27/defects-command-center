param(
  [ValidateSet("all", "install", "build", "test", "dev", "client-dev", "client-build", "client-test")]
  [string]$Mode = "all"
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[node20-runner] $Message" -ForegroundColor Cyan
}

function Invoke-Npm {
  param(
    [string[]]$NpmArgs
  )

  Write-Step "npm $($NpmArgs -join ' ')"
  & $script:NodeExe $script:NpmCli @NpmArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: npm $($NpmArgs -join ' ')"
  }
}

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

$node20Dir = Join-Path $env:USERPROFILE "tools\node20"
$script:NodeExe = Join-Path $node20Dir "node.exe"
$script:NpmCli = Join-Path $node20Dir "node_modules\npm\bin\npm-cli.js"

if (!(Test-Path $script:NodeExe) -or !(Test-Path $script:NpmCli)) {
  throw "Node 20 portable runtime not found. Expected: $node20Dir. Extract your Node 20 zip there first."
}

# Ensure child npm scripts also use this Node runtime instead of global Node.
$env:PATH = "$node20Dir;$env:PATH"
$env:npm_config_scripts_prepend_node_path = "true"

Write-Step "Using Node runtime: $script:NodeExe"
& $script:NodeExe -v
& $script:NodeExe $script:NpmCli -v

switch ($Mode) {
  "install" {
    Invoke-Npm -NpmArgs @("install", "--no-audit", "--no-fund")
  }
  "build" {
    Invoke-Npm -NpmArgs @("run", "build", "--workspace=server")
  }
  "test" {
    Invoke-Npm -NpmArgs @("run", "test", "--workspace=server", "--", "--reporter=dot")
  }
  "dev" {
    Invoke-Npm -NpmArgs @("run", "dev", "--workspace=server")
  }
  "client-dev" {
    Invoke-Npm -NpmArgs @("run", "dev", "--workspace=client")
  }
  "client-build" {
    Invoke-Npm -NpmArgs @("run", "build", "--workspace=client")
  }
  "client-test" {
    Invoke-Npm -NpmArgs @("run", "test", "--workspace=client")
  }
  "all" {
    Invoke-Npm -NpmArgs @("install", "--no-audit", "--no-fund")
    Invoke-Npm -NpmArgs @("run", "build", "--workspace=server")
    Invoke-Npm -NpmArgs @("run", "test", "--workspace=server", "--", "--reporter=dot")
    Write-Step "Done. To start server: .\run-node20.ps1 -Mode dev"
  }
}
