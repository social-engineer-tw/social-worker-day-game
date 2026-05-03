# 《社工的一日：一個都不漏接？》

純前端社工小遊戲。玩家在有限時間內接任務、送任務、使用休息室與功德無量，盡量達成本關 KPI，同時避免生命值歸零或壓力爆表。

## 遊戲流程

首頁主視覺 → 視覺化遊戲說明頁 → 第一關 → 第一關通關慶祝頁 → 第二關 → 最終破關頁。

首頁主視覺圖片位置：

```text
assets/hero-social-worker-day.png
```

遊戲說明圖片位置：

```text
assets/images/game-guide.png
```

玩家角色圖片位置：

```text
assets/images/social-worker-avatar.png
```

第一關通關圖片位置：

```text
assets/images/level1-clear.png
```

第二關通關圖片位置：

```text
assets/images/level2-clear.png
```

背景音樂檔案位置：

```text
assets/audio/bgm.mp3
```

背景音樂會在玩家點擊開始遊戲流程後自動播放，遊戲不提供音樂開關按鈕。若要更換音樂，只要替換 `assets/audio/bgm.mp3`；若瀏覽器阻擋播放或檔案不存在，遊戲仍可正常遊玩。

部署到 GitHub Pages 時，請確認 `assets` 資料夾有一起上傳。

## 操作方式

桌機：

- WASD / 方向鍵移動
- Q / Tab 切換手上鎖定任務

手機／平板：

- 請將裝置轉為橫向
- 用一根手指直接拖曳社工，拖到哪裡就停在哪裡
- 直式畫面會顯示旋轉提示，轉為橫向後才能遊玩

共通：

- 進入 ☕ 休息室：自動休息，基礎每秒回復生命值 +18，離開即停止
- 碰到 🙏 功德無量：清空場上尚未接起的任務
- DEBUG：顯示或隱藏偵錯資訊

## 關卡

第一關：先撐住今天

- 時間 60 秒
- KPI：完成 15 件任務
- 達成 KPI 後立即通關

第二關：事情開始追上來

- 時間 60 秒
- KPI：完成 18 件任務
- 任務節奏更快，危機與文件壓力更高

## 本機測試

直接用瀏覽器開啟 `index.html` 即可遊玩。不需要 npm、伺服器或資料庫。

## 技術限制

- HTML + CSS + 原生 JavaScript
- 不使用 React
- 不使用 npm
- 不使用 canvas
- 不使用後端
- 不使用外部圖片連結
