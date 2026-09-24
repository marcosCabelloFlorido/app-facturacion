ALTER TABLE outgoing_messages
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN deleted_by uuid REFERENCES public.users(id),
  ADD CONSTRAINT removed_message_not_in_progress
    CHECK (deleted_at IS NULL OR status NOT IN ('queued', 'sending'));
