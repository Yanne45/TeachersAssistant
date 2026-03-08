-- ============================================================================
-- Teacher Assistant — Migration 006 : Programmes complets
-- Complète HGGSP Tle (intro+OTC), ajoute Hist 1ère, Géo Tle, HGGSP 1ère
-- Inclut descriptions officielles et mots-clés pour chaque chapitre
-- Idempotent : INSERT OR IGNORE + UPDATE
-- ============================================================================
PRAGMA foreign_keys = ON;

-- ══════════════════════════════════════════════════════════════════════════════
-- A. COMPLÉTER HGGSP TERMINALE
--    Structure officielle : Introduction + Axe 1 + Axe 2 + OTC par thème
--    Axe 1 et Axe 2 existent déjà (ids 7-18), on ajoute Intro et OTC
-- ══════════════════════════════════════════════════════════════════════════════

-- Décaler les sort_order des chapitres existants (C1→2, C2→3)
UPDATE program_topics SET sort_order = 2, code = 'T1-AXE1' WHERE id = 7;
UPDATE program_topics SET sort_order = 3, code = 'T1-AXE2' WHERE id = 8;
UPDATE program_topics SET sort_order = 2, code = 'T2-AXE1' WHERE id = 9;
UPDATE program_topics SET sort_order = 3, code = 'T2-AXE2' WHERE id = 10;
UPDATE program_topics SET sort_order = 2, code = 'T3-AXE1' WHERE id = 11;
UPDATE program_topics SET sort_order = 3, code = 'T3-AXE2' WHERE id = 12;
UPDATE program_topics SET sort_order = 2, code = 'T4-AXE1' WHERE id = 13;
UPDATE program_topics SET sort_order = 3, code = 'T4-AXE2' WHERE id = 14;
UPDATE program_topics SET sort_order = 2, code = 'T5-AXE1' WHERE id = 15;
UPDATE program_topics SET sort_order = 3, code = 'T5-AXE2' WHERE id = 16;
UPDATE program_topics SET sort_order = 2, code = 'T6-AXE1' WHERE id = 17;
UPDATE program_topics SET sort_order = 3, code = 'T6-AXE2' WHERE id = 18;

-- Introductions (sort_order=1)
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order) VALUES
  (43, 1, 3, 2, 1, 'chapter', 'T1-INTRO', 'Introduction : pourquoi les espaces maritimes et extra-atmosphériques sont-ils des enjeux géopolitiques ?',
   'Mise en perspective des enjeux liés à la conquête et à l''appropriation de nouveaux espaces (maritimes, aériens, extra-atmosphériques, numériques). Jalons : les grandes découvertes maritimes ; la course à l''espace pendant la Guerre froide.', 4, 1),
  (44, 1, 3, 2, 2, 'chapter', 'T2-INTRO', 'Introduction : panorama des conflits armés actuels',
   'Panorama de la conflictualité mondiale contemporaine et évolution des formes de guerre. Jalons : les conflits armés après 1945 ; les formes contemporaines de la guerre (guérilla, terrorisme, cyberguerre).', 4, 1),
  (45, 1, 3, 2, 3, 'chapter', 'T3-INTRO', 'Introduction : histoire et mémoire',
   'Distinction entre histoire et mémoire. La mémoire comme construction sociale et politique. Le rôle de l''historien face aux mémoires. Jalons : un lieu de mémoire ; un débat historiographique.', 4, 1),
  (46, 1, 3, 2, 4, 'chapter', 'T4-INTRO', 'Introduction : patrimoine, usages sociaux et politiques',
   'Définition et évolution de la notion de patrimoine (matériel, immatériel, naturel). La patrimonialisation comme processus politique et culturel. Jalons : l''évolution de la notion de patrimoine ; l''UNESCO et le patrimoine mondial.', 4, 1),
  (47, 1, 3, 2, 5, 'chapter', 'T5-INTRO', 'Introduction : environnement, entre exploitation et protection',
   'Panorama historique des relations entre sociétés humaines et environnement. La prise de conscience environnementale au XXe siècle. Jalons : les révolutions industrielles et leur impact environnemental ; l''émergence de la question environnementale.', 4, 1),
  (48, 1, 3, 2, 6, 'chapter', 'T6-INTRO', 'Introduction : la connaissance, un enjeu majeur',
   'La connaissance comme ressource stratégique dans le monde contemporain. Production, circulation et contrôle des savoirs. Jalons : les grandes révolutions scientifiques ; la « société de la connaissance ».', 4, 1);

-- Objets de Travail Conclusifs — OTC (sort_order=4)
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order) VALUES
  (49, 1, 3, 2, 1, 'chapter', 'T1-OTC', 'OTC : La Chine — à la conquête de l''espace, des mers et de l''information',
   'Étude de la montée en puissance de la Chine dans les nouveaux espaces de conquête : programme spatial (Tiangong, Chang''e), revendications en mer de Chine méridionale, Routes de la Soie numérique. Analyse de la stratégie chinoise d''affirmation de puissance.', 6, 4),
  (50, 1, 3, 2, 2, 'chapter', 'T2-OTC', 'OTC : Le Moyen-Orient — conflits régionaux et tentatives de résolution',
   'Étude des conflits au Moyen-Orient depuis 1948 : conflits israélo-arabes, guerre civile libanaise, guerres du Golfe, conflit syrien. Analyse des tentatives de résolution (accords d''Oslo, processus de paix) et du rôle des acteurs internationaux.', 6, 4),
  (51, 1, 3, 2, 3, 'chapter', 'T3-OTC', 'OTC : L''histoire et les mémoires du génocide des Tutsi au Rwanda (1994)',
   'Étude du génocide des Tutsi au Rwanda : mécanismes, responsabilités, rôle de la communauté internationale. Les procès (TPIR, tribunaux gacaca). La construction mémorielle et la réconciliation. La question de la responsabilité française.', 6, 4),
  (52, 1, 3, 2, 4, 'chapter', 'T4-OTC', 'OTC : Patrimoine, la question de la restitution — le cas des frises du Parthénon et des bronzes du Bénin',
   'Étude des débats autour de la restitution des biens culturels. Les frises du Parthénon (British Museum vs Grèce). Les bronzes du Bénin (restitution par la France, l''Allemagne). Les enjeux diplomatiques, identitaires et juridiques de la restitution.', 6, 4),
  (53, 1, 3, 2, 5, 'chapter', 'T5-OTC', 'OTC : Les États-Unis et la question environnementale',
   'Étude de la position des États-Unis face aux enjeux environnementaux : entre leadership et retrait. Le rôle des lobbies, les retraits du protocole de Kyoto et de l''accord de Paris (Trump), le retour (Biden). Les contradictions entre modèle économique et transition écologique.', 6, 4),
  (54, 1, 3, 2, 6, 'chapter', 'T6-OTC', 'OTC : Le cyberespace — entre réseaux, puissance et conflits',
   'Étude du cyberespace comme nouveau territoire de la connaissance et de la puissance. Les câbles sous-marins, les data centers, les GAFAM. La cybersécurité et la cyberguerre. La gouvernance d''Internet. La souveraineté numérique.', 6, 4);

-- ══════════════════════════════════════════════════════════════════════════════
-- B. HISTOIRE PREMIÈRE (Tronc commun)
--    subject_id=1 (HIST), level_id=1 (PRE)
-- ══════════════════════════════════════════════════════════════════════════════

-- Thèmes
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order) VALUES
  (55, 1, 1, 1, NULL, 'theme', 'HP1', 'L''Europe face aux révolutions',
   'Ce thème étudie les bouleversements politiques de la fin du XVIIIe siècle et de la première moitié du XIXe siècle. Il analyse la Révolution française, l''Empire napoléonien et les mouvements révolutionnaires en Europe, entre aspirations libérales et nationales et tentatives de restauration.', 13, 1),
  (56, 1, 1, 1, NULL, 'theme', 'HP2', 'La France dans l''Europe des nationalités : politique et société (1848-1871)',
   'Ce thème étudie la période charnière entre 1848 et 1871 : la Deuxième République, le Second Empire, et la naissance de la Troisième République. Il analyse l''entrée difficile dans l''âge démocratique et les transformations économiques et sociales liées à l''industrialisation.', 13, 2),
  (57, 1, 1, 1, NULL, 'theme', 'HP3', 'La Troisième République avant 1914 : un régime politique, un empire colonial',
   'Ce thème étudie l''enracinement de la République en France : mise en œuvre du projet républicain (école, laïcité, libertés), crises (boulangisme, affaire Dreyfus), et expansion coloniale. Il analyse les permanences et mutations de la société française.', 13, 3),
  (58, 1, 1, 1, NULL, 'theme', 'HP4', 'La Première Guerre mondiale : le « suicide de l''Europe » et la fin des empires européens',
   'Ce thème étudie la Grande Guerre comme rupture majeure dans l''histoire européenne et mondiale. Il analyse les grandes étapes du conflit, l''expérience combattante, la mobilisation des sociétés et les bouleversements géopolitiques qui en résultent.', 13, 4);

-- Chapitres
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order) VALUES
  (59, 1, 1, 1, 55, 'chapter', 'HP1-C1', 'La Révolution française et l''Empire : une nouvelle conception de la nation',
   'La crise de l''Ancien Régime, les événements révolutionnaires (1789-1799) et l''Empire napoléonien. Points de passage : la prise de la Bastille et la nuit du 4 Août ; la proclamation de la République (septembre 1792) ; le sacre de Napoléon (1804).', 7, 1),
  (60, 1, 1, 1, 55, 'chapter', 'HP1-C2', 'L''Europe entre restauration et révolution (1814-1848)',
   'Le congrès de Vienne et la restauration monarchique. Les mouvements libéraux et nationaux en Europe. Les révolutions de 1830 et 1848. Points de passage : Metternich et le congrès de Vienne ; les Trois Glorieuses (1830) ; le Printemps des peuples (1848).', 6, 2),
  (61, 1, 1, 1, 56, 'chapter', 'HP2-C1', 'La difficile entrée dans l''âge démocratique : la Deuxième République et le Second Empire',
   'Le suffrage universel masculin (1848), la Deuxième République et le coup d''État de Louis-Napoléon Bonaparte. L''Empire autoritaire puis libéral. Points de passage : l''abolition de l''esclavage (1848) ; le plébiscite de 1851 ; Haussmann et la transformation de Paris.', 7, 1),
  (62, 1, 1, 1, 56, 'chapter', 'HP2-C2', 'L''industrialisation et l''accélération des transformations économiques et sociales en France',
   'La révolution industrielle en France : chemin de fer, usines, urbanisation. Les nouvelles classes sociales (bourgeoisie industrielle, classe ouvrière). La question sociale. Points de passage : le canal de Suez (1869) ; les conditions ouvrières au XIXe siècle ; les débuts du mouvement ouvrier.', 6, 2),
  (63, 1, 1, 1, 57, 'chapter', 'HP3-C1', 'La mise en œuvre du projet républicain',
   'L''enracinement de la République : les lois scolaires de Jules Ferry, la laïcité (loi de 1905), les libertés fondamentales (presse, syndicats, associations). Les crises : boulangisme, affaire Dreyfus. Points de passage : les lois Ferry (1881-1882) ; l''affaire Dreyfus et Zola ; la loi de séparation (1905).', 7, 1),
  (64, 1, 1, 1, 57, 'chapter', 'HP3-C2', 'Permanences et mutations de la société française jusqu''en 1914',
   'Les transformations sociales : exode rural, urbanisation, place des femmes. L''expansion coloniale et la société coloniale. Le mouvement ouvrier et les débuts du socialisme. Points de passage : la conquête de l''Algérie ; Clemenceau vs Ferry sur la colonisation ; les grèves de 1906.', 6, 2),
  (65, 1, 1, 1, 58, 'chapter', 'HP4-C1', 'Un embrasement mondial et ses grandes étapes',
   'Les origines du conflit, les grandes phases de la guerre (1914-1918) : guerre de mouvement, guerre de position, année 1917 (entrée des États-Unis, révolutions russes), offensive finale. Points de passage : août 1914 : l''entrée en guerre ; Verdun et la Somme (1916) ; 1917, l''année tournant.', 7, 1),
  (66, 1, 1, 1, 58, 'chapter', 'HP4-C2', 'Les sociétés en guerre : des civils acteurs et victimes de la guerre',
   'La guerre totale : mobilisation des sociétés, économie de guerre, propagande. Les violences contre les civils : génocide arménien. Les conséquences : traités de paix, bouleversements territoriaux, bilan humain. Points de passage : les femmes dans la guerre ; le génocide arménien (1915) ; le traité de Versailles (1919).', 6, 2);

-- ══════════════════════════════════════════════════════════════════════════════
-- C. GÉOGRAPHIE TERMINALE (Tronc commun)
--    subject_id=2 (GEO), level_id=2 (TLE)
-- ══════════════════════════════════════════════════════════════════════════════

-- Thèmes
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order) VALUES
  (67, 1, 2, 2, NULL, 'theme', 'GTle1', 'Mers et océans : au cœur de la mondialisation',
   'Ce thème étudie le rôle central des mers et des océans dans la mondialisation contemporaine. Il analyse les flux maritimes, les enjeux d''appropriation des espaces océaniques, les rivalités géopolitiques et les défis environnementaux liés aux espaces maritimes.', 14, 1),
  (68, 1, 2, 2, NULL, 'theme', 'GTle2', 'Dynamiques territoriales, coopérations et tensions dans la mondialisation',
   'Ce thème analyse les inégalités d''intégration des territoires dans la mondialisation, les dynamiques de coopération et de tension aux différentes échelles (mondiale, régionale, locale). Il étudie les acteurs et les logiques qui structurent ces dynamiques.', 14, 2),
  (69, 1, 2, 2, NULL, 'theme', 'GTle3', 'L''Union européenne dans la mondialisation : des dynamiques complexes',
   'Ce thème étudie la place de l''Union européenne dans la mondialisation : son ouverture commerciale, ses politiques régionales, ses frontières, et les dynamiques territoriales internes entre centres et périphéries.', 14, 3),
  (70, 1, 2, 2, NULL, 'theme', 'GTle4', 'La France et ses régions dans l''Union européenne et dans la mondialisation',
   'Ce thème analyse les dynamiques territoriales de la France dans le contexte européen et mondial : métropolisation, littoralisation, inégalités régionales, outre-mer. Il étudie les systèmes productifs et les politiques d''aménagement.', 14, 4);

-- Chapitres
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order) VALUES
  (71, 1, 2, 2, 67, 'chapter', 'GTle1-C1', 'Mers et océans : vecteurs essentiels de la mondialisation',
   'Le rôle des mers et océans dans les échanges mondiaux : routes maritimes, détroits stratégiques, ports et façades maritimes. Étude de cas : le détroit de Malacca ou le canal de Suez. Les flux maritimes : conteneurisation, câbles sous-marins, ressources.', 7, 1),
  (72, 1, 2, 2, 67, 'chapter', 'GTle1-C2', 'Mers et océans : entre appropriation, protection et liberté de circulation',
   'Les rivalités pour l''appropriation des espaces maritimes : ZEE, plateau continental, tensions en mer de Chine, Arctique. La piraterie. La protection des océans : pollution, surpêche, aires marines protégées. Étude de cas : l''océan Arctique, entre enjeux géopolitiques et environnementaux.', 7, 2),
  (73, 1, 2, 2, 68, 'chapter', 'GTle2-C1', 'Des territoires inégalement intégrés dans la mondialisation',
   'Les facteurs d''intégration et de marginalisation des territoires dans la mondialisation. Les métropoles comme nœuds de la mondialisation. Les espaces en marge : PMA, territoires enclavés. Étude de cas : une métropole mondiale et un territoire en marge.', 7, 1),
  (74, 1, 2, 2, 68, 'chapter', 'GTle2-C2', 'Coopérations, tensions et régulations aux échelles mondiale, régionale et locale',
   'Les organisations de coopération régionale (UE, ASEAN, Mercosur, UA). Les tensions commerciales (guerre commerciale États-Unis/Chine). Les régulations : OMC, accords multilatéraux. Les mouvements altermondialistes. Étude de cas : une organisation régionale.', 7, 2),
  (75, 1, 2, 2, 69, 'chapter', 'GTle3-C1', 'L''Union européenne, un espace plus ou moins ouvert sur le monde',
   'L''UE comme puissance commerciale : accords de libre-échange, politique commerciale commune. Les frontières de l''UE : Schengen, politique migratoire, voisinage. Les flux d''échanges avec le reste du monde. Étude de cas : les relations commerciales UE/reste du monde.', 7, 1),
  (76, 1, 2, 2, 69, 'chapter', 'GTle3-C2', 'De l''espace européen aux territoires de l''Union européenne',
   'Les disparités territoriales au sein de l''UE : centre/périphérie, anciens/nouveaux membres. La politique de cohésion et les fonds structurels. Les eurorégions et la coopération transfrontalière. Étude de cas : une région transfrontalière européenne.', 7, 2),
  (77, 1, 2, 2, 70, 'chapter', 'GTle4-C1', 'La France : dynamiques démographiques, inégalités socio-économiques',
   'Les dynamiques démographiques françaises : vieillissement, immigration, mobilités internes. Les inégalités socio-économiques entre territoires : métropoles dynamiques, espaces en difficulté. L''outre-mer. Étude de cas : les dynamiques territoriales d''une métropole française.', 7, 1),
  (78, 1, 2, 2, 70, 'chapter', 'GTle4-C2', 'La France : les systèmes productifs entre valorisation locale et intégration européenne et mondiale',
   'Les systèmes productifs français : industrie, agriculture, services. La désindustrialisation et la tertiarisation. Les pôles de compétitivité, les clusters. L''intégration dans les chaînes de valeur européennes et mondiales. Étude de cas : un espace productif français.', 7, 2);

-- ══════════════════════════════════════════════════════════════════════════════
-- D. HGGSP PREMIÈRE
--    subject_id=3 (HGGSP), level_id=1 (PRE)
--    Structure : Introduction + Axe 1 + Axe 2 + OTC par thème
-- ══════════════════════════════════════════════════════════════════════════════

-- Thèmes
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order) VALUES
  (79, 1, 3, 1, NULL, 'theme', 'SP1', 'Comprendre un régime politique : la démocratie',
   'Ce thème étudie la démocratie dans ses dimensions historiques et contemporaines : ses origines, ses formes, ses fragilités. Il analyse les processus de démocratisation, les crises de la démocratie et les débats autour de la participation citoyenne.', 24, 1),
  (80, 1, 3, 1, NULL, 'theme', 'SP2', 'Analyser les dynamiques des puissances internationales',
   'Ce thème étudie les fondements et les formes de la puissance dans les relations internationales. Il analyse les dynamiques de puissance (hard power, soft power, smart power), les rivalités entre États et les recompositions géopolitiques contemporaines.', 24, 2),
  (81, 1, 3, 1, NULL, 'theme', 'SP3', 'Étudier les divisions politiques du monde : les frontières',
   'Ce thème étudie les frontières comme constructions politiques, historiques et géographiques. Il analyse les processus de tracé, de contestation et de dépassement des frontières, ainsi que les enjeux contemporains (murs, migrations, cyberespace).', 24, 3),
  (82, 1, 3, 1, NULL, 'theme', 'SP4', 'S''informer : un regard critique sur les sources et modes de communication',
   'Ce thème étudie les transformations de l''information et de la communication. Il analyse les médias, les réseaux sociaux, la liberté de la presse, la désinformation et l''éducation aux médias dans une perspective historique et géopolitique.', 24, 4),
  (83, 1, 3, 1, NULL, 'theme', 'SP5', 'Analyser les relations entre États et religions',
   'Ce thème étudie les relations entre le politique et le religieux dans différents contextes historiques et géographiques. Il analyse la laïcité, le rôle politique des religions, les conflits à dimension religieuse et la sécularisation.', 24, 5);

-- SP1 — Chapitres
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order) VALUES
  (84, 1, 3, 1, 79, 'chapter', 'SP1-INTRO', 'Introduction : penser la démocratie',
   'Définition et origines de la démocratie. Démocratie directe (Athènes) et représentative. Les conditions de la démocratie. Jalons : l''Ecclesia athénienne ; les révolutions atlantiques et la naissance des démocraties modernes.', 4, 1),
  (85, 1, 3, 1, 79, 'chapter', 'SP1-AXE1', 'Axe 1 : Avancées et reculs des démocraties',
   'Les vagues de démocratisation et les processus de transition démocratique. Les fragilités et les reculs de la démocratie. Jalons : l''Amérique latine entre dictatures et démocratisation ; l''Afrique du Sud, de l''apartheid à la démocratie (1991-1994).', 8, 2),
  (86, 1, 3, 1, 79, 'chapter', 'SP1-AXE2', 'Axe 2 : Modes d''expression de la démocratie',
   'Les formes de participation politique : vote, militantisme, mouvements sociaux, désobéissance civile. La démocratie participative et délibérative. Jalons : la Révolution française et la souveraineté nationale/populaire ; les suffragettes au Royaume-Uni.', 8, 3),
  (87, 1, 3, 1, 79, 'chapter', 'SP1-OTC', 'OTC : L''Union européenne et la démocratie',
   'Étude de la construction démocratique européenne : le Parlement européen, le déficit démocratique, la citoyenneté européenne. Les débats sur la souveraineté et la démocratie dans le cadre de l''UE. Le Brexit comme crise démocratique.', 4, 4);

-- SP2 — Chapitres
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order) VALUES
  (88, 1, 3, 1, 80, 'chapter', 'SP2-INTRO', 'Introduction : les fondements de la puissance',
   'Définir la puissance : les différentes dimensions (militaire, économique, culturelle, diplomatique). Hard power, soft power, smart power. Jalons : l''Empire romain, un modèle de puissance multidimensionnelle.', 4, 1),
  (89, 1, 3, 1, 80, 'chapter', 'SP2-AXE1', 'Axe 1 : Essor et déclin des puissances — un regard historique',
   'Les cycles de puissance dans l''histoire. Les empires et leur chute. Les facteurs d''essor et de déclin. Jalons : l''Empire ottoman, de l''essor au déclin ; une puissance qui se reconstruit après un conflit : le Japon après 1945.', 8, 2),
  (90, 1, 3, 1, 80, 'chapter', 'SP2-AXE2', 'Axe 2 : Les formes indirectes de la puissance',
   'Le soft power culturel, linguistique, technologique. L''influence des firmes transnationales. Le rôle des ONG et des organisations internationales. Jalons : l''influence culturelle des États-Unis (cinéma, musique, mode de vie) ; la francophonie, outil d''influence.', 8, 3),
  (91, 1, 3, 1, 80, 'chapter', 'SP2-OTC', 'OTC : La Chine — une puissance en construction',
   'Étude de la montée en puissance de la Chine : économie, diplomatie, armée, soft power. Les Nouvelles Routes de la Soie. Les tensions avec les États-Unis. La stratégie chinoise d''influence en Afrique et en Asie du Sud-Est.', 4, 4);

-- SP3 — Chapitres
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order) VALUES
  (92, 1, 3, 1, 81, 'chapter', 'SP3-INTRO', 'Introduction : les frontières dans le monde d''aujourd''hui',
   'Définir les frontières : tracé, fonctions (barrière, interface, filtre). Les types de frontières (terrestres, maritimes, aériennes). L''évolution de la notion de frontière. Jalons : les frontières européennes depuis 1945 ; frontières et migrations.', 4, 1),
  (93, 1, 3, 1, 81, 'chapter', 'SP3-AXE1', 'Axe 1 : Tracer des frontières, approche géopolitique',
   'Les processus de tracé des frontières : conquêtes, traités, décolonisation, partition. Les frontières contestées et les conflits frontaliers. Jalons : les frontières du Proche et du Moyen-Orient après 1918 ; la frontière germano-polonaise.', 8, 2),
  (94, 1, 3, 1, 81, 'chapter', 'SP3-AXE2', 'Axe 2 : Les frontières en débat',
   'Dépasser les frontières : intégration régionale, mondialisation, cyberespace. Renforcer les frontières : murs, contrôles, souveraineté. Jalons : les murs aux frontières (États-Unis/Mexique, Israël/Palestine) ; l''espace Schengen, frontières ouvertes et fermées.', 8, 3),
  (95, 1, 3, 1, 81, 'chapter', 'SP3-OTC', 'OTC : Les frontières internes et externes de l''Union européenne',
   'Étude des frontières de l''UE : l''espace Schengen, les frontières extérieures (Méditerranée, frontière orientale), les eurorégions. La crise migratoire et la gestion des frontières. Les coopérations transfrontalières.', 4, 4);

-- SP4 — Chapitres
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order) VALUES
  (96, 1, 3, 1, 82, 'chapter', 'SP4-INTRO', 'Introduction : s''informer, un regard critique sur les sources',
   'Les sources d''information : médias traditionnels, réseaux sociaux, agences de presse. La fiabilité des sources et la vérification de l''information. Jalons : l''invention de l''imprimerie et la diffusion de l''information ; la naissance de la presse moderne.', 4, 1),
  (97, 1, 3, 1, 82, 'chapter', 'SP4-AXE1', 'Axe 1 : Les grandes révolutions techniques de l''information',
   'Les transformations des moyens de communication : de l''imprimerie au numérique. Radio, télévision, Internet. Les conséquences sur la diffusion de l''information et le débat démocratique. Jalons : l''Encyclopédie ; la radio et la propagande au XXe siècle ; Internet et les réseaux sociaux.', 8, 2),
  (98, 1, 3, 1, 82, 'chapter', 'SP4-AXE2', 'Axe 2 : Liberté ou contrôle de l''information — un débat politique fondamental',
   'La liberté de la presse et ses limites. La censure et la propagande. Le contrôle de l''information par les États autoritaires. Les lanceurs d''alerte. Jalons : l''affaire Dreyfus et le rôle de la presse ; les médias en Russie et en Chine ; WikiLeaks et Snowden.', 8, 3),
  (99, 1, 3, 1, 82, 'chapter', 'SP4-OTC', 'OTC : Information et désinformation à l''heure d''Internet',
   'Étude de la désinformation dans le contexte numérique : fake news, complotisme, manipulation des opinions. Le rôle des algorithmes et des bulles de filtre. Les réponses : fact-checking, éducation aux médias, régulation des plateformes.', 4, 4);

-- SP5 — Chapitres
INSERT OR IGNORE INTO program_topics (id, academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order) VALUES
  (100, 1, 3, 1, 83, 'chapter', 'SP5-INTRO', 'Introduction : États et religions',
   'Les différents modèles de relations entre États et religions : théocratie, religion d''État, concordat, laïcité, sécularisation. Les évolutions historiques. Jalons : le pouvoir papal au Moyen Âge ; la Réforme et les guerres de Religion.', 4, 1),
  (101, 1, 3, 1, 83, 'chapter', 'SP5-AXE1', 'Axe 1 : Pouvoir et religion — des liens historiques traditionnels',
   'Les liens entre pouvoir politique et religion dans l''histoire : monarchies de droit divin, califats, empires théocratiques. Les ruptures : sécularisation, séparation de l''Église et de l''État. Jalons : le sacre des rois de France ; la loi de séparation de 1905.', 8, 2),
  (102, 1, 3, 1, 83, 'chapter', 'SP5-AXE2', 'Axe 2 : États et religions dans le monde contemporain',
   'La diversité des relations entre États et religions aujourd''hui. Le retour du religieux dans la sphère politique. Les conflits à dimension religieuse. Jalons : la révolution islamique en Iran (1979) ; les États-Unis, nation religieuse et laïque.', 8, 3),
  (103, 1, 3, 1, 83, 'chapter', 'SP5-OTC', 'OTC : La laïcité en France — une exception ?',
   'Étude du modèle français de laïcité : histoire, lois, débats contemporains. Comparaison avec d''autres modèles (États-Unis, Turquie, Royaume-Uni). Les controverses : voile, signes religieux, liberté d''expression et blasphème.', 4, 4);

-- ══════════════════════════════════════════════════════════════════════════════
-- E. MOTS-CLÉS POUR TOUS LES NOUVEAUX CHAPITRES
-- ══════════════════════════════════════════════════════════════════════════════

-- HGGSP Tle — Introductions
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (43,'espace maritime',1),(43,'espace extra-atmosphérique',2),(43,'géopolitique',3),(43,'conquête',4),(43,'souveraineté',5),
  (44,'conflit armé',1),(44,'guerre contemporaine',2),(44,'terrorisme',3),(44,'cyberguerre',4),(44,'paix',5),
  (45,'mémoire',1),(45,'histoire',2),(45,'construction mémorielle',3),(45,'devoir de mémoire',4),(45,'historien',5),
  (46,'patrimoine',1),(46,'patrimonialisation',2),(46,'UNESCO',3),(46,'patrimoine immatériel',4),(46,'patrimoine naturel',5),
  (47,'environnement',1),(47,'révolution industrielle',2),(47,'pollution',3),(47,'écologie',4),(47,'prise de conscience',5),
  (48,'connaissance',1),(48,'savoir',2),(48,'révolution scientifique',3),(48,'société de la connaissance',4),(48,'enjeu stratégique',5);

-- HGGSP Tle — OTC
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (49,'Chine',1),(49,'Tiangong',2),(49,'mer de Chine',3),(49,'Routes de la Soie',4),(49,'puissance spatiale',5),(49,'souveraineté numérique',6),
  (50,'Moyen-Orient',1),(50,'Israël-Palestine',2),(50,'accords d''Oslo',3),(50,'Syrie',4),(50,'guerre du Golfe',5),(50,'ONU',6),
  (51,'Rwanda',1),(51,'génocide des Tutsi',2),(51,'TPIR',3),(51,'gacaca',4),(51,'réconciliation',5),(51,'France-Rwanda',6),
  (52,'restitution',1),(52,'Parthénon',2),(52,'bronzes du Bénin',3),(52,'British Museum',4),(52,'décolonisation culturelle',5),(52,'droit international',6),
  (53,'États-Unis',1),(53,'Kyoto',2),(53,'accord de Paris',3),(53,'lobbies',4),(53,'climato-scepticisme',5),(53,'transition énergétique',6),
  (54,'cyberespace',1),(54,'GAFAM',2),(54,'câbles sous-marins',3),(54,'cybersécurité',4),(54,'gouvernance d''Internet',5),(54,'data centers',6);

-- Histoire Première
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (59,'Révolution française',1),(59,'1789',2),(59,'Bastille',3),(59,'droits de l''homme',4),(59,'Napoléon',5),(59,'nation',6),(59,'Empire',7),
  (60,'restauration',1),(60,'congrès de Vienne',2),(60,'Metternich',3),(60,'libéralisme',4),(60,'Printemps des peuples',5),(60,'1848',6),
  (61,'suffrage universel',1),(61,'Deuxième République',2),(61,'coup d''État',3),(61,'Second Empire',4),(61,'Haussmann',5),(61,'plébiscite',6),
  (62,'industrialisation',1),(62,'chemin de fer',2),(62,'classe ouvrière',3),(62,'bourgeoisie',4),(62,'question sociale',5),(62,'urbanisation',6),
  (63,'Jules Ferry',1),(63,'école républicaine',2),(63,'laïcité',3),(63,'loi de 1905',4),(63,'affaire Dreyfus',5),(63,'libertés fondamentales',6),
  (64,'colonisation',1),(64,'empire colonial',2),(64,'exode rural',3),(64,'socialisme',4),(64,'mouvement ouvrier',5),(64,'condition féminine',6),
  (65,'Première Guerre mondiale',1),(65,'1914-1918',2),(65,'tranchées',3),(65,'Verdun',4),(65,'guerre totale',5),(65,'1917',6),(65,'États-Unis',7),
  (66,'civils',1),(66,'économie de guerre',2),(66,'propagande',3),(66,'génocide arménien',4),(66,'traité de Versailles',5),(66,'bilan humain',6);

-- Géographie Terminale
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (71,'route maritime',1),(71,'détroit',2),(71,'conteneurisation',3),(71,'port',4),(71,'façade maritime',5),(71,'câbles sous-marins',6),
  (72,'ZEE',1),(72,'piraterie',2),(72,'Arctique',3),(72,'mer de Chine',4),(72,'pollution marine',5),(72,'surpêche',6),(72,'aires marines protégées',7),
  (73,'intégration',1),(73,'marginalisation',2),(73,'PMA',3),(73,'métropole mondiale',4),(73,'mondialisation',5),(73,'inégalités territoriales',6),
  (74,'coopération régionale',1),(74,'OMC',2),(74,'ASEAN',3),(74,'Mercosur',4),(74,'guerre commerciale',5),(74,'altermondialisme',6),
  (75,'Schengen',1),(75,'libre-échange',2),(75,'politique commerciale',3),(75,'frontières de l''UE',4),(75,'migrations',5),(75,'voisinage',6),
  (76,'disparités territoriales',1),(76,'politique de cohésion',2),(76,'fonds structurels',3),(76,'eurorégion',4),(76,'centre-périphérie',5),(76,'transfrontalier',6),
  (77,'démographie',1),(77,'vieillissement',2),(77,'métropolisation',3),(77,'outre-mer',4),(77,'inégalités socio-économiques',5),(77,'mobilités',6),
  (78,'système productif',1),(78,'désindustrialisation',2),(78,'pôle de compétitivité',3),(78,'tertiarisation',4),(78,'agriculture',5),(78,'chaîne de valeur',6);

-- HGGSP Première
INSERT OR IGNORE INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES
  (84,'démocratie',1),(84,'Athènes',2),(84,'démocratie directe',3),(84,'démocratie représentative',4),(84,'citoyen',5),
  (85,'démocratisation',1),(85,'dictature',2),(85,'transition',3),(85,'apartheid',4),(85,'Afrique du Sud',5),(85,'Amérique latine',6),
  (86,'vote',1),(86,'suffragettes',2),(86,'participation',3),(86,'mouvements sociaux',4),(86,'souveraineté',5),(86,'désobéissance civile',6),
  (87,'Union européenne',1),(87,'Parlement européen',2),(87,'déficit démocratique',3),(87,'Brexit',4),(87,'citoyenneté européenne',5),
  (88,'puissance',1),(88,'hard power',2),(88,'soft power',3),(88,'smart power',4),(88,'Empire romain',5),
  (89,'empire',1),(89,'déclin',2),(89,'Empire ottoman',3),(89,'Japon',4),(89,'reconstruction',5),(89,'cycle de puissance',6),
  (90,'influence culturelle',1),(90,'FTN',2),(90,'ONG',3),(90,'francophonie',4),(90,'cinéma américain',5),(90,'rayonnement',6),
  (91,'Chine',1),(91,'Routes de la Soie',2),(91,'armée chinoise',3),(91,'Afrique',4),(91,'rivalité sino-américaine',5),(91,'soft power chinois',6),
  (92,'frontière',1),(92,'tracé',2),(92,'barrière',3),(92,'interface',4),(92,'migrations',5),(92,'frontières européennes',6),
  (93,'décolonisation',1),(93,'partition',2),(93,'Proche-Orient',3),(93,'Moyen-Orient',4),(93,'traité',5),(93,'frontière contestée',6),
  (94,'mur',1),(94,'Schengen',2),(94,'contrôle',3),(94,'souveraineté',4),(94,'cyberespace',5),(94,'États-Unis/Mexique',6),
  (95,'frontières de l''UE',1),(95,'Schengen',2),(95,'Méditerranée',3),(95,'crise migratoire',4),(95,'eurorégion',5),(95,'coopération transfrontalière',6),
  (96,'information',1),(96,'source',2),(96,'fiabilité',3),(96,'agence de presse',4),(96,'presse',5),(96,'imprimerie',6),
  (97,'imprimerie',1),(97,'radio',2),(97,'télévision',3),(97,'Internet',4),(97,'réseaux sociaux',5),(97,'Encyclopédie',6),
  (98,'liberté de la presse',1),(98,'censure',2),(98,'propagande',3),(98,'lanceur d''alerte',4),(98,'WikiLeaks',5),(98,'Snowden',6),
  (99,'fake news',1),(99,'désinformation',2),(99,'complotisme',3),(99,'fact-checking',4),(99,'algorithme',5),(99,'bulle de filtre',6),
  (100,'religion',1),(100,'État',2),(100,'théocratie',3),(100,'laïcité',4),(100,'sécularisation',5),(100,'concordat',6),
  (101,'monarchie de droit divin',1),(101,'califat',2),(101,'sacre',3),(101,'séparation Église-État',4),(101,'loi de 1905',5),(101,'Réforme',6),
  (102,'retour du religieux',1),(102,'Iran 1979',2),(102,'États-Unis',3),(102,'islam politique',4),(102,'conflit religieux',5),(102,'pluralisme',6),
  (103,'laïcité française',1),(103,'loi de 2004',2),(103,'voile',3),(103,'blasphème',4),(103,'liberté d''expression',5),(103,'modèle turc',6);
