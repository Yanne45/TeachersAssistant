# Teacher Assistant — Spécification complète du projet

> **Version** : 1.5
> **Date** : 12 mars 2026
> **Type** : Application desktop personnelle (mono-utilisateur)  
> **Plateforme cible** : Windows 11 (FHD / QHD)

---

## 1. Vision et objectifs

### 1.1 Présentation

**Teacher Assistant** est un logiciel de bureau destiné aux enseignants du secondaire (lycée général). Il offre un environnement complet de **pilotage pédagogique** couvrant l'ensemble du cycle professionnel : planification de l'année, préparation des cours, gestion documentaire, correction assistée par IA, suivi des élèves et génération de bulletins.

### 1.2 Objectifs principaux

- **Planifier** une année scolaire complète (calendrier, progression, emploi du temps)
- **Préparer** les séquences et séances pédagogiques avec assistance IA
- **Organiser** une bibliothèque documentaire intelligente (PDF, DOCX, PPTX, images)
- **Corriger** les copies avec évaluation par compétences, assistée ou manuelle
- **Suivre** les élèves (profil, compétences, bulletins, orientation)
- **Générer** des contenus pédagogiques via IA (cours, fiches, sujets, appréciations)
- **Exporter** en PDF des documents professionnels (progressions, bulletins, fiches)

### 1.3 Public cible

Enseignant du lycée général, notamment en Histoire-Géographie et HGGSP (spécialité). L'application est conçue pour un usage personnel, sans authentification ni gestion multi-utilisateurs.

### 1.4 Principes directeurs

- **Opérationnel avant tout** : chaque écran répond à un besoin quotidien concret
- **Assistance IA non contraignante** : l'IA propose, l'enseignant décide
- **Navigation claire** : architecture de type application professionnelle (Notion, Figma)
- **Extensible** : ajout de sections et fonctionnalités sans casser l'existant
- **Données locales** : tout reste sur la machine de l'utilisateur (SQLite)
- **Résilience hors-ligne** : l'app reste fonctionnelle sans connexion, seules les fonctions IA et sync Google sont dégradées

---

## 2. Stack technique

### 2.1 Architecture

| Couche | Technologie | Rôle |
|---|---|---|
| **Runtime desktop** | Tauri 2.x | Conteneur natif Windows, accès filesystem, sécurité |
| **Frontend** | React 18+ (TypeScript) | Interface utilisateur, composants, état |
| **Styling** | CSS Variables + Tailwind CSS | Design system, tokens, responsive |
| **Base de données** | SQLite (via Tauri SQL plugin) | Stockage local de toutes les données |
| **IA** | OpenAI · Mistral AI · Anthropic · Ollama (local) | Génération de contenus, analyse, corrections, multi-fournisseur |
| **Traitement fichiers** | LibreOffice CLI (conversion), PDF.js (aperçu) | Preview et conversion documentaire |
| **Import EDT** | Google Calendar API (OAuth desktop) | Synchronisation emploi du temps depuis Pronote/ENT |
| **Export** | HTML → PDF (via navigateur intégré) | Génération de documents imprimables |

### 2.2 Dépendances clés

- **React DnD / dnd-kit** : drag & drop (progression, séances, documents)
- **TanStack Table** : tableaux de données (élèves, devoirs, notes)
- **date-fns** : manipulation de dates scolaires
- **PDF.js** : aperçu de documents PDF
- **Mammoth.js** : extraction de texte DOCX
- **Recharts** : graphiques (radar compétences, histogrammes, évolutions)

### 2.3 Gestion hors-ligne

L'application étant locale (SQLite), elle reste pleinement fonctionnelle sans connexion internet. Seules deux fonctionnalités dépendent du réseau :

| Fonctionnalité | Comportement hors-ligne |
|---|---|
| **API IA** (génération, analyse) | File d'attente locale. Les requêtes sont stockées et exécutées automatiquement au retour de la connexion. Un indicateur "⏳ En attente IA" est affiché. |
| **Sync Google Calendar** | Import ICS one-way fonctionnel. OAuth Google Desktop (loopback) implémenté — lecture seule, import vers EDT local. |

Un **indicateur de connectivité** est affiché dans le header (pastille verte = connecté, grise = hors-ligne).

### 2.4 Structure du projet

```
teacher-assistant/
├── src-tauri/          # Backend Rust (Tauri)
│   ├── src/
│   └── tauri.conf.json
├── src/                # Frontend React
│   ├── components/     # Composants UI réutilisables
│   ├── layouts/        # Header, Tabs, Sidebar, Main
│   ├── pages/          # Écrans par section
│   ├── hooks/          # Hooks custom
│   ├── stores/         # État global
│   ├── services/       # API IA, DB, fichiers
│   ├── styles/         # Tokens CSS, thème
│   └── utils/
├── db/                 # Migrations SQLite
└── public/
```

---

## 3. Charte graphique

### 3.1 Philosophie visuelle

Style **institutionnel modernisé** : sobre, professionnel, accessible. Inspiré des ENT scolaires mais avec une touche contemporaine (micro-interactions, icônes minimalistes, espacement généreux). Support des modes clair et sombre.

### 3.2 Palette de couleurs

#### Couleurs système

| Usage | Couleur | Hex (light) | Hex (dark) | CSS Variable |
|---|---|---|---|---|
| **Primaire** (navigation, titres, focus) | Turquoise | `#3DB4C6` | `#4DC8DA` | `--color-primary` |
| **Primaire foncé** (hover, active) | Turquoise foncé | `#2FA7B8` | `#3DB4C6` | `--color-primary-dark` |
| **Action / CTA** (boutons principaux) | Orange vif | `#F28C28` | `#F5A040` | `--color-accent` |
| **Fond global** | Gris très clair / Gris foncé | `#F5F7F8` | `#1A1D21` | `--color-bg` |
| **Fond surface** (cards, panels) | Blanc / Gris sombre | `#FFFFFF` | `#23272E` | `--color-surface` |
| **Texte principal** | Gris foncé / Gris clair | `#444444` | `#D4D4D8` | `--color-text` |
| **Texte secondaire** | Gris moyen | `#888888` | `#9CA3AF` | `--color-text-muted` |
| **Feedback positif** | Vert clair | `#7ED957` | `#86E05F` | `--color-success` |
| **Alerte / attention** | Jaune ambre | `#F5A623` | `#FABD3B` | `--color-warn` |
| **Erreur / danger** | Rouge | `#E74C3C` | `#EF6356` | `--color-danger` |
| **Info** | Bleu clair | `#5DADE2` | `#6DB8E8` | `--color-info` |

#### Couleurs par matière (tagging pédagogique)

| Matière | Couleur | Hex | CSS Variable |
|---|---|---|---|
| **Histoire** | Bleu marine | `#2C3E7B` | `--color-subject-histoire` |
| **Géographie** | Vert forêt | `#27774E` | `--color-subject-geo` |
| **HGGSP** | Violet | `#7B3FA0` | `--color-subject-hggsp` |

Par niveau : variante claire pour Première, variante saturée pour Terminale (opacité 70% vs 100%).

#### Couleurs sémantiques (calendrier & statuts)

| Contexte | Affichage |
|---|---|
| Vacances scolaires | Fond rose clair `#FDEAEA` |
| Jours fériés | Ligne rouge `#E74C3C` |
| Examens / bac blanc | Fond orange clair `#FEF3E2` |
| Fermeture exceptionnelle | Hachuré gris |
| Statut "non commencé" | Gris `#E0E0E0` |
| Statut "en cours" | Bleu `--color-primary` |
| Statut "à confirmer" | Orange `--color-warn` |
| Statut "finalisé" | Vert `--color-success` |

### 3.3 Typographie

**Police** : sans-serif système (Segoe UI sur Windows, system-ui en fallback)

| Rôle | Taille | Rem | Graisse | Interlignage |
|---|---|---|---|---|
| Display (titre dashboard) | 32 px | 2.0 rem | 600 | 1.2 |
| H1 (titre page) | 28 px | 1.75 rem | 600 | 1.2 |
| H2 (sections) | 22 px | 1.375 rem | 600 | 1.3 |
| H3 (sous-sections, cartes) | 18 px | 1.125 rem | 600 | 1.3 |
| Body (texte principal) | 16 px | 1.0 rem | 400 | 1.45 |
| Small (labels, métadonnées) | 14 px | 0.875 rem | 500 | 1.35 |
| XS (badges, aides) | 12 px | 0.75 rem | 400 | 1.35 |

**Base** : `font-size: 16px` sur `<html>`, tout le reste en `rem`.

#### Adaptation multi-résolutions (FHD / QHD)

```css
/* Base */
html { font-size: 16px; }

/* Léger agrandissement QHD */
@media (min-width: 2200px) {
  html { font-size: 17px; }
}

/* Option utilisateur dans Paramètres → Interface */
html[data-ui="compact"]     { font-size: 15px; }
html[data-ui="comfortable"] { font-size: 17px; }
```

### 3.4 Design tokens CSS

```css
:root {
  /* Couleurs - Mode clair */
  --color-primary: #3DB4C6;
  --color-primary-dark: #2FA7B8;
  --color-accent: #F28C28;
  --color-bg: #F5F7F8;
  --color-surface: #FFFFFF;
  --color-text: #444;
  --color-text-muted: #888;
  --color-success: #7ED957;
  --color-warn: #F5A623;
  --color-danger: #E74C3C;
  --color-info: #5DADE2;

  /* Matières */
  --color-subject-histoire: #2C3E7B;
  --color-subject-geo: #27774E;
  --color-subject-hggsp: #7B3FA0;

  /* Rayons */
  --radius-xs: 6px;   /* inputs, badges */
  --radius-s: 10px;   /* cards */
  --radius-m: 14px;   /* panels */
  --radius-l: 18px;   /* modals */

  /* Ombres */
  --shadow-card: 0 2px 6px rgba(0, 0, 0, 0.08);
  --shadow-floating: 0 8px 24px rgba(0, 0, 0, 0.12);

  /* Bordures */
  --border-default: 1px solid #E0E0E0;
  --border-focus: 2px solid var(--color-primary);

  /* Espacements (échelle 4px) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
}

/* Mode sombre */
[data-theme="dark"] {
  --color-primary: #4DC8DA;
  --color-primary-dark: #3DB4C6;
  --color-accent: #F5A040;
  --color-bg: #1A1D21;
  --color-surface: #23272E;
  --color-text: #D4D4D8;
  --color-text-muted: #9CA3AF;
  --color-success: #86E05F;
  --color-warn: #FABD3B;
  --color-danger: #EF6356;
  --color-info: #6DB8E8;
  --shadow-card: 0 2px 6px rgba(0, 0, 0, 0.3);
  --shadow-floating: 0 8px 24px rgba(0, 0, 0, 0.5);
  --border-default: 1px solid #3A3F47;
}
```

### 3.5 Composants UI standards

#### Boutons

| Type | Style | Usage |
|---|---|---|
| **Primary (CTA)** | Fond orange `--color-accent`, texte blanc, `border-radius: --radius-xs` | Actions importantes (Valider, Créer, Générer) |
| **Secondary** | Fond `--color-surface`, bordure `--border-default` | Actions secondaires |
| **Ghost** | Transparent, texte `--color-text-muted` seul | Barres d'outils, actions discrètes |

Tailles : S (28-32 px, font 12px, padding 10px), M (34-36 px, font 13px, padding 14px), L (42-44 px, font 14px, padding 18px). Tous les boutons ont `font-weight: 600` et un `gap: 6px` pour les icônes.

#### Badges

Composant transversal utilisé sur tous les écrans pour le tagging contextuel :

| Variante | Style | Exemples d'usage |
|---|---|---|
| **Matière** | Texte couleur matière, fond couleur matière à 10% d'opacité | `HGGSP`, `Histoire`, `Géo` |
| **Statut** | Texte couleur statut, fond couleur statut à 10% | `Séance prête`, `À préparer`, `Final`, `À confirmer` |
| **Info** | Texte `--color-text-muted`, fond `--color-bg` | `⏱ 2h`, `📄 4 docs`, `Tle 2` |
| **Filtre actif** | Texte `--color-primary`, fond primary à 15% | Filtres sélectionnés dans la barre (Récents, Par matière...) |
| **Filtre inactif** | Texte `--color-text-muted`, fond `--color-bg` | Filtres non sélectionnés |

Style commun : `padding: 2px 8px`, `border-radius: 12px`, `font-size: 11px`, `font-weight: 600`, `display: inline-flex`, `align-items: center`, `gap: 4px`.

#### États interactifs (tous composants)

| État | Apparence |
|---|---|
| **Default** | Style de base |
| **Hover** | Ombre renforcée (`--shadow-floating`), léger `translateY(-1px)` sur les cards |
| **Active / Pressed** | Enfoncement visuel (scale 0.98 ou fond plus foncé) |
| **Focus** | Ring turquoise 2px (`--border-focus`) — accessibilité clavier |
| **Disabled** | Opacité 50%, curseur `not-allowed`, non cliquable |
| **Loading** | Skeleton gris animé (pulse CSS) reprenant la structure du contenu attendu |
| **Error** | Bordure rouge `--color-danger` + message en Small sous le champ |

#### Empty states (écrans vides)

Chaque liste ou zone de contenu vide affiche :
- Illustration simple (icône ou SVG léger)
- Message explicatif (ex : "Aucune séquence créée")
- CTA principal (ex : bouton "Créer votre première séquence")

#### Cards

- Fond `--color-surface`, ombre `--shadow-card`
- Padding : 16 px (standard), 10-14 px (compacte dans listes)
- Hover : ombre → `--shadow-floating` + `translateY(-1px)`, transition 0.2s ease
- Titre en font-size 13-14px `font-weight: 600` + métadonnées en 11-12px `--color-text-muted`
- **Border-left coloré** (4px) pour le tagging matière ou statut
- **Border-top coloré** (3px) pour les cartes indicateurs (turquoise = normal, orange = alerte)
- Actions (icônes/boutons ghost) en haut à droite ou en bas

#### Sidebar / Menu latéral

- Largeur : 220 px (compact wireframe), 260-280 px (standard), 300 px (confort)
- Items : hauteur 36px, padding `8px 12px`, indent de 16px par niveau hiérarchique
- Sélection active : fond `primary` à 10%, barre gauche 3px solid `--color-primary`, texte primary, `font-weight: 600`
- Hover : fond `primary` à 6%
- Séparateurs de sections : texte 10px uppercase, `letter-spacing: 1px`, `--color-text-muted`, padding-top 12px, margin-top 8px

#### Tables / Listes

- Hauteur de ligne : 40-44 px
- Header sticky si liste longue

#### Modals / Drawers

- Drawer droit (édition) : 420-520 px
- Modal (preview) : 720-960 px

---

## 4. Architecture UI et navigation

### 4.1 Layout global

```
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER (52px) turquoise                                              │
│ [🎓 Teacher Assistant] [🔍 Rechercher...] ──── [🤖 IA] [🔔³] [🟢] [⚙] [YD]│
├──────────────────────────────────────────────────────────────────────┤
│ TABS (42px) blanc, border-bottom gris                                │
│ 📊 Dashboard | 📚 Programme | 🧩 Préparation | 📅 Planning |        │
│ 📝 Cahier de textes | 📊 Évaluation                                 │
│ Tab actif: font-weight 600 + border-bottom 2px turquoise            │
├────────────┬─────────────────────────────────────┬───────────────────┤
│ SIDEBAR    │ MAIN CONTENT                        │ INSPECTOR         │
│ (220px)    │ (flex, max 1600px)                  │ (360-420px)       │
│ fond blanc │ fond --color-bg                     │ fond blanc        │
│ border-R   │ padding 20px                        │ Drawer si <1400   │
└────────────┴─────────────────────────────────────┴───────────────────┘
```

### 4.2 Header global (52px, fond turquoise)

Barre horizontale à fond `--color-primary`, texte et icônes blancs.

| Élément | Position | Style | Rôle |
|---|---|---|---|
| **🎓 Teacher Assistant** | Gauche | Logo emoji + texte 15px bold, `letter-spacing: -0.5px` | Identité |
| **Barre de recherche** | Centre-gauche | Fond `rgba(255,255,255,0.15)`, `border-radius: 16px`, hauteur 32px, icône loupe + placeholder "Rechercher..." en blanc 60% | Recherche transversale |
| **🤖 IA** | Droite | Icône + label "IA", texte blanc 80%, cliquable | Accès rapide générateur IA |
| **🔔 Notifications** | Droite | Icône cloche, badge compteur rond (14×14px, fond `--color-accent`, texte blanc 9px bold) | Centre de notifications |
| **🟢 Connectivité** | Droite | Pastille 6×6px, `border-radius: 50%`, vert = connecté, gris = hors-ligne | Indicateur réseau |
| **⚙️ Paramètres** | Droite | Icône engrenage, texte blanc 80% | Ouvre les paramètres |
| **Avatar** | Extrême droite | Cercle 28×28px, fond `rgba(255,255,255,0.2)`, initiales blanches 12px bold | Identité utilisateur |

### 4.3 Tabs horizontaux (42px, fond blanc)

Barre d'onglets sous le header, avec `border-bottom: 1px solid --border-default`.

| État | Style |
|---|---|
| **Tab actif** | Texte `--color-primary`, `font-weight: 600`, `border-bottom: 2px solid --color-primary` |
| **Tab inactif** | Texte `--color-text-muted`, `font-weight: 400`, `border-bottom: 2px solid transparent` |

Chaque tab contient une icône SVG 18×18 + un label en font-size 13px, `gap: 6px`, `padding: 0 16px`. Alignement vertical centré.

**6 tabs** par logique métier :

| Tab | Icône | Contenu (sidebar) |
|---|---|---|
| 📊 **Dashboard** | Grille 4 carrés | Tableau de bord quotidien (pas de sidebar) |
| 📚 **Programme** | Livre | Programmes officiels + Progression annuelle |
| 🧩 **Préparation** | Couches | Séquences & séances + Bibliothèque + Générateur IA |
| 📅 **Planning** | Calendrier | Emploi du temps + Calendrier scolaire |
| 📝 **Cahier de textes** | Document ligné | Trace officielle des cours |
| 📊 **Évaluation** | Barres graphique | Devoirs & corrections + Suivi élèves + Bulletins |

Les **Paramètres** sont accessibles via l'icône ⚙️ dans le header (pas un tab).

### 4.4 Menus latéraux contextuels

Chaque tab charge un menu latéral spécifique. Le menu utilise le composant `SidebarItem` avec indentation hiérarchique et les séparateurs de sections décrits en §3.5.

**Programme** :
```
Programme officiel          (actif par défaut)
  HGGSP                     (indent 1)
  Histoire                  (indent 1)
  Géographie                (indent 1)
Progression annuelle        (séparateur section)
  Par matière               (indent 1)
  Par classe                (indent 1)
  Vue timeline              (indent 1)
  Vue liste                 (indent 1)
```

**Préparation** :
```
── SÉQUENCES ──             (label section uppercase)
  Toutes les séquences      (indent 1)
  En cours                  (indent 1)
  Templates                 (indent 1)
── BIBLIOTHÈQUE ──
  Récents                   (indent 1, vue par défaut)
  Par matière               (indent 1)
── GÉNÉRATEUR IA ──
  Générer contenu           (indent 1)
  Historique                (indent 1)
```

**Planning** :
```
Emploi du temps
  Vue semaine               (indent 1)
  Import                    (indent 1)
Calendrier scolaire
  Vue annuelle              (indent 1)
```

**Cahier de textes** :
```
Terminale 2                 (items = classes)
Terminale 4
Première 3
```

**Évaluation** :
```
── DEVOIRS & CORRECTIONS ──
  Liste devoirs             (indent 1)
  Correction en série       (indent 1)
  Bilan devoir              (indent 1)
── ÉLÈVES ──
  Par classe                (indent 1)
  Fiche élève               (indent 1)
── BULLETINS ──
```

### 4.5 Centre de notifications

Accessible via l'icône **🔔** dans le header avec badge compteur orange.

**Types de notifications** :

| Type | Exemple | Priorité |
|---|---|---|
| **Alerte pédagogique** | Séquence en retard, programme non couvert | Haute |
| **Rappel** | Cahier de textes non rempli, correction en attente | Moyenne |
| **Système** | Sync Google échouée, requête IA en attente, sauvegarde effectuée | Basse |
| **Info** | Contenu IA généré et prêt, import terminé | Basse |

Le panneau notifications (drawer droit) permet : marquer comme lu, cliquer pour naviguer vers l'élément concerné, tout marquer comme lu.

### 4.6 Breakpoints responsive

| Plage | Mode | Sidebar | Inspector | Main |
|---|---|---|---|---|
| < 1400 px | Compact | 220 px | Drawer overlay | Prioritaire |
| 1400-2200 px | Standard | 260-280 px | 360 px | Flexible |
| > 2200 px | Confort | 300 px | 420 px | max-width 1600-1800 px centré |

### 4.7 Routing logique

```
/dashboard
/programme
/programme/hggsp/terminale/theme-2
/programme/progression
/programme/progression/terminale-hggsp
/preparation/sequences
/preparation/sequences/12
/preparation/sequences/12/seance/3
/preparation/bibliotheque
/preparation/bibliotheque/recents
/preparation/bibliotheque/document/45
/preparation/ia/generer
/preparation/ia/historique
/planning/edt
/planning/calendrier
/cahier-de-textes
/cahier-de-textes/terminale-2
/evaluation/devoirs
/evaluation/devoirs/8
/evaluation/devoirs/8/correction-serie
/evaluation/devoirs/8/bilan
/evaluation/eleves
/evaluation/eleves/classe/terminale-2
/evaluation/eleves/12
/evaluation/eleves/12/competences
/evaluation/bulletins
/parametres
/parametres/annee-scolaire
/parametres/ia
```

### 4.8 Comportements UX globaux

- **Changement de tab** : la sidebar se recharge, le contenu change de contexte, l'état précédent est conservé (filtres actifs, scroll position)
- **Tabs actifs** : texte turquoise + `border-bottom 2px solid primary` ; inactifs : texte `--color-text-muted`
- **Sidebar active** : fond `primary 10%` + barre gauche 3px turquoise + texte primary bold ; hover : fond `primary 6%`
- **Breadcrumb** : affiché en haut du contenu pour la navigation hiérarchique
- **Sauvegarde automatique** : pas de bouton "Enregistrer" sauf actions critiques
- **Toasts** : confirmation des actions (ex : "Entrée enregistrée")
- **Hover cards** : ombre renforcée + `translateY(-1px)`, transition 0.2s
- **Skeleton loading** : lors du chargement, blocs gris animés (pulse CSS) mimant la structure
- **Empty states** : illustration + message + CTA sur chaque zone vide

---

## 5. Écrans détaillés

### 5.1 Dashboard

**Rôle** : Porte d'entrée quotidienne — répondre à "Qu'est-ce que j'ai à faire aujourd'hui ?"

**Pas de sidebar** : le dashboard occupe toute la zone de contenu.

#### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ INDICATEURS RAPIDES — grille 5 colonnes, gap 12px            │
│ [📚 Séq. en cours: 3] [📅 Séances semaine: 8] [⏱ Heures:    │
│  42/90] [📝 Cahier: 2 ⚠] [✏️ Corrections: 15 ⚠]            │
├──────────────────────────────────────────────────────────────┤
│ MINI-TIMELINE SEMAINE — grille 5 colonnes, gap 6px           │
│ Lun 24 | Mar 25 | Mer 26 | Jeu 27 ● | Ven 28               │
│ (blocs colorés par matière dans chaque jour)                 │
├──────────────────────────────┬───────────────────────────────┤
│ AUJOURD'HUI (EDT du jour)   │ ALERTES + COUVERTURE PROGRAMME│
│ (créneaux avec badges)      │ (notifications + barres %)    │
├──────────────────────────────┴───────────────────────────────┤
│ ACCÈS RAPIDES — boutons en ligne                             │
└──────────────────────────────────────────────────────────────┘
```

#### Indicateurs rapides

5 cards en grille, chacune avec `border-top: 3px solid` (turquoise pour les indicateurs normaux, orange `--color-warn` si alerte).

| Indicateur | Valeur exemple | Icône | border-top |
|---|---|---|---|
| Séquences en cours | `3` | 📚 | turquoise |
| Séances cette semaine | `8` | 📅 | turquoise |
| Heures réalisées | `42/90` | ⏱ | turquoise |
| Cahier à compléter | `2` | 📝 | **orange** (alerte) |
| Corrections en attente | `15` | ✏️ | **orange** (alerte) |

Chaque card : icône emoji 22px centré, valeur 22px bold, label 11px `--color-text-muted`. Cliquable → navigue vers l'écran concerné.

#### Mini-timeline semaine

Card contenant une grille 5 colonnes (Lun → Ven). Titre : "Semaine du 24 février" en font 13px bold.

Chaque colonne jour :
- Header : abréviation + numéro (ex: "Lun 24"), 11px bold. Le jour actuel a un fond `primary 15%` et un `border-radius: 4px`.
- Créneaux : petits blocs empilés verticalement (`gap: 3px`), chacun avec `border-left: 3px solid [couleur matière]`, fond matière 18% d'opacité, `border-radius: 4px`, `padding: 3px 6px`. Contenu : nom matière en bold couleur matière (10-11px), horaire en `--color-text-muted` (10px).

Clic sur un jour = filtre le bloc "Aujourd'hui" sur ce jour.

#### Bloc Aujourd'hui

Card avec titre "📅 Aujourd'hui — Jeudi 27" en font 14px bold.

Chaque créneau : ligne horizontale avec `background: --color-bg`, `border-radius: --radius-xs`, `border-left: 3px solid [couleur matière]`, padding 10px 12px, gap 12px.

| Élément | Style |
|---|---|
| Horaire | 12px bold `--color-text-muted`, largeur fixe 60px |
| Matière + classe | 13px bold `--color-text` (ex: "HGGSP — Tle 2") |
| Badge statut | Badge composant : vert "Séance prête" ou orange "À préparer" |

Sous les créneaux : deux boutons — `[+ Créer séance]` (primary S) + `[Cahier de textes]` (secondary S).

#### Bloc Alertes

Card avec titre "⚠️ Alertes" en font 14px bold.

Chaque alerte : ligne avec `border-left: 3px solid` (rouge pour danger, orange pour warn), fond `danger 8%` ou `warn 8%`, `border-radius: --radius-xs`, padding 8px 10px, icône triangle + texte 12px.

Exemples :
- 🔴 "Séquence 'Guerre froide' en retard (–2 sem.)"
- 🟡 "Cahier de textes du 25/02 non rempli"
- 🟡 "15 copies Tle 2 à corriger"

Clic → navigue vers l'élément concerné.

#### Bloc Couverture programme

Card avec titre "📊 Couverture programme" en font 14px bold.

Pour chaque thème, une ligne : label (11px `--color-text`) + pourcentage (11px bold, couleur matière) + barre de progression (hauteur 6px, `border-radius: 6px`, fond couleur matière 20% d'opacité, remplissage couleur matière). La largeur de remplissage correspond au % de couverture.

Exemples :
- HGGSP Tle — Thème 1 : 85% (barre violet)
- Histoire Tle — Thème 1 : 100% (barre bleu marine)
- Géo Tle — Thème 1 : 60% (barre vert forêt)

#### Accès rapides

Ligne de boutons en bas du dashboard :
- `[Créer séance]` (primary M)
- `[Générer contenu IA]` (secondary M)
- `[Ajouter document]` (secondary M)
- `[Voir progression]` (secondary M)

#### États du système

- Journée avec cours → affichage complet
- Journée sans cours → suggestions (préparer séance, créer contenu)
- Année non configurée → empty state "Configurer l'année scolaire" + CTA

---

### 5.2 Calendrier scolaire

**Rôle** : Définir les périodes non travaillées pour ancrer la planification dans le réel.

**Accès** : Tab Planning → Calendrier scolaire

#### Layout

```
┌───────────────────────────────┬──────────────────────┐
│ CALENDRIER ANNUEL (Sept→Juin) │ PARAMÈTRES           │
│ Affichage mensuel vertical    │ Année scolaire       │
│ avec codes couleurs           │ Vacances (4 blocs)   │
│                               │ Jours fériés (+)     │
│                               │ Autres périodes      │
└───────────────────────────────┴──────────────────────┘
```

#### Fonctionnalités

- Résumé automatique en haut : semaines travaillées, semaines non travaillées, jours fériés
- Clic sur une date → ajouter période
- Code couleur par type : vacances = fond rose `#FDEAEA`, fériés = ligne rouge `--color-danger`, examens = fond orange clair `#FEF3E2`, fermeture = hachuré gris
- Vue "liste des périodes" sous le formulaire pour vérification rapide
- Calculs automatiques alimentant la progression annuelle et l'estimation IA

---

### 5.3 Emploi du temps (EDT)

**Rôle** : Visualiser et gérer l'emploi du temps hebdomadaire.

**Accès** : Tab Planning → Emploi du temps

#### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ BARRE SUPÉRIEURE                                                 │
│ Titre "Emploi du temps" (16px bold)                              │
│ ──── [Toggle: Toutes | Q1 | Q2] [Importer ICS] [Google Calendar]│
├──────────────────────────────────────────────────────────────────┤
│ GRILLE HEBDOMADAIRE                                              │
│ 50px colonne heures + 5 colonnes jours égales                    │
│ Header turquoise : Lundi | Mardi | Mercredi | Jeudi | Vendredi  │
│ Lignes horaires 8h→16h, hauteur 36px par heure                  │
│ Créneaux colorés par matière, positionnés en absolute            │
│ Bandes grisées pour les pauses (12h-13h)                         │
└──────────────────────────────────────────────────────────────────┘
```

#### Toggle Q1/Q2

Contrôle segmenté horizontal : fond `--color-bg`, `border-radius: --radius-xs`, `border: 1px solid --border-default`. 3 segments (Toutes | Q1 | Q2).

| Segment | Style actif | Style inactif |
|---|---|---|
| Sélectionné | Fond `--color-primary`, texte blanc, 12px bold | — |
| Non sélectionné | — | Fond transparent, texte `--color-text-muted`, 12px normal |

#### Grille EDT

Structure : `display: grid; grid-template-columns: 50px repeat(5, 1fr)`.

- **Header jour** : fond `--color-primary`, texte blanc, 12px bold, centré, padding 8px
- **Cellule heure** (colonne gauche) : 10px `--color-text-muted`, centré, padding 8px 4px. Label "Pause" en 8px rouge pour les lignes 12h-13h
- **Cellules contenu** : `border-top: 1px solid --border-default`, `border-left: 1px solid --border-default`, hauteur minimale 36px
- **Bandes pause** : fond `--border-default` à 40% d'opacité sur les lignes 12h-13h

#### Créneaux de cours

Positionnés en `position: absolute` dans les cellules, span sur la hauteur correspondante (ex: 2h = 72px).

Style : `border-left: 3px solid [couleur matière]`, fond matière 15% opacité, `border-radius: 4px`, padding `4px 6px`. Contenu :
- Matière : 11px bold, couleur matière
- Classe : 10px `--color-text-muted`

Clic → édition (drawer) ou création de séance liée. Drag & drop pour déplacer.

#### Boutons d'import

Deux boutons secondary S en haut à droite : `[Importer ICS]` et `[Google Calendar]`.

**Tables associées** : `timetable_slots`, `school_day_settings`, `day_breaks`, `calendar_events`, `calendar_event_mapping`

---

### 5.4 Programme officiel et Progression annuelle

**Accès** : Tab Programme

#### Écran Programme officiel

**Rôle** : Référentiel des programmes par matière et niveau.

**Barre supérieure** : contexte "HGGSP — Terminale" en 11px `--color-text-muted` + titre "Programme officiel" en 16px bold. Boutons à droite : `[Importer (JSON/CSV)]` (secondary S) + `[+ Ajouter thème]` (primary S).

**Contenu** : liste de cards dépliables (accordéon), une par thème.

##### Card thème (replié)

- `border-left: 4px solid [couleur matière]`
- Ligne : chevron (▶ replié / ▼ déplié, 14×14) + titre thème en 14px bold
- À droite : badge couverture `85% couvert` (vert si 100%, turquoise sinon) ou `Non commencé` (gris)

##### Card thème (déplié)

Sous le titre, `padding-left: 22px` (aligné après le chevron) :

Chaque chapitre : ligne sur fond `--color-bg`, `border-radius: --radius-xs`, padding 8px 12px, margin-bottom 4px. Contenu : "Chapitre N — Titre" en 13px. À droite : badges `[2 séquences]` (couleur matière) + `[✓ évalué]` (vert).

#### Import du programme

Trois modes prévus :
- **JSON structuré** : format défini par l'application (export/import entre installations)
- **CSV simple** : colonnes thème, chapitre, point, code
- **Parsing IA du Bulletin Officiel** (phase 2) : upload d'un PDF du BO → extraction automatique de la structure

---

#### Écran Progression annuelle

**Rôle** : Planifier les séquences dans l'année via une timeline visuelle.

##### Layout

```
┌────────────────────┬──────────────────────────────────────────────┐
│ SÉQUENCES DISPO    │ TIMELINE HORIZONTALE                         │
│ (220px, scrollable)│ Sept | Oct | Nov | Déc | Jan | Fév | ...    │
│                    │ ▓▓▓ Vacances (bandes hachurées + label)     │
│ Titre 13px bold    │                                              │
│ [Heures: 35/90]    │ ═══Séq 1═══  ════Séq 2════  ═══Séq 3═══   │
│ badge primary      │ (barres colorées, positionnées en %)        │
│                    │                                              │
│ Cards séquences    │ Hauteur: 36px par séquence                  │
│ (draggable)        │ Top: 24px + i * 46px                        │
│                    │                                              │
│ [+ Nouvelle séq.]  │                                              │
└────────────────────┴──────────────────────────────────────────────┘
```

##### Panneau séquences (gauche, 220px)

- Titre "Séquences disponibles" en 13px bold
- Badge info : "Heures programmées : 35 / 90" en fond `primary 10%`, texte `--color-primary`, 12px bold
- Cards séquences empilées verticalement (`gap: 8px`), chacune avec `border-left: 4px solid [couleur matière]`, padding 10px. Contenu : titre 12px bold + "Xh prévues" 11px `--color-text-muted`
- Les cartes sont draggable (`cursor: grab`) vers la timeline
- Bouton `[+ Nouvelle séquence]` (secondary S) en bas

##### Timeline (zone principale)

- **Header mois** : grille de 10 colonnes égales (Sept → Juin), chaque mois centré en 11px bold `--color-text-muted`, `border-bottom: 1px solid --border-default`
- **Zone séquences** : position relative, hauteur ~220px

**Bandes de vacances** : `position: absolute`, top 0 → bottom 0, largeur proportionnelle à la durée. Style : `background: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(danger, 0.06) 4px, rgba(danger, 0.06) 8px)` (hachuré diagonal léger), `border-left: 2px dashed [danger à 40%]`. Label vacances en 9px bold `--color-danger`, centré en haut.

**Barres séquences** : `position: absolute`, positionnées en `left: (start/10)*100%`, `width: (duration/10)*100%`, hauteur 36px, top calculé par index (`24 + i * 46` px). Style : fond matière 20% opacité, `border-left: 4px solid [couleur matière]`, `border-radius: --radius-xs`, `box-shadow: --shadow-card`, padding `4px 8px`. Texte : nom séquence en 11px bold couleur matière, `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`. Curseur pointer.

---

### 5.5 Séquences et séances

**Accès** : Tab Préparation → Séquences

**Rôle** : Cœur pédagogique — préparer le contenu des cours.

#### Système de templates de séquences

- **Sauvegarder comme template** : depuis toute séquence existante (sans dates ni classe)
- **Bibliothèque de templates** : accessible dans la sidebar (Préparation → Séquences → Templates)
- **Instancier un template** : pré-remplit la séquence + ses séances, l'enseignant ajuste dates/classe
- **Export / Import** (phase 2) : partage de templates au format JSON

#### Gestion multi-classes

Une séquence peut être assignée à **plusieurs classes** simultanément via la table `sequence_classes`. Cela évite de maintenir des copies quasi identiques.

#### En-tête de séquence

- Contexte : "Terminale 2, Terminale 4" en 11px `--color-text-muted`
- Titre : "Séquence — La Guerre froide" en 16px bold
- Badges à droite : `[HGGSP]` (violet) + `[8h prévues]` (turquoise) + `[✓ évaluée]` (vert)
- Boutons sous le titre : `[📋 Sauver comme template]` (secondary S) + `[🤖 Générer plan IA]` (secondary S) + `[+ Ajouter séance]` (primary S)

#### Accordéon des séances

Chaque séance est une card avec `border-left: 4px solid [couleur statut]` (vert si "done", turquoise si "planned"), padding 0, overflow hidden.

##### Ligne repliée (header cliquable)

Padding `12px 16px`, `cursor: pointer`, `display: flex`, `justify-content: space-between`.

- Gauche : chevron (▶/▼) + "Séance N — Titre" en 13px bold
- Droite : badges en ligne — `[⏱ 2h]` (gris info) + `[📄 4]` (gris info, nb documents) + `[✓ Réalisée]` (vert) ou `[Prévue]` (bleu info)

##### Contenu déplié

`padding: 0 16px 16px`, `border-top: 1px solid --border-default`, margin-top 12px.

**Grille 2 colonnes** (`gap: 12px`) :

| Colonne gauche | Colonne droite |
|---|---|
| **🎯 Objectifs** (12px bold `--color-text-muted` titre) | **📚 Documents** (12px bold `--color-text-muted` titre) |
| Texte objectif en 12px, `line-height: 1.6` | Liste fichiers : icône document + nom, 12px, padding `3px 0` |
| Badges capacités en dessous (badges couleur matière) | |

**Déroulé** (pleine largeur sous la grille) : titre "📋 Déroulé" en 12px bold `--color-text-muted`, puis étapes numérotées en 12px, `line-height: 1.7`.

**Boutons d'action** (sous le déroulé, gap 8px) : `[🤖 Générer déroulé IA]` (secondary S) + `[📝 Cahier de textes]` (secondary S) + `[Ouvrir en plein écran]` (ghost S).

#### Modes de création

- **Manuel** : bouton "+ Ajouter séance"
- **Depuis template** : instancier un template de séquence
- **Assisté IA** : bouton "Générer plan de séances"
- **Duplication** : dupliquer une séance existante
- **Depuis EDT** : clic créneau → créer séance (auto-remplit classe + durée)

#### Vue détaillée séance (plein écran)

```
┌───────────────────────────────┬────────────────────┐
│ CONTENU DE LA SÉANCE          │ OUTILS             │
│ (éditeur principal)           │ Objectifs          │
│                               │ Documents          │
│                               │ IA                 │
└───────────────────────────────┴────────────────────┘
```

---

### 5.6 Cahier de textes

**Accès** : Tab Cahier de textes

**Rôle** : Trace officielle des cours réalisés.

#### Barre supérieure

Titre "Cahier de textes" (16px bold) + boutons à droite : `[Export PDF]` (secondary S) + `[+ Nouvelle entrée]` (primary S).

#### Filtres par classe

Sous la barre supérieure, ligne de badges cliquables (pas un menu) : `[Tle 2]` `[Tle 4]` `[1ère 3]`. Badge actif : texte `--color-primary`, fond primary 15%. Badge inactif : texte `--color-text-muted`, fond `--color-bg`.

#### Liste chronologique

Empilement vertical de cards (`gap: 10px`), chacune avec `border-left: 4px solid [couleur matière]`.

##### Contenu d'une entrée

**Ligne supérieure** (`display: flex`, `justify-content: space-between`) :
- Gauche : date en 18px bold + jour en 12px `--color-text-muted` + badge matière + badge classe
- Droite : badge `[Séance liée]` (vert) ou `[⚠ Non liée]` (orange)

**Corps** :
- Titre/contenu du cours en 13px bold
- Activités en 12px `--color-text-muted`, préfixé "Activités :"
- Devoirs (si présents) en 12px `--color-accent`, `font-weight: 500`, préfixé "📌 Devoirs :"

**Boutons** (en bas, ghost S) : `[Modifier]` + `[Ouvrir séance]`.

**Relation** : `lesson_log.session_id → sessions.id`

---

### 5.7 Bibliothèque documentaire

**Accès** : Tab Préparation → Bibliothèque

**Rôle** : Retrouver, prévisualiser et réutiliser les documents pédagogiques.

#### Barre supérieure

Titre "Bibliothèque — Récents" (16px bold). À droite : barre de recherche (input avec icône loupe, fond `--color-surface`, `border: 1px solid --border-default`, `border-radius: --radius-xs`, 12px, placeholder "Rechercher...") + bouton `[+ Importer]` (primary S).

#### Filtres badges

Ligne de badges cliquables sous la barre supérieure : `[Récents]` (actif par défaut, primary 15%) + `[Par matière]` + `[Par niveau]` + `[Tags]` (inactifs, fond `--color-bg`).

#### Grille de documents

`display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px`.

##### Card document

`border-top: 3px solid [couleur matière]`.

**Zone miniature** (haut) : hauteur 80px, fond matière 8% opacité, `border-radius: --radius-xs`, centré. Icône type : 📄 (PDF), 🖼 (Image), 📊 (PPTX), en 24px, couleur matière.

**Informations** (bas) :
- Titre : 13px bold, `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- Ligne badges : badge matière + badge `[✨ IA]` (bleu info) si généré par IA + date en 10px `--color-text-muted` alignée à droite (`margin-left: auto`)

#### Zone de dépôt (drag & drop)

En bas de la grille : zone avec `border: 2px dashed --border-default`, `border-radius: --radius-s`, padding 20px, texte centré 13px `--color-text-muted` : "📁 Glissez vos documents ici pour les importer".

**Pipeline import** : Ingestion → Extraction texte → Classification (règles + IA) → Routage automatique. Validation en 2 clics.

**Types gérés** : PDF, PPTX, DOCX, images.

---

### 5.8 Générateur IA

**Accès** : Tab Préparation → Générateur IA

**Rôle** : Interface centralisée pour la génération de contenus pédagogiques.

**Menu latéral** : Générer contenu | Historique | Prompts | Templates

**Fonctionnalités** :
- Génération de : cours, fiches de révision, sujets d'évaluation, corrigés, diaporamas, activités, traces écrites
- Contexte pédagogique en entrée : programme, capacités, niveau, documents, type d'évaluation
- Prompts personnalisables par type de contenu
- Historique des générations (traçabilité)
- Documents générés rangés dans la bibliothèque avec badge IA
- File d'attente pour les requêtes hors-ligne

**Paramètres IA** (dans Paramètres) :
- Modèle, style, niveau de détail, citation, langue, cible
- Clé API stockée chiffrée côté OS (pas en SQLite)

---

### 5.9 Corrections et évaluations

**Accès** : Tab Évaluation → Devoirs & corrections

#### Écran Liste des devoirs

Barre supérieure : titre + bouton `[+ Nouveau]` (primary). Filtres sidebar : Statut corr., Type exercice, Compétences, Tags. Tableau avec colonnes Date | Devoir | Type | Corrections (badge progression "15/28") | Compétences.

Chaque devoir est **lié à une séquence** (`assignments.sequence_id`).

---

#### Écran Correction en série (batch)

Optimisé pour corriger 20-35 copies. Layout 3 colonnes :

```
┌──────────────────────┬────────────────────────────┬──────────────────┐
│ A. LISTE ÉLÈVES      │ B. COPIE + CORRECTION      │ C. GRILLE        │
│ (200px)              │ (flex)                     │ COMPÉTENCES      │
│                      │                            │ (240px)          │
└──────────────────────┴────────────────────────────┴──────────────────┘
```

##### Colonne A — Liste élèves (200px)

Card sans hover, padding 8px. Titre "Élèves (28)" en 12px bold, padding `4px 8px`.

Chaque élève : ligne `padding: 6px 8px`, `border-radius: --radius-xs`, `font-size: 12px`. Contenu : icône statut + nom (flex 1) + score si disponible (11px bold `--color-text-muted`).

**Icônes de statut** :
- ✅ = Final (vert)
- ⚠ = À confirmer (orange)
- ⏳ = IA en cours (bleu)
- ⬜ = Non commencé (gris)

L'élève sélectionné a un fond `primary 10%` et un `font-weight: 600`.

##### Colonne B — Copie + Correction (flex)

Card sans hover, padding 12px.

**Barre supérieure** : nom élève en 13px bold + "Note: 11/20" en 12px `--color-text-muted`. Boutons ghost S à droite : `[⬅ Préc.]` + `[Suiv. ➡]`.

**Zone split** (`grid 2 colonnes, gap 8px`) :
- Gauche : zone "📄 Aperçu copie (PDF viewer)", fond `--color-bg`, `border-radius: --radius-xs`, hauteur 180px, centré 12px `--color-text-muted`
- Droite : zone correction éditeur, fond `--color-bg`, `border-radius: --radius-xs`, padding 12px. Titre "Correction" en bold `--color-text-muted` + texte libre en 12px, `line-height: 1.7`

**Boutons d'action** (sous le split) : `[🤖 Analyser (IA)]` (secondary S) + `[📥 Importer correction]` (secondary S) + `[✓ Finaliser]` (primary S).

##### Colonne C — Grille compétences (240px)

Card sans hover, padding 10px. Titre "Grille compétences" en 12px bold.

**Par compétence** (empilement vertical, margin-bottom 10px) :
- Nom compétence : 11px `--color-text-muted`
- 4 boutons de niveau en ligne (`gap: 4px`) :

| Bouton niveau | Style sélectionné | Style non sélectionné |
|---|---|---|
| Niveau actif | 32×28px, fond `--color-primary`, texte blanc, `border: 1px solid primary` | — |
| Niveaux inférieurs | — | 32×28px, fond `primary 30%`, texte primary, `border: 1px solid --border-default` |
| Niveaux supérieurs | — | 32×28px, fond `--color-bg`, texte `--color-text-muted`, `border: 1px solid --border-default` |

Tous : `border-radius: 6px`, `font-size: 12px`, `font-weight: 700`, `cursor: pointer`.

**Forces / Lacunes** (sous les grilles, séparées par `border-top: 1px solid --border-default`, padding-top 8px) :
- "✅ Forces" en 11px bold `--color-success`, puis items "•" en 11px
- "⚠ Lacunes" en 11px bold `--color-danger`, puis items "•" en 11px

Bouton pleine largeur en bas : `[Générer feedback IA]` (secondary S, centré).

##### Raccourcis clavier

J/K = élève suivant/précédent, 1-4 = niveau compétence, Tab = compétence suivante, F = finaliser, A = analyser IA, S = sauvegarder.

---

#### Écran Bilan devoir (synthèse classe)

**Rôle** : Après correction, synthèse automatique des résultats.

**En-tête** : "Bilan — Dissertation HGGSP (Tle 2)" en 16px bold + "28 copies corrigées — 12 février 2026" en 12px `--color-text-muted`.

##### Layout grille 2×2

```
┌──────────────────────────────┬───────────────────────────────┐
│ DISTRIBUTION NOTES           │ COMPÉTENCES MOYENNES          │
│ (histogramme)                │ (barres de progression)       │
├──────────────────────────────┼───────────────────────────────┤
│ TOP 3 RÉUSSITES              │ TOP 3 LACUNES                 │
│ (card border-top verte)      │ (card border-top rouge)       │
└──────────────────────────────┴───────────────────────────────┘
```

##### Card Distribution des notes

Titre "📊 Distribution des notes" en 13px bold.

**Histogramme** : 8 barres verticales (`flex: 1`), hauteur proportionnelle (valeur × 13px), fond `--color-primary`, `border-radius: 3px 3px 0 0`. Labels en dessous : 2.5, 5, 7.5... 20 en 9px `--color-text-muted`.

**Statistiques** sous l'histogramme (`display: flex; justify-content: space-around`, 12px) : "Moy: **11.2**" | "Méd: **11**" | "Min: **4**" | "Max: **18**".

##### Card Compétences moyennes classe

Titre "🎯 Compétences (moyenne classe)" en 13px bold.

Pour chaque compétence, une ligne (margin-bottom 10px) :
- Nom + score ("Problématiser" ... "2.8/4") en `display: flex; justify-content: space-between`, 12px
- Score coloré : bold, vert si ≥ 3.0, orange si ≥ 2.5, rouge si < 2.5
- Barre de progression (hauteur 6px, même code couleur que le score)

##### Cards Top 3

- **Réussites** : `border-top: 3px solid --color-success`. Titre "✅ Top 3 réussites" en 13px bold `--color-success`. Items "•" en 12px.
- **Lacunes** : `border-top: 3px solid --color-danger`. Titre "⚠️ Top 3 lacunes" en 13px bold `--color-danger`. Items "•" en 12px.

##### Actions

Boutons sous la grille : `[🤖 Générer commentaire classe (IA)]` (primary) + `[Export PDF bilan]` (secondary).

---

### 5.10 Suivi des élèves

**Accès** : Tab Évaluation → Élèves

#### Écran Liste élèves

Vue par classe avec tableau : nom, badges, dernier devoir, profil compétences. Filtres par classe, période, statut.

#### Fiche élève (Hub)

##### En-tête

- Avatar : cercle 40×40px, fond `primary 20%`, icône utilisateur centrée
- Nom : "DUPONT Léa — Terminale 2" en 16px bold
- Sous-titre : "Née en 2008" en 12px `--color-text-muted`
- Badges à droite : `[T1 ✅]` (vert) + `[Cahier ⚠]` (orange)

##### Onglets internes

Barre d'onglets horizontale avec `border-bottom: 2px solid --border-default`. 8 onglets : Aperçu | Notes | Corrections | **Compétences** | Profil | Bulletins | Orientation | Docs.

Style tab actif : texte `--color-primary`, `font-weight: 600`, `border-bottom: 2px solid primary`, `margin-bottom: -2px`. Inactif : texte `--color-text-muted`, `font-weight: 400`.

##### Onglet Compétences (vue détaillée)

Layout 2 colonnes (`gap: 16px`).

**Colonne gauche — Niveau actuel par compétence**

Card titre "Niveau actuel par compétence" (13px bold).

Pour chaque compétence (5 ex: Problématiser, Construire un plan, Mobiliser connaissances, Rédaction, Analyser un document) :
- Ligne : nom + "N/4" (12px, `display: flex; justify-content: space-between`). Score en bold.
- **Barre segmentée 4 niveaux** : 4 divs en `flex: 1`, hauteur 8px, `border-radius: 4px`, `gap: 3px`. Les niveaux ≤ score = fond `--color-primary`, les niveaux > score = fond `primary 20%`.

**Colonne droite — Évolution sur l'année**

Card titre "Évolution sur l'année" (13px bold).

Badges périodes en haut : `[T1]` `[T2]` `[T3]`. T1/T2 en turquoise (actifs = données), T3 en gris (pas encore de données).

Pour chaque compétence, une ligne (`display: flex; align-items: center; gap: 8px`) :
- Nom compétence : 11px `--color-text-muted`, largeur fixe 140px
- **Pastilles rondes T1/T2/T3** : cercles 24×24px, `border-radius: 12px`, affichant le niveau (1-4) en 11px bold centré. Code couleur du fond et du texte :
  - Niveau ≥ 3 : fond `success 20%`, texte `--color-success`
  - Niveau 2 : fond `warn 20%`, texte `--color-warn`
  - Niveau 1 : fond `danger 20%`, texte `--color-danger`
- **Flèche tendance** : 10px bold, comparaison premier vs dernier niveau
  - ↗ en vert `--color-success` (progression)
  - ↘ en rouge `--color-danger` (régression)
  - → en gris `--color-text-muted` (stable)

##### Boutons d'action

Sous les colonnes : `[🤖 Générer appréciation]` (primary) + `[Voir bulletin T2]` (secondary).

##### Autres onglets (résumé)

- **Aperçu** : synthèse rapide, profil comportement/travail, mini-graphiques
- **Notes & Devoirs** : tableau filtrable TanStack Table
- **Corrections** : liste des copies avec feedback qualitatif
- **Profil période** : niveaux 1-5 (comportement, travail, participation, autonomie, méthode)
- **Bulletins** : appréciations avec versioning (draft → final)
- **Orientation** : rapports, entretiens, vœux Parcoursup
- **Documents** : pièces jointes classées par période

---

### 5.11 Paramètres

**Accès** : Icône ⚙️ dans le header (pas un tab)

**Rôle** : Configuration complète de l'application.

#### Layout

```
┌──────────────────────────────────────────────────────────┐
│ Titre "Paramètres" (16px bold)                           │
├──────────────────────────────────────────────────────────┤
│ GRILLE DE CARTES — 2 colonnes, gap 12px                  │
│ [📅 Année scolaire] [📚 Matières & volumes]              │
│ [🗓 Calendrier]     [🤖 IA & génération]                 │
│ [🖨 Export PDF]     [💾 Sauvegardes]                     │
│ [🎨 Interface]      [🎯 Capacités]                       │
└──────────────────────────────────────────────────────────┘
```

#### Card paramètre

Chaque section est une card cliquable avec padding 14px.

**Structure** : icône emoji 20px + colonne titre/description (`gap: 10px`) en haut, puis liste de détails en dessous.
- Titre : 14px bold `--color-text`
- Description : 11px `--color-text-muted`
- Détails : liste "•" en 12px `--color-text`, `padding-left: 30px`

| Section | Icône | Description | Détails |
|---|---|---|---|
| **Année scolaire** | 📅 | "2025–2026 (active)" | Dates, Nouvelle année depuis existante |
| **Matières & volumes** | 📚 | "3 matières configurées" | HG: 3h/sem, HGGSP: 6h/sem, Géo: 3h/sem |
| **Calendrier scolaire** | 🗓 | "Zone C — 30 sem. travaillées" | 5 périodes de vacances, 11 jours fériés |
| **IA & génération** | 🤖 | "GPT-4o configuré" | Style: pédagogique, 8 prompts personnalisés |
| **Export PDF** | 🖨 | "Identité configurée" | Lycée Victor Hugo, M. Durand — HGGSP |
| **Sauvegardes** | 💾 | "Dernière: aujourd'hui 08:00" | Auto: quotidienne, Emplacement |
| **Interface** | 🎨 | "Thème clair — Standard" | Taille: Standard (16px), Thème: Clair / Sombre |
| **Capacités** | 🎯 | "24 capacités définies" | 12 spécifiques exercice, 12 générales |

Clic sur une card → navigation vers la page de détail de cette section.

#### Fonction "Nouvelle année depuis existante"

Bouton dans Paramètres → Année scolaire. Copie :
- ✅ Programme officiel, Séquences → templates, Capacités, Paramètres IA, Types documents
- ❌ Élèves, notes, bulletins, cahier de textes, corrections

#### Sauvegardes

| Fonctionnalité | Détail |
|---|---|
| **Sauvegarde automatique** | Programmable, emplacement configurable |
| **Export complet** | SQLite + fichiers → ZIP |
| **Export sélectif** | Année, séquences/templates, bibliothèque |
| **Restauration** | Depuis ZIP |
| **Vérification d'intégrité** | Au lancement |

---

## 6. Modèle de données (synthèse)

### 6.1 Tables principales

#### Paramètres et cadre annuel

| Table | Rôle |
|---|---|
| `academic_years` | Années scolaires (label, dates, timezone) |
| `calendar_periods` | Vacances, fériés, examens (type, dates, impact) |
| `weekly_calendar_overrides` | Semaines exceptionnelles |
| `school_day_settings` | Structure journée (heure début, durée cours) |
| `day_breaks` | Pauses (récréation, déjeuner) |
| `subjects` | Matières enseignées |
| `levels` | Niveaux (Première, Terminale) |
| `classes` | Classes (nom, niveau, année) |
| `subject_hour_allocations` | Volumes horaires (matière × niveau × heures/semaine) |
| `subject_program_structures` | Structure attendue du programme |
| `teaching_scopes` | Matières enseignées pour une année |
| `notifications` | Centre de notifications (type, message, lien, lu/non lu, date) |

#### Programme et contenus

| Table | Rôle |
|---|---|
| `program_topics` | Arbre hiérarchique : thèmes → chapitres → points (parent_id, topic_type, sort_order) |
| `skills` | Capacités/compétences (exercise_specific / general, catégorie, matière, niveau) |
| `content_types` | Types de contenu IA avec prompts associés |
| `sequence_templates` | Templates de séquences réutilisables |

#### Séquences et séances

| Table | Rôle |
|---|---|
| `sequences` | Séquences pédagogiques (titre, durée, dates, statut, ordre) |
| `sequence_classes` | **Liaison N:N séquence ↔ classes** |
| `sequence_program_topics` | Liaison séquence ↔ programme (multi-chapitres, is_primary) |
| `sequence_skills` | Capacités travaillées par séquence |
| `sessions` | Séances (titre, durée, statut, ordre, source manual/ai) |
| `session_skills` | Capacités travaillées par séance |
| `session_documents` | Documents utilisés par séance |
| `lesson_log` | Cahier de textes (contenu, activités, devoirs) |

#### Emploi du temps

| Table | Rôle |
|---|---|
| `timetable_slots` | Créneaux structurels (jour, heures, classe, matière, récurrence Q1/Q2) |
| `calendar_events` | Événements importés (Google Calendar) |
| `calendar_event_mapping` | Mapping événement → classe/matière/salle |

#### Bibliothèque documentaire

| Table | Rôle |
|---|---|
| `documents` | Fichiers (titre, chemin, type, source, hash, miniature, extraction) |
| `document_sources` | Dossiers surveillés |
| `document_types` | Types (Cours, Diaporama, Fiche, Sujet, Corrigé) |
| `document_tags` | Tags libres |
| `document_tag_map` | Liaison document ↔ tags |
| `ingestion_jobs` | File d'import (statut, erreur) |
| `ingestion_suggestions` | Suggestions IA de classification |

#### IA et génération

| Table | Rôle |
|---|---|
| `ai_settings` | Configuration globale IA |
| `ai_generations` | Historique des générations |
| `ai_generation_documents` | Documents source pour une génération |
| `ai_request_queue` | File d'attente des requêtes IA hors-ligne |

#### Corrections et évaluations

| Table | Rôle |
|---|---|
| `assignments` | Devoirs (classe, type, date, barème, **sequence_id FK**) |
| `assignment_types` | Types d'exercice |
| `assignment_skill_map` | Compétences évaluées par devoir |
| `exercise_type_skill_map` | Sets de compétences par défaut par type d'exercice |
| `submissions` | Copies élèves (fichier, note) |
| `corrections` | Corrections (texte, source manual/ai) |
| `submission_skill_evaluations` | Niveau par compétence par copie (1-4, source, commentaire) |
| `feedback_items` | Critères/dimensions de feedback |
| `submission_feedback` | Réussites/lacunes qualitatives |

#### Suivi élèves

| Table | Rôle |
|---|---|
| `students` | Élèves (nom, prénom) |
| `student_class_enrollments` | **Liaison N:N élève ↔ classe** (gère changements d'année) |
| `report_periods` | Périodes de bulletin (T1, T2, T3) |
| `student_period_profiles` | Profil par période (comportement, travail, participation, autonomie, méthode 1-5) |
| `student_skill_observations` | Observations longitudinales par compétence |
| `bulletin_entries` | Appréciations bulletin (discipline / PP / conseil) |
| `bulletin_entry_versions` | **Historique des versions** d'appréciations |
| `orientation_reports` | Rapports d'orientation |
| `orientation_interviews` | Entretiens d'orientation |
| `student_documents` | Documents attachés à un élève |

#### Export et système

| Table | Rôle |
|---|---|
| `export_settings` | Identité PDF (nom, établissement, logo, pied de page) |
| `backup_log` | Journal des sauvegardes |
| `user_preferences` | Préférences interface (thème, taille UI, vue par défaut) |

### 6.2 Relations structurantes clés

1. **Programme hiérarchique** : `program_topics.parent_id → program_topics.id`
2. **Séquence ↔ Programme multi** : `sequence_program_topics`
3. **Séquence ↔ Classes multi** : `sequence_classes`
4. **Devoir ↔ Séquence** : `assignments.sequence_id → sequences.id`
5. **Élève ↔ Classes** : `student_class_enrollments`
6. **Génération IA ↔ Documents** : `ai_generation_documents` + `documents.generated_from_ai_generation_id`
7. **Appréciations versionnées** : `bulletin_entry_versions`

---

## 7. Fonctionnalités IA (synthèse transversale)

L'IA intervient à plusieurs niveaux, toujours en mode **proposition** (l'enseignant valide) :

| Contexte | Fonctionnalité IA | Statut |
|---|---|---|
| **Programme** | Parser un PDF du BO → extraction structure | Partiellement implémenté — l'infrastructure document (import + extracted_text + injection dans le prompt) est en place; pas de tâche IA dédiée "Extraire programme officiel" dans le catalogue |
| **Séquences** | Proposer un découpage en séances | **Implémenté** — bouton "Plan IA" dans `SequenceDetailPage` (`taskCode: generate_sequence_plan`) |
| **Séances** | Générer déroulé, activités, trace écrite | **Implémenté** — bouton "Générer déroulé IA" dans `SequenceDetailPage` |
| **Cahier de textes** | Synthétiser depuis la séance | Partiel — entrée Cahier créée depuis la séance, mais pas de génération IA automatique du résumé |
| **Bibliothèque** | Classifier et router les documents importés | Partiel — table `ingestion_suggestions` et `documentUploadService` présents; routing IA non câblé |
| **Corrections** | Analyser copie → niveaux compétences + réussites/lacunes | **Implémenté** — `CorrectionSeriePage` → "Générer feedback IA" via `smartCorrect` |
| **Bilan devoir** | Commentaire synthétique classe | **Implémenté** — `BilanDevoirPage` génère un commentaire IA sur stats réelles du devoir |
| **Bulletins** | Appréciations discipline et PP | **Implémenté** — `BulletinsPage` (batch) et `FicheElevePage` (unitaire) via `aiBulletinService` |
| **Orientation** | Synthèse forces, axes de progrès, recommandations | **Non implémenté** — données d'orientation lues (rapports, entretiens) mais aucune génération IA orientée orientation |
| **Contenus** | Cours, fiches, sujets, corrigés, diaporamas | **Implémenté** — cœur du `GenerateurIAPage`, 41 tâches prédéfinies en 5 catégories |
| **Documents** | Travailler à partir d'un document de référence (PDF, DOCX) | **Implémenté** — pièces jointes dans `GenerateurIAPage` (bibliothèque + fichiers ad-hoc), injection dans `assemblePrompt()` |

**Usages implémentables à court terme** (infrastructure déjà en place) :

| Usage | Effort estimé | Prérequis déjà disponibles |
|---|---|---|
| Tâche IA "Extraire structure programme officiel" | Faible — ajouter une tâche au catalogue | `extracted_text` PDF + injection document |
| Synthèse IA cahier de textes depuis séance | Faible — bouton dans `CahierEntreeForm` | `lessonLogService`, `sequenceService`, `assemblePrompt` |
| Orientation IA (synthèse parcours élève) | Moyen — nouvelle tâche + variables élève/notes/compétences | `orientationService`, `studentService`, `assemblePrompt` |
| Routing IA bibliothèque (suggestion matière/type) | Moyen — post-import, appel `assemblePrompt` sur `extracted_text` | `documentUploadService`, `ingestion_suggestions`, catalogue IA |
| **Import copies par lot + correction IA batch** | Élevé — UI multi-fichiers + mapping élève + pipeline batch | `submissionService`, `smartCorrect`, mammoth/pdfjs |
| Classification auto des séquences par niveau/thème | Moyen — analyse du `default_template` ou description séquence | `sequenceService`, `assemblePrompt`, `aiTaskService` |

**Pipeline correction IA** : Import correction → Analyse texte → Mapping capacités → `submission_skill_evaluations` → `submission_feedback`.

**Gestion hors-ligne IA** : requêtes stockées dans `ai_request_queue`, exécutées au retour de la connexion.

### 7.1 Multi-fournisseur IA

| Fournisseur | Endpoint | Auth | Modèles types |
|---|---|---|---|
| **OpenAI** | `api.openai.com/v1/chat/completions` | `Bearer {openai-api-key}` | GPT-4o, GPT-4o-mini, GPT-3.5-turbo |
| **Mistral** | `api.mistral.ai/v1/chat/completions` | `Bearer {mistral-api-key}` | mistral-large-latest, mistral-small-latest, open-mistral-7b, open-mixtral-8x7b |
| **Anthropic** | `api.anthropic.com/v1/messages` | `x-api-key` header | Claude 3.5 Sonnet, Claude 3 Haiku |
| **Ollama (local)** | `{local_server_url}/v1/chat/completions` | Aucune (réseau local) | Catalogue dynamique via `/api/tags` |

Chaque fournisseur dispose de sa propre clé stockée dans le keyring OS (`openai-api-key`, `mistral-api-key`, `anthropic-api-key`). Le fournisseur actif et l'URL du serveur local sont persistés dans `ai_settings` (colonnes `provider`, `local_server_url`).

**Ollama / serveur local** : indicateur de statut (ping `/api/version`) + catalogue dynamique des modèles installés (`/api/tags`). Permet d'utiliser un modèle hébergé sur un Mac Mini ou autre machine locale via IP réseau.

### 7.2 Saisie vocale

Le `GenerateurIAPage` intègre un bouton microphone sur le champ "Consignes complémentaires". Il utilise la **Web Speech API** native du navigateur (gratuite, aucun appel réseau), avec transcription en temps réel et activation vocale de la langue `fr-FR`. Fallback silencieux si l'API n'est pas disponible.

### 7.3 CRUD tâches IA custom

L'`AITemplateEditorPage` permet en plus de l'édition des templates existants :
- **Créer** une tâche IA personnalisée (libellé, code-slug auto, catégorie, icône, format sortie) — `is_custom = 1`
- **Dupliquer** une tâche existante comme base de travail (copie variables + paramètres)
- **Supprimer** une tâche custom (les tâches système sont protégées)

Les tâches custom sont distinguées visuellement (badge CUSTOM + bordure colorée).

### 7.4 Aperçu du prompt assemblé

Avant de lancer une génération, l'utilisateur peut afficher le prompt complet assemblé (3 couches résolues) via le bouton "Aperçu du prompt". Permet de vérifier les variables interpolées et le texte exact soumis au modèle.

### 7.5 Tableau de bord consommation & coûts

Page dédiée `AIUsagePage` (`Préparation → Consommation & coûts`) :
- KPIs : coût estimé ce mois, coût total, tokens consommés, coût moyen/génération
- Répartition par modèle (tokens + coût estimé)
- Répartition par catégorie (barres horizontales)
- Évolution mensuelle sur 6 mois (histogramme vertical)
- Historique des 20 dernières générations (tâche, catégorie, modèle, tokens, coût, date)

Calcul de coût basé sur la table `MODEL_PRICING` (prix/MTok en entrée et sortie pour chaque modèle cloud). Données issues de `ai_generations` (`tokens_input`, `tokens_output`).

### 7.6 Documents de référence pour la génération IA

Le `GenerateurIAPage` permet d'associer des documents à une génération IA, injectés dans le prompt (couche 2) avant les consignes libres :

**Depuis la bibliothèque** : picker recherchable (`documentService.search()` + `getRecent(8)` en état vide) → documents sélectionnés = chips bleus. Seuls les documents dont `extracted_text` est renseigné alimentent réellement le prompt (icône ⚠ si texte absent).

**Fichiers ad-hoc** : bouton "Joindre un fichier (.txt, .docx)" → extraction locale :
- `.txt` : `file.text()` natif
- `.docx` : `mammoth.extractRawText()` (import dynamique)
- `.pdf` : doit être importé via la bibliothèque (PDF.js extrait le texte à l'import)

**Injection** (dans `assemblePrompt()`) :
```
--- Document de référence : {title} ---
{extracted_text}
---

--- Fichier joint ---
{rawText}
---
```

**`AIGenerationRequest`** étendu : `documentIds?: ID[]` (existant, maintenant utilisé) + `rawDocumentContexts?: string[]` (nouveau).

---

## 8. Écrans à concevoir

- **Liste élèves** (vue classe) : tableau complet avec badges, filtres, tri
- **Recherche globale** : résultats transversaux avec scoring
- **Gestion bulletins** (vue classe) : tableau classe × période avec statuts et génération batch
- **Export PDF** : prévisualisation et personnalisation

---

## 9. Priorités MVP

### Phase 1 — Fondations
1. Paramètres (année scolaire, matières, volumes horaires)
2. Calendrier scolaire
3. Programme officiel (arbre + import JSON/CSV)
4. Système de sauvegarde automatique

### Phase 2 — Planification
5. Progression annuelle (timeline horizontale + drag & drop + bandes vacances)
6. Emploi du temps (grille + toggle Q1/Q2 + import ICS)
7. Dashboard (indicateurs, mini-timeline semaine, EDT jour, alertes, couverture)
8. Centre de notifications

### Phase 3 — Préparation pédagogique
9. Séquences et séances (accordéon + grille 2 colonnes + badges)
10. Bibliothèque (grille 3 colonnes + filtres badges + vue récents + drag & drop)
11. Cahier de textes (filtres badges classe + cards journal)
12. Templates de séquences

### Phase 4 — IA et corrections
13. Générateur IA (contenus + file d'attente hors-ligne)
14. Corrections en série (3 colonnes + grille compétences 1-4 + raccourcis clavier)
15. Bilan devoir (histogramme + barres compétences colorées + top réussites/lacunes)
16. Import drag & drop intelligent

### Phase 5 — Suivi élèves
17. Fiche élève (hub + onglet compétences avec barres segmentées + pastilles T1/T2/T3 + tendances)
18. Profil période + bulletins (avec versioning)
19. Orientation
20. Export PDF
21. Mode sombre
22. Fonction "Nouvelle année depuis existante"

---

## 10. État d'implémentation (v1.4 — 12 mars 2026)

### 10.1 Vue d'ensemble

| Métrique | Valeur |
|---|---|
| **Fichiers source** | ~195 fichiers (TS/TSX, CSS, SQL, configs) |
| **Lignes TypeScript/TSX** | ~18 000 |
| **Lignes CSS** | ~7 000 |
| **Lignes SQL** | ~2 200 |
| **Services backend** | 17 services |
| **Pages/écrans** | 18 pages |
| **Composants UI** | 17 composants réutilisables |
| **Formulaires** | 10 modals/formulaires |
| **Seeds SQL** | 3 fichiers (schéma + prompts IA + programmes) + 2 migrations additionnelles |

### 10.2 Architecture implémentée

#### Stack réalisée

| Couche | Implémentation | Statut |
|---|---|---|
| Runtime Tauri 2.x | `src-tauri/` avec `tauri.conf.json` | ✅ Structure prête |
| React 18 + TypeScript | Composants, hooks, stores, routing | ✅ Complet |
| CSS Variables + Tailwind-like | `tokens.css` (108 vars), `globals.css` | ✅ Complet |
| SQLite | `db.ts` (289 lignes), couche d'abstraction CRUD | ✅ Complet |
| Système de migrations | `splitSqlStatements()`, exécution ordonnée | ✅ Complet |
| Multi-workspace | `workspaceService.ts`, fichiers `.ta`, welcome page | ✅ Complet |

#### Services (14 fichiers, ~4 400 lignes)

| Service | Fichier | Lignes | Rôle |
|---|---|---|---|
| `db` | `db.ts` | 289 | Couche SQL générique (select, insert, update, delete, migrations) |
| `academicService` | `academicService.ts` | 388 | Années, calendrier, matières, niveaux, classes, volumes, `newYearService` |
| `aiService` | `aiService.ts` | ~700 | Moteur IA 3 couches, `assemblePrompt`, `smartGenerate`, `smartCorrect`, queue, multi-provider, `ollamaService`, `aiUsageService`, `aiTaskService` CRUD |
| `sequenceService` | `sequenceService.ts` | 326 | CRUD séquences, séances, réordonnancement, templates |
| `studentService` | `studentService.ts` | 301 | CRUD élèves, enrollments, profils, observations compétences |
| `evaluationService` | `evaluationService.ts` | 290 | Devoirs, soumissions, corrections, skill evaluations |
| `importExportService` | `importExportService.ts` | 814 | ICS, CSV, JSON, PDF export (4 builders), backup ZIP |
| `searchService` | `searchService.ts` | 258 | Recherche cross-table 7 tables, scoring, highlight |
| `notificationEngine` | `notificationEngine.ts` | 221 | Génération d'alertes automatiques |
| `programmeService` | `programmeService.ts` | 202 | Arbre programme, import/export |
| `workspaceService` | `workspaceService.ts` | 242 | Multi-DB, config locale, ouverture/fermeture |
| `timetableService` | `timetableService.ts` | — | Créneaux EDT, import ICS |
| `documentService` | `documentService.ts` | — | CRUD documents, ingestion |
| `dashboardService` | `dashboardService.ts` | — | Indicateurs, alertes, couverture |
| `systemService` | `systemService.ts` | — | Connectivité, préférences |

#### Moteur IA — Architecture 3 couches

Le moteur de prompts (`aiService.ts`) assemble les prompts en 3 couches fusionnées :

1. **System prompt** : personnalité + persona enseignant (stocké dans `ai_tasks`)
2. **Task prompt** : template par type de génération avec `{{variables}}` (stocké dans `ai_task_user_templates` ou fallback `ai_tasks.default_user_template`)
3. **User instructions** : consignes libres par requête (champ textarea dépliable + saisie vocale)

Variables résolues dynamiquement : `{{subjects.name}}`, `{{levels.name}}`, `{{sequences.title}}`, `{{program_topics.title}}`.

Paramètres par tâche : `model`, `temperature`, `max_tokens`, `style`, `tone`, `detail_level`.

File d'attente hors-ligne : `ai_request_queue` avec `enqueue()`, `processQueue()`, `pendingCount()`.

#### CRUD tâches IA

- `aiTaskService.createTask()` : création tâche custom (`is_custom = 1`)
- `aiTaskService.duplicateTask()` : copie complète (variables + paramètres)
- `aiTaskService.deleteTask()` : suppression (tâches custom uniquement)

#### Multi-fournisseur

- `getApiKey(provider)` / `setApiKey(key, provider)` : keyring par fournisseur
- `ollamaService.ping(url)` : test connectivité serveur local
- `ollamaService.listModels(url)` : catalogue modèles Ollama
- `callChatAPI()` : routing provider-aware (OpenAI / Mistral / Anthropic / Ollama)

#### Tableau de bord coûts

- `aiUsageService.byModel/byCategory/byMonth/recent/totalsThisMonth()`
- `estimateCost(tokensIn, tokensOut, model)` : coût estimé en USD
- `MODEL_PRICING` : table de prix/MTok pour OpenAI et Mistral

#### Google Calendar (`googleCalendarService.ts`)

- `connect(clientId, clientSecret)` : OAuth 2.0 Desktop flow complet
  - `invoke('oauth_init')` → port loopback aléatoire (Tauri Rust, stdlib uniquement)
  - `open(authUrl)` via `@tauri-apps/plugin-shell`
  - `invoke('oauth_wait')` → capture du code d'autorisation dans le listener Rust
  - Échange code → `access_token` + `refresh_token` via `fetch()`
  - `refresh_token` stocké dans le keyring OS
- `getAccessToken()` : rafraîchissement automatique avant expiration
- `listCalendars()` : liste des agendas via `GET /calendar/v3/users/me/calendarList`
- `listEvents(calendarId, timeMin, timeMax)` : événements via `GET /calendar/v3/calendars/{id}/events`
- `toICSEvents(events)` : conversion format GCal → format `ICSMappingModal`
- `disconnect()` : révocation token + nettoyage keyring
- Scope : `https://www.googleapis.com/auth/calendar.readonly`

### 10.3 Pages implémentées

#### Dashboard (`DashboardPage.tsx` — 222 lignes)

- 5 indicateurs rapides (cards avec `border-top` coloré, cliquables)
- Mini-timeline semaine (grille 5 colonnes, blocs colorés par matière)
- Bloc "Aujourd'hui" (créneaux EDT avec badges statut)
- Bloc alertes (cards avec `border-left` danger/warn)
- Bloc couverture programme (barres de progression par thème)
- Accès rapides (4 boutons CTA)
- Données chargées depuis `dashboardService` avec fallback mock

#### Programme officiel (`ProgrammeOfficielPage.tsx`)

- Accordéon des thèmes avec `border-left` couleur matière
- Badge couverture (%) par thème
- Chapitres dépliables avec badges séquences liées
- Import JSON/CSV des programmes

#### Progression annuelle (`ProgressionAnnuellePage.tsx` — 152 lignes)

- Panneau séquences draggable (gauche, 220px)
- Timeline horizontale 10 mois avec bandes vacances hachurées
- Barres séquences positionnées en `position: absolute` par pourcentage
- Drag & drop avec persistence (`sequenceService.update()`)
- Bouton Export PDF → `PDFPreviewModal`

#### Emploi du temps (`EmploiDuTempsPage.tsx`)

- Grille hebdomadaire `grid: 50px + 5×1fr`
- Toggle Q1/Q2 (SegmentedControl)
- Créneaux colorés par matière en `position: absolute`
- Bandes pause grisées (12h-13h)
- Import ICS avec modal de mapping (`ICSMappingModal`)
- **Google Calendar OAuth** : bouton ouvre `GoogleCalendarModal`
  - Configuration client_id/secret (projet Google Cloud, type "Application de bureau")
  - Flux OAuth Desktop loopback — navigateur système + callback automatique
  - Sélecteur de calendrier + plage temporelle → mapping via `ICSMappingModal`
- Données depuis `timetableService`

#### Calendrier scolaire (`CalendrierScolairePage.tsx` — 201 lignes)

- Vue annuelle (Sept → Juin) avec codes couleur par type
- Formulaire d'ajout de période (vacances, fériés, examens, fermeture)
- Résumé automatique (semaines travaillées, jours fériés)
- Persistence via `calendarPeriodService`

#### Séquences & séances (`SequenceDetailPage.tsx` — 228 lignes)

- Accordéon des séances avec `border-left` statut
- Grille 2 colonnes (objectifs + documents / déroulé)
- Badges capacités, documents, durée
- Réordonnancement des séances avec persistence
- Boutons IA (générer plan, générer déroulé)
- Templates de séquences

#### Cahier de textes (`CahierDeTextesPage.tsx` — 167 lignes)

- Filtres par classe (badges cliquables)
- Liste chronologique avec `border-left` couleur matière
- Cards avec date, titre, activités, devoirs
- Formulaire d'entrée (`CahierEntreeForm`)
- Export PDF → `PDFPreviewModal`
- Données depuis `DataProvider` (DB) avec fallback mock

#### Bibliothèque (`BibliothequePage.tsx`)

- Grille 3 colonnes avec cards document
- Miniatures typées (📄 PDF, 🖼 Image, 📊 PPTX)
- Filtres badges (Récents, Par matière, Par niveau, Tags)
- Zone de dépôt drag & drop

#### Générateur IA (`GenerateurIAPage.tsx`)

- 3 vues : Générer | Historique | File d'attente
- Sélection de tâche par grille catégorisée
- Variables auto-remplies depuis DB (matières, niveaux, séquences)
- Paramètres par tâche (model, temperature, tone, etc.)
- Textarea d'instructions utilisateur (couche 3) + **bouton microphone** (Web Speech API, gratuit)
- **Aperçu du prompt** : bouton affichant le prompt complet assemblé (3 couches résolues) avant génération
- Résultat avec actions (copier, sauver en bibliothèque, noter)
- Historique des générations avec badges et tokens
- **File d'attente** : badge compteur, liste des requêtes pendantes, bouton "Traiter la file", vidage

#### Consommation & coûts IA (`AIUsagePage.tsx`)

- 4 KPIs : coût ce mois / coût total / tokens consommés / coût moyen par génération
- Sélecteur de modèle de référence pour recalculer les coûts
- Table par modèle (tokens entrée + sortie, count, coût estimé)
- Barres par catégorie (contenus, évaluations, planification, correction, système)
- Histogramme mensuel (6 mois glissants)
- Tableau des 20 générations récentes (tâche, catégorie, modèle, tokens, coût, date)
- Navigation : sidebar `Préparation → GÉNÉRATEUR IA → Consommation & coûts`

#### Corrections en série (`CorrectionSeriePage.tsx` — 250 lignes)

- Layout 3 colonnes (élèves | copie+correction | grille compétences)
- Liste élèves avec icônes statut (✅ ⚠ ⏳ ⬜)
- Split aperçu copie / éditeur correction
- Grille 4 niveaux par compétence (boutons colorés)
- Forces / lacunes qualitatives
- Consignes IA complémentaires (collapsible `<details>`)
- Boutons IA (analyser) avec fallback queue hors-ligne

#### Bilan devoir (`BilanDevoirPage.tsx` — 165 lignes)

- Grille 2×2 (distribution notes | compétences moyennes | top réussites | top lacunes)
- Histogramme en barres CSS
- Statistiques (moyenne, médiane, min, max)
- Barres de progression colorées par seuil
- Export PDF → `PDFPreviewModal`
- Génération commentaire synthétique IA

#### Fiche élève (`FicheElevePage.tsx` — 181 lignes)

- En-tête avec avatar, badges, bouton export PDF
- 8 onglets (Aperçu, Notes, Corrections, **Compétences**, Profil, Bulletins, Orientation, Docs)
- Onglet Compétences :
  - Barres segmentées 4 niveaux (`SegmentedBar`)
  - Pastilles T1/T2/T3 avec code couleur seuil
  - Flèches tendance (↗ ↘ →)
- Export PDF → `PDFPreviewModal`

#### Bulletins (`BulletinsPage.tsx` — 254 lignes)

- Sélection classe (pills) + période (T1/T2/T3)
- Tableau élèves avec badges statut
- Éditeur d'appréciation avec versioning (draft → final)
- Génération batch IA avec progression
- Consignes IA complémentaires (collapsible)
- Export PDF → `PDFPreviewModal`

#### Liste devoirs (`ListeDevoirsPage.tsx`)

- Tableau filtrable avec badges progression corrections
- Formulaire `DevoirForm`
- Données depuis `evaluationService` avec fallback mock

#### Liste élèves (`ListeElevesPage.tsx`)

- Tableau par classe avec badges
- Import CSV (`ImportElevesModal`)
- Données depuis `studentService` avec fallback mock

#### Recherche globale (`RechercheGlobalePage.tsx` — 202 lignes)

- Recherche cross-table 7 tables (`searchService`)
- Debounce 300ms
- Filtres par type avec compteurs dynamiques
- Scoring par pertinence (titre match = score élevé)
- Highlight `<mark>` des termes trouvés
- Navigation directe vers l'élément (tab + page + entity)
- Fermeture par Échap ou bouton

#### Paramètres (`ParametresPage.tsx` + `SettingsSubPages.tsx` + `AITemplateEditorPage.tsx` — 1 111 lignes)

- Hub 8 cards avec navigation vers sous-pages
- **Année scolaire** : édition label/dates + "Nouvelle année depuis existante"
  - Copie sélective : programmes, compétences, volumes, structure journée, périodes bulletin
  - Séquences converties en templates
  - Résumé visuel ✅/❌
- **Matières & volumes** : tableaux matières, niveaux, classes depuis DB
- **Calendrier** : redirection vers Planning → Calendrier
- **IA & templates** : éditeur de prompts par tâche, mode simple/avancé, `{{variables}}`, picker
  - **CRUD tâches custom** : créer / dupliquer / supprimer des tâches IA personnalisées
  - **Multi-fournisseur** : sélecteur OpenAI / Mistral / Anthropic / Serveur local
  - **Clé API** : champ password + toggle visibilité + sauvegarde keyring OS par fournisseur
  - **Ollama local** : champ URL serveur + pastille statut ping + rafraîchissement catalogue modèles
  - Paramètres globaux (model, temperature, max_tokens)
- **Export PDF** : identité enseignant/établissement
- **Capacités** : liste groupée par catégorie
- **Interface** : toggle thème clair/sombre + densité UI (compact/standard/confort)

### 10.4 Composants UI réutilisables (15)

| Composant | Fichier | Description |
|---|---|---|
| `Button` | `Button.tsx` | 3 variants (primary/secondary/ghost), 3 tailles (S/M/L), icon, fullWidth |
| `Badge` | `Badge.tsx` | 7 variants (default, info, success, warn, danger, muted, custom color) |
| `Card` | `Card.tsx` | Surface avec ombre, hover animé, `noHover`, `borderTop/borderLeft` coloré |
| `Tabs` | `Tabs.tsx` | Onglets horizontaux avec icône + label, `border-bottom` active |
| `SidebarItem` | `SidebarItem.tsx` | Items hiérarchiques avec indent, sélection active, séparateurs |
| `Input` | `Input.tsx` | Champ texte avec label, error, hint |
| `Modal` | `Modal.tsx` | Overlay centré avec header/body/footer |
| `Drawer` | `Drawer.tsx` | Panneau latéral droit (420-520px) |
| `Toast` | `Toast.tsx` | Notifications éphémères (success/error/info/warn) |
| `EmptyState` | `EmptyState.tsx` | Illustration + message + CTA pour zones vides |
| `ProgressBar` | `ProgressBar.tsx` | Barre de progression avec couleur et label |
| `SegmentedBar` | `ProgressBar.tsx` | Barre segmentée 4 niveaux pour compétences |
| `SkillLevelSelector` | `SkillLevelSelector.tsx` | 4 boutons de niveau (1-4) avec états colorés |
| `SegmentedControl` | `SegmentedControl.tsx` | Toggle multi-segments (ex: Q1/Q2, Clair/Sombre) |
| `Breadcrumb` | `Breadcrumb.tsx` | Navigation hiérarchique |
| `PromptVariablePicker` | `PromptVariablePicker.tsx` | Palette de variables `{{code}}` cliquables |
| `VoiceInput` | `VoiceInput.tsx` | Bouton microphone Web Speech API (fr-FR), animation pulse, fallback si API indisponible |

### 10.5 Formulaires et modals (9)

| Composant | Rôle |
|---|---|
| `SequenceForm` | Création/édition de séquence (titre, matière, heures, dates) |
| `SeanceForm` | Création/édition de séance (titre, objectifs, déroulé) |
| `DevoirForm` | Création de devoir (titre, type, barème, séquence liée) |
| `EleveForm` | Ajout/édition d'élève |
| `CalendrierPeriodeForm` | Ajout de période au calendrier scolaire |
| `CreneauForm` | Création de créneau EDT |
| `CahierEntreeForm` | Entrée de cahier de textes |
| `ImportElevesModal` | Import CSV d'élèves avec prévisualisation |
| `ICSMappingModal` | Mapping ICS → matières/classes avec auto-détection |
| `GoogleCalendarModal` | OAuth Desktop loopback + sélection calendrier/plage + délègue à ICSMappingModal |
| `PDFPreviewModal` | Preview HTML dans iframe + Imprimer/Télécharger |

### 10.6 Export PDF

4 builders HTML dans `pdfExportService` avec styles `@media print` :

| Builder | Contenu | Intégré dans |
|---|---|---|
| `buildBulletinHTML` | En-tête établissement + tableau appréciations par matière | BulletinsPage |
| `buildBilanHTML` | Stats grand format (moyenne/min/max) | BilanDevoirPage |
| `buildProgressionHTML` | Tableau séquences avec pastilles matière, heures, statut | ProgressionAnnuellePage |
| `buildFicheEleveHTML` | Grille compétences + notes + profil période | FicheElevePage |

Composant `PDFPreviewModal` : modal 90vw × 85vh avec iframe, boutons Imprimer (→ dialogue système "Enregistrer en PDF") et Télécharger HTML. Intégré dans 5 pages (Bulletins, Bilan, Progression, Fiche élève, Cahier de textes).

### 10.7 Base de données

#### Schéma (`001_initial_schema.sql`)

56 tables couvrant : paramètres annuels (8 tables), programme et contenus (7), séquences et séances (7), emploi du temps (3), bibliothèque documentaire (6), IA et génération (8), corrections et évaluations (7), suivi élèves (8), export et système (3).

#### Seeds (`002_ai_prompts.sql`)

41 tâches IA prédéfinies en 5 catégories (contenus, évaluations, planification, correction, système), avec 76 variables, 89 paramètres, et templates par défaut. Chaque tâche a un system_prompt et un default_user_template avec `{{variables}}`.

#### Migrations additionnelles

| Fichier | Contenu |
|---|---|
| `012_ai_custom_tasks.sql` | `ALTER TABLE ai_tasks ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0` — distingue tâches système et custom |
| `013_ai_provider_settings.sql` | `ALTER TABLE ai_settings ADD COLUMN provider TEXT NOT NULL DEFAULT 'openai'` et `local_server_url TEXT` — support multi-fournisseur |

### 10.8 Stores et état global

| Store | Fichier | Rôle |
|---|---|---|
| `AppContext` | `AppContext.tsx` | Thème, connectivité, toasts, notifications |
| `DataProvider` | `DataProvider.tsx` | Cache DB centralisé (séquences, sessions, élèves, etc.) |
| `RouterContext` | `RouterContext.tsx` | Navigation par tab/page/entity sans react-router |
| `WorkspaceContext` | `WorkspaceContext.tsx` | Multi-DB, ouverture/fermeture workspace |

### 10.9 Statut par phase MVP

#### Phase 1 — Fondations ✅

| Item | Statut | Détails |
|---|---|---|
| Paramètres | ✅ | Hub + 7 sous-pages fonctionnelles |
| Calendrier scolaire | ✅ | Vue annuelle + formulaire + persistence DB |
| Programme officiel | ✅ | Arbre + import JSON/CSV |
| Sauvegarde auto | ✅ | Export/import ZIP, `backupService2` |

#### Phase 2 — Planification ✅

| Item | Statut | Détails |
|---|---|---|
| Progression annuelle | ✅ | Timeline + DnD + persistence + export PDF |
| Emploi du temps | ✅ | Grille + Q1/Q2 + import ICS + mapping |
| Dashboard | ✅ | 5 indicateurs + timeline + EDT jour + alertes + couverture |
| Notifications | ✅ | Engine + centre de notifications |

#### Phase 3 — Préparation pédagogique ✅

| Item | Statut | Détails |
|---|---|---|
| Séquences et séances | ✅ | Accordéon + badges + réordonnancement |
| Bibliothèque | ✅ | Grille 3 col + filtres + drag & drop |
| Cahier de textes | ✅ | Filtres classe + cards + export PDF |
| Templates de séquences | ✅ | Sauvegarde + instanciation |

#### Phase 4 — IA et corrections ✅

| Item | Statut | Détails |
|---|---|---|
| Générateur IA | ✅ | 3 couches prompts + 41 tâches + variables DB + queue |
| Corrections en série | ✅ | 3 colonnes + grille compétences + IA + raccourcis |
| Bilan devoir | ✅ | Histogramme + stats + top réussites/lacunes + export PDF |
| Import intelligent | ✅ | ICS mapping + CSV import |

#### Phase 5 — Suivi élèves ✅

| Item | Statut | Détails |
|---|---|---|
| Fiche élève | ✅ | Hub 8 onglets + compétences + tendances + export PDF |
| Bulletins | ✅ | Tableau + éditeur + batch IA + versioning + export PDF |
| Recherche globale | ✅ | 7 tables + scoring + navigation |
| Mode sombre | ✅ | Toggle + persistence + 108 CSS vars en dark |
| Nouvelle année | ✅ | Copie sélective avec résumé visuel |

#### Éléments transversaux ✅

| Item | Statut |
|---|---|
| Export PDF (preview) | ✅ 4 builders + modal dans 5 pages |
| Empty states | ✅ Composant + intégré dans 4 pages |
| Gestion clé API | ✅ Champ password + keyring OS |
| File d'attente IA | ✅ Badge + liste + traitement + vidage |
| Consignes IA utilisateur | ✅ Collapsible dans correction + bulletins |

### 10.10 Points restants

| Item | Priorité | Description |
|---|---|---|
| Tests unitaires | Moyenne | Aucun test écrit — à ajouter pour services critiques |
| Orientation (fiche élève) | Basse | Onglet prévu mais non implémenté (rapports, entretiens, Parcoursup) |
| Données mock résiduelles | Basse | 10 pages ont encore des fallback mock quand la DB est vide |
| IDs hardcodés PDF | Basse | `buildFicheEleveHTML(1)` — à brancher sur ID réel de la fiche |
| Parsing IA du BO | Basse | Phase 2 prévue — upload PDF du BO → extraction structure |
| Google Calendar sync | Basse | Import ICS fonctionnel, OAuth Google non implémenté |
| Raccourcis clavier correction | Partiel | J/K/1-4/Tab documentés dans la spec, implémentation partielle |
