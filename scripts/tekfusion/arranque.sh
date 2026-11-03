#!/usr/bin/env bash
# Arranque del CRM TekFusion en macOS (o Linux). Idempotente; pregunta antes de instalar.
# Uso: scripts/tekfusion/arranque.sh
set -u
cd "$(dirname "$0")/../.."
REPO=$(pwd)
ok(){ printf '  \033[32m[ok]\033[0m %s\n' "$1"; }
falta(){ printf '  \033[33m[falta]\033[0m %s\n' "$1"; }
mal(){ printf '  \033[31m[error]\033[0m %s\n' "$1"; }
pregunta(){ read -r -p "  $1 (s/n) " r; [[ "$r" == "s" || "$r" == "S" ]]; }
tiene(){ command -v "$1" >/dev/null 2>&1; }
brew_install(){ if tiene brew; then pregunta "¿Instalar $2 con Homebrew?" && brew install "$1"; else mal "Homebrew no está. Instala $2 a mano (o Homebrew: https://brew.sh)"; fi; }

echo "CRM TekFusion · arranque en $REPO"
echo; echo "=== 1. Programas"
if tiene node; then v=$(node -v | tr -d v); if [ "${v%%.*}" -ge 24 ]; then ok "Node $v"; else falta "Node $v (se necesita 24)"; brew_install node "Node.js"; fi; else falta "Node.js"; brew_install node "Node.js"; fi
tiene git && ok "$(git --version)" || { falta "Git"; brew_install git "Git"; }
tiene gh && ok "GitHub CLI" || { falta "GitHub CLI (opcional)"; brew_install gh "GitHub CLI"; }
tiene gitleaks && ok "gitleaks" || { falta "gitleaks"; brew_install gitleaks "gitleaks"; }
DOCKER_OK=0
if tiene docker; then if docker info >/dev/null 2>&1; then ok "Docker corriendo"; DOCKER_OK=1; else falta "Docker instalado pero no corriendo: abre Docker Desktop (o OrbStack) y vuelve a correr esto."; fi
else falta "Docker Desktop (lo necesita Supabase local)"; if tiene brew && pregunta "¿Instalar Docker Desktop con Homebrew?"; then brew install --cask docker; echo "  Ábrelo una vez desde Aplicaciones y vuelve a correr este script."; fi; fi
tiene claude && ok "Claude Code" || falta "Claude Code: npm install -g @anthropic-ai/claude-code  (y luego 'claude' para iniciar sesión)"
tiene node || { mal "Sin Node no se puede seguir."; exit 1; }

echo; echo "=== 2. Repositorio"
git config core.autocrlf false; git config core.filemode true
if [ -z "$(git config user.email)" ]; then falta "Git sin nombre/correo para commits"; read -r -p "  Nombre: " n; read -r -p "  Correo: " e; [ -n "$n" ] && git config --global user.name "$n"; [ -n "$e" ] && git config --global user.email "$e"; fi
ok "git OK, rama $(git branch --show-current)"

echo; echo "=== 3. Dependencias"
if [ -d node_modules ]; then ok "node_modules existe"; else npm install && ok "npm install" || mal "npm install falló: copia el error y pégalo en Claude."; fi
tiene typescript-language-server && ok "typescript-language-server" || { npm install -g typescript-language-server typescript && ok "typescript-language-server"; }

echo; echo "=== 4. Herramientas de Claude Code"
if tiene claude && pregunta "¿Instalar skills y MCP del proyecto (agent-skills, Supabase, ECC, LSP, Context7)?"; then
  claude plugin marketplace add addyosmani/agent-skills && claude plugin install agent-skills@addy-agent-skills
  claude plugin marketplace add supabase/agent-skills && claude plugin install supabase@supabase-agent-skills
  claude plugin marketplace add https://github.com/affaan-m/ECC && claude plugin install ecc@ecc
  claude plugin marketplace update claude-plugins-official && claude plugin install typescript-lsp@claude-plugins-official
  claude mcp add context7 -- npx -y @upstash/context7-mcp
  ok "Listo. En Claude Code: /plugin → en ECC deja solo database-reviewer y security-reviewer."
fi

echo; echo "=== 5. Supabase local"
if [ "$DOCKER_OK" = 1 ] && pregunta "¿Levantar Supabase local ahora? (primera vez descarga ~1 GB)"; then npx supabase start && ok "Supabase local arriba. Studio: http://127.0.0.1:54323" || mal "supabase start falló."; fi

echo; echo "=== Siguiente"
echo "  1. npm run dev  →  http://localhost:5173"
echo "  2. En otra terminal: claude  →  pega el prompt inicial del README.md"
echo "  Paso a paso: docs/16-arranque.md"
