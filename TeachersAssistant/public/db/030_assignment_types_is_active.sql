-- Migration 030: Add is_active column to assignment_types
-- Needed by assignmentTypeService which filters on is_active

ALTER TABLE assignment_types ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
