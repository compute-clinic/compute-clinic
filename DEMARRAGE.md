# Lancer ComputeClinic en une commande

Branche : `essai-correction-compta-matiere`

## 1. Ce qu'il faut installer (une seule fois)

| | Windows 10/11 | Linux (Ubuntu, Debian…) |
|---|---|---|
| Git | [git-scm.com/download/win](https://git-scm.com/download/win) (installe aussi Git Bash) | `sudo apt install git curl` |
| Docker | [Docker Desktop](https://www.docker.com/products/docker-desktop/) | [Docker Engine](https://docs.docker.com/engine/install/) + `sudo usermod -aG docker $USER`, puis se reconnecter |
| Espace disque | 15 Go libres | 15 Go libres |

Sous Windows, si Docker Desktop ne démarre jamais : activez la virtualisation dans le BIOS
(Intel VT-x ou AMD SVM), puis lancez `wsl --update` dans PowerShell en administrateur.

Le premier lancement télécharge 3 à 6 Go. Il prend 20 à 60 minutes selon la connexion.
Les lancements suivants prennent 1 à 2 minutes.

## 2. Récupérer et lancer

**Linux**, ou **Windows dans Git Bash** :

```bash
git clone -b essai-correction-compta-matiere https://github.com/compute-clinic/compute-clinic.git
cd compute-clinic
./demarrer.sh
```

**Windows**, dans PowerShell ou en double-cliquant le fichier : clonez le dépôt comme ci-dessus,
puis lancez `demarrer.bat`.

Le script fait tout, dans l'ordre :

1. Il vérifie Docker.
2. Il crée le réseau et les fichiers de configuration manquants.
3. Il construit et lance les 18 conteneurs.
4. Il attend les migrations.
5. Il charge les données de démonstration, au premier lancement seulement.
6. Il teste l'interface, la passerelle et 5 comptes.

Il se termine par « ComputeClinic fonctionne. » ou par la liste de ce qui a échoué.

## 3. Utiliser l'application

- Interface : <http://127.0.0.1:5173>. Sous Windows, préférez `127.0.0.1` à `localhost`.
- Documentation de l'API : <http://127.0.0.1:8080/docs>.
- Comptes de test : [Fultang-Core/credentials.md](Fultang-Core/credentials.md). Le mot de passe est
  `Fultang@123`, sauf deux comptes : `admin@fultang.local` / `adminpass` et
  `jean.dupont@fultang.local` / `password123`.
- La passerelle accepte **5 tentatives de connexion par minute**. Au-delà, elle répond « Rate limit
  exceeded ». Attendez alors une minute.

## 4. Autres commandes

| Commande | Effet |
|---|---|
| `./demarrer.sh tester` | refait seulement les tests |
| `./demarrer.sh etat` | état de chaque conteneur |
| `./demarrer.sh journaux compta-matiere-backend` | 60 dernières lignes d'un conteneur (nom sans `fultang-`) |
| `./demarrer.sh arreter` | arrête tout ; les données sont gardées |
| `./demarrer.sh repeupler` | recharge les données de démonstration (**efface** la comptabilité financière) |

Sous Windows sans Git Bash, remplacez `./demarrer.sh` par `demarrer.bat`.

## 5. Corrections apportées par cette branche

| Problème | Correction |
|---|---|
| La comptabilité matière ne démarrait pas : la migration 0004 levait `TenantContextMissingError` | La migration écrit dans la base visée (`schema_editor.connection.alias`) |
| Les scripts de données de démonstration plantaient pour la même raison (comptabilité matière, infrastructures, comptabilité financière) | `seed_demo_matiere`, `recompute_stock`, `seed_infrastructure.py` et `seed_demo` travaillent sur le pool non assigné ; `seed_infrastructure.py` peut être relancé sans erreur |
| La passerelle renvoyait une erreur 500 aux utilisateurs dont le nom ou le service est accentué (Réception, Médecine…) | Les en-têtes `X-User-Nom`, `X-User-Prenom`, `X-User-Service-Nom` et `X-User-Email` sont transmis en latin-1 |
| Les scripts plantaient sous Windows (`exec /entrypoint.sh: no such file or directory`) | `.gitattributes` impose les fins de ligne Linux |
| Le personnel démarrait avant que sa base accepte les connexions | `entrypoint.sh` attend une vraie connexion, puis s'arrête en cas d'erreur |
| Le personnel restait « unhealthy » | Le contrôle de santé vérifie le port au lieu d'une adresse protégée |
| Les bases PostgreSQL étaient déclarées en panne au premier démarrage | Délai de démarrage de 60 s et 30 essais |
| `tenant-service` refusait de démarrer sans `.env.email` | Modèle `.env.email.example`, copié par le script |
| `lancer_application.sh` annonçait le port 3000 | Il annonce le port 5173 |
| `apply_seed.sh` échouait sous Git Bash (`/app` réécrit en `C:/Program Files/Git/app`) | `demarrer.sh` désactive cette conversion |
