#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "运行后端测试"
(cd "$repo_dir/backend" && mvn test)

echo "运行前端代码检查"
(cd "$repo_dir/frontend" && pnpm lint)

echo "运行前端类型检查"
(cd "$repo_dir/frontend" && pnpm type-check)

echo "运行前端测试"
(cd "$repo_dir/frontend" && pnpm test)

echo "全部检查通过"
