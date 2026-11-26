#!/bin/sh
# Demarrage du service du personnel.
# On attend que PostgreSQL ACCEPTE les connexions (pas seulement que le nom
# « postgres » existe) : apres un arret brutal, la base repare ses fichiers
# pendant une minute ou plus (AH-23). Toute erreur arrete le conteneur, pour
# que Docker le relance (restart: on-failure) au lieu de rester « Up » a vide.
set -e

DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
MAX_RETRIES=60
echo ">>> Attente de la base PostgreSQL ${DB_HOST}:${DB_PORT}..."
i=0
until python -c "
import os, psycopg2
psycopg2.connect(host='${DB_HOST}', port=${DB_PORT}, dbname=os.environ.get('POSTGRES_DB'),
                 user=os.environ.get('POSTGRES_USER'), password=os.environ.get('POSTGRES_PASSWORD'),
                 connect_timeout=3).close()
" 2>/dev/null; do
    i=$((i + 1))
    if [ $i -ge $MAX_RETRIES ]; then
        echo ">>> ERREUR : la base n'accepte toujours pas les connexions apres $MAX_RETRIES essais."
        exit 1
    fi
    echo ">>> Base pas encore prete ($i/$MAX_RETRIES), nouvel essai dans 2 s..."
    sleep 2
done
echo ">>> Base prete. Lancement des migrations..."
python manage.py migrate --no-input
echo ">>> Seeding des donnees..."
python seed_data.py
echo ">>> Demarrage du serveur Django..."
exec python manage.py runserver 0.0.0.0:8000
