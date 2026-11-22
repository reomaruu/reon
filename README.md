# 迅雷 Share Inspector

Xunlei（迅雷）の共有リンクから、ログイン不要で閲覧可能なファイル一覧と、共有APIが返す直接ダウンロードURLを表示するCloudflare Workersアプリです。スマートフォンのブラウザでも利用できます。

**注意:** 共有リンクにログインが必要な場合、認証制限を解除してダウンロードすることはできません。迅雷の非公開Web APIを参照する実験版であり、実サーバーの対象リンクとの接続・ダウンロードは未検証です。

## 使い方

Node.js 20以上で:

```sh
npm install
npm test
npx wrangler login
npm run deploy
```

Cloudflareが発行する `https://xunlei-link-inspector.<subdomain>.workers.dev` を開き、共有URLを貼り付けます。

## 機能

- 共有URL・抽出コード・フォルダパスの解析
- ファイル名・容量・フォルダ内ファイルの表示
- APIが直接URLを返したファイルのみダウンロードリンクを表示
- 入力URLとAPI接続先の厳格な制限（SSRFを防止）
- レスポンス制限・接続タイムアウト・エラー処理
- DB、ログイン、Cookie保存なし

## 制約・運用注意

- 迅雷アカウントが必要な共有ファイルやVIP制限には対応しません。
- 1リクエストにつき最大35 APIコール、300ファイル、20直接URL追加照会。
- `captcha_sign` は非公式の仕様に依存しており、いつでも変更される可能性があります。
- API制限や認証画面が現れる場合があります。
- 公開運用時にはCloudflare側で `/api/inspect` へのレート制限を設定してください。本アプリはDB不要の構成のため、分散型レート制限を自前実装していません。
- 不明な配布ファイルは実行せず、著作権・利用許諾を確認してください。

## 参照

- https://github.com/cybdarlnig-png/gopeed-extension-xunlei

迅雷の公式製品・提携製品ではありません。
