-- Migration 013 : support multi-fournisseurs IA (Mistral, serveur local Ollama)
ALTER TABLE ai_settings ADD COLUMN provider TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE ai_settings ADD COLUMN local_server_url TEXT NOT NULL DEFAULT 'http://localhost:11434';
