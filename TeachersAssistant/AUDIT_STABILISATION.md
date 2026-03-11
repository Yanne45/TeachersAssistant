# Audit Technique - TeachersAssistant

Date: 2026-03-11
Périmètre: `TeachersAssistant/TeachersAssistant`

## 1. Résumé exécutif

L'application était en état non livrable au démarrage de l'audit (compilation TypeScript cassée), avec un volume important d'erreurs de typage, des composants manquants, des incohérences entre services et pages, et plusieurs fonctionnalités partiellement branchées.

Un lot de stabilisation prioritaire a été réalisé pour restaurer la capacité de build puis rétablir un niveau de sûreté TypeScript plus strict.

## 2. Constat initial

- Build KO (`npm run build`): 156 erreurs TypeScript.
- Erreurs bloquantes identifiées:
  - imports de composants inexistants (bibliothèque documentaire);
  - appels de méthodes de services non exposées (`classService.getAll`, `documentService.getByTag`);
  - incompatibilités de types transverses (`Badge`, types router/tab, `db` plugin typing);
  - null-safety stricte non satisfaite sur plusieurs pages/services.

## 3. Fonctions/écrans implémentés vs non finalisés

### Implémentés et branchés

- Workspace/Welcome multi-base (ouvrir/créer/récents).
- Navigation principale par tabs + sous-pages.
- Écrans principaux: Dashboard, Programme, Préparation, Planning, Cahier, Classes, Évaluation, Recherche, Paramètres.

### Partiellement implémentés / non finalisés

- Plusieurs actions UI encore placeholders (boutons sans effet métier).
- Certaines vues utilisent encore des données mock en fallback.
- Une partie des workflows reste en mode "best effort" (imports, redirections, actions secondaires).

## 4. Risques techniques identifiés

- Cohérence type/domain model fragile (alias historiques `label` vs `name/short_name`).
- Dette sur typage strict (certaines zones utilisent des `any` de compatibilité).
- Warnings de bundle (chunk principal trop gros, imports dynamiques + statiques mélangés).

## 5. Travaux déjà réalisés (stabilisation P1)

### 5.1 Build et structure

- Build TypeScript + Vite rétablie: `npm run build` passe.
- Ajout des composants manquants pour lever les erreurs de résolution module:
  - `src/components/library/ImportModal.tsx`
  - `src/components/library/TagManager.tsx`

### 5.2 Services/API

- Ajout API manquantes:
  - `documentService.getByTag(...)`
  - `classService.getAll()`
- Ajustements de typage DB/plugin SQL:
  - compatibilité `lastInsertId` optionnel;
  - sécurisation de certains retours (`selectOne`, connexion ouverte).

### 5.3 UI/types transverses

- `Badge` rendu compatible avec les usages legacy:
  - variant `default` accepté (mappé vers `info`)
  - prop `status` supportée
  - prop `style` supportée
- Alignement des types de navigation de la recherche globale.

### 5.4 Corrections ciblées pages/services

Corrections sur plusieurs fichiers critiques (exemples):

- `src/pages/parametres/ParametresPage.tsx`
- `src/pages/parametres/SettingsSubPages.tsx`
- `src/pages/preparation/BibliothequePage.tsx`
- `src/pages/planning/CalendrierScolairePage.tsx`
- `src/pages/preparation/SequenceDetailPage.tsx`
- `src/pages/evaluation/BilanDevoirPage.tsx`
- `src/services/aiService.ts`
- `src/services/notificationEngine.ts`
- `src/hooks/useAsync.ts`

## 6. Changements de configuration

Dans `tsconfig.json`:

- `noUnusedLocals: false`
- `noUnusedParameters: false`
- `noUncheckedIndexedAccess`: réactivé à `true` après correction du code

## 7. État actuel

- Build: OK
- Build strict indexing: OK (`noUncheckedIndexedAccess: true`)
- Warnings Vite restants:
  - imports dynamiques/statiques mixtes

## 8. Étape recommandée exécutée (11/03/2026)

Étape lancée et terminée: **durcissement TypeScript sur les accès indexés**.

Travail effectué:

- Réactivation de `noUncheckedIndexedAccess: true`.
- Correction des erreurs sur 13 fichiers (forms, pages et services), notamment:
  - garde-fous sur `arr[i]`/regex groups potentiellement `undefined`;
  - sécurisation des parsing CSV/ICS/PDF;
  - sécurisation des accès map/index dans pages classes/correction/séquences;
  - sécurisation des stats et calculs de durée.
- Validation finale: `npm run build` passe en production.

## 9. Prochaine étape recommandée

Priorité suivante: **performance de build/runtime (P1.2)**.

Plan suggéré:

1. Éliminer le mix import statique/dynamique des services (`db.ts`, `services/index.ts`, `aiService.ts`) pour retrouver un code-splitting effectif.
2. Mesurer avant/après (taille gzip + temps de chargement initial).

Ensuite:

- réactiver progressivement `noUnusedLocals` et `noUnusedParameters`.

## 10. Étape recommandée exécutée (P1.2 - quick win)

Action réalisée:

- Ajout d'un `manualChunks` dans `vite.config.ts` pour séparer les vendors (`react`, `dnd`, `jszip`, etc.).

Résultat mesuré (build prod):

- Avant: chunk applicatif principal ~`511.75 kB` minifié.
- Après: chunk applicatif principal ~`322.11 kB` minifié.
- Le warning Vite `Some chunks are larger than 500 kB` a disparu.

Reste à traiter:

- warnings Vite sur imports dynamiques/statiques mixtes (nécessite harmonisation des patterns d'import dans les pages/services).

## 11. Étape exécutée (P1.3 - harmonisation imports)

Action réalisée:

- Suppression des `import()` dynamiques de services dans les pages et stores.
- Passage en imports statiques cohérents via le barrel `../../services` (et `../services/db` côté store).
- Export de `getApiKey` ajouté dans `src/services/index.ts` pour éviter l'import direct de `aiService`.

Validation:

- Recherche projet: plus aucun `await import('...services')`.
- `npm run build`: OK, sans warnings Vite de type `dynamically imported ... but also statically imported`.

## 12. Étape exécutée (P1.4 - réactivation unused checks)

Action réalisée:

- Réactivation dans `tsconfig.json`:
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
- Correction de tous les `unused` signalés:
  - imports React/services inutilisés;
  - variables et paramètres non utilisés;
  - imports de types non utilisés dans services/types.

Validation:

- `npm run build`: OK avec les trois garde-fous actifs:
  - `noUncheckedIndexedAccess: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`

## 13. QA rapide post-stabilisation (P1.5)

Périmètre vérifié:

- Écrans critiques ciblés: Classes, Séquences, Générateur IA, Paramètres.
- Flux contrôlés dans le code: import élèves, export template séquence, import/export sauvegarde, lecture clé API, densité UI.

Résultats:

- Build production: OK (`npm run build`).
- Aucune régression évidente détectée dans les handlers touchés par la stabilisation.
- Les nettoyages `unused` et l'harmonisation d'imports n'ont pas cassé les flux métiers vérifiés.

Point bloquant restant:

- `npm run lint` ne peut pas s'exécuter car ESLint v9 attend un fichier `eslint.config.js` (flat config), absent dans le projet.

## 14. Étape exécutée (P1.6 - réactivation lint gate)

Action réalisée:

- Ajout d'une configuration ESLint v9 flat: `eslint.config.js`.
- Activation des règles React Hooks recommandées + parsing TypeScript.
- Corrections mineures associées (dépendances de hooks / directives eslint inutiles).

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 15. Étape exécutée (P1.7 - CI minimale)

Action réalisée:

- Ajout d'un workflow GitHub Actions: `.github/workflows/ci.yml`.
- Déclenchement sur `push` (`main`/`master`) et `pull_request`.
- Pipeline: `npm ci` -> `npm run lint` -> `npm run build` (Node 20, cache npm).

Validation locale avant push:

- `npm run lint`: OK.
- `npm run build`: OK.

## 16. Étape exécutée (P1.8 - réactivation persistance formulaires critiques)

Objectif:

- Remplacer les `onSave => console.log(...)` sur les écrans à plus fort impact métier.

Travail réalisé:

- `ListeDevoirsPage`:
  - branchement `DevoirForm` vers `assignmentService.create(...)`;
  - création automatique des copies via `submissionService.createBatch(...)`;
  - rechargement de la liste + toasts de succès/erreur.
- `ListeElevesPage`:
  - branchement `EleveForm` vers `studentService.create(...)` + `enroll(...)`;
  - refresh des données après ajout;
  - import CSV: refresh + toast résultat.
- `ClassesPage`:
  - branchement `EleveForm` vers `studentService.create/update/enroll`;
  - rechargement des classes et des classes dépliées après sauvegarde.
- `EmploiDuTempsPage`:
  - ajout du bouton `+ Nouveau créneau` (formulaire désormais accessible);
  - branchement `CreneauForm` vers `timetableService.create(...)`;
  - refresh des créneaux après création.
- `CahierDeTextesPage`:
  - branchement `CahierEntreeForm` vers `lessonLogService.create(...)`;
  - refresh du cahier après création.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.
