#!/usr/bin/env bash
# =============================================================================
# Compuclinic / Fultang — lancement unique de l'application
# =============================================================================
# Usage :
#   ./lancer_application.sh              # démarre tout + migrations + seed
#   ./lancer_application.sh --seed-only  # uniquement migrations + peuplement
#   ./lancer_application.sh --no-build   # up sans reconstruire les images
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

SEED_ONLY=0
NO_BUILD=0
for arg in "$@"; do
    case "$arg" in
        --seed-only) SEED_ONLY=1 ;;
        --no-build) NO_BUILD=1 ;;
        -h|--help)
            head -n 12 "$0" | tail -n 8
            exit 0
            ;;
    esac
done

if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}✗ Docker n'est pas installé.${NC}"
    exit 1
fi

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   Compuclinic — lancement de l'écosystème${NC}"
echo -e "${BLUE}======================================================${NC}"

if [ "$SEED_ONLY" -eq 0 ]; then
    echo -e "\n${CYAN}➔ Réseau Docker partagé…${NC}"
    docker network inspect fultang_shared_network >/dev/null 2>&1 \
        || docker network create fultang_shared_network
    echo -e "${GREEN}✓ Réseau fultang_shared_network${NC}"

    echo -e "\n${CYAN}➔ Microservices backend…${NC}"
    chmod +x backend/start_all.sh
    if [ "$NO_BUILD" -eq 1 ]; then
        (cd backend && docker compose up -d)
        (cd backend && ./start_all.sh) || true
    else
        (cd backend && docker compose build api-gateway --pull=false)
        (cd backend && ./start_all.sh)
    fi

    echo -e "\n${CYAN}➔ Frontend (http://127.0.0.1:5173)…${NC}"
    if [ -f Frontend/docker-compose.yml ]; then
        if [ "$NO_BUILD" -eq 1 ]; then
            (cd Frontend && docker compose up -d)
        else
            (cd Frontend && docker compose build --pull=false && docker compose up -d)
        fi
        echo -e "${GREEN}✓ Frontend sur le port 5173${NC}"
    else
        echo -e "${RED}⚠ Frontend/docker-compose.yml introuvable${NC}"
    fi
fi

echo -e "\n${CYAN}➔ Migrations et peuplement…${NC}"
chmod +x backend/apply_seed.sh
(cd backend && ./apply_seed.sh)

echo -e "\n${BLUE}======================================================${NC}"
echo -e "${GREEN}🎉 Application prête${NC}"
echo -e "${CYAN}👉 Interface : http://127.0.0.1:5173/${NC}"
echo -e "${CYAN}👉 Gateway  : http://127.0.0.1:8080/${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "Pour recharger uniquement les données :  ${CYAN}./lancer_application.sh --seed-only${NC}"
