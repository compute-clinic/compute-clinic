#!/usr/bin/env bash
# =============================================================================
# ComputeClinic — lancement en une commande
# =============================================================================
# Usage (Linux, macOS, ou Git Bash sous Windows) :
#   ./demarrer.sh              prépare, construit, lance, remplit (1re fois) et teste
#   ./demarrer.sh tester       refait seulement les tests
#   ./demarrer.sh etat         affiche l'état des conteneurs
#   ./demarrer.sh arreter      arrête tout (les données sont gardées)
#   ./demarrer.sh journaux X   affiche les 60 dernières lignes du conteneur fultang-X
#   ./demarrer.sh repeupler    recharge les données de démonstration (EFFACE la compta financière)
#
# Sans le dépôt : ce fichier seul suffit, il clone le dépôt à côté de lui.
# Premier lancement : 3 à 6 Go à télécharger, 20 à 60 min selon la connexion.
# =============================================================================
set -u

DEPOT_URL="https://github.com/compute-clinic/compute-clinic.git"
BRANCHE="essai-correction-compta-matiere"

# Git Bash réécrit « /app » en « C:/Program Files/Git/app » dans les arguments
# de docker exec : on désactive cette conversion (sans effet hors Windows).
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

V='\033[0;32m'; R='\033[0;31m'; J='\033[0;33m'; C='\033[0;36m'; G='\033[1m'; N='\033[0m'
ok()    { echo -e "  ${V}[OK]${N} $*"; }
ko()    { echo -e "  ${R}[ÉCHEC]${N} $*"; }
info()  { echo -e "  ${C}-->${N} $*"; }
alerte(){ echo -e "  ${J}[ATTENTION]${N} $*"; }
titre() { echo -e "\n${G}== $* ==${N}"; }

# --- 0. Trouver (ou cloner) le dépôt -----------------------------------------
ICI="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
if [ -d "$ICI/Fultang-Core/backend" ]; then
    RACINE="$ICI"
elif [ -d "$PWD/compute-clinic/Fultang-Core/backend" ]; then
    RACINE="$PWD/compute-clinic"
else
    titre "Téléchargement du dépôt"
    command -v git >/dev/null || { ko "Git n'est pas installé : https://git-scm.com"; exit 1; }
    git -c core.autocrlf=false clone --branch "$BRANCHE" "$DEPOT_URL" compute-clinic || exit 1
    RACINE="$PWD/compute-clinic"
    exec bash "$RACINE/demarrer.sh" "$@"
fi
BACK="$RACINE/Fultang-Core/backend"
FRONT="$RACINE/Fultang-Core/Frontend"
MARQUE="$RACINE/.computeclinic-donnees-chargees"

# --- Docker ------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
    for d in "/c/Program Files/Docker/Docker/resources/bin" "/d/Programs/Docker/resources/bin" \
             "/Applications/Docker.app/Contents/Resources/bin"; do
        [ -x "$d/docker" ] || [ -x "$d/docker.exe" ] && export PATH="$d:$PATH" && break
    done
fi

verifier_docker() {
    titre "Vérification de Docker"
    if ! command -v docker >/dev/null 2>&1; then
        ko "Docker n'est pas installé. Installez Docker Desktop : https://www.docker.com/products/docker-desktop/"
        exit 1
    fi
    if ! docker info >/dev/null 2>&1; then
        ko "Docker est installé mais ne répond pas."
        if [ "$(uname -s)" = "Linux" ] && ! groups | grep -qw docker; then
            echo "     Linux : votre compte n'est pas dans le groupe docker. Faites une fois :"
            echo "        sudo usermod -aG docker \$USER   puis fermez la session et reconnectez-vous."
            echo "     Ou démarrez le service : sudo systemctl start docker"
        fi
        echo "     1. Ouvrez Docker Desktop et attendez « Engine running »."
        echo "     2. Sous Windows, si Docker ne démarre jamais : activez la virtualisation"
        echo "        dans le BIOS (Intel VT-x / AMD SVM), puis dans PowerShell admin : wsl --update"
        exit 1
    fi
    docker compose version >/dev/null 2>&1 || { ko "« docker compose » absent : mettez Docker Desktop à jour."; exit 1; }
    ok "Docker $(docker version --format '{{.Server.Version}}' 2>/dev/null) répond."
    for p in 5173 8080; do
        if (exec 3<>/dev/tcp/127.0.0.1/$p) 2>/dev/null; then
            if ! docker ps --format '{{.Ports}}' | grep -q ":$p->"; then
                alerte "Le port $p est déjà pris par un autre programme : fermez-le avant de continuer."
            fi
        fi
    done
}

preparer() {
    titre "Préparation"
    docker network inspect fultang_shared_network >/dev/null 2>&1 \
        || docker network create fultang_shared_network >/dev/null
    ok "Réseau fultang_shared_network"
    if [ ! -f "$BACK/tenant-service/.env.email" ]; then
        cp "$BACK/tenant-service/.env.email.example" "$BACK/tenant-service/.env.email"
        ok "tenant-service/.env.email créé (e-mails désactivés)"
    fi
    if [ ! -f "$BACK/Medical-Monitoring/.env" ]; then
        cp "$BACK/Medical-Monitoring/.env.example" "$BACK/Medical-Monitoring/.env"
        sed -i.bak -e 's|@db:5432|@medical-db:5432|g' -e 's/^DB_HOST=db$/DB_HOST=medical-db/' \
            "$BACK/Medical-Monitoring/.env" && rm -f "$BACK/Medical-Monitoring/.env.bak"
        ok "Medical-Monitoring/.env créé"
    fi
    # Scripts sortis en CRLF par un ancien clone Windows : on les remet en LF.
    local n=0
    while IFS= read -r f; do
        if grep -q $'\r' "$f" 2>/dev/null; then sed -i.bak 's/\r$//' "$f" && rm -f "$f.bak"; n=$((n+1)); fi
    done < <(find "$RACINE/Fultang-Core" -name '*.sh' -not -path '*/node_modules/*')
    [ "$n" -gt 0 ] && ok "$n script(s) remis en fins de ligne Linux" || ok "Fins de ligne des scripts correctes"
}

compose() { # compose <dossier relatif à backend ou ""> <args...>
    local dir="$1"; shift
    (cd "$BACK/$dir" && docker compose "$@")
}

lancer() {
    titre "Construction et lancement (long la première fois)"
    info "Socle : base du personnel, personnel, passerelle, Kafka, agent clinique"
    compose "" up -d --build || { ko "Le socle n'a pas démarré"; return 1; }
    info "Suivi médical"
    (cd "$BACK/Medical-Monitoring" && docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build) \
        || ko "Suivi médical"
    for s in "Gestion-Infrastructures:Infrastructures" "fultang-compta-financiere:Comptabilité financière" \
             "ComptaMatiere:Comptabilité matière" "tenant-service:Établissements (tenants)"; do
        info "${s#*:}"
        compose "${s%%:*}" up -d --build || ko "${s#*:}"
    done
    info "Interface web"
    (cd "$FRONT" && docker compose up -d --build) || ko "Interface web"
}

attendre_port() { # attendre_port <conteneur> <port> <max secondes>
    local c="$1" p="$2" max="$3" t=0
    while [ "$t" -lt "$max" ]; do
        if docker exec "$c" python -c "import socket; socket.create_connection(('localhost', $p), 3)" >/dev/null 2>&1; then
            ok "$c répond ($t s)"; return 0
        fi
        # Redémarrage automatique si le conteneur s'est arrêté (base pas prête, etc.)
        if [ "$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null)" != "true" ]; then
            docker start "$c" >/dev/null 2>&1
        fi
        sleep 5; t=$((t+5))
    done
    ko "$c ne répond pas après $max s — voir : ./demarrer.sh journaux ${c#fultang-}"; return 1
}

attendre() {
    titre "Attente des services (migrations au premier lancement)"
    local echec=0
    attendre_port fultang-personnel 8000 420 || echec=1
    attendre_port fultang-medical-backend 8000 420 || echec=1
    attendre_port fultang-infrastructure-web 8000 300 || echec=1
    attendre_port fultang-compta-financiere-backend 8000 300 || echec=1
    attendre_port fultang-compta-matiere-backend 8000 300 || echec=1
    attendre_port fultang-tenant-web 8000 300 || echec=1
    attendre_port fultang-gateway 8080 120 || echec=1
    return $echec
}

peupler() {
    if [ -f "$MARQUE" ] && [ "${1:-}" != "force" ]; then
        titre "Données de démonstration"
        ok "Déjà chargées (pour recommencer : ./demarrer.sh repeupler)"
        return 0
    fi
    titre "Chargement des données de démonstration"
    if bash "$BACK/apply_seed.sh"; then
        date > "$MARQUE"; ok "Données chargées"
    else
        ko "Le chargement des données a échoué (voir les messages ci-dessus)"; return 1
    fi
}

# --- Tests -------------------------------------------------------------------
code_http() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$@"; }

connexion() { # connexion <email> <mot de passe>  -> affiche le jeton, ou rien
    curl -s --max-time 15 -X POST http://127.0.0.1:8080/auth/login -H 'Content-Type: application/json' \
        -d "{\"email\":\"$1\",\"password\":\"$2\"}" | sed -n 's/.*"access_token" *: *"\([^"]*\)".*/\1/p'
}

compter() { # compter <jeton> <chemin passerelle> -> nombre d'éléments renvoyés (ou code d'erreur)
    local corps code
    corps=$(curl -s --max-time 15 -w '\n%{http_code}' -H "Authorization: Bearer $1" "http://127.0.0.1:8080$2")
    code=$(echo "$corps" | tail -n1); corps=$(echo "$corps" | sed '$d')
    [ "$code" = "200" ] || { echo "HTTP $code"; return 1; }
    # Comptage fait par le Python du conteneur de la passerelle : marche partout, sans jq.
    echo "$corps" | docker exec -i fultang-gateway python -c "import sys, json
d = json.load(sys.stdin)
if isinstance(d, dict):
    print(d['count'] if 'count' in d else len(d.get('results', d)))
else:
    print(len(d))" 2>/dev/null || echo "réponse reçue"
}

tester() {
    titre "Tests de fonctionnement"
    local echecs=0 c t n
    c=$(code_http http://127.0.0.1:5173/);      [ "$c" = 200 ] && ok "Interface web  http://127.0.0.1:5173" || { ko "Interface web : HTTP $c"; echecs=$((echecs+1)); }
    c=$(code_http http://127.0.0.1:8080/docs);  [ "$c" = 200 ] && ok "Passerelle     http://127.0.0.1:8080/docs" || { ko "Passerelle : HTTP $c"; echecs=$((echecs+1)); }

    # La passerelle limite à 5 connexions par minute : 5 comptes, un par groupe de travail.
    info "Connexion de 5 comptes (limite de la passerelle : 5 par minute)"
    while IFS='|' read -r email mdp role chemin libelle; do
        t=$(connexion "$email" "$mdp")
        if [ -z "$t" ]; then ko "$role ($email) : connexion refusée"; echecs=$((echecs+1)); continue; fi
        if n=$(compter "$t" "$chemin"); then
            ok "$role : connecté, $libelle : $n"
        else
            ko "$role : connecté, mais $libelle → $n"; echecs=$((echecs+1))
        fi
    done <<'COMPTES'
a.matiere@fultang.local|Fultang@123|Comptable matière (groupe 1)|/compta-matiere/api/compta_matiere/materiels/|matériels
admin@fultang.local|adminpass|Administrateur (groupe 2)|/infrastructure/api/batiments/|bâtiments
claire.b@fultang.local|Fultang@123|Réceptionniste (groupe 3)|/medical/patients/|patients
i.njoya@fultang.local|Fultang@123|Comptable financier (groupe 4)|/compta-financiere/api/exercices/|exercices
dg@fultang.local|Fultang@123|Directeur|/compta-matiere/api/compta_matiere/besoins/|besoins
COMPTES

    titre "Résultat"
    if [ "$echecs" -eq 0 ]; then
        echo -e "  ${V}${G}ComputeClinic fonctionne.${N}"
    else
        echo -e "  ${R}${G}$echecs test(s) en échec.${N} Relancez ./demarrer.sh tester dans une minute ;"
        echo "  si l'échec persiste : ./demarrer.sh etat puis ./demarrer.sh journaux <service>."
    fi
    resume
    return "$echecs"
}

resume() {
    cat <<'FIN'

  Interface   : http://127.0.0.1:5173   (préférez 127.0.0.1 à localhost sous Windows)
  Passerelle  : http://127.0.0.1:8080/docs
  Comptes     : voir Fultang-Core/credentials.md — mot de passe Fultang@123 sauf :
                admin@fultang.local / adminpass   et   jean.dupont@fultang.local / password123
  Rappel      : 5 tentatives de connexion par minute au maximum, ensuite attendre 1 minute.
FIN
}

etat() {
    titre "État des conteneurs ComputeClinic"
    docker ps -a --filter name=fultang- --format 'table {{.Names}}\t{{.Status}}' | sort
}

arreter() {
    titre "Arrêt (les données sont conservées)"
    (cd "$FRONT" && docker compose stop) >/dev/null 2>&1
    for d in tenant-service ComptaMatiere fultang-compta-financiere Gestion-Infrastructures; do
        compose "$d" stop >/dev/null 2>&1
    done
    (cd "$BACK/Medical-Monitoring" && docker compose -f docker-compose.yml -f docker-compose.override.yml stop) >/dev/null 2>&1
    compose "" stop >/dev/null 2>&1
    ok "Tout est arrêté. Relancer : ./demarrer.sh"
}

case "${1:-tout}" in
    tout)       verifier_docker; preparer; lancer; attendre; peupler; tester ;;
    tester)     tester ;;
    etat)       etat ;;
    arreter)    arreter ;;
    journaux)   docker logs --tail 60 "fultang-${2:?nom du service, ex. compta-matiere-backend}" ;;
    repeupler)  peupler force ;;
    -h|--help|aide) sed -n 2,15p "$0" ;;
    *)          echo "Commande inconnue : $1 (voir ./demarrer.sh aide)"; exit 1 ;;
esac
