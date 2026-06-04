#!/bin/bash

set -e  # Exit on error

#==============================================================================
# Dockerizer Web Install Script
# Helm 차트를 사용하여 dockerizer-web 프론트엔드를 배포한다.
# 사용법: sudo ./install.sh --config config.json [--skip-confirmation]
#==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHART_DIR="${SCRIPT_DIR}/../deploy/helm"

source "${SCRIPT_DIR}/common.sh"
trap cleanup_on_error EXIT

#==============================================================================
# yq 경로 설정
#==============================================================================
KI_ENV_BIN_PATH="/var/lib/ki-env/bin/bin"
if [ -x "${KI_ENV_BIN_PATH}/yq" ]; then
    YQ_COMMAND="${KI_ENV_BIN_PATH}/yq"
elif command -v yq &> /dev/null; then
    YQ_COMMAND="yq"
else
    log_error "yq command not found. Install yq or set KI_ENV_BIN_PATH."
    exit 1
fi

#==============================================================================
# Command Line Arguments
#==============================================================================
SKIP_CONFIRMATION=false
BUILD_IMAGES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            BUILD_IMAGES=true
            shift
            ;;
        --skip-confirmation)
            SKIP_CONFIRMATION=true
            shift
            ;;
        --config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --config <file>          Specify configuration JSON file"
            echo "  --build                  Build and push Docker image before deploying"
            echo "  --skip-confirmation      Skip deployment confirmation prompts"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

if [ -z "${CONFIG_FILE:-}" ]; then
    log_error "Configuration file not specified. Use --config <file>"
    exit 1
fi
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Configuration file not found: $CONFIG_FILE"
    exit 1
fi

log_info "Loading configuration from: $CONFIG_FILE"

#==============================================================================
# Confirmation Helper
#==============================================================================
confirm_deployment() {
    local chart_name=$1

    if [ "$SKIP_CONFIRMATION" = true ]; then
        return 0
    fi

    while true; do
        read -p "Deploy ${chart_name}? (yes/no) [no]: " yn < /dev/tty
        yn=${yn:-no}
        case $yn in
            [Yy]* | [Yy][Ee][Ss]* ) return 0;;
            [Nn]* | [Nn][Oo]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

#==============================================================================
# Helm Deploy (with backup & change report)
#==============================================================================
deploy_helm_chart() {
    local chart_name=$1
    shift

    if ! confirm_deployment "${chart_name}"; then
        log_info "Skipped ${chart_name}"
        return 0
    fi

    local backup_dir="${BACKUP_BASE_DIR}/${chart_name}"
    mkdir -p "${backup_dir}"

    local before_file="${backup_dir}/before.yaml"
    local after_file="${backup_dir}/after.yaml"
    local report_file="${backup_dir}/change-report.txt"
    local is_upgrade=false

    if sudo helm status -n ${NAMESPACE} ${chart_name} &> /dev/null; then
        is_upgrade=true
        log_info "Backing up existing release: ${chart_name}"
        sudo helm get manifest -n ${NAMESPACE} ${chart_name} > "${before_file}"
        sudo helm get values -n ${NAMESPACE} ${chart_name} > "${backup_dir}/values-before.yaml"
        log_success "Backup saved: ${backup_dir}"
    fi

    log_info "Deploying ${chart_name}..."

    sudo helm upgrade -n ${NAMESPACE} ${chart_name} "${CHART_DIR}/${chart_name}/" \
        --install \
        "$@"

    if [ $? -eq 0 ]; then
        log_success "${chart_name} deployed successfully"

        # 기존 릴리스 업그레이드면 pod 를 명시적으로 재시작한다.
        # 이미지 태그가 동일하면 helm 은 Deployment 를 새로 굴리지 않아 pod 가
        # 재생성되지 않으므로(이미지 재pull 안 됨), pullPolicy: Always 와 함께
        # 최신 이미지를 반영하려면 rollout restart 가 필요하다.
        if [ "$is_upgrade" = true ]; then
            log_info "Restarting workloads for existing release ${chart_name}..."
            if sudo kubectl rollout restart deployment -n ${NAMESPACE} -l "app.kubernetes.io/instance=${chart_name}"; then
                sudo kubectl rollout status deployment -n ${NAMESPACE} -l "app.kubernetes.io/instance=${chart_name}" --timeout=300s || true
                log_success "${chart_name} workloads restarted"
            else
                log_warn "No matching workloads to restart for ${chart_name}"
            fi
        fi

        sudo helm get manifest -n ${NAMESPACE} ${chart_name} > "${after_file}"
        sudo helm get values -n ${NAMESPACE} ${chart_name} > "${backup_dir}/values-after.yaml"

        if [ "$is_upgrade" = true ]; then
            {
                echo "=============================================="
                echo "  Change Report: ${chart_name}"
                echo "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
                echo "  Namespace: ${NAMESPACE}"
                echo "=============================================="
                echo ""
                echo "--- Manifest Changes ---"
                diff -u "${before_file}" "${after_file}" || true
                echo ""
                echo "--- Values Changes ---"
                diff -u "${backup_dir}/values-before.yaml" "${backup_dir}/values-after.yaml" || true
            } > "${report_file}"
        else
            {
                echo "=============================================="
                echo "  Change Report: ${chart_name}"
                echo "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
                echo "  Namespace: ${NAMESPACE}"
                echo "  Type: 신규 설치"
                echo "=============================================="
                echo ""
                echo "신규 설치 - 이전 릴리즈 없음"
                echo ""
                echo "--- Installed Manifest ---"
                cat "${after_file}"
            } > "${report_file}"
        fi
        log_info "Change report: ${report_file}"
    else
        log_error "Failed to deploy ${chart_name}"
        exit 1
    fi
}

#==============================================================================
# Load Configuration
#==============================================================================
log_step "Loading configuration"

NAMESPACE=$(${YQ_COMMAND} -r '.namespace' "$CONFIG_FILE")

# Version / Images
IMAGE_BASE=$(${YQ_COMMAND} -r '.version.image_base' "$CONFIG_FILE")
WEB_TAG=$(${YQ_COMMAND} -r '.version.tag' "$CONFIG_FILE")

WEB_IMAGE="${IMAGE_BASE}/dockerizer-web"

# Harbor
HARBOR_URL=$(${YQ_COMMAND} -r '.harbor.url // "aipub-harbor.cluster7.idc1.ten1010.io"' "$CONFIG_FILE")

BACKUP_BASE_DIR="${SCRIPT_DIR}/backups/${NAMESPACE}/$(date +%Y%m%d_%H%M%S)"

#==============================================================================
# Pre-flight Checks
#==============================================================================
log_step "Pre-flight checks"

check_command kubectl
check_command helm
check_namespace "${NAMESPACE}"

#==============================================================================
# Display Deployment Plan
#==============================================================================
log_step "Deployment Plan"
log_info "=========================================="
log_info "  Namespace:    ${NAMESPACE}"
log_info "  Image:        ${WEB_IMAGE}:${WEB_TAG}"
log_info "  Harbor URL:   ${HARBOR_URL}"
log_info "=========================================="
log_info "  1. dockerizer-web (${WEB_TAG})"
log_info "=========================================="
log_info ""

if [ "$SKIP_CONFIRMATION" = false ]; then
    log_info "You will be prompted to confirm deployment."
    log_info "Tip: Use --skip-confirmation to deploy without prompts"
    log_info ""
fi

#==============================================================================
# Image Build & Push (optional)
#==============================================================================
if [ "$BUILD_IMAGES" = true ]; then
    log_step "Building and pushing Docker image"

    check_command docker

    WEB_IMAGE_FULL="${WEB_IMAGE}:${WEB_TAG}"

    log_info "Building image: ${WEB_IMAGE_FULL}"
    log_info "  VITE_HARBOR_URL: ${HARBOR_URL}"
    sudo docker build --platform linux/amd64 \
      --build-arg "VITE_HARBOR_URL=${HARBOR_URL}" \
      -t "${WEB_IMAGE_FULL}" \
      -f "${SCRIPT_DIR}/../Dockerfile" \
      "${SCRIPT_DIR}/.."

    log_info "Pushing image..."
    sudo docker push "${WEB_IMAGE_FULL}"
    log_success "Image built and pushed"
fi

#==============================================================================
# Deploy: dockerizer-web
#==============================================================================
log_step "Deploying dockerizer-web"

deploy_helm_chart "dockerizer-web" \
  --set image.repository="${WEB_IMAGE}" \
  --set image.tag="${WEB_TAG}"

#==============================================================================
# Completion
#==============================================================================
log_step "Installation Complete"
log_success "dockerizer-web has been deployed to namespace '${NAMESPACE}'"
