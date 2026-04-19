#!/usr/bin/env bash
set -euo pipefail

# ---- Defaults ----
REGISTRY="${REGISTRY:-aipub-harbor.cluster7.idc1.ten1010.io}"
REPOSITORY="${REPOSITORY:-aipub/brewery-web}"
TAG="${TAG:-$(git describe --tags --always --dirty 2>/dev/null || echo "dev")}"
PLATFORM="${PLATFORM:-linux/amd64}"

# Build-time env vars (Vite)
VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"
VITE_HARBOR_URL="${VITE_HARBOR_URL:-}"

IMAGE="${REGISTRY}/${REPOSITORY}:${TAG}"

echo "==> Building image: ${IMAGE}"
echo "    Platform: ${PLATFORM}"

docker build \
  --platform "${PLATFORM}" \
  --build-arg "VITE_API_BASE_URL=${VITE_API_BASE_URL}" \
  --build-arg "VITE_HARBOR_URL=${VITE_HARBOR_URL}" \
  -t "${IMAGE}" \
  -f Dockerfile \
  .

echo "==> Build complete: ${IMAGE}"

# ---- Push ----
if [[ "${PUSH:-false}" == "true" ]]; then
  echo "==> Pushing ${IMAGE}"
  docker push "${IMAGE}"
  echo "==> Push complete"
fi
