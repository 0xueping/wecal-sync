import zipfile, os

excluded_dirs = {'.git', 'backup-core', 'dist', 'docs', 'node_modules', 'scripts', 'privacy', 'store-screenshots', '__pycache__'}
excluded_ext = {'.psd', '.ai', '.bak', '.original.js'}
excluded_files = {'.DS_Store', 'Thumbs.db', '.gitkeep', 'pack-clean.sh'}

with zipfile.ZipFile('dist/wecal-sync-v1.0.0-clean.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('.'):
        rel = os.path.relpath(root, '.')
        parts = rel.replace(os.sep, '/').split('/')
        
        # 跳过排除目录
        if any(p in excluded_dirs for p in parts):
            continue
        
        for f in files:
            if f in excluded_files or any(f.endswith(e) for e in excluded_ext):
                continue
            fp = os.path.join(root, f)
            arcname = os.path.relpath(fp, '.')
            zf.write(fp, arcname)

    names = zf.namelist()
    print(f'Total: {len(names)} files')
    for n in sorted(names):
        if n.startswith('.'):
            continue
        print(f'  {n}')
