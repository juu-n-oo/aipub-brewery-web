#!/bin/bash

#==============================================================================
# common.sh - 공통 함수 모음
# 사용법: source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
#==============================================================================

#==============================================================================
# 색상 코드
#==============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

#==============================================================================
# 로깅 함수
#==============================================================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_step() {
    echo -e "\n${GREEN}==>${NC} ${BLUE}$*${NC}"
}

#==============================================================================
# 에러 핸들링
# 사용법: trap cleanup_on_error EXIT
#==============================================================================
cleanup_on_error() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Script failed with exit code: $exit_code"
        log_error "Check the logs above for details"
    fi
}

#==============================================================================
# 명령어 존재 여부 확인
# 사용법: check_command kubectl
#==============================================================================
check_command() {
    local cmd=$1
    if ! command -v "$cmd" &> /dev/null; then
        log_error "Required command not found: $cmd"
        return 1
    fi
}

#==============================================================================
# Namespace 존재 여부 확인 (없으면 생성 여부 질문)
# 사용법: check_namespace <namespace>
#==============================================================================
check_namespace() {
    local namespace=$1
    if ! sudo kubectl get namespace "$namespace" &> /dev/null; then
        log_warn "Namespace '$namespace' does not exist"
        if [ "${SKIP_CONFIRMATION:-false}" = true ]; then
            sudo kubectl create namespace "$namespace"
            log_success "Created namespace: $namespace"
        else
            read -p "Create namespace? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                sudo kubectl create namespace "$namespace"
                log_success "Created namespace: $namespace"
            else
                log_error "Namespace required for deployment"
                return 1
            fi
        fi
    fi
}
