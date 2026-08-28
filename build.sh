#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${ROOT_DIR}/app"
STAGE_DIR="${ROOT_DIR}/.app-build-$$"
BUILD_TARGET="${1:-all}"
REQUIRED_JAVA_MAJOR=21
REQUIRED_MAVEN_VERSION=3.6.3
REQUIRED_NODE_VERSION=20.12.1
REQUIRED_PNPM_VERSION=9.0.0

cleanup() {
  rm -rf -- "${STAGE_DIR}"
}
trap cleanup EXIT

fail() {
  echo "环境校验失败: $*" >&2
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "缺少命令 $1"
  fi
}

version_at_least() {
  local current="${1#v}"
  local required="${2#v}"
  local current_major current_minor current_patch
  local required_major required_minor required_patch

  if [[ ! "${current}" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+) ]]; then
    return 1
  fi
  current_major="${BASH_REMATCH[1]}"
  current_minor="${BASH_REMATCH[2]}"
  current_patch="${BASH_REMATCH[3]}"

  if [[ ! "${required}" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+) ]]; then
    return 1
  fi
  required_major="${BASH_REMATCH[1]}"
  required_minor="${BASH_REMATCH[2]}"
  required_patch="${BASH_REMATCH[3]}"

  if (( current_major != required_major )); then
    (( current_major > required_major ))
    return
  fi
  if (( current_minor != required_minor )); then
    (( current_minor > required_minor ))
    return
  fi
  (( current_patch >= required_patch ))
}

check_backend_environment() {
  local java_spec_version
  local javac_output javac_version javac_major
  local maven_output maven_header maven_version maven_java_version maven_java_major
  local line

  echo "校验后端构建环境"
  for command_name in java javac mvn; do
    require_command "${command_name}"
  done

  java_spec_version="$(
    java -XshowSettings:properties -version 2>&1 \
      | awk '$1 == "java.specification.version" { print $3; exit }'
  )"
  [[ "${java_spec_version}" == "${REQUIRED_JAVA_MAJOR}" ]] \
    || fail "需要 JDK ${REQUIRED_JAVA_MAJOR}，当前 java=${java_spec_version:-未知}"

  javac_output="$(javac -version 2>&1)" || fail "javac 无法执行"
  javac_version="${javac_output#javac }"
  javac_major="${javac_version%%.*}"
  [[ "${javac_major}" == "${REQUIRED_JAVA_MAJOR}" ]] \
    || fail "需要 JDK ${REQUIRED_JAVA_MAJOR}，当前 javac=${javac_version}"

  maven_output="$(mvn -version 2>&1)" || fail "Maven 无法执行"
  maven_header="${maven_output%%$'\n'*}"
  maven_version="${maven_header#Apache Maven }"
  maven_version="${maven_version%% *}"
  version_at_least "${maven_version}" "${REQUIRED_MAVEN_VERSION}" \
    || fail "需要 Maven >= ${REQUIRED_MAVEN_VERSION}，当前=${maven_version}"

  maven_java_version=""
  while IFS= read -r line; do
    case "${line}" in
      "Java version:"*)
        maven_java_version="${line#Java version: }"
        maven_java_version="${maven_java_version%%,*}"
        break
        ;;
    esac
  done <<< "${maven_output}"
  maven_java_major="${maven_java_version%%.*}"
  [[ "${maven_java_major}" == "${REQUIRED_JAVA_MAJOR}" ]] \
    || fail "Maven 必须使用 JDK ${REQUIRED_JAVA_MAJOR}，当前=${maven_java_version:-未知}"

  echo "后端环境检查通过: JDK ${java_spec_version}, Maven ${maven_version}"
}

check_frontend_environment() {
  local node_version pnpm_version

  echo "校验前端构建环境"
  for command_name in node pnpm; do
    require_command "${command_name}"
  done

  node_version="$(node --version 2>&1)" || fail "Node.js 无法执行"
  version_at_least "${node_version}" "${REQUIRED_NODE_VERSION}" \
    || fail "需要 Node.js >= ${REQUIRED_NODE_VERSION}，当前=${node_version}"

  pnpm_version="$(pnpm --version 2>&1)" || fail "pnpm 无法执行"
  version_at_least "${pnpm_version}" "${REQUIRED_PNPM_VERSION}" \
    || fail "需要 pnpm >= ${REQUIRED_PNPM_VERSION}，当前=${pnpm_version}"

  echo "前端环境检查通过: Node.js ${node_version#v}, pnpm ${pnpm_version}"
}

build_backend() {
  echo "构建后端"
  (
    cd "${ROOT_DIR}/backend"
    mvn -DskipTests clean package
  )
}

build_frontend() {
  echo "构建前端"
  (
    cd "${ROOT_DIR}/frontend"
    CI=1 pnpm install --frozen-lockfile
    pnpm build
  )
}

stage_backend() {
  mkdir -p "${APP_DIR}/config" "${APP_DIR}/server" "${STAGE_DIR}"
  cp "${ROOT_DIR}/backend/src/main/resources/application.yml" \
    "${STAGE_DIR}/application.yml"
  cp "${ROOT_DIR}/backend/target/lens-server.jar" \
    "${STAGE_DIR}/lens-server.jar"
  mv -f "${STAGE_DIR}/application.yml" "${APP_DIR}/config/application.yml"
  mv -f "${STAGE_DIR}/lens-server.jar" "${APP_DIR}/server/lens-server.jar"
}

stage_frontend() {
  mkdir -p "${STAGE_DIR}/ui" "${APP_DIR}"
  cp -R "${ROOT_DIR}/frontend/dist/." "${STAGE_DIR}/ui/"
  rm -rf -- "${APP_DIR}/ui"
  mv "${STAGE_DIR}/ui" "${APP_DIR}/ui"
}

if (( $# > 1 )); then
  fail "用法: ./build.sh [all|frontend|backend]"
fi

case "${BUILD_TARGET}" in
  all)
    check_backend_environment
    check_frontend_environment
    build_backend
    build_frontend
    rm -rf -- "${APP_DIR}"
    stage_backend
    stage_frontend
    ;;
  backend)
    check_backend_environment
    build_backend
    stage_backend
    ;;
  frontend)
    check_frontend_environment
    build_frontend
    stage_frontend
    ;;
  *)
    fail "未知构建目标 ${BUILD_TARGET}，可选: all、frontend、backend"
    ;;
esac

rm -rf -- "${STAGE_DIR}"
trap - EXIT

echo "${BUILD_TARGET} 构建完成: ${APP_DIR}"
