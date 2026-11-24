import json, re, subprocess, sys
files = sys.argv[1:]
out = subprocess.run('npm exec --yes --package=pnpm@11.25.0 -- pnpm exec eslint ' + ' '.join(files) + ' --format json', shell=True, capture_output=True, text=True).stdout
start = out.index('[')
data = json.loads(out[start:])
for f in data:
    names = set()
    for m in f['messages']:
        mm = re.match(r"'(\w+)' is (defined|assigned a value) but never used", m['message'])
        if mm: names.add(mm.group(1))
    if not names: continue
    s = open(f['filePath'], encoding='utf-8').read()
    def fix(match):
        items = [x.strip() for x in match.group(1).split(',') if x.strip()]
        keep = [x for x in items if x.replace('type ', '') not in names]
        if not keep: return ''
        return 'import { ' + ', '.join(keep) + ' } from ' + match.group(2) + ';'
    s = re.sub(r'import \{([^}]*)\} from ("[^"]+");', fix, s)
    def fix_destructure(match):
        items = [x.strip() for x in match.group(1).split(',') if x.strip()]
        keep = [x for x in items if x not in names]
        return 'const { ' + ', '.join(keep) + ' } = ' + match.group(2)
    s = re.sub(r'const \{([^}]*)\} = (use\w+\()', fix_destructure, s)
    open(f['filePath'], 'w', encoding='utf-8').write(s)
    print(sorted(names))
