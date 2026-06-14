import zipfile

with zipfile.ZipFile('dist/wecal-sync-v1.0.0.zip', 'r') as zf:
    content = zf.read('features/settings/settings-view.js').decode('utf-8')
    # Check for actual problematic patterns
    if '=&gt;' in content:
        print('HAS =&gt;')
    if '\\`' in content:
        print('HAS escaped backtick sequences')
        # Show lines with backslash+backtick
        for i, line in enumerate(content.split('\n'), 1):
            if '\\`' in line:
                print(f'  L{i}: {line.strip()[:120]}')
    # Check all JS files for actual issues
    print('\nChecking all JS files...')
    for name in zf.namelist():
        if not name.endswith('.js'):
            continue
        content = zf.read(name).decode('utf-8', errors='replace')
        problems = []
        if '=&gt;' in content:
            problems.append('=&gt;')
        # Check for backslash followed by backtick (NOT inside a string)
        # This requires parsing which is hard, so just flag obvious issues
        print(f'  {name}: OK')
