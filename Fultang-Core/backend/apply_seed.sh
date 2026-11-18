#!/usr/bin/env bash
# Peuplement complet de l'écosystème Compuclinic / Fultang (personnel, RH,
# médical, infrastructures, compta financière, compta matière).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

wait_running() {
    local name="$1"
    local n=0
    until docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null | grep -q true; do
        n=$((n + 1))
        if [ "$n" -ge 45 ]; then
            echo "✗ Conteneur $name non démarré."
            return 1
        fi
        sleep 2
    done
}

echo "=== Attente des conteneurs ==="
for c in fultang-personnel fultang-medical-backend fultang-infrastructure-web \
         fultang-compta-financiere-backend fultang-compta-matiere-backend; do
    wait_running "$c"
    echo "  ✓ $c"
done
sleep 5

echo ""
echo "=== Migrations ==="
docker exec -w /app/service_personnel fultang-personnel python manage.py migrate --no-input
docker exec -w /app fultang-medical-backend python manage.py migrate --no-input
docker exec -w /app fultang-infrastructure-web python manage.py migrate --no-input
docker exec -w /app fultang-compta-financiere-backend python manage.py migrate --no-input
docker exec -w /app fultang-compta-matiere-backend python manage.py migrate --no-input
if docker inspect fultang-tenant-web >/dev/null 2>&1; then
    docker exec -w /app fultang-tenant-web python manage.py migrate --no-input || true
fi

echo ""
echo "=== Personnel, services, RH, admin, directeur ==="
docker exec -w /app/service_personnel fultang-personnel python /app/service_personnel/seed_data.py

echo ""
echo "=== Patients et visites (médical) ==="
docker exec -w /app fultang-medical-backend python seed_medical.py || \
    docker exec -w /app fultang-medical-backend python /app/seed_medical.py

echo ""
echo "=== Infrastructures (bâtiments, salles, lits) ==="
docker exec -w /app fultang-infrastructure-web python seed_infrastructure.py

echo ""
echo "=== Comptabilité financière (exercices 2025/2026) ==="
docker exec -w /app fultang-compta-financiere-backend python manage.py seed_demo --flush

echo ""
echo "=== Comptabilité matière ==="
docker exec -w /app fultang-compta-matiere-backend python manage.py seed_demo_matiere

echo ""
echo "✅ Peuplement terminé."
echo ""
echo "Identifiants (mot de passe Fultang@123 sauf mention) :"
echo "  Réception        claire.b@fultang.local"
echo "  Infirmier (Mat.) marie.ateba@fultang.local"
echo "  Infirmier (Chir.) fatou.ndongo@fultang.local"
echo "  Infirmier (CG)   grace.owona@fultang.local"
echo "  Infirmier (Neur.) aimee.fouda@fultang.local"
echo "  Infirmier (Urg.) ines.menga@fultang.local"
echo "  Médecin (Chir.)  jean.dupont@fultang.local     / password123"
echo "  Médecin (CG)     alain.kengne@fultang.local"
echo "  Médecin (Neur.)  sophie.mballa@fultang.local"
echo "  Caissier         paul.talla@fultang.local"
echo "  Comptable        i.njoya@fultang.local"
echo "  RH               rh@fultang.local"
echo "  Directeur        dg@fultang.local"
echo "  Admin système    admin@fultang.local           / adminpass"
echo "  Laborantin       luc.kamga@fultang.local"
echo "  Pharmacien       sylvie.ekani@fultang.local"
