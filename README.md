# Powerbuilding Tracker

Application web (PWA) pour suivre un programme powerbuilding de 7 semaines
(Top Set & Backoff) : charges, exercices faits, timer de repos, historique des cycles.
Elle fonctionne **hors-ligne** et s'installe sur l'écran d'accueil du téléphone.

## Structure

```
index.html            Page principale (structure HTML)
css/style.css         Styles
js/program.js         Données du programme (semaines, jours, exercices, estimations)
js/app.js             État, affichage, timer, historique, cycles
sw.js                 Service worker (mode hors-ligne)
manifest.json         Infos d'installation (nom, icônes, couleurs)
assets/icons/         Icônes de l'app
```

Aucune dépendance et aucune étape de build : ce sont de simples fichiers statiques.

## Lancer en local

Ouvrir `index.html` en double-cliquant fonctionne pour tester l'affichage, mais
le mode hors-ligne (service worker) demande un petit serveur local, au choix :

- VS Code : extension **Live Server** → clic droit sur `index.html` → *Open with Live Server*
- ou, si Python est installé : `python -m http.server 8000` puis http://localhost:8000

Le plus simple reste souvent de tester directement sur l'URL GitHub Pages.

## Mise en ligne (GitHub Pages)

1. Pousser le code sur la branche `main`.
2. Sur GitHub : **Settings → Pages → Build and deployment**
   - Source : *Deploy from a branch*
   - Branch : `main` / `/ (root)` → **Save**
3. Au bout d'une minute environ, l'app est en ligne sur
   **https://elnhiko.github.io/powerbuilding-tracker/**

Chaque `git push` sur `main` met le site à jour automatiquement.

## Installer sur le téléphone

- **iPhone (Safari)** : ouvrir l'URL → bouton Partager → *Sur l'écran d'accueil*.
- **Android (Chrome)** : ouvrir l'URL → menu ⋮ → *Installer l'application*
  (ou *Ajouter à l'écran d'accueil*).

L'app s'ouvre alors en plein écran, comme une app native, et marche sans réseau.

## Données

Les données sont toujours gardées **sur l'appareil** (`localStorage`, clé `pb-v2`)
pour que l'app marche hors-ligne. Si tu te connectes (bouton **Compte**), elles sont
aussi **sauvegardées en ligne avec Supabase** et synchronisées entre tes appareils.
Si tu modifies les données sur deux appareils, c'est la modification la plus récente qui est gardée.

Voyant à côté de « Compte » : vert = synchronisé, orange = envoi en attente,
rouge = hors-ligne / erreur, gris = non connecté.

### Mise en place de Supabase (une seule fois)

1. Créer un projet gratuit sur https://supabase.com
2. **SQL Editor → New query** : coller le contenu de `supabase/schema.sql` → **Run**
3. **Authentication → URL Configuration** : *Site URL* =
   `https://elnhiko.github.io/powerbuilding-tracker/`
4. **Project Settings → API** : copier *Project URL* et la clé *anon / publishable*
   dans `js/config.js` (jamais la clé *service_role / secret*).

Pour consulter tes charges directement dans Supabase : **Table Editor** → vue `charges`
(une ligne par exercice saisi : cycle, semaine, jour, charge, fait).

## Mettre à jour l'app

Modifie les fichiers, puis `git push`. Le service worker est en mode
« réseau d'abord » : le téléphone récupère la nouvelle version dès qu'il a du
réseau. Si tu ajoutes un nouveau fichier, ajoute-le aussi à la liste `ASSETS` de
`sw.js` et incrémente `CACHE_NAME` (`pb-tracker-v3`, …).
