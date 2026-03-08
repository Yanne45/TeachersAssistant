-- ============================================================================
-- Teacher Assistant — Migration 005 : Descriptions officielles des chapitres
-- Contenu issu du programme officiel (BO) pour chaque chapitre
-- ============================================================================

-- ══════════════════════════════════════════════
-- HGGSP Terminale — Descriptions thèmes
-- ══════════════════════════════════════════════

UPDATE program_topics SET description = 'Ce thème étudie les nouvelles formes de conquête et de rivalités à travers l''exploration et l''appropriation des espaces maritimes, aériens et extra-atmosphériques. Il interroge les enjeux de puissance, de souveraineté et de coopération liés à ces espaces.' WHERE id = 1;
UPDATE program_topics SET description = 'Ce thème aborde les transformations de la guerre et les tentatives de construction de la paix depuis l''époque moderne. Il analyse les dimensions politiques, diplomatiques et juridiques des conflits armés et de leur résolution.' WHERE id = 2;
UPDATE program_topics SET description = 'Ce thème explore les relations entre histoire et mémoires, notamment autour des conflits majeurs du XXe siècle. Il interroge la construction des mémoires, leurs usages politiques et sociaux, et le rôle de la justice dans le travail mémoriel.' WHERE id = 3;
UPDATE program_topics SET description = 'Ce thème étudie la notion de patrimoine dans ses dimensions historiques, artistiques et politiques. Il analyse les processus de patrimonialisation, les tensions entre préservation et transformation, et les enjeux géopolitiques du patrimoine.' WHERE id = 4;
UPDATE program_topics SET description = 'Ce thème analyse les relations entre les sociétés humaines et leur environnement dans une perspective historique et géopolitique. Il aborde l''exploitation des ressources, la protection de l''environnement et les défis du changement climatique.' WHERE id = 5;
UPDATE program_topics SET description = 'Ce thème interroge le rôle de la connaissance comme enjeu de pouvoir. Il étudie la production, la diffusion et le contrôle des savoirs dans les relations internationales, ainsi que les nouveaux défis liés au numérique et au cyberespace.' WHERE id = 6;

-- ══════════════════════════════════════════════
-- HGGSP Terminale — Descriptions chapitres
-- ══════════════════════════════════════════════

UPDATE program_topics SET description = 'Étude des conquêtes et rivalités dans les espaces maritimes et extra-atmosphériques. Jalons : la course à l''espace depuis les années 1950 ; la Chine et la conquête de l''espace ; tensions en mer de Chine méridionale.' WHERE id = 7;
UPDATE program_topics SET description = 'Analyse des coopérations internationales dans les nouveaux espaces. Jalons : la Station spatiale internationale (ISS) ; le traité sur l''Antarctique (1959) ; la Convention des Nations unies sur le droit de la mer (CNUDM, Montego Bay, 1982).' WHERE id = 8;
UPDATE program_topics SET description = 'Étude de la dimension politique de la guerre, de Clausewitz aux conflits contemporains. Jalons : la guerre, « continuation de la politique par d''autres moyens » (Clausewitz) ; le modèle de Westphalie face aux guerres irrégulières ; le terrorisme.' WHERE id = 9;
UPDATE program_topics SET description = 'Analyse des défis de la construction de la paix depuis 1648. Jalons : les traités de Westphalie (1648) ; la SDN et l''ONU, des organisations pour la paix ; les tribunaux pénaux internationaux et la CPI.' WHERE id = 10;
UPDATE program_topics SET description = 'Étude des relations entre histoire et mémoires des conflits. Jalons : l''historien face aux mémoires de la Seconde Guerre mondiale en France ; mémoires et histoire d''un conflit : la guerre d''Algérie.' WHERE id = 11;
UPDATE program_topics SET description = 'Analyse du rôle de la justice dans le traitement des mémoires. Jalons : le procès de Nuremberg ; la commission Vérité et Réconciliation en Afrique du Sud ; les mémoires du génocide des Tutsis au Rwanda.' WHERE id = 12;
UPDATE program_topics SET description = 'Étude des usages sociaux et politiques du patrimoine. Jalons : Versailles, du château à un lieu de mémoire nationale ; le patrimoine, facteur de rayonnement culturel et de puissance (le Louvre).' WHERE id = 13;
UPDATE program_topics SET description = 'Analyse des tensions autour de la préservation du patrimoine. Jalons : les destructions de patrimoine en situation de conflit (Palmyre, Tombouctou) ; la question des restitutions de biens culturels (bronzes du Bénin).' WHERE id = 14;
UPDATE program_topics SET description = 'Étude de l''exploitation et de la protection de l''environnement. Jalons : la forêt amazonienne, un enjeu environnemental mondial ; les ressources naturelles, enjeu de conflits ; la gestion d''une ressource : l''eau.' WHERE id = 15;
UPDATE program_topics SET description = 'Analyse historique et géopolitique du changement climatique. Jalons : les évolutions du climat depuis le XIXe siècle ; les négociations climatiques internationales (Rio, Kyoto, Paris) ; les États-Unis et la question climatique.' WHERE id = 16;
UPDATE program_topics SET description = 'Étude de la production et de la diffusion des connaissances. Jalons : les grandes découvertes scientifiques et leurs impacts ; les universités dans la compétition internationale ; l''explosion d''Internet et ses enjeux.' WHERE id = 17;
UPDATE program_topics SET description = 'Analyse de la connaissance comme enjeu politique et géopolitique. Jalons : le cyberespace, entre liberté et contrôle ; la guerre de l''information à l''ère numérique ; l''intelligence artificielle, un enjeu géopolitique majeur.' WHERE id = 18;

-- ══════════════════════════════════════════════
-- Histoire Terminale — Descriptions thèmes
-- ══════════════════════════════════════════════

UPDATE program_topics SET description = 'Ce thème étudie la mise en place d''un monde bipolaire après 1945, marqué par l''opposition entre le modèle américain (libéralisme, capitalisme) et le modèle soviétique (communisme, économie planifiée). Il analyse les formes de la confrontation Est-Ouest et les modèles politiques, économiques et sociaux en présence.' WHERE id = 19;
UPDATE program_topics SET description = 'Ce thème analyse la complexification des relations internationales avec l''émergence de nouveaux acteurs : décolonisation, non-alignement, organisations internationales, acteurs transnationaux. Il montre comment le monde bipolaire est contesté de l''intérieur.' WHERE id = 20;
UPDATE program_topics SET description = 'Ce thème étudie les mutations économiques, politiques et sociales des années 1970 à 1991 : chocs pétroliers, remise en cause du modèle keynésien, tournant néolibéral, contestations sociales et culturelles, jusqu''à la chute du bloc soviétique.' WHERE id = 21;
UPDATE program_topics SET description = 'Ce thème analyse les recompositions du monde depuis la fin de la Guerre froide : nouvel ordre mondial, construction européenne, montée des défis globaux (terrorisme, crises économiques, enjeux environnementaux).' WHERE id = 22;

-- ══════════════════════════════════════════════
-- Histoire Terminale — Descriptions chapitres
-- ══════════════════════════════════════════════

UPDATE program_topics SET description = 'La Guerre froide (1947-1991) : les grandes phases de la confrontation Est-Ouest. Points de passage : Berlin (1945-1989), la crise de Cuba (1962), la guerre de Corée (1950-1953). Les formes de la confrontation : course aux armements, conflits périphériques, guerre idéologique.' WHERE id = 23;
UPDATE program_topics SET description = 'Les modèles politiques et sociaux en compétition. Points de passage : le modèle américain (société de consommation, soft power) ; le modèle soviétique (planification, contrôle social) ; les contre-modèles et contestations internes.' WHERE id = 24;
UPDATE program_topics SET description = 'Le processus de décolonisation et la naissance du tiers-monde. Points de passage : la conférence de Bandung (1955) ; la guerre d''Indochine et la guerre d''Algérie ; l''indépendance et la construction nationale.' WHERE id = 25;
UPDATE program_topics SET description = 'Les conflits et enjeux géopolitiques du monde bipolaire. Points de passage : le conflit israélo-arabe ; la guerre du Vietnam ; le rôle croissant des organisations internationales et des acteurs non-étatiques.' WHERE id = 26;
UPDATE program_topics SET description = 'Les mutations économiques et politiques des années 1970-1991. Points de passage : le choc pétrolier de 1973 ; le tournant néolibéral (Reagan, Thatcher) ; la chute du mur de Berlin et la fin de l''URSS (1989-1991).' WHERE id = 27;
UPDATE program_topics SET description = 'Les transformations sociales et culturelles. Points de passage : Mai 68 dans le monde ; les combats pour l''égalité (féminisme, droits civiques) ; l''émergence de la conscience écologique et des nouvelles formes de contestation.' WHERE id = 28;
UPDATE program_topics SET description = 'Le monde après 1989 : entre espoirs et nouvelles tensions. Points de passage : la guerre du Golfe (1991) ; les attentats du 11 septembre 2001 et la guerre contre le terrorisme ; l''émergence d''un monde multipolaire.' WHERE id = 29;
UPDATE program_topics SET description = 'La construction européenne entre élargissement et approfondissement. Points de passage : le traité de Maastricht (1992) et la création de l''UE ; l''élargissement à l''Est ; les crises de la construction européenne (rejet du TCE, Brexit).' WHERE id = 30;

-- ══════════════════════════════════════════════
-- Géographie Première — Descriptions thèmes
-- ══════════════════════════════════════════════

UPDATE program_topics SET description = 'Ce thème étudie le processus de métropolisation à l''échelle mondiale : concentration des populations, des activités et des pouvoirs dans les grandes villes. Il analyse les dynamiques spatiales, les hiérarchies urbaines et les inégalités qui en résultent.' WHERE id = 31;
UPDATE program_topics SET description = 'Ce thème analyse les transformations des espaces de production dans le contexte de la mondialisation : nouvelles logiques de localisation, rôle des métropoles et des littoraux, recompositions territoriales.' WHERE id = 32;
UPDATE program_topics SET description = 'Ce thème étudie les mutations des espaces ruraux, entre multifonctionnalité et fragmentation. Il analyse les dynamiques agricoles, les nouvelles fonctions des campagnes et les conflits d''usage qui en résultent.' WHERE id = 33;
UPDATE program_topics SET description = 'Ce thème prend la Chine comme étude de cas pour analyser les recompositions spatiales liées au développement économique rapide : urbanisation massive, inégalités territoriales, enjeux environnementaux.' WHERE id = 34;

-- ══════════════════════════════════════════════
-- Géographie Première — Descriptions chapitres
-- ══════════════════════════════════════════════

UPDATE program_topics SET description = 'Les villes à l''échelle mondiale et le poids croissant des métropoles. Étude de cas : une métropole mondiale (Londres, New York ou Tokyo). La hiérarchie urbaine mondiale, les villes globales et leur rôle dans la mondialisation.' WHERE id = 35;
UPDATE program_topics SET description = 'Les métropoles face aux inégalités et aux mutations. Étude de cas : une métropole d''un pays émergent (Mumbai, Lagos ou São Paulo). Gentrification, fragmentation socio-spatiale, périurbanisation et défis de la ville durable.' WHERE id = 36;
UPDATE program_topics SET description = 'Les espaces de production dans le monde : logiques de localisation et chaînes de valeur mondiales. Étude de cas : un espace productif dans le contexte de la mondialisation. Firmes transnationales et division internationale du travail.' WHERE id = 37;
UPDATE program_topics SET description = 'Le rôle des métropoles et des littoraux dans l''organisation des espaces productifs. Étude de cas : les espaces productifs français dans la dynamique de la mondialisation. Littoralisation, ZIP, façades maritimes.' WHERE id = 38;
UPDATE program_topics SET description = 'La fragmentation des espaces ruraux : entre déclin et renouveau. Étude de cas : les espaces ruraux en France. Dynamiques agricoles, déprise rurale, périurbanisation et nouvelles ruralités.' WHERE id = 39;
UPDATE program_topics SET description = 'L''affirmation des fonctions non agricoles des espaces ruraux. Étude de cas : un espace rural en conflit d''usage. Multifonctionnalité, tourisme rural, circuits courts, néo-ruraux et transitions agricoles.' WHERE id = 40;
UPDATE program_topics SET description = 'L''urbanisation et la métropolisation en Chine : un processus accéléré. Étude de cas : une métropole chinoise (Shanghai ou Pékin). Exode rural, ZES, mégalopoles, Nouvelles Routes de la Soie.' WHERE id = 41;
UPDATE program_topics SET description = 'Les recompositions territoriales en Chine : inégalités et aménagement. Étude de cas : les inégalités entre Chine littorale et Chine intérieure. Développement économique, aménagement du territoire, enjeux environnementaux.' WHERE id = 42;
