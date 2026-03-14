-- Migration 028: Add event_type to calendar_events for agenda categorization
ALTER TABLE calendar_events ADD COLUMN event_type TEXT NOT NULL DEFAULT 'other'
  CHECK (event_type IN ('parent_meeting', 'staff_meeting', 'council', 'exam', 'training', 'administrative', 'other'));
