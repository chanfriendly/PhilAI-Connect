-- Allow anon inserts for extraction script

CREATE POLICY "Allow public inserts on articles" ON public.articles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public updates on articles" ON public.articles FOR UPDATE USING (true);

CREATE POLICY "Allow public inserts on authors" ON public.authors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public updates on authors" ON public.authors FOR UPDATE USING (true);

CREATE POLICY "Allow public inserts on article_authors" ON public.article_authors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public updates on article_authors" ON public.article_authors FOR UPDATE USING (true);
