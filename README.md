# 日本では空気と水はどれだけきれいになったか

下水道普及・水洗化と公害苦情（大気・水質など）から、生活環境の改善を探索するダッシュボード。

visualizing.jp スタンドアロン（dataviz.jp サブスクツールではない）。

想定URL: https://japan-data-environment.visualizing.jp

## 開発

```bash
cp .env.example .env   # ESTAT_APP_ID を設定
npm install
npm run meta && npm run fetch && npm run data && npm run verify
npm run dev
```

| スクリプト | 内容 |
| --- | --- |
| `npm run meta` | e-Stat メタ情報 |
| `npm run fetch` | e-Stat 生データ取得 |
| `npm run data` | 配信用 cube 構築 |
| `npm run verify` | 健全性チェック |
| `npm run dev` | Vite 開発サーバ |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | TypeScript 検査 |

データ設計の正本は [`docs/data-sources.md`](docs/data-sources.md)。

## ビュー

| ビュー | 内容 |
| --- | --- |
| 時代 | 下水道・水洗化・公害苦情の長期推移（1975–2023） |
| 大気・水質 | 公害の種類別苦情件数・構成比（1972–2016） |
| 地域 | 都道府県の普及率・人口当たり苦情 |

## GitHub Pages / DNS

- `.github/workflows/pages.yml` で Pages にデプロイする。
- カスタムドメイン `japan-data-environment.visualizing.jp` は、Pages 設定と visualizing.jp 側 DNS（既存シリーズと同じ運用）で登録する。
