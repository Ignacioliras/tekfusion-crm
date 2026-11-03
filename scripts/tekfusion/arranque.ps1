# Arranque del CRM TekFusion en Windows.
# Uso: doble clic en ARRANQUE.cmd (raíz del repo) o:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\tekfusion\arranque.ps1
# Es idempotente: se puede correr varias veces. Pregunta antes de instalar.

$ErrorActionPreference = "Continue"
$Repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Repo

function Titulo($t) { Write-Host ""; Write-Host "=== $t ===" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  [ok] $t" -ForegroundColor Green }
function Falta($t) { Write-Host "  [falta] $t" -ForegroundColor Yellow }
function Mal($t) { Write-Host "  [error] $t" -ForegroundColor Red }
function Existe($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Preguntar($t) { $r = Read-Host "  $t (s/n)"; return ($r -eq "s" -or $r -eq "S") }
function RefrescarPath {
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}
function InstalarWinget($id, $nombre) {
  if (-not (Existe "winget")) { Mal "winget no está disponible. Instala $nombre a mano."; return }
  if (Preguntar "¿Instalar $nombre con winget?") {
    winget install --id $id -e --accept-source-agreements --accept-package-agreements
    RefrescarPath
  }
}

Write-Host "CRM TekFusion · arranque en $Repo" -ForegroundColor Cyan

# ---------------------------------------------------------------
Titulo "1. Programas"
if (Existe "node") {
  $v = (node -v).TrimStart("v"); $mayor = [int]($v.Split(".")[0])
  if ($mayor -ge 24) { Ok "Node $v" } else { Falta "Node $v (se necesita 24, ver .nvmrc)"; InstalarWinget "OpenJS.NodeJS.LTS" "Node.js LTS" }
} else { Falta "Node.js"; InstalarWinget "OpenJS.NodeJS.LTS" "Node.js LTS" }

if (Existe "git") { Ok (git --version) } else { Falta "Git"; InstalarWinget "Git.Git" "Git for Windows" }
if (Existe "gh") { Ok "GitHub CLI" } else { Falta "GitHub CLI (opcional, sirve para crear el repo)"; InstalarWinget "GitHub.cli" "GitHub CLI" }
if (Existe "gitleaks") { Ok "gitleaks" } else { Falta "gitleaks (escaneo de secretos en cada commit)"; InstalarWinget "Gitleaks.Gitleaks" "gitleaks" }

$dockerOk = $false
if (Existe "docker") {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) { Ok "Docker Desktop corriendo"; $dockerOk = $true }
  else { Falta "Docker está instalado pero no corriendo: abre Docker Desktop y vuelve a correr este script." }
} else {
  Falta "Docker Desktop (lo necesita Supabase local)"
  InstalarWinget "Docker.DockerDesktop" "Docker Desktop"
  Write-Host "  Docker Desktop pide reiniciar y activar WSL2. Reinicia, ábrelo y vuelve a correr este script." -ForegroundColor Yellow
}

if (Existe "claude") { Ok "Claude Code" } else { Falta "Claude Code: npm install -g @anthropic-ai/claude-code  (y luego 'claude' para iniciar sesión)" }

if (-not (Existe "node")) { Mal "Sin Node no se puede seguir. Cierra esta ventana, abre una nueva y corre el script otra vez."; exit 1 }

# ---------------------------------------------------------------
Titulo "2. Repositorio"
if (Existe "git") {
  git config --global --get-all safe.directory 2>$null | Out-Null
  $dir = ($Repo.Path -replace "\\", "/")
  $ya = git config --global --get-all safe.directory 2>$null | Where-Object { $_ -eq $dir }
  if (-not $ya) { git config --global --add safe.directory $dir; Ok "safe.directory agregado" } else { Ok "safe.directory" }
  git config core.autocrlf false
  git config core.filemode false
  if (-not (git config user.email)) {
    Falta "Git no tiene tu nombre y correo para los commits."
    $n = Read-Host "  Nombre para los commits (ej: Ignacio Lira)"
    $e = Read-Host "  Correo para los commits"
    if ($n) { git config --global user.name $n }
    if ($e) { git config --global user.email $e }
  }
  $estado = git status --porcelain
  if ($LASTEXITCODE -eq 0) { Ok ("git OK, rama " + (git branch --show-current) + ", " + (($estado | Measure-Object).Count) + " archivos con cambios") }
}

# ---------------------------------------------------------------
Titulo "3. Dependencias del proyecto"
if (Test-Path "node_modules") { Ok "node_modules existe (para reinstalar: borra la carpeta y corre de nuevo)" }
else {
  Write-Host "  npm install (puede tardar 2-5 minutos)..."
  npm install
  if ($LASTEXITCODE -eq 0) { Ok "npm install" } else { Mal "npm install falló. Copia el error y pégalo en Claude." }
}
if (-not (Existe "typescript-language-server")) {
  npm install -g typescript-language-server typescript
  if ($LASTEXITCODE -eq 0) { Ok "typescript-language-server" }
} else { Ok "typescript-language-server" }

# ---------------------------------------------------------------
Titulo "4. Herramientas de Claude Code"
if (Existe "claude") {
  if (Preguntar "¿Instalar skills y MCP del proyecto (agent-skills, Supabase, ECC, LSP, Context7)?") {
    claude plugin marketplace add addyosmani/agent-skills
    claude plugin install agent-skills@addy-agent-skills
    claude plugin marketplace add supabase/agent-skills
    claude plugin install supabase@supabase-agent-skills
    claude plugin marketplace add https://github.com/affaan-m/ECC
    claude plugin install ecc@ecc
    claude plugin marketplace update claude-plugins-official
    claude plugin install typescript-lsp@claude-plugins-official
    claude mcp add context7 -- npx -y @upstash/context7-mcp
    Ok "Listo. En Claude Code: /plugin -> en ECC deja solo database-reviewer y security-reviewer."
    Write-Host "  Supabase MCP, n8n-mcp y GitHub MCP se agregan cuando exista staging (docs/14)." -ForegroundColor DarkGray
  }
} else { Falta "Claude Code no está instalado; salto este paso." }

# ---------------------------------------------------------------
Titulo "5. Supabase local"
if ($dockerOk) {
  if (Preguntar "¿Levantar Supabase local ahora? (primera vez descarga ~1 GB)") {
    npx supabase start
    if ($LASTEXITCODE -eq 0) {
      Ok "Supabase local arriba. Studio: http://127.0.0.1:54323"
      Write-Host "  .env.development ya apunta a este Supabase local; no hay que copiar claves." -ForegroundColor DarkGray
    } else { Mal "supabase start falló. ¿Docker Desktop está abierto y con WSL2?" }
  }
} else { Falta "Supabase local espera a Docker Desktop." }

# ---------------------------------------------------------------
Titulo "Siguiente"
Write-Host "  1. npm run dev  ->  http://localhost:5173  (crea tu usuario y entra)"
Write-Host "  2. En otra terminal, en esta carpeta: claude"
Write-Host "  3. Pega el 'Prompt inicial' del README.md"
Write-Host "  Paso a paso completo: docs\16-arranque.md"
