# Audit Fonctionnel - Écrans & Branchement

Date: 2026-03-11  
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
| Planning | EmploiDuTempsPage | Implémenté partiel | Branché, import ICS OK, flux création/Google Calendar incomplets. |
| Planning | CalendrierScolairePage | Implémenté partiel | Branché, persistance partielle, encore du mock. |
| Cahier | CahierDeTextesPage | Implémenté partiel | Branché, fallback mock, édition incomplète. |
| Classes | ClassesPage (overview/import) | Implémenté partiel | Navigation overview/import OK, ajout/édition élève incomplets. |
| Évaluation | ListeDevoirsPage | Implémenté partiel | Branché, fallback mock, création devoir non persistée. |
| Évaluation | CorrectionSeriePage | Implémenté partiel | Branché, largement mock, actions secondaires non câblées. |
| Évaluation | BilanDevoirPage | Implémenté partiel | Branché, données mock + IA partielle. |
| Évaluation | ListeElevesPage | Implémenté partiel | Branché, fallback mock, ajout élève non persisté. |
| Évaluation | FicheElevePage | Implémenté partiel | Branché mais contenu majoritairement statique/mock. |
| Évaluation | BulletinsPage | Implémenté partiel | Branché mais flux principal mock. |
| Recherche | RechercheGlobalePage | Implémenté + branché | Overlay branché, navigation vers pages active. |
| Paramètres | ParametresPage | Implémenté + branché | Hub + sous-pages branchés, backup ZIP fonctionnel. |
| Paramètres | AITemplateEditorPage | Implémenté + branché | Accessible depuis Paramètres, API key + templates branchés. |
| Paramètres | SettingsSubPages | Implémenté partiel | Certaines sous-actions restent TODO. |

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
- Ajouter une télémétrie légère en dev (compteurs cache hit/miss, temps de chargement par écran) pour vérifier l’impact réel des optimisations.

### Priorité 2 - Qualité fonctionnelle

- Compléter les flows CRUD manquants restants dans les onglets encore partiels (actions secondaires, confirmations, cas vides).
- Harmoniser les statuts métiers affichés avec un dictionnaire unique (libellé, couleur, icône) partagé UI/services.
- Vérifier les filtres sidebar et recherche globale sur jeux de données volumineux (combinatoire filtres + pagination).

### Priorité 3 - Qualité UX/UI

- Remplacer les styles inline répétitifs des pages Evaluation par des classes CSS dédiées pour homogénéiser et faciliter la maintenance.
- Renforcer l’accessibilité clavier/ARIA sur tableaux virtualisés, badges cliquables et actions secondaires.
- Uniformiser les microcopies finales (terminologie métier, accents, messages d’action) sur l’ensemble des écrans restants.

### Priorité 4 - Industrialisation

- Ajouter des tests ciblés:
  - unitaires sur helpers cache/invalidation,
  - intégration sur les parcours critiques (chargement, sauvegarde, finalisation, génération IA).
- Mettre en place une checklist CI “stabilité” (lint, build, test, smoke navigation) avant push de lots importants.
