import zipfile

with zipfile.ZipFile('dist/wecal-sync-v1.0.0-clean.zip', 'r') as zf:
    ai = zf.read('features/create/ai-handler.js').decode('utf-8')
    
    # Check 401 handling
    if 'status === 401' in ai:
        print('✅ 401 check present')
    elif '401' in ai:
        lines = [l.strip() for l in ai.split('\n') if '401' in l]
        for l in lines:
            print(f'  401 line: {l[:100]}')
    else:
        print('❌ 401 NOT FOUND')
    
    # Check extractJSON
    if 'function extractJSON' in ai:
        print('✅ extractJSON function present')
    
    # Check for template literal backslash issues
    import re
    issues = []
    for i, line in enumerate(ai.split('\n'), 1):
        # Check for backslash followed by backtick (escaped template literal)
        if '\\' in line and '`' in line:
            # This is likely a false positive in regex patterns
            pass
    
    # Check the response handling section
    if 'let parsed = extractJSON(raw)' in ai:
        print('✅ extractJSON used in parseWithAI')
    
    # Show the parse section
    lines = ai.split('\n')
    for i, line in enumerate(lines):
        if 'extractJSON' in line or '401' in line:
            print(f'  L{i+1}: {line.strip()[:120]}')
