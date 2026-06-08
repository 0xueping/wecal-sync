#!/usr/bin/env python3
"""
WeCal Sync - Chrome Extension Pack Script
Usage: python pack.py
Output: ../dist/wecal-sync-v{VERSION}.zip
"""
import json, os, zipfile

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    dist_dir = os.path.join(project_dir, 'dist')
    os.makedirs(dist_dir, exist_ok=True)

    # Read version
    manifest_path = os.path.join(project_dir, 'manifest.json')
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    version = manifest.get('version', 'unknown')

    zip_name = f'wecal-sync-v{version}.zip'
    zip_path = os.path.join(dist_dir, zip_name)

    # Directories/files to include (traverse recursively)
    include_dirs = ['_locales', 'icons', 'ui', 'background', 'common',
                    'content_scripts', 'features', 'lib']
    include_files = ['manifest.json', 'content.js']

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for fname in include_files:
            fpath = os.path.join(project_dir, fname)
            if os.path.isfile(fpath):
                zf.write(fpath, fname)
                print(f'  + {fname}')

        for dname in include_dirs:
            dpath = os.path.join(project_dir, dname)
            if not os.path.isdir(dpath):
                print(f'  - {dname}/ (not found, skipped)')
                continue
            for root, dirs, files in os.walk(dpath):
                # Exclude backup files from production zip
                files = [f for f in files if not f.endswith('.bak')]
                for f in files:
                    full = os.path.join(root, f)
                    rel = os.path.relpath(full, project_dir)
                    zf.write(full, rel)
                    print(f'  + {rel}')

    size = os.path.getsize(zip_path)
    print(f'\nWeCal Sync v{version} Packed Successfully!')
    print(f'Output: {zip_path}')
    print(f'Size:   {size:,} bytes ({size/1024:.1f} KB)')

if __name__ == '__main__':
    main()
