#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${ROOT_DIR}/app"
JAR_PATH="${APP_DIR}/server/lens-server.jar"
PID_FILE="${APP_DIR}/server/lens-server.pid"
LOG_FILE="${APP_DIR}/server/lens-server.log"
STOP_TIMEOUT="${STOP_TIMEOUT:-30}"

usage() {
  echo "用法: $0 {start|stop|restart|status}"
}

read_pid() {
  [[ -f "${PID_FILE}" ]] && tr -d '[:space:]' < "${PID_FILE}"
}

is_lens_process() {
  local pid="$1"
  local command
  [[ "${pid}" =~ ^[0-9]+$ ]] || return 1
  kill -0 "${pid}" 2>/dev/null || return 1
  command="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
  [[ "${command}" == *"lens-server.jar"* ]]
}

start() {
  local pid
  local -a java_opts=()
  local -a app_args=()
  local -a launch_command=(java)

  if [[ ! -s "${JAR_PATH}" ]]; then
    echo "未找到后端包，请先执行 ./build.sh" >&2
    exit 1
  fi

  pid="$(read_pid || true)"
  if [[ -n "${pid}" ]] && is_lens_process "${pid}"; then
    echo "Lens 已在运行，PID=${pid}"
    return
  fi
  rm -f -- "${PID_FILE}"

  if [[ -n "${JAVA_OPTS:-}" ]]; then
    read -r -a java_opts <<< "${JAVA_OPTS}"
    launch_command+=("${java_opts[@]}")
  fi
  launch_command+=(-jar "server/lens-server.jar")
  if [[ -n "${APP_ARGS:-}" ]]; then
    read -r -a app_args <<< "${APP_ARGS}"
    launch_command+=("${app_args[@]}")
  fi

  (
    cd "${APP_DIR}"
    nohup "${launch_command[@]}" >> "server/lens-server.log" 2>&1 &
    echo "$!" > "server/lens-server.pid"
  )

  pid="$(read_pid)"
  sleep 1
  if ! kill -0 "${pid}" 2>/dev/null; then
    rm -f -- "${PID_FILE}"
    echo "Lens 启动失败，请查看日志: ${LOG_FILE}" >&2
    exit 1
  fi
  echo "Lens 已启动，PID=${pid}，日志=${LOG_FILE}"
}

stop() {
  local pid
  local waited=0

  pid="$(read_pid || true)"
  if [[ -z "${pid}" ]]; then
    echo "Lens 未运行"
    return
  fi
  if ! is_lens_process "${pid}"; then
    rm -f -- "${PID_FILE}"
    echo "Lens 未运行，已清理失效 PID 文件"
    return
  fi

  kill "${pid}"
  while is_lens_process "${pid}" && (( waited < STOP_TIMEOUT )); do
    sleep 1
    (( waited += 1 ))
  done

  if is_lens_process "${pid}"; then
    echo "优雅停止超时，强制终止 PID=${pid}" >&2
    kill -KILL "${pid}"
  fi
  rm -f -- "${PID_FILE}"
  echo "Lens 已停止"
}

status() {
  local pid
  pid="$(read_pid || true)"
  if [[ -n "${pid}" ]] && is_lens_process "${pid}"; then
    echo "Lens 正在运行，PID=${pid}"
    return
  fi
  [[ -z "${pid}" ]] || rm -f -- "${PID_FILE}"
  echo "Lens 未运行"
  return 1
}

case "${1:-}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    stop
    start
    ;;
  status)
    status
    ;;
  *)
    usage
    exit 1
    ;;
esac
