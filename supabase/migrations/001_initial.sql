-- Obsidian Log 初期スキーマ
-- 運用手順書に基づく

-- tasks テーブル
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('todo', 'doing', 'done')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- admins テーブル
CREATE TABLE admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- site_config テーブル（サイト設定）
CREATE TABLE site_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- site_config 初期値（空文字。使用時に管理画面から URL を登録）
INSERT INTO site_config (key, value, updated_at)
VALUES ('github_repo_url', '', NOW());

-- RLS を有効化
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- tasks の RLS ポリシー
CREATE POLICY "tasks_select_public" ON tasks
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "tasks_select_admin" ON tasks
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admins)
  );

CREATE POLICY "tasks_insert_admin" ON tasks
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admins)
  );

CREATE POLICY "tasks_update_admin" ON tasks
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM admins)
  );

CREATE POLICY "tasks_delete_admin" ON tasks
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM admins)
  );

-- admins の RLS ポリシー
CREATE POLICY "admins_select_self" ON admins
  FOR SELECT USING (auth.uid() = user_id);

-- site_config の RLS ポリシー
CREATE POLICY "site_config_select_all" ON site_config
  FOR SELECT USING (true);

CREATE POLICY "site_config_modify_admin" ON site_config
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admins)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admins)
  );
