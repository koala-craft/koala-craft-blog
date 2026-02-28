-- Zenn 関連機能削除: site_config から zenn_username を削除
DELETE FROM site_config WHERE key = 'zenn_username';
