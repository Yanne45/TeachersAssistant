-- Migration 027: AI-powered natural language search
INSERT INTO ai_tasks (code, label, description, category, icon, system_prompt, default_template, output_format, sort_order, is_custom, target_screens)
VALUES (
  'search_intent',
  'Recherche intelligente',
  'Interprète une requête en langage naturel pour trouver des ressources pédagogiques.',
  'systeme',
  '🔍',
  'Tu es un assistant de recherche pour une application de gestion pédagogique. Tu interprètes les requêtes des enseignants en langage naturel et tu extrais des filtres structurés pour la recherche.

Les types d''entités disponibles sont : sequence, session, document, student, assignment, lesson_log, program_topic.
Les matières possibles : histoire, géographie, hggsp, emc, ses, philosophie, français, mathématiques, physique, svt, anglais, espagnol, allemand.

Tu dois TOUJOURS répondre en JSON valide, sans texte avant ou après.',
  'Interprète cette requête de recherche et extrais les filtres structurés :

« {{query}} »

Réponds en JSON avec cette structure exacte :
{
  "keywords": ["mot1", "mot2"],
  "typeFilter": ["sequence", "document"],
  "subjectFilter": "histoire",
  "levelFilter": null,
  "dateHint": null,
  "reformulatedQuery": "requête reformulée plus précise"
}

Règles :
- keywords : les termes de recherche essentiels (sans les mots vides)
- typeFilter : tableau des types pertinents (vide = tous les types)
- subjectFilter : la matière détectée ou null
- levelFilter : le niveau scolaire détecté ou null (ex: "seconde", "première", "terminale")
- dateHint : indication temporelle détectée ou null (ex: "récent", "cette semaine", "trimestre 2")
- reformulatedQuery : la requête nettoyée et précise pour une recherche par mots-clés',
  'json',
  500,
  0,
  '["recherche_globale"]'
);
