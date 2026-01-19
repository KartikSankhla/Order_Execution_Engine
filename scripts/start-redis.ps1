param(
  [string]$ComposeFile = "docker-compose.yml",
  [string]$Service = "redis"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting $Service via docker compose..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "docker not found. Install Docker Desktop and ensure it's running."
}

docker compose -f $ComposeFile up -d $Service
if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to start $Service. Check Docker Desktop and your compose file."
}

Write-Host "$Service started. It should be available on 127.0.0.1:6379"

