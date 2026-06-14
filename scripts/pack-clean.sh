#!/bin/bash
# WeCal Sync - 打包干净版（上架用），自动保留上一版
# 用法: bash scripts/pack-clean.sh

set -e

VERSION="v1.0.0"
DIST="dist"
SRC="."

# 1. 如果已有 clean.zip，先备份带时间戳
OLD_ZIP="$DIST/wecal-sync-$VERSION-clean.zip"
if [ -f "$OLD_ZIP" ]; then
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    cp "$OLD_ZIP" "$DIST/wecal-sync-$VERSION-clean.$TIMESTAMP.zip"
    echo "  ⏺ 备份旧版: wecal-sync-$VERSION-clean.$TIMESTAMP.zip"
fi

# 2. 临时还原原始核心文件
cp backup-core/caldav-client.original.js background/caldav-client.js
cp backup-core/sync-engine.original.js background/sync-engine.js
cp backup-core/xml-utils.original.js common/xml-utils.js

# 3. 打包
python3 -c "
import sys
sys.path.insert(0, '.')
import json
with open('scripts/pack.py','r') as f:
    code = f.read()
code = code.replace(\"f'wecal-sync-v{version}.zip'\", \"f'wecal-sync-v{version}-clean.zip'\")
with open('scripts/pack_clean.py','w') as f:
    f.write(code)
"
python3 scripts/pack_clean.py
rm scripts/pack_clean.py

echo ""
echo "  ✅ 打包完成: $DIST/wecal-sync-$VERSION-clean.zip"

# 4. 恢复混码
node scripts/obfuscate-core.js > /dev/null 2>&1
echo "  🔒 混码已恢复"
