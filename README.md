<!-- Language Navigation -->
<div align="center">

🌐 [日本語](#日本語) ｜ [English](#english) ｜ [中文](#中文) ｜ [한국어](#한국어)

</div>

---

<a name="日本語"></a>
# X Likes Viewer

Twitter / X の「いいね」やブックマークを JSON から読み込み、ギャラリー形式で快適に閲覧するためのツール。単一の HTML ファイルとして動作し、サーバー・API・ブラウザ拡張機能は一切不要。

## 使い方

1. **エクスポート** — 内蔵ブックマークレットを X.com 上で実行し、いいね / ブックマークを JSON でエクスポート
2. **読み込み** — ブラウザでこのページを開き、エクスポートした JSON ファイルを選択
3. **閲覧** — メディア付きツイートをギャラリー形式で表示・検索・フィルタリング

> ブックマークレットの登録方法はツール内の「ツール」パネルに記載されています。

## 機能

### 📥 データ取り込み
- 内蔵ブックマークレットによる X.com からの **いいね / ブックマーク エクスポート**（[twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter) 参考実装）
- JSON ファイルの読み込み（いいね・ブックマーク・twitter-web-exporter 出力形式に対応）
- IndexedDB を使用した最大 10 件のキャッシュ保存（履歴から即時切替可能）

### 🔍 検索・フィルタ
- テキスト検索（投稿本文・ユーザー名）
- 高度な検索構文:
  - `-キーワード` : 除外検索
  - `A AND B` / `A & B` : AND 検索
  - `A OR B` / `A | B` : OR 検索
  - `min_faves:N` : 最低いいね数
  - `min_retweets:N` : 最低リツイート数
  - `since:YYYY-MM-DD` / `until:YYYY-MM-DD` : 日付範囲（検索構文）
- UI による日付範囲フィルタ
- ソート：新しい順 / 古い順 / いいね数順

### 🖼️ 表示・閲覧
- **グリッド表示** と **リスト表示** の切替
- モーダルビューワー（画像・動画・GIF）
  - ピンチズーム / マウスドラッグ / ダブルクリックズーム
  - ホイールスクロールまたはスワイプで複数メディアを切替
  - 画像 / 動画タップでツイート本文をオーバーレイ表示
- ユーザー名クリックでコンテキストメニュー（そのユーザーのみ検索 / 除外）

### 🛠️ JSON ツール
- **JSON マージ**: 2 つの JSON を ID 重複除外しながら結合・ダウンロード
- **投稿除外**: 指定いいね数未満のツイートを除去した JSON をダウンロード

### 🎨 カスタマイズ
- テーマ：ライト / ダーク / AMOLED
- アニメーション・エフェクト ON/OFF
- 表示言語：日本語 / English / 中文 / 한국어
- スクロール連動ヘッダー自動非表示

### 📱 環境・互換性
- PWA 対応（ホーム画面に追加してアプリとして利用可能）
- PC・スマートフォン両対応（レスポンシブデザイン）
- Twitter API 不使用 — ブラウザ上で完結し、入力データは外部に一切送信されない
- HTML ファイルをローカル保存すればオフライン環境でも完全動作

## ライセンス

本リポジトリの内容は [Creative Commons 表示 - 継承 4.0 国際 (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/) の下で提供されています。

© 2025–2026 n4rcole

<div align="right"><a href="#top">▲ トップへ戻る</a></div>

---

<a name="english"></a>
# X Likes Viewer

A tool for browsing Twitter / X likes and bookmarks loaded from a JSON file, displayed in a gallery layout. Runs as a single HTML file — no server, API, or browser extension required.

## How to Use

1. **Export** — Run the built-in bookmarklet on X.com to export your likes or bookmarks as JSON
2. **Load** — Open this page in your browser and select the exported JSON file
3. **Browse** — View, search, and filter your tweets in a rich gallery layout

> Instructions for registering the bookmarklet are available in the in-tool "Tools" panel.

## Features

### 📥 Data Import
- **Likes / Bookmarks export** via built-in bookmarklet running on X.com (based on [twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter))
- JSON file loading (supports likes, bookmarks, and twitter-web-exporter output formats)
- Up to 10 cached sessions stored in IndexedDB with instant history switching

### 🔍 Search & Filter
- Text search (tweet body and username)
- Advanced search syntax:
  - `-keyword` : exclude keyword
  - `A AND B` / `A & B` : AND search
  - `A OR B` / `A | B` : OR search
  - `min_faves:N` : minimum likes count
  - `min_retweets:N` : minimum retweet count
  - `since:YYYY-MM-DD` / `until:YYYY-MM-DD` : date range (inline syntax)
- Date range filter via UI
- Sort by: newest / oldest / most liked

### 🖼️ Display & Viewing
- Toggle between **Grid view** and **List view**
- Modal viewer for images, videos, and GIFs
  - Pinch zoom / mouse drag / double-click zoom
  - Scroll wheel or swipe to navigate multiple media items
  - Tap image / video to overlay the tweet text
- Click username for a context menu (search or exclude that user)

### 🛠️ JSON Tools
- **JSON Merge**: Combine two JSON files with automatic duplicate ID removal, then download
- **Post Filter**: Download a JSON with tweets below a specified likes threshold removed

### 🎨 Customization
- Themes: Light / Dark / AMOLED
- Toggle animations and visual effects on/off
- Display language: 日本語 / English / 中文 / 한국어
- Auto-hiding header on scroll

### 📱 Environment & Compatibility
- PWA support (installable as a home screen app)
- Responsive design for both desktop and mobile
- No Twitter API required — runs entirely in the browser; no data is ever sent externally
- Save the HTML file locally for full offline operation

## License

The contents of this repository are provided under the [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/) license.

© 2025–2026 n4rcole

<div align="right"><a href="#top">▲ Back to top</a></div>

---

<a name="中文"></a>
# X Likes Viewer

一款用于浏览 Twitter / X 点赞与书签的工具，支持从 JSON 文件加载数据并以图库形式展示。以单一 HTML 文件运行，无需服务器、API 或浏览器扩展。

## 使用方法

1. **导出** — 在 X.com 上运行内置书签小工具，将点赞 / 书签导出为 JSON
2. **加载** — 在浏览器中打开本页面，选择导出的 JSON 文件
3. **浏览** — 以丰富的图库形式查看、搜索和筛选推文

> 书签小工具的注册方法请参阅工具内的「工具」面板。

## 功能

### 📥 数据导入
- 通过内置书签小工具在 X.com 上**导出点赞 / 书签**（参考 [twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter) 实现）
- 加载 JSON 文件（支持点赞、书签及 twitter-web-exporter 输出格式）
- 使用 IndexedDB 最多缓存 10 条记录，可随时从历史中切换

### 🔍 搜索与筛选
- 文本搜索（推文内容、用户名）
- 高级搜索语法:
  - `-关键词` : 排除关键词
  - `A AND B` / `A & B` : AND 搜索
  - `A OR B` / `A | B` : OR 搜索
  - `min_faves:N` : 最低点赞数
  - `min_retweets:N` : 最低转推数
  - `since:YYYY-MM-DD` / `until:YYYY-MM-DD` : 日期范围（内联语法）
- 通过 UI 设置日期范围筛选
- 排序：最新 / 最早 / 点赞数最多

### 🖼️ 展示与查看
- **网格视图**与**列表视图**切换
- 图片、视频、GIF 的模态查看器
  - 捏合缩放 / 鼠标拖拽 / 双击缩放
  - 滚轮滚动或滑动切换多个媒体
  - 点击图片 / 视频显示推文文本叠加层
- 点击用户名显示上下文菜单（搜索或排除该用户）

### 🛠️ JSON 工具
- **JSON 合并**：将两个 JSON 文件去除重复 ID 后合并并下载
- **投稿过滤**：下载已删除低于指定点赞数推文的 JSON

### 🎨 自定义
- 主题：浅色 / 深色 / AMOLED
- 开关动画与视觉效果
- 显示语言：日本語 / English / 中文 / 한국어
- 滚动时自动隐藏顶栏

### 📱 环境与兼容性
- 支持 PWA（可添加到主屏幕作为应用使用）
- 响应式设计，支持桌面与移动端
- 无需 Twitter API — 完全在浏览器内运行，数据不会发送至任何外部服务器
- 将 HTML 文件保存到本地后可完全离线运行

## 许可证

本仓库内容采用 [知识共享 署名-相同方式共享 4.0 国际 (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.zh) 许可证授权。

© 2025–2026 n4rcole

<div align="right"><a href="#top">▲ 返回顶部</a></div>

---

<a name="한국어"></a>
# X Likes Viewer

Twitter / X의 좋아요 및 북마크를 JSON 파일에서 불러와 갤러리 형식으로 편리하게 열람하는 도구입니다. 단일 HTML 파일로 동작하며 서버·API·브라우저 확장 프로그램이 일절 필요하지 않습니다.

## 사용 방법

1. **내보내기** — X.com에서 내장 북마클릿을 실행해 좋아요 / 북마크를 JSON으로 내보내기
2. **불러오기** — 브라우저에서 이 페이지를 열고 내보낸 JSON 파일 선택
3. **열람** — 미디어 포함 트윗을 갤러리 형식으로 보기·검색·필터링

> 북마클릿 등록 방법은 도구 내 「도구」패널을 참조하세요.

## 기능

### 📥 데이터 가져오기
- 내장 북마클릿을 통한 X.com의 **좋아요 / 북마크 내보내기**（[twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter) 참고 구현）
- JSON 파일 불러오기（좋아요·북마크·twitter-web-exporter 출력 형식 지원）
- IndexedDB를 사용한 최대 10건의 캐시 저장（기록에서 즉시 전환 가능）

### 🔍 검색 및 필터
- 텍스트 검색（게시물 본문·사용자명）
- 고급 검색 구문:
  - `-키워드` : 제외 검색
  - `A AND B` / `A & B` : AND 검색
  - `A OR B` / `A | B` : OR 검색
  - `min_faves:N` : 최소 좋아요 수
  - `min_retweets:N` : 최소 리트윗 수
  - `since:YYYY-MM-DD` / `until:YYYY-MM-DD` : 날짜 범위（인라인 구문）
- UI 날짜 범위 필터
- 정렬：최신순 / 오래된순 / 좋아요 순

### 🖼️ 표시 및 열람
- **그리드 보기**와 **리스트 보기** 전환
- 이미지·동영상·GIF 모달 뷰어
  - 핀치 줌 / 마우스 드래그 / 더블클릭 줌
  - 휠 스크롤 또는 스와이프로 복수 미디어 전환
  - 이미지 / 동영상 탭으로 트윗 본문 오버레이 표시
- 사용자명 클릭 시 컨텍스트 메뉴（해당 유저 검색 / 제외）

### 🛠️ JSON 도구
- **JSON 병합**：두 JSON을 ID 중복 제거 후 결합하여 다운로드
- **게시물 제외**：지정 좋아요 수 미만 트윗을 제거한 JSON 다운로드

### 🎨 커스터마이징
- 테마：라이트 / 다크 / AMOLED
- 애니메이션·이펙트 ON/OFF
- 표시 언어：日本語 / English / 中文 / 한국어
- 스크롤 연동 헤더 자동 숨기기

### 📱 환경 및 호환성
- PWA 지원（홈 화면에 추가해 앱으로 사용 가능）
- PC·스마트폰 모두 지원（반응형 디자인）
- Twitter API 미사용 — 브라우저에서 완결되며 입력 데이터는 외부로 일절 전송되지 않음
- HTML 파일을 로컬에 저장하면 오프라인 환경에서도 완전 동작

## 라이선스

본 리포지토리의 내용은 [크리에이티브 커먼즈 저작자표시-동일조건변경허락 4.0 국제 (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.ko) 라이선스 하에 제공됩니다.

© 2025–2026 n4rcole

<div align="right"><a href="#top">▲ 맨 위로</a></div>
