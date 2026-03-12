-- Migration 011 : support des tâches IA personnalisées
-- Ajoute is_custom pour distinguer les tâches système (built-in) des tâches créées par l'enseignant

ALTER TABLE ai_tasks ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0;
