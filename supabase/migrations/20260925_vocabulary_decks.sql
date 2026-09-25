-- Custom vocabulary study decks (LEARN-03)
CREATE TABLE IF NOT EXISTS public.vocabulary_decks (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.vocabulary_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vocabulary decks"
  ON public.vocabulary_decks
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.vocabulary_deck_items (
  deck_id TEXT NOT NULL REFERENCES public.vocabulary_decks(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL REFERENCES public.saved_words(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (deck_id, word_id)
);

ALTER TABLE public.vocabulary_deck_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vocabulary deck items"
  ON public.vocabulary_deck_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
