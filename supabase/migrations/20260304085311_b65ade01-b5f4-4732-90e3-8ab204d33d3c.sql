
-- Allow authenticated users to manage lessons (admin functionality)
-- In production, you'd restrict this to admin role users
CREATE POLICY "Authenticated users can insert lessons"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lessons"
  ON public.lessons FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete lessons"
  ON public.lessons FOR DELETE TO authenticated
  USING (true);

-- Allow authenticated users to manage languages
CREATE POLICY "Authenticated users can insert languages"
  ON public.languages FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update languages"
  ON public.languages FOR UPDATE TO authenticated
  USING (true);
