-- Zenn ユーザー名（記事・スクラップの元リンク用）
INSERT INTO site_config (key, value, updated_at)
VALUES ('zenn_username', '', NOW())
ON CONFLICT (key) DO NOTHING;
