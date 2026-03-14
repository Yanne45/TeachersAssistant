# Audit Fonctionnel - Écrans & Branchement

Date: 2026-03-12
Périmètre: `TeachersAssistant/TeachersAssistant`

## Légende

- `Implémenté + branché`: écran accessible et relié au routeur/menu.
- `Implémenté partiel`: écran branché mais avec mock/placeholder ou flux incomplets.
- `Implémenté non branché`: code présent mais non accessible via navigation normale.
- `Non implémenté`: attendu fonctionnellement mais absent du code (non détecté ici).

## 1) Cartographie des écrans

| Zone | Écran | Statut | Observations |
|---|---|---|---|
| Workspace | Welcome | Implémenté + branché | Ouverture/création/récents OK. |
| Dashboard | DashboardPage | Implémenté partiel | Données via DataProvider; navigation branchée mais dépend de mappings internes. |
| Programme | ProgrammeOfficielPage | Implémenté + branché | Chargement DB, import JSON/CSV branché. |
| Programme | ProgressionAnnuellePage | Implémenté partiel | Écran branché, mais base majoritairement mock + actions partielles. |
| Préparation | SequenceDetailPage | Implémenté partiel | CRUD séquences/séances branché, plusieurs actions UI non câblées. |
| Préparation | BibliothequePage | Implémenté partiel | Vue branchée + import modal, mais certains filtres sidebar non pris en compte. |
| Préparation | GenerateurIAPage | Implémenté partiel | Génération/history/queue internes; intégration routeur partielle. |
| Planning | EmploiDuTempsPage | Implémenté + branché | Import ICS OK, OAuth Google Calendar implémenté (flux Desktop loopback), création créneau persistée. |
| Planning | CalendrierScolairePage | Implémenté partiel | Branché, persistance partielle, encore du mock. |
| Cahier | CahierDeTextesPage | Implémenté partiel | Branché, fallback mock, édition incomplète. |
| Classes | ClassesPage (overview/import) | Implémenté partiel | Navigation overview/import OK, ajout/édition élève incomplets. |
| Évaluation | ListeDevoirsPage | Implémenté partiel | Branché, fallback mock, création devoir non persistée. |
| Évaluation | CorrectionSeriePage | Implémenté partiel | Branché, largement mock, actions secondaires non câblées. |
| Évaluation | BilanDevoirPage | Implémenté partiel | Branché, données mock + IA partielle. |
| Évaluation | ListeElevesPage | Implémenté partiel | Branché, fallback mock, ajout élève non persisté. |
| Évaluation | FicheElevePage | Implémenté partiel | Branché mais contenu majoritairement statique/mock. |
| Classes | SkillMapPage | Implémenté + branché | Cartographie compétences classe : heatmap élèves × capacités, filtres classe/matière/période. |
| Évaluation | TableauNotesPage | Implémenté + branché | Grille élèves × évaluations, filtres classe/matière/période, moyennes pondérées /20, import PDF Pronote. |
| Évaluation | BulletinsPage | Implémenté partiel | Branché mais flux principal mock. |
| Recherche | RechercheGlobalePage | Implémenté + branché | Overlay branché, navigation vers pages active. |
| Paramètres | ParametresPage | Implémenté + branché | Hub + sous-pages branchés, backup ZIP fonctionnel. |
| Paramètres | AITemplateEditorPage | Implémenté + branché | Accessible depuis Paramètres, API key + templates branchés, CRUD tâches custom, multi-fournisseur. |
| Préparation | AIUsagePage | Implémenté + branché | Tableau de bord consommation IA; accessible via sidebar `ia-couts`. |
| Paramètres | SettingsSubPages | Implémenté + branché | CRUD complet matières/niveaux/classes/capacités/types évaluation/compétences. |
| Paramètres | TypesEvaluationSettings | Implémenté + branché | CRUD types d'évaluation + liens M:N capacités/compétences générales. |
| Paramètres | CompetencesGeneralesSettings | Implémenté + branché | CRUD compétences générales (couleur, liens capacités). |

## 2) Fonctions/écrans implémentés mais non branchés (ou branchés partiellement)

1. Historique IA sidebar non relié à la vue `history`.
- Menu `ia-historique` renvoie bien vers `GenerateurIAPage`, mais la page n'utilise pas `route.page` pour sélectionner `view`.
- Réf: [App.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/App.tsx), [GenerateurIAPage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/preparation/GenerateurIAPage.tsx)

2. Filtres sidebar de progression non exploités (`classe`, `timeline`, `liste`).
- Les items existent dans la navigation mais `ProgressionAnnuellePage` ne lit pas `route.filter`.
- Réf: [navigation.ts](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/constants/navigation.ts), [ProgressionAnnuellePage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/programme/ProgressionAnnuellePage.tsx)

3. Filtre sidebar bibliothèque `matiere` non exploité.
- Le menu envoie `filter='matiere'`, mais la page ne traite pas cette clé (elle traite `hggsp/histoire/geo/...`).
- Réf: [navigation.ts](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/constants/navigation.ts), [BibliothequePage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/preparation/BibliothequePage.tsx)

4. Vue bibliothèque `page === 'importer'` présente mais non exposée par la navigation.
- Le code existe mais aucun item/menu actuel ne pousse `page='importer'`.
- Réf: [BibliothequePage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/preparation/BibliothequePage.tsx)

5. Filtres sidebar Cahier (`all/classe`) non reliés à la logique de page.
- Le menu existe, mais `CahierDeTextesPage` filtre localement via son propre state (`activeClassId`), pas via `route`.
- Réf: [navigation.ts](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/constants/navigation.ts), [CahierDeTextesPage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/cahier/CahierDeTextesPage.tsx)

## 3) Fonctions branchées mais non implémentées (placeholders visibles)

1. Emploi du temps
- Bouton `Google Calendar` sans handler.
- Créneau manuel via `CreneauForm` non persisté (console seulement).
- Réf: [EmploiDuTempsPage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/planning/EmploiDuTempsPage.tsx)

2. Séquences
- Actions `Plan IA`, `Générer déroulé IA`, `Cahier de textes` sans logique branchée.
- Réf: [SequenceDetailPage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/preparation/SequenceDetailPage.tsx)

3. Cahier de textes
- Bouton `Modifier` sans action.
- `CahierEntreeForm` onSave non persisté (console).
- Réf: [CahierDeTextesPage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/cahier/CahierDeTextesPage.tsx)

4. Évaluation
- `CorrectionSerie`: `Importer correction` et `Générer feedback IA` non câblés.
- `FicheEleve`: usage d'ID fixe pour export PDF (TODO).
- Réf: [CorrectionSeriePage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/evaluation/CorrectionSeriePage.tsx), [FicheElevePage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/evaluation/FicheElevePage.tsx)

5. Formulaires CRUD encore non persistés selon écran
- `DevoirForm`, `EleveForm`, `CreneauForm`, `CahierEntreeForm` souvent branchés en `onSave => console.log(...)`.
- Réf: [ListeDevoirsPage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/evaluation/ListeDevoirsPage.tsx), [ListeElevesPage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/evaluation/ListeElevesPage.tsx), [ClassesPage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/classes/ClassesPage.tsx), [CahierDeTextesPage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/cahier/CahierDeTextesPage.tsx), [EmploiDuTempsPage.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/planning/EmploiDuTempsPage.tsx)

6. Paramètres
- `Matières & volumes`: actions `+ Ajouter` en TODO.
- Réf: [SettingsSubPages.tsx](/d:/VSProjets/TeachersAssistant/TeachersAssistant/src/pages/parametres/SettingsSubPages.tsx)

## 4) Non implémenté (absent du code)

Aucun écran supplémentaire clairement attendu mais totalement absent n'a été détecté dans le périmètre actuel.  
Le principal gap est surtout `branché mais partiel` plutôt que `absent`.

## 5) Conclusion de l'étape 1

- La quasi-totalité des écrans est présente et accessible.
- Le risque principal est fonctionnel: nombreux flux encore partiels (mock, boutons inactifs, formulaires non persistés, filtres sidebar non exploités).
- Étape suivante recommandée: passer à la matrice d'écarts critiques (impact métier) pour prioriser les correctifs P2.

## 6) Lot de corrections impactantes appliqué

Corrections réalisées après cet audit:

1. Historique IA réellement branché au routeur.
- `ia-historique` ouvre désormais la vue `history` du Générateur IA.
- Les onglets internes `Générer` / `Historique` synchronisent la route (`ia-generer` / `ia-historique`).

2. Import Bibliothèque rendu accessible depuis la navigation.
- Nouvelle entrée sidebar `Importer docs`.
- Routage `preparation/importer` branché vers `BibliothequePage`.

3. Filtre sidebar `Par matière` de la Bibliothèque opérationnel.
- Ajout d'un chargement dédié des documents avec matière (`subject_id IS NOT NULL`).

4. Filtres sidebar du Cahier reliés à l'écran.
- `all` / `classe` + `filter` pilotent `activeClassId`.
- Les pills de classe mettent à jour la route (`setPage`), donc cohérence sidebar/page.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 7) Avancement complémentaire - lot persistance formulaires (P1)

Corrections appliquées:

1. `DevoirForm` persisté dans `ListeDevoirsPage`.
- Création DB réelle (`assignmentService.create`) + génération des copies (`submissionService.createBatch`).

2. `EleveForm` persisté dans `ListeElevesPage`.
- Création DB réelle (`studentService.create`) + inscription classe (`studentService.enroll`).

3. `EleveForm` persisté dans `ClassesPage`.
- Création et mise à jour élève (`studentService.create/update`) + inscription classe.

4. `CreneauForm` persisté et réactivé dans `EmploiDuTempsPage`.
- Ajout du bouton `+ Nouveau créneau` + persistance DB (`timetableService.create`).

5. `CahierEntreeForm` persisté dans `CahierDeTextesPage`.
- Création DB réelle (`lessonLogService.create`) avec source `manual`.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 8) Avancement complémentaire - placeholders critiques réactivés

Corrections appliquées:

1. `CorrectionSeriePage`:
- textarea correction passée en mode contrôlé (édition réellement prise en compte);
- bouton `Importer correction` branché (import fichier texte -> contenu correction);
- bouton `Générer feedback IA` branché (remplit forces/lacunes via `smartCorrect`);
- raccourci `Ctrl+S` remonte désormais un retour utilisateur (toast).

2. `CahierDeTextesPage`:
- bouton `Modifier` branché pour réouvrir le formulaire en mode édition;
- sauvegarde en mode édition branchée vers `lessonLogService.update`;
- conservation du mode création (`lessonLogService.create`) et refresh liste après sauvegarde.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 9) Avancement complémentaire - CorrectionSerie branchée DB

Corrections appliquées:

1. Chargement réel des copies depuis le devoir sélectionné.
- utilisation de `route.entityId` (devoir actif) et `loadSubmissions(assignmentId)`.
- récupération des données associées par copie: correction la plus récente, niveaux de compétences, feedbacks.

2. Sauvegarde réelle de la correction.
- action `Sauvegarder`: persistance texte correction (`corrections`), niveaux (`submission_skill_evaluations`) et feedbacks (`submission_feedback`).

3. Finalisation réelle.
- action `Finaliser`: mêmes persistances + `submission.status = final`.

4. Compétences dynamiques par devoir.
- chargement via `assignment_skill_map` (fallback sur compétences par défaut si non configurées).

5. Cas sans sélection/devoir.
- fallback robuste avec état vide explicite (`EmptyState`) au lieu d'un écran cassé.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 10) Avancement complémentaire - lot prioritaire `1 + 3`

### 1. Compétences réelles du devoir (création + exploitation)

Corrections appliquées:

- À la création d'un devoir (`ListeDevoirsPage`), les compétences sélectionnées sont maintenant persistées dans `assignment_skill_map`.
- Les listes de devoirs (`assignmentService.getByYear/getById`) remontent désormais `skill_labels` réelles via agrégation SQL.
- Navigation vers `CorrectionSerie` corrigée pour transporter correctement `entityId` (devoir ciblé), afin d'afficher la bonne grille de compétences.

### 3. `BilanDevoirPage` branché sur données réelles

Corrections appliquées:

- Sélection du devoir actif via `route.entityId` (ou fallback premier devoir disponible).
- Chargement réel du devoir (`assignmentService.getById`) + stats (`bilanService.computeStats`).
- Affichage dynamique:
  - histogramme des notes,
  - moyenne/médiane/min/max,
  - moyennes compétences,
  - top forces / top lacunes.
- Génération IA du commentaire de classe branchée sur les vraies stats du devoir courant.
- Export PDF bilan branché sur l'ID réel du devoir sélectionné.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 11) Avancement complémentaire - suite `4+` (point 1 puis 2)

### 1. `FicheElevePage` ID dynamique corrigé

Corrections appliquées:

- Lecture de l'ID élève depuis `route.entityId`.
- Chargement réel des données élève (`loadStudent(studentId)`).
- Chargement réel de l'évolution compétences (`loadSkillEvolution(studentId)`).
- Export PDF branché sur l'ID dynamique (`pdfExportService.buildFicheEleveHTML(studentId)`), plus d'ID hardcodé.
- Gestion du cas sans sélection avec `EmptyState` explicite.

### 2. Planning - placeholder `Google Calendar` neutralisé proprement

Corrections appliquées:

- Bouton `Google Calendar` dans `EmploiDuTempsPage` affiche maintenant un retour utilisateur (`toast`) et redirige vers `planning/calendrier` au lieu d'une action muette.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 12) Avancement complémentaire - FicheEleve `notes + bulletins`

Corrections appliquées:

- `FicheElevePage`:
  - onglet `Notes` branché sur données réelles (`studentService.getRecentGrades`), avec moyenne récente;
  - onglet `Bulletins` branché sur données réelles (`reportPeriodService.getByYear` + `loadBulletins(studentId, periodId)`);
  - sélection de période bulletin via badges filtrants.
- `studentService`:
  - ajout de `getRecentGrades(studentId, limit)` pour centraliser la requête SQL des notes.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 13) Avancement complémentaire - FicheEleve `corrections`

Corrections appliquées:

- `FicheElevePage`:
  - onglet `Corrections` branché sur données réelles (soumissions de l'élève);
  - affichage devoir, date, note et statut de correction;
  - action `Ouvrir devoir` qui navigue vers `CorrectionSerie` avec le bon `assignment_id`.
- `submissionService`:
  - ajout de `getByStudent(studentId, limit)` pour récupérer l'historique des copies côté évaluation.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 14) Avancement complémentaire - FicheEleve `profil`

Corrections appliquées:

- `FicheElevePage`:
  - onglet `Profil` branché sur `student_period_profiles` via `periodProfileService.get(studentId, periodId)`;
  - lecture des 5 dimensions (comportement, travail, participation, autonomie, méthode);
  - affichage des notes qualitatives de période quand présentes;
  - réutilisation du sélecteur de période (même logique que l'onglet `Bulletins`).

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 15) Avancement complémentaire - FicheEleve `orientation`

Corrections appliquées:

- `FicheElevePage`:
  - onglet `Orientation` branché sur données réelles:
    - rapports (`orientation_reports`) via `orientationService.getReports(studentId)`;
    - entretiens (`orientation_interviews`) via `orientationService.getInterviews(studentId)`;
  - affichage des informations clés (titre/date/contenu pour rapports, date/résumé/décisions/étapes pour entretiens).

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 16) Avancement complémentaire - FicheEleve `docs`

Corrections appliquées:

- `studentService`:
  - ajout de `getDocuments(studentId, reportPeriodId?)` (jointure `student_documents` + `documents` + `document_types` + `subjects` + `report_periods`).
- `FicheElevePage`:
  - onglet `Docs` branché sur données réelles de l'élève;
  - filtre période réutilisé pour afficher les docs de la période sélectionnée (et les docs non rattachés à une période);
  - affichage des métadonnées utiles (libellé/titre, type, matière, extension, période);
  - action `Ouvrir` branchée sur le chemin réel du document.

Validation:

- `npm run lint`: à exécuter.
- `npm run build`: à exécuter.

## 17) Avancement complémentaire - FicheEleve `apercu`

Corrections appliquées:

- `FicheElevePage`:
  - onglet `Apercu` implémenté (plus de placeholder);
  - synthèse chiffrée: moyenne récente, copies finalisées, compétences suivies, documents liés;
  - bloc "Derniers éléments" alimenté par données réelles (note, correction, bulletin période active, orientation, document);
  - raccourcis d'accès vers onglets `Notes`, `Corrections`, `Profil`, `Docs`.

Validation:

- `npm run lint`: à exécuter.
- `npm run build`: à exécuter.

## 18) Avancement complémentaire - actions globales fiche élève

Corrections appliquées:

- `FicheElevePage`:
  - bouton `Generer appreciation` branché:
    - génération IA (`taskCode: generate_appreciation`) avec variables réelles élève/profil/notes/compétences;
    - persistance en base dans `bulletin_entries` (création ou mise à jour d'une entrée `class_teacher` en brouillon);
    - rafraîchissement immédiat de l'onglet `Bulletins`.
  - bouton `Voir bulletin T2` branché:
    - sélection de la période T2 si trouvée (détection via libellé),
    - bascule automatique vers l'onglet `Bulletins`,
    - fallback informatif si T2 absente.

Validation:

- `npm run lint`: à exécuter.
- `npm run build`: à exécuter.

## 19) Avancement complémentaire - branchement complet sidebar (filtres/pages)

Corrections appliquées:

- `Programme > Progression`:
  - `route.filter` est maintenant consommé:
    - `timeline` -> vue timeline DnD,
    - `liste` -> vue liste,
    - `classe` -> vue par classe compacte.
- `Préparation > Séquences`:
  - `route.page === templates` -> filtre des séquences templates,
  - `route.filter === in_progress` -> filtre des séquences en cours.
- `Planning > Import`:
  - `route.page === edt-import` déclenche explicitement le flux import ICS (file picker) au chargement de la page.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 20) Avancement complémentaire - lot placeholders impactants

Corrections appliquées:

- `SequenceDetailPage`:
  - bouton `Plan IA` branché (génération IA + mise à jour description séquence);
  - bouton `Générer déroulé IA` branché (génération IA + mise à jour `lesson_plan` de la séance);
  - bouton `Cahier de textes` branché (création entrée `lesson_log` puis navigation vers l'onglet Cahier).
- `BulletinsPage`:
  - bascule d'une version majoritairement mock vers un chargement DB réel:
    - classes (`classService`), périodes (`reportPeriodService`), élèves (`studentService`),
    - statuts par période (`bulletinService`),
    - édition/sauvegarde d'appréciation (`bulletinService.create/update/updateStatus`),
    - génération IA unitaire et batch (`aiBulletinService`) + persistance,
    - export PDF sur période active réelle.
- `SettingsSubPages`:
  - suppression des actions textuelles `TODO` résiduelles.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 21) Avancement complémentaire - Paramètres CRUD UI complet

Corrections appliquées:

- `MatieresSettings`:
  - CRUD UI complet des matières:
    - création (formulaire inline),
    - édition (préremplissage + update),
    - suppression avec confirmation.
- `MatieresSettings`:
  - CRUD UI complet des classes:
    - création (niveau, nom, nom court, effectif),
    - édition,
    - suppression avec confirmation.
  - affichage filtré sur l'année active.
- `SettingsSubPages`:
  - réécriture propre UTF-8 (suppression des corruptions d'encodage).
- `ParametresPage.css`:
  - ajout styles CRUD (header actions, formulaires inline, actions de ligne).

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 22) Avancement complémentaire - Paramètres CRUD UI (niveaux + capacités)

Corrections appliquées:

- `MatieresSettings`:
  - ajout CRUD UI complet des niveaux:
    - création,
    - édition,
    - suppression (confirmation),
    - tableau d'administration.
- `CapacitesSettings`:
  - passage d'une vue lecture seule à un CRUD UI complet:
    - création/édition/suppression des capacités (`skills`),
    - champs type/catégorie/libellé/description/matière/niveau/max niveau,
    - persistance via `skillService`.
- `levelService`:
  - ajout API manquantes: `create`, `update`, `delete`.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 23) Avancement complémentaire - Paramètres (recherche, tri, pagination)

Corrections appliquées:

- `MatieresSettings`:
  - ajout de la recherche, du tri et de la pagination sur les tableaux:
    - matières,
    - niveaux,
    - classes;
  - ajout d'une barre de contrôle homogène (champ recherche + sélecteur tri + taille de page);
  - pagination avec navigation `Précédent/Suivant` + compteur de résultats.
- `CapacitesSettings`:
  - ajout de la recherche, du tri et de la pagination sur la table des capacités;
  - tri étendu par libellé, catégorie, type, matière et niveau.
- Optimisation de rendu:
  - remplacement des `find(...)` répétés par des maps `id -> entité` (`useMemo`) pour les libellés niveau/matière.
- `ParametresPage.css`:
  - ajout des styles UI pour toolbar de table, pagination et états `disabled`.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 24) Avancement complémentaire - suite `4+` (gestion erreurs apercu PDF)

Corrections appliquees:

- `PDFPreviewModal`:
  - ajout d'une gestion d'erreur explicite si HTML vide/non chargeable;
  - desactivation des actions `Telecharger` / `Imprimer` quand l'aperçu est invalide;
  - affichage d'un message d'erreur dans le corps du modal au lieu d'un iframe vide.
- `FicheElevePage`:
  - export PDF securise (toast si eleve non selectionne, HTML vide ou erreur generation).
- `BulletinsPage`:
  - export PDF securise (controle HTML vide + log erreur + toast).
- `BilanDevoirPage`:
  - suppression du fallback silencieux `window.print()`;
  - gestion explicite des erreurs (controle HTML vide + toast).
- `ProgressionAnnuellePage`:
  - export PDF base sur l'annee active (plus d'ID hardcode `1`);
  - gestion explicite des erreurs (annee absente / HTML vide / erreur generation).
- `CahierDeTextesPage`:
  - controle de contenu avant export (toast si aucune entree ou HTML vide).

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 25) Avancement complémentaire - suppression mocks impactants (`Cahier` + `Progression`)

Corrections appliquees:

- `CahierDeTextesPage`:
  - suppression du fallback `MOCK_ENTRIES` (plus de donnees fictives en cas de liste vide);
  - remplacement des classes statiques par chargement reel via `classService.getByYear(activeYear.id)`;
  - filtrage par `class_id` reel (plus de filtre par libelle hardcode);
  - gestion d'erreur explicite au chargement (toast + liste vide).
- `ProgressionAnnuellePage`:
  - suppression des jeux de donnees statiques (`INITIAL_SEQUENCES`, `AVAILABLE_SEQUENCES`);
  - chargement des sequences reelles via `loadSequences()` (DataProvider / DB);
  - mapping dynamique vers la timeline (position/duree derivees des champs reels: dates, `sort_order`, `total_hours`);
  - vue compacte non-factice: regroupement par `level_label` au lieu de classes mockees;
  - etat vide explicite si aucune sequence.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 26) Avancement complémentaire - réactivation actions muettes

Corrections appliquees:

- `ProgressionAnnuellePage`:
  - bouton `+ Nouvelle sequence` rebranche sur un vrai flux `SequenceForm`;
  - persistance complete a la creation (table `sequences` + classes + topics + documents);
  - rafraichissement immediat de la vue progression apres creation.
- `CahierDeTextesPage`:
  - bouton `Ouvrir seance` maintenant contextuel:
    - ouvre la sequence cible si `session_id` existe;
    - positionne la route avec `entityId` (sequence) et `subView` (session) pour focaliser l'ouverture;
    - messages explicites si entree non liee / seance introuvable.
- `SequenceDetailPage`:
  - lecture de `route.entityId` pour selectionner automatiquement la sequence cible;
  - lecture de `route.subView` pour ouvrir automatiquement la seance cible dans l'accordeon.
- `BulletinsPage` + `aiBulletinService`:
  - le champ `Consignes IA complementaires` est maintenant branche;
  - transmission des consignes au flux IA unitaire ET batch (`userInstructions`).

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 27) Avancement complémentaire - harmonisation encodage UI (mojibake)

Corrections appliquees:

- `SettingsSubPages`:
  - remplacement des 4 icones `EmptyState` corrompues (mojibake) par des icones UTF-8 propres:
    - matieres: `📚`,
    - niveaux: `🏷️`,
    - classes: `🏫`,
    - capacites: `🎯`.

Validation:

- scan encodage (`rg 'Ã|Â|ðŸ|â' src`): plus aucune occurrence.
- `npm run lint`: OK.
- `npm run build`: OK.

## 28) Avancement complémentaire - cohérence terminologique UX

Corrections appliquées:

- `ProgressionAnnuellePage`:
  - harmonisation des libellés utilisateur (séquences, début/durée, états vides).
- `CahierDeTextesPage`:
  - harmonisation des libellés d'actions et toasts (`Matière`, `Ouvrir la séance`, message d'erreur explicite).
- `BulletinsPage`:
  - harmonisation des messages d'action et d'état (`Élève`, `année`, consignes de sélection).

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 29) Avancement complémentaire - cohérence terminologique UX (Evaluation)

Corrections appliquées:

- `BilanDevoirPage`:
  - harmonisation des libellés et toasts visibles utilisateur (accents, formulations, états d'erreur PDF/IA).
- `FicheElevePage`:
  - harmonisation des onglets, titres de sections, labels d'actions et messages de feedback (accents et cohérence lexicale).
- `CorrectionSeriePage`:
  - harmonisation des messages de toast et états vides (`Échec`, `Élève`, `sélectionnée`, `terminée`, etc.);
  - harmonisation des labels UI (`Élèves`, `Grille compétences`, raccourcis clavier, microcopie de navigation).

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 30) Avancement complémentaire - harmonisation terminologique (Préparation + Bulletins)

Corrections appliquées:

- `SequenceDetailPage`:
  - harmonisation des statuts, toasts et libellés visibles (`Séquence`, `Séance`, `Déroulé`, `Échec`, `Sélectionnez`, etc.).
- `GenerateurIAPage`:
  - harmonisation de la microcopie UI (`Générer`, `Génération`, `Contexte pédagogique`, `Paramètres`, `Résultat`, etc.);
  - correction des chaînes mojibake restantes dans l’historique et la file d’attente (icônes, libellés, messages).
- `BulletinsPage`:
  - harmonisation des toasts/actions/libellés (`Période`, `Appréciation`, `Générer`, `Aperçu`, `Élève`, etc.);
  - correction de chaînes mal encodées en état vide éditeur.
- `FicheElevePage`:
  - harmonisation du titre `Évolution sur l'année`.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 31) Avancement complémentaire - harmonisation terminologique globale (hors Evaluation/Preparation)

Corrections appliquées:

- `CahierDeTextesPage`:
  - harmonisation des toasts, états vides et libellés d’actions (`entrée`, `séance`, `Aperçu`, `Échec`, etc.).
- `CalendrierScolairePage`:
  - harmonisation des libellés calendrier (mois accentués, `Année`, `Périodes`, `férié`) et des icônes de synthèse.
- `EmploiDuTempsPage`:
  - harmonisation des messages de feedback (`année`, `créneau`, `données`, `événement`) et des labels d’action.
- `ProgressionAnnuellePage`:
  - harmonisation des toasts/libellés (`année`, `séquence`, `Aperçu`, `Échec`, `programmées`, mois accentués).
- `ParametresPage`:
  - harmonisation du hub Paramètres (titres/cartes/actions), remplacement des placeholders d’icônes et accents.
- `AITemplateEditorPage`:
  - harmonisation terminologique complète des libellés UI (tâches, paramètres, clé API, mode avancé, réinitialisation, etc.).
- `SettingsSubPages`:
  - harmonisation de nombreux libellés/toasts/tables/pagination (`libellé`, `abréviation`, `Précédent`, `matière`, `capacité`, etc.);
  - correction des icônes `EmptyState` corrompues.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 32) Avancement complémentaire - qualité visuelle transverse (actions, états vides, statuts)

Corrections appliquées:

- `Toast` (`src/components/ui/Toast.tsx` + `Toast.css`):
  - refonte visuelle cohérente: titre par type (`Succès`, `Erreur`, `Attention`, `Info`) + message;
  - icônes de statut normalisées, meilleure hiérarchie visuelle, bordure latérale colorée;
  - améliorations UX/accessibilité: `role="status"`, `aria-live`, bouton de fermeture avec `aria-label`, responsive mobile.
- `EmptyState` (`src/components/ui/EmptyState.tsx` + `EmptyState.css`):
  - harmonisation du rendu sur tous les écrans: conteneur carte neutre, icône centrée dans pastille, meilleure lisibilité;
  - conservation de l’API existante (pas de rupture).
- `Badge` (`src/components/ui/Badge.tsx` + `Badge.css`):
  - extension de la normalisation des statuts (`completed`, `pending`, `to_confirm`, `ai_processing`, `queued`, `failed`, etc.);
  - amélioration visuelle des badges de statut (contour subtil) et homogénéisation d’icône.
- Harmonisation interactions boutons natifs:
  - `BulletinsPage.css`: alignement des boutons/pills/actions sur les comportements du design system (`hover`, `focus-visible`, `active`, `disabled`);
  - `ParametresPage.css`: mêmes règles d’interaction sur les actions globales.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 33) Avancement complémentaire - performance UI (re-renders ciblés)

Optimisations appliquées:

- `BulletinsPage`:
  - factorisation du recalcul des lignes élève/période dans une fonction unique mémoïsée (`reloadRowsForClass`);
  - suppression de recalculs répétés via `useMemo` (`statusCounts`, `activePeriod`, `rowsById`, `tableRows`);
  - conservation du comportement fonctionnel, avec moins de travail de rendu sur les changements de saisie éditeur.
- `CorrectionSeriePage`:
  - mémoïsation des sélecteurs dérivés (`skillLabels`, `selected`) pour limiter les recalculs pendant l’édition de correction.
- `FicheElevePage`:
  - stabilisation de l’action `Voir bulletin T2` via `useCallback` pour éviter les recréations inutiles de handler.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 34) Avancement complémentaire - performance UI (virtualisation simple listes longues)

Optimisations appliquées:

- `BulletinsPage`:
  - virtualisation simple de la table élèves (fenêtrage + overscan + spacers) pour limiter le nombre de lignes DOM rendues;
  - conservation du rendu fonctionnel (sélection, statuts, actions), avec scrolling natif.
- `CorrectionSeriePage`:
  - virtualisation simple de la liste élèves (colonne gauche) pour garder une navigation fluide sur gros effectifs;
  - ajout d’un conteneur scroll dédié et calcul de plage visible.
- `FicheElevePage`:
  - stabilisation complémentaire de callback (`Voir bulletin T2`) pour réduire les recréations de handlers.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 35) Avancement complémentaire - robustesse data-fetch (cache + invalidation ciblée)

Optimisations appliquées:

- `BulletinsPage`:
  - ajout d’un cache mémoire local pour les lectures répétitives:
    - bulletins par couple `élève/période` (`getByStudentPeriod`),
    - notes récentes par élève (`getRecentGrades`);
  - déduplication des requêtes concurrentes via cache de promesses “in flight”;
  - invalidation ciblée du cache après écriture (`create/update/status`) pour garantir la cohérence des données;
  - réutilisation du cache dans:
    - chargement de la grille classe/périodes,
    - chargement éditeur,
    - copie T1,
    - génération batch.
- purge automatique des caches au changement d’année active.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 36) Avancement complémentaire - robustesse data-fetch (Fiche élève + Correction série)

Optimisations appliquées:

- `FicheElevePage`:
  - ajout de caches mémoire locaux + déduplication des requêtes en vol pour:
    - notes récentes élève,
    - corrections élève,
    - bulletins (élève/période),
    - profil de période (élève/période),
    - orientation (rapports + entretiens),
    - documents élève (élève/période);
  - réutilisation des données en cache dans les `useEffect` de chargement;
  - invalidation ciblée du cache bulletins après génération/enregistrement d’appréciation IA;
  - purge complète des caches au changement d’année active.
- `CorrectionSeriePage`:
  - ajout de caches mémoire locaux + déduplication des requêtes en vol pour:
    - compétences du devoir,
    - soumissions du devoir,
    - détails de soumission (évaluations compétences, feedbacks, dernière correction);
  - bascule du chargement principal sur ces helpers cache/dédoublonnage;
  - invalidation ciblée du cache détail après sauvegarde/finalisation de copie;
  - purge des caches au changement de devoir (`assignmentId`).

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 37) Avancement complémentaire - IA : CRUD tâches, aperçu prompt, mode vocal, tableau de bord coûts, multi-fournisseur

Corrections et nouveautés appliquées:

### Tâches IA custom (CRUD)

- `AITemplateEditorPage`:
  - bouton `+` dans la sidebar déclenche un formulaire inline de création de tâche;
  - champs: libellé → auto-génération du code slug, catégorie, icône, format de sortie;
  - persistance DB via `aiTaskService.createTask()` (colonne `is_custom = 1`, migration `012_ai_custom_tasks.sql`);
  - bouton duplication `⧉` (hover) crée une copie complète incluant variables et paramètres (`aiTaskService.duplicateTask()`);
  - bouton `Supprimer` visible uniquement sur les tâches custom (`is_custom = 1`);
  - badge visuel `CUSTOM` + bordure gauche colorée distinguant tâches system vs. custom dans la sidebar.

### Aperçu du prompt assemblé

- `GenerateurIAPage`:
  - bouton `Aperçu du prompt` adjacent au bouton `Générer`;
  - appel `assemblePrompt()` sans appel API → affichage du prompt résolu dans un panneau dédié;
  - panneau multi-couches (Couche 1 système en fond violet, Couches 2+3 message utilisateur);
  - permet de vérifier les variables résolues et le texte exact soumis au modèle avant génération.

### Mode vocal (Web Speech API)

- Composant `VoiceInput` (`src/components/ui/VoiceInput.tsx`):
  - utilise `window.SpeechRecognition` / `window.webkitSpeechRecognition` (API navigateur native, gratuite);
  - bouton micro intégré à la section "Consignes complémentaires" du `GenerateurIAPage`;
  - animation pulsante rouge en écoute active;
  - fallback gracieux si l'API n'est pas disponible (bouton masqué).
- Coût: nul (API navigateur locale, aucun appel réseau payant).

### Tableau de bord consommation & coûts IA

- Nouvelle page `AIUsagePage` (`src/pages/preparation/AIUsagePage.tsx`):
  - 4 KPIs: coût estimé ce mois / coût total / tokens consommés / coût moyen par génération;
  - table par modèle (tokens entrée/sortie, count, coût estimé);
  - barres horizontales par catégorie (contenus, évaluations, planification, correction, système);
  - histogramme vertical mensuel sur 6 mois (tokens + coût);
  - tableau des 20 générations récentes (tâche, catégorie, modèle, tokens, coût, date);
  - sélecteur de modèle pour recalculer les coûts avec un tarif différent.
- Service `aiUsageService`: `byModel()`, `byCategory()`, `byMonth(limit)`, `recent(limit)`, `totalsThisMonth()`.
- Fonction `estimateCost(tokensIn, tokensOut, model)` avec table de prix `MODEL_PRICING`.
- Navigation: sidebar `Préparation > GÉNÉRATEUR IA > Consommation & coûts` (`ia-couts`), branché dans `App.tsx`.

### Multi-fournisseur IA (Mistral + Ollama local)

- `aiService.ts` étendu:
  - type `AIProvider`: `'openai' | 'mistral' | 'anthropic' | 'local'`;
  - `getApiKey(provider)` / `setApiKey(key, provider)`: clé keyring spécifique par fournisseur;
  - `callChatAPI()` provider-aware: endpoint + header d'authentification sélectionné selon le fournisseur actif;
  - Mistral: `api.mistral.ai/v1/chat/completions` avec `Authorization: Bearer {key}`;
  - Local (Ollama): `{local_server_url}/v1/chat/completions` sans header d'auth.
- `ollamaService`:
  - `ping(baseUrl)`: GET `/api/version` (timeout 3s) → booléen online/offline;
  - `listModels(baseUrl)`: GET `/api/tags` → liste des modèles installés (`string[]`).
- `AITemplateEditorPage` sidebar paramètres:
  - sélecteur fournisseur (OpenAI / Mistral / Anthropic / Serveur local);
  - champ API key masqué avec toggle visibilité (masqué pour Ollama local);
  - bloc Ollama: champ URL serveur + pastille statut (vert/rouge) + bouton Rafraîchir les modèles;
  - sélecteur de modèle dynamique (catalogue Ollama) ou statique (cloud providers);
  - auto-ping au changement de fournisseur vers `local`.
- Migration `013_ai_provider_settings.sql`: ajout colonnes `provider` et `local_server_url` dans `ai_settings`.
- Modèles Mistral ajoutés à `MODEL_PRICING`: `mistral-large-latest`, `mistral-small-latest`, `open-mistral-7b`, `open-mixtral-8x7b`.

### Google Calendar sync (OAuth implémenté)

- **OAuth Desktop flow implémenté** (`googleCalendarService.ts` + commandes Tauri `oauth_init`/`oauth_wait` dans `lib.rs`):
  - Loopback HTTP server sur port aléatoire (`127.0.0.1:0`) — aucune dépendance externe, stdlib Rust uniquement.
  - Ouverture du navigateur via `@tauri-apps/plugin-shell` (`shell:allow-open`).
  - Échange du code d'autorisation contre `access_token` + `refresh_token` via `fetch()`.
  - Stockage du `refresh_token` dans le keyring OS (fallback localStorage).
  - Rafraîchissement automatique du token avant expiration.
- **Nouveau modal `GoogleCalendarModal`** (`src/components/forms/GoogleCalendarModal.tsx`):
  - Onglet configuration (client_id, client_secret, aide pas-à-pas).
  - Onglet import : sélecteur de calendrier (liste dynamique via API), sélecteur de plage (7j/30j/trimestre/année scolaire).
  - Réutilise `ICSMappingModal` pour la correspondance événements → matières/classes.
  - Déconnexion avec révocation du token.
- **`EmploiDuTempsPage`** : bouton "Google Calendar" ouvre désormais `GoogleCalendarModal` au lieu d'un toast inactif.
- **Scope** : `https://www.googleapis.com/auth/calendar.readonly` (lecture seule, import one-way vers l'EDT local).
- Statut audit mis à jour : `Import ICS fonctionnel, OAuth Google implémenté (flux Desktop loopback)`.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 38) Avancement complémentaire - documents de référence pour la génération IA

Nouveautés appliquées:

### Pièces jointes documents dans `GenerateurIAPage`

- Nouvelle section "Documents de référence" insérée entre les consignes et le bouton Générer:
  - **Picker bibliothèque** : barre de recherche avec debounce (250ms) → `documentService.search()` ou `getRecent(8)` si vide;
  - résultats affichés sous forme de liste cliquable; icône ⚠ si `extracted_text` absent (import non effectué);
  - documents sélectionnés affichés sous forme de **chips** (bleu) avec bouton ✕ individuel;
  - **Fichier ad-hoc** : bouton "Joindre un fichier (.txt/.docx)" → extraction locale:
    - `.txt` via `file.text()`,
    - `.docx` via `mammoth.extractRawText()` (import dynamique),
    - PDF : nécessite import via la bibliothèque (extracted_text déjà en base);
  - fichiers joints affichés en chips orange distincts.
- État réinitialisé à chaque changement de tâche IA.

### Injection dans `assemblePrompt()`

- `AIGenerationRequest` étendu: `rawDocumentContexts?: string[]`.
- Pour chaque `documentId`: lecture `extracted_text` + `title` depuis `documents` → injection `--- Document de référence : {title} ---\n{texte}\n---` avant les consignes.
- Pour chaque contexte brut: injection `--- Fichier joint ---\n{texte}\n---`.
- Les deux `handleGenerate` et `handlePreviewPrompt` transmettent `documentIds` et `rawDocumentContexts`.

Validation:

- `npm run build`: OK (aucun warning nouveau).

## 39) Avancement complémentaire - gestion des évaluations (types, compétences, templates)

### 1. Arborescence organisée sous `executableDir`

- `workspaceService.getAppSubDir(type, ...parts)` remplace `getCopiesDir()`:
  - types disponibles : `copies` / `documents` / `exports` / `generations_ia` / `backups`;
  - `copies/<classe>/<devoir>/` — organisé par `className` + `assignmentTitle`;
  - `documents/<niveau>/<matière>/` — destination IA après classification;
  - `exports/`, `generations_ia/`, `backups/` — prévus mais non encore peuplés dynamiquement;
  - chaque composant sanitizé (caractères spéciaux → `_`, espaces → `_`, max 40 chars);
  - répertoire créé si absent (`mkdir recursive`).
- `BulkCopyImportModal` : nouvelles props `className` + `assignmentTitle` → transmises à `getAppSubDir`.
- `CorrectionSeriePage` : utilise `getAppSubDir(‘copies’, assignment.class_name, assignment.title)` pour l’import individuel.
- `documentUploadService` : classification IA AVANT écriture sur disque → destination `documents/<niveau>/<matière>/`.

### 2. Types d’évaluation — CRUD complet (`TypesEvaluationSettings`)

- Nouvelle sous-page Paramètres `types-evaluation` → `TypesEvaluationSettings`.
- CRUD complet: création, édition, suppression (soft delete `is_active=0`).
- Liens M:N vers `skills` (`assignment_type_skill_map`) et `general_competencies` (`assignment_type_competency_map`).
- Multi-sélection par badges (capacités) et badges colorés (compétences générales).
- Service `assignmentTypeService` : `getAll / create / update / delete / getSkillIds / setSkills / getCompetencyIds / setCompetencies`.
- Migration `017_competencies.sql`.

### 3. Compétences générales — CRUD complet (`CompetencesGeneralesSettings`)

- Nouvelle sous-page Paramètres `competences` → `CompetencesGeneralesSettings`.
- Champs : libellé, description, couleur (color picker natif).
- Liens M:N vers `skills` (`skill_competency_map`) : une capacité peut appartenir à plusieurs compétences.
- Service `generalCompetencyService` : `getAll / create / update / delete / getSkillIds / setSkills`.
- `skillService` étendu : `getCompetencyIds(skillId)` + `setCompetencies(skillId, competencyIds)`.
- `CapacitesSettings` mis à jour : badges compétences associées en création/édition de capacité.

### 4. DevoirForm branché sur données réelles

- Suppression des 5 constantes `MOCK_*` (`MOCK_ASSIGNMENT_TYPES`, `MOCK_CLASSES`, `MOCK_SUBJECTS`, `MOCK_SEQUENCES`, `MOCK_SKILLS`).
- Chargement réel à l’ouverture du drawer : `assignmentTypeService`, `classService`, `subjectService`, `sequenceService`, `skillService`.
- Auto-remplissage `max_score` depuis `default_max_score` du type sélectionné.
- Filtrage des capacités par matière sélectionnée.

### 5. Descripteurs de niveaux de maîtrise — `GrilleDescriptiveModal`

- Migration `018_skill_descriptors.sql` : table `skill_level_descriptors` (skill_id × level 1-4, UNIQUE).
- Service `skillDescriptorService` : `getBySkill / getBySkillIds / upsert / upsertAll`.
- `DEFAULT_LEVEL_LABELS` : Non atteint / Partiellement atteint / Atteint / Dépassé.
- `GrilleDescriptiveModal` (depuis `CorrectionSeriePage`) : édition des critères observables pour chaque niveau de chaque capacité du devoir.
- Sauvegarde par capacité ou globale.

### 6. Template de correction imprimable — `CorrectionTemplateModal`

- `CorrectionTemplateModal` (depuis `CorrectionSeriePage`) : modal plein format affiché et imprimable (`window.print()`).
- Contenu : en-tête devoir/classe/matière, bloc note, appréciation générale, forces/lacunes, grille capacités (3 lignes × 5 colonnes : libellés des 4 niveaux + niveau atteint mis en évidence par couleur).
- Bouton `Grille descriptive` + bouton `Template correction` ajoutés dans `CorrectionSeriePage`.

Validation:

- `npm run lint`: OK.
- `npm run build`: OK.

## 40) Avancement complémentaire - Tableau de notes, Import Pronote PDF, Diaporama JSON, Quiz interactif

### 1. Tableau de notes (`TableauNotesPage`)

- Nouvelle page `src/pages/evaluation/TableauNotesPage.tsx` + CSS :
  - grille élèves × évaluations avec filtres classe / matière / période ;
  - filtre période basé sur `report_periods` (fonctionne trimestres ET semestres) ;
  - moyennes pondérées /20 par élève (coefficient de chaque évaluation) ;
  - moyenne de classe par évaluation et moyenne générale ;
  - coloration par seuils (vert ≥80%, noir ≥50%, orange ≥30%, rouge <30%) ;
  - colonnes sticky (nom élève à gauche, moyenne à droite) ;
  - bouton import PDF Pronote intégré.
- Service `gradeTableService.getGradeTable(classId, subjectId, yearId, periodStart?, periodEnd?)` ajouté dans `evaluationService.ts`.
- Types `GradeTableResult`, `GradeTableAssignment`, `GradeTableStudent`, `GradeTableScore` dans `evaluation.ts`.
- Navigation : sidebar Évaluation > NOTES > Tableau de notes (`page: 'tableau-notes'`), branché dans `App.tsx`.

### 2. Import de notes PDF Pronote multi-évaluations

- Parser `pronoteGradeParser.ts` (`src/utils/`) :
  - extraction texte PDF via `pdfjs-dist` ;
  - parsing header Pronote : détection `Coef. X - Y`, titres d'évaluations, dates ;
  - parsing lignes données : code classe, scores multiples, moyenne, noms (majuscules consécutives = nom de famille) ;
  - gestion des valeurs nulles : `Abs`, `Disp`, `N.N`, `X`, `–` ;
  - détection format "liste d'élèves" vs "tableau de notes" (erreur explicite) ;
  - PDF uniquement (pas de CSV — Pronote n'exporte pas en CSV).
- Modal `PronoteGradeImportModal.tsx` (`src/components/evaluation/`) :
  - workflow 4 phases : upload → config → preview → saving → done ;
  - config : tableau des évaluations détectées (checkbox, titre éditable, barème, coefficient) ;
  - preview : correspondance élèves avec badges confiance (exact/partiel/—), dropdown de correction manuelle ;
  - save : création automatique des évaluations (`assignmentService.create`) + submissions (`submissionService.createBatch`) + injection notes (`submissionService.updateScore`) ;
  - métadonnées Pronote affichées (matière, période, groupe).

### 3. Diaporama structuré JSON (`generate_slideshow`)

- Migration `026_slideshow_and_quiz.sql` :
  - `generate_slideshow` mis à jour en `output_format: 'json'` avec prompt structuré ;
  - JSON : `{ title, subtitle, totalSlides, slides: [{ number, title, content[], notes, visualSuggestion, type }], conclusion, suggestedActivity }` ;
  - types de diapositives : `title`, `content`, `document`, `activity`, `transition`, `summary`.
- Composant `SlideViewer` (`src/components/ai/SlideViewer.tsx` + CSS) :
  - mode **Diapo** : navigation unitaire (← →), raccourcis clavier, dots cliquables ;
  - mode **Liste** : cartes cliquables avec aperçu condensé ;
  - toggle notes professeur, suggestions visuelles ;
  - pied de page : conclusion + activité suggérée.
- Types `SlideshowData`, `SlideshowSlide`, `SlideType` ajoutés dans `types/ai.ts`.

### 4. Quiz interactif (`generate_quiz`)

- Migration `026_slideshow_and_quiz.sql` :
  - nouvelle tâche `generate_quiz` (catégorie `evaluations`, `output_format: 'json'`) ;
  - paramètres spécifiques : `num_questions`, `question_type` (qcm/multiple/vrai_faux/mixte), `time_per_question` ;
  - variables contextuelles : matière, niveau, chapitre, séance, capacités, documents ;
  - JSON : `{ title, subject, chapter, totalQuestions, questions: [{ number, type, question, choices[], correctAnswers[], explanation, timeLimit, difficulty, skill }] }`.
- Composant `QuizViewer` (`src/components/ai/QuizViewer.tsx` + CSS) :
  - mode **Liste** ou **Question** (navigation unitaire) ;
  - réponses correctes colorées en vert (masquables) ;
  - explications pédagogiques (masquables) ;
  - badges difficulté colorés (facile/standard/approfondi/expert) ;
  - **export Kahoot CSV** : téléchargement direct, format compatible import Kahoot ;
  - **export Moodle XML** : format `multichoice` standard, catégorie, feedbacks, support choix multiples.
- Types `QuizData`, `QuizQuestion`, `QuizQuestionType` ajoutés dans `types/ai.ts`.

### 5. Intégration dans `GenerateurIAPage`

- Détection automatique du format JSON structuré quand la tâche est `generate_slideshow` ou `generate_quiz` ;
- Affichage du viewer adapté (SlideViewer / QuizViewer) au lieu du rendu markdown ;
- Fallback `<details>` "Voir le JSON brut" pour debug/copie ;
- Les actions existantes (sauvegarder, copier, régénérer, noter) restent disponibles.

### 6. Documents de référence dans les générations contextuelles

- `useScreenAITasks` (`src/hooks/useScreenAITasks.ts`) :
  - `ScreenAIContext` enrichi avec `documentIds?: ID[]` et `rawDocumentContexts?: string[]` ;
  - le hook transmet désormais ces champs dans `AIGenerationRequest` lors de l'appel à `smartGenerate()` ;
  - les écrans contextuels (séquence, correction, fiche élève) peuvent joindre des documents de la bibliothèque ou des fichiers ad-hoc au même titre que le `GenerateurIAPage`.
- Le `GenerateurIAPage` supportait déjà les deux modes (bibliothèque + ad-hoc .txt/.docx) depuis le lot 38.

Validation:

- `npx tsc --noEmit`: OK.

## Reste à faire (backlog priorisé)

### Priorité 1 - Stabilisation technique

- Uniformiser la gestion d’erreurs runtime sur les pages Evaluation clés (`BulletinsPage`, `FicheElevePage`, `CorrectionSeriePage`):
  - boundary UI d’erreur par panneau,
  - actions `Réessayer` explicites,
  - toasts cohérents et non dupliqués.
- Finaliser la robustesse des aperçus PDF:
  - fallback fiable si `iframe` ne peut pas charger le document,
  - message utilisateur exploitable (permission, chemin invalide, format non supporté),
  - logs techniques normalisés.
- Réduire les requêtes écriture en rafale côté correction:
  - regrouper les `upsert/create` séquentiels par soumission quand possible,
  - limiter les allers-retours DB pour feedbacks/compétences.


### Priorité 2 - Qualité fonctionnelle

- **Améliorer le système de correction des copies** :
  - ~~**Import par lot**~~ ✅ **Implémenté** — `BulkCopyImportModal` : sélection multiple (PDF, image, DOCX), matching automatique nom de fichier → élève (`studentMatcher`), mapping manuel, barre de progression, rapport final. Import individuel dans `CorrectionSeriePage`.
  - ~~**Stockage organisé sous `executableDir`**~~ ✅ **Migré** — `workspaceService.getAppSubDir(type, ...parts)` : `copies/<classe>/<devoir>/`, `documents/<niveau>/<matière>/`, `exports/`, `generations_ia/`, `backups/`. Chaque composant sanitizé.
  - ~~**Pseudonymisation texte avant envoi IA**~~ ✅ **Implémenté** — `pseudonymizeText()` remplace nom + prénom de l’élève par `[Élève]` dans `copie_contenu` avant tout envoi cloud. Limitation connue : les images de copies pouvant contenir un nom manuscrit ne peuvent pas être pseudonymisées (passer à Ollama local pour ces cas).
  - ~~**Types d’évaluation CRUD**~~ ✅ **Implémenté** — `TypesEvaluationSettings` : création/édition/suppression, liens M:N capacités + compétences.
  - ~~**Compétences générales CRUD**~~ ✅ **Implémenté** — `CompetencesGeneralesSettings` : couleur, liens M:N capacités; `CapacitesSettings` mis à jour.
  - ~~**DevoirForm données réelles**~~ ✅ **Implémenté** — suppression des 5 MOCK_*, chargement DB réel, auto-fill barème.
  - ~~**Descripteurs niveaux de maîtrise**~~ ✅ **Implémenté** — `GrilleDescriptiveModal` + migration 018 + `skillDescriptorService`.
  - ~~**Template de correction imprimable**~~ ✅ **Implémenté** — `CorrectionTemplateModal` avec grille capacités colorée + `window.print()`.
  - Permettre l’analyse IA en batch sur toutes les copies d’un devoir (pipeline : import texte → `assemblePrompt` correction → `smartCorrect` → persistance `corrections` + `submission_skill_evaluations` + `submission_feedback` pour chaque copie).
  - Raccourcis clavier manquants dans le mode correction 3 colonnes (navigation copie suivante/précédente, finalisation rapide).
- ~~**Remplissage prédictif du cahier de textes** (effort faible)~~ — **FAIT** :
  - Bouton “Générer le résumé IA” dans `CahierEntreeForm` via `useScreenAITasks(AI_SCREEN.CAHIER_ENTREE)`. Envoie titre, matière, classe, notes libres/vocales à la tâche `generate_lesson_log`. Parsing structuré (contenu/activités/devoirs) + fallback texte brut. Migration 024.
- ~~**Différenciation pédagogique instantanée** (effort faible)~~ — **FAIT** :
  - Tâche IA catalogue `differentiate_document` : génère 3 versions (simplifié / standard / enrichi) en un seul prompt. Variables : matière, niveau, document source, chapitre, capacités. Intégrée au `GenerateurIAPage` via `target_screens`. Migration 025.
- ~~**Rapport de classe pour conseil de classe** (effort faible)~~ — **FAIT** :
  - Tâche IA `generate_council_report` : agrège moyenne classe, répartition des notes, bilan compétences, mentions indicatives par élève → synthèse structurée (bilan général, points forts, axes d’amélioration, recommandations) exportable PDF. Écrans : `generateur_ia`, `correction_serie`. Migration 025.
- ~~Compléter les flows CRUD manquants restants dans les onglets encore partiels (actions secondaires, confirmations, cas vides).~~ — **FAIT** :
  - `ProfileTabPanel` : édition complète (score pills 1-5, textarea notes, save/cancel), `onSave` → `periodProfileService.upsert()` avec invalidation cache.
  - `BulletinsTabPanel` : édition inline du contenu + suppression avec `ConfirmDialog`, `StatusBadge` avec `BULLETIN_STATUS_META`, labels français `entry_type`.
  - `OrientationTabPanel` : suppression rapports et entretiens avec `ConfirmDialog`, `orientationService.deleteReport/deleteInterview`.
  - `DocumentsTabPanel` : bouton « Délier » avec `ConfirmDialog`, `studentService.unlinkDocument()`.
  - CSS dédié : `.fiche-eleve__score-pills`, `.fiche-eleve__score-pill`, `.fiche-eleve__profile-notes`, `.fiche-eleve__profile-actions`, `.fiche-eleve__section-header-row`, `.fiche-eleve__inline-btn`.
- ~~Harmoniser les statuts métiers affichés avec un dictionnaire unique (libellé, couleur, icône) partagé UI/services.~~ — **FAIT** :
  - 6 dictionnaires centralisés dans `src/constants/statuses.ts` : `SUBMISSION_STATUS_META`, `BULLETIN_STATUS_META`, `ASSIGNMENT_STATUS_META`, `SEQUENCE_STATUS_META`, `SESSION_STATUS_META`, `AI_TASK_STATUS_META`.
  - Composant `StatusBadge` utilisé dans `DashboardPage`, `ListeDevoirsPage`, `BulletinsTabPanel`, `CorrectionSeriePage`, `BulletinsPage`.
  - `ListeDevoirsPage` : filtres dynamiques via `STATUS_FILTER_ORDER` + `ASSIGNMENT_STATUS_META`.
- ~~Vérifier les filtres sidebar et recherche globale sur jeux de données volumineux (combinatoire filtres + pagination).~~ — **FAIT** :
  - Virtualisation ajoutée sur `TableauNotesPage` (seuil 50 lignes, ROW_HEIGHT=32, OVERSCAN=8), `ListeDevoirsPage`, `ListeElevesPage`, `BulletinsPage`, `CorrectionSeriePage`.
  - Pattern uniforme : `VIRTUAL_ROW_HEIGHT`, `VIRTUAL_OVERSCAN`, `VIRTUAL_THRESHOLD`, spacers top/bottom, activation conditionnelle.

### Priorité 3 - Qualité UX/UI et fonctionnalités analytiques

- ~~Remplacer les styles inline répétitifs des pages Evaluation par des classes CSS dédiées pour homogénéiser et faciliter la maintenance.~~ — **FAIT** :
  - `GrilleDescriptiveModal` : réécriture complète, 14+ classes CSS BEM dans `GrilleDescriptiveModal.css` (seules les couleurs dynamiques des badges restent inline).
  - `GrandOralPage` : 7 inline styles remplacés par classes CSS dédiées (`.go-page__empty-icon`, `.go-page__detail-status`, `.go-page__teacher-notes`, etc.).
  - `FicheElevePage` : classes profil/édition ajoutées (score pills, profile notes, actions, section header).
- Renforcer l’accessibilité clavier/ARIA sur tableaux virtualisés, badges cliquables et actions secondaires.
- ~~Uniformiser les microcopies finales (terminologie métier, accents, messages d’action) sur l’ensemble des écrans restants.~~ — **FAIT** :
  - Accents corrigés : `Problematiser` → `Problématiser`, `Redaction` → `Rédaction` dans `FicheElevePage` et `CorrectionSeriePage`.
  - Labels `entry_type` français dans `BulletinsTabPanel` (Professeur principal, Enseignant matière, CPE, Chef d’établissement).
  - Toasts cohérents : « Profil enregistré », « Appréciation modifiée/supprimée », « Rapport supprimé », « Document délié ».
- **Détection des “signaux faibles” élèves** (effort moyen) :
  - Algorithme de tendance sur `submission_skill_evaluations` : si un élève est en baisse sur une compétence donnée 3 devoirs consécutifs → alerte dans `FicheElevePage` et/ou dashboard.
  - Pas d’IA nécessaire (logique SQL + seuils) ; l’IA peut enrichir le commentaire d’alerte une fois le signal détecté.
  - Exemples d’alertes : “Maîtrise la théorie mais chute sur l’analyse de documents depuis 3 devoirs”, “Note en baisse constante depuis le trimestre 2”.
- ~~**Cartographie des compétences de la classe** (effort moyen)~~ — **FAIT** :
  - `SkillMapPage` (`src/pages/classes/SkillMapPage.tsx` + CSS) : heatmap élèves × capacités cross-devoirs, filtres classe/matière/période ;
  - agrégation des `submission_skill_evaluations` par élève et capacité → niveau moyen arrondi ;
  - coloration 4 niveaux (Non atteint / Partiellement / Atteint / Dépassé) ;
  - légende intégrée + résumé statistique ;
  - navigation : sidebar Classes > SUIVI > Cartographie compétences (`page: ‘skill-map’`), branché dans `App.tsx`.

### Priorité 4 - Industrialisation et fonctionnalités avancées

- ~~Ajouter des tests ciblés :~~ — **FAIT (unitaires)** :
  - Vitest installé + configuré (`vite.config.ts`, `jsdom`, scripts `test`/`test:watch`).
  - `statuses.test.ts` : 132 assertions — complétude et cohérence des 6 dictionnaires de statuts (labels, icons, couleurs, inter-dict consistency).
  - `virtualScroll.test.ts` : logique virtualisation extraite dans `utils/virtualScroll.ts`, 7 tests (seuil, scroll, bornes, invariant topSpacer+visible+bottomSpacer=total).
  - `toastDedup.test.ts` : logique dédup extraite dans `utils/toastDedup.ts`, 6 tests (ajout, doublon, type/message différents, IDs uniques).
  - `requestCache.test.ts` : cache single-flight générique `utils/requestCache.ts`, 7 tests (fetch, cache hit, single-flight concurrent, invalidate, clear, erreur, clés composites).
  - Tests d'intégration parcours critiques : reportés (nécessitent mock Tauri DB).
- Mettre en place une checklist CI “stabilité” (lint, build, test, smoke navigation) avant push de lots importants.
- **Séquence “à rebours”** (effort élevé) :
  - L’enseignant fixe une date d’évaluation finale et des compétences cibles → l’IA rétro-planifie les séances dans l’emploi du temps en tenant compte des jours fériés, des vacances et du volume horaire de la matière.
  - Prérequis : `timetableService` (créneaux EDT), `calendarService` (jours fériés/vacances), `sequenceService` (création séances), tâche IA `generate_sequence_plan` étendue.
  - Complexité principale : logique calendaire (calculer les créneaux disponibles, gérer les contraintes).
- ~~**Génération de supports multimédias** (effort élevé)~~ — **FAIT (niveaux 1+2)** :
  - Tâche `generate_slideshow` migrée en `output_format: json` → JSON structuré (slides avec titre, points clés, notes prof, suggestion visuelle, type). Migration 026.
  - Composant `SlideViewer` : navigation diapo par diapo (clavier + dots), vue liste, notes prof masquables, suggestions visuelles.
  - Nouvelle tâche `generate_quiz` (catégorie évaluations) : QCM/vrai-faux/mixte, paramètres (nb questions, type, temps). Migration 026.
  - Composant `QuizViewer` : vue liste/unitaire, réponses colorées, explications masquables, **export Kahoot CSV** + **export Moodle XML**.
  - Intégration dans `GenerateurIAPage` : détection auto du JSON structuré, viewer adapté au lieu du rendu markdown, fallback "Voir le JSON brut".
  - Niveau 3 (export PPTX réel via `pptxgenjs`) reporté — le viewer intégré + copier/adapter suffit pour l’usage courant.
- ~~**Import bulletin PDF Pronote** (effort moyen)~~ — **FAIT** :
  - Parser `utils/bulletinPdfParser.ts` : extraction nom élève (3 patterns regex), période, classe depuis PDF Pronote.
  - `BulletinPdfImportModal` (4 phases) : DropZone multi-PDF → parsing → matching élèves (exact/partiel/none, dropdown override, skip) → copie fichier + création document + lien `student_documents`.
  - `studentService.linkDocument()` ajouté pour l’association élève-document-période.
  - Bouton « Importer PDF » intégré dans `BulletinsPage`.
- ~~**Recherche naturelle IA** (effort faible)~~ — **FAIT** :
  - Migration 027 : tâche IA `search_intent` (catégorie `systeme`) — prompt JSON structuré extrayant keywords, typeFilter, subjectFilter, levelFilter, dateHint, reformulatedQuery.
  - `searchService.aiSearch()` : appelle l’IA pour interpréter la requête → filtre + boost résultats standard → fallback `semanticSearch()` si IA indisponible.
  - Mode « Intelligent » (🧠) dans `RechercheGlobalePage` utilise désormais `aiSearch()` au lieu du parsing regex.
  - Indicateur de chargement IA dédié avec animation pulsée.
