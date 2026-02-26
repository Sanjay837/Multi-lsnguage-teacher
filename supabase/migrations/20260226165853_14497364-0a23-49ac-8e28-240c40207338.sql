
-- Allow users to delete their own chat messages (for clear history)
CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);
