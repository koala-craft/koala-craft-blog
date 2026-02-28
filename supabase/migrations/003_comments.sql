-- 一般ユーザー向けコメント機能
-- content_type: 'blog' | 'article' | 'stream'
-- content_slug: 記事のスラッグ

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('blog', 'article', 'stream')),
  content_slug text NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_name text NOT NULL,
  author_email text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_content ON comments (content_type, content_slug);
CREATE INDEX idx_comments_parent ON comments (parent_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "comments_select_all" ON comments
  FOR SELECT USING (true);

-- 誰でも投稿可能（匿名）
CREATE POLICY "comments_insert_all" ON comments
  FOR INSERT WITH CHECK (true);

-- 管理者のみ削除可能
CREATE POLICY "comments_delete_admin" ON comments
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM admins)
  );
