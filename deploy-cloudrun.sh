#!/usr/bin/env bash

# ==============================================================================
# 🥐 EuroTrip GCP Cloud Run 自動部署腳本
# ==============================================================================

set -e

SERVICE_NAME="euro-trip"
REGION="asia-east1" # 可改為 europe-west1 (歐洲法蘭克福) 或其他區域

echo "🚀 開始準備部署 ${SERVICE_NAME} 到 GCP Cloud Run..."

# 檢查 gcloud 是否登入
if ! command -v gcloud &> /dev/null; then
  echo "❌ 找不到 gcloud 指令，請先安裝 Google Cloud SDK。"
  exit 1
fi

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "❌ 尚未設定 GCP Project ID，請先執行: gcloud config set project <YOUR_PROJECT_ID>"
  exit 1
fi

echo "📦 當前 GCP 專案: ${PROJECT_ID}"
echo "🌍 部署區域: ${REGION}"

# 執行 Cloud Build 與 Cloud Run 部署
echo "🛠️ 正在使用 Cloud Build 建置容器映像檔並部署至 Cloud Run..."

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2

echo "🎉 部署完成！請查看上方輸出之 Cloud Run 服務網址 (Service URL)！"
