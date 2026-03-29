import os, sys

base = sys.argv[1]

replacements = {
    os.path.join(base, 'apps', 'wind', 'src', 'App.jsx'): [
        ("import { ErrorBoundary } from './components/ErrorBoundary';",
         "import { ErrorBoundary } from '@utahwind/ui';"),
    ],
    os.path.join(base, 'apps', 'wind', 'src', 'components', 'Dashboard.jsx'): [
        ("import Modal from './Modal';",
         "import { Modal } from '@utahwind/ui';"),
        ("import { SafeComponent } from './ErrorBoundary';",
         "import { SafeComponent } from '@utahwind/ui';"),
    ],
    os.path.join(base, 'apps', 'wind', 'src', 'components', 'DetailedPanels.jsx'): [
        ("import { SafeComponent } from './ErrorBoundary';",
         "import { SafeComponent } from '@utahwind/ui';"),
        ("import FactorBar from './FactorBar';",
         "import { FactorBar } from '@utahwind/ui';"),
    ],
    os.path.join(base, 'apps', 'wind', 'src', 'components', 'FlatwaterTemplate.jsx'): [
        ("import { SafeComponent } from './ErrorBoundary';",
         "import { SafeComponent } from '@utahwind/ui';"),
    ],
    os.path.join(base, 'apps', 'wind', 'src', 'components', 'WindSeekerTemplate.jsx'): [
        ("import { SafeComponent } from './ErrorBoundary';",
         "import { SafeComponent } from '@utahwind/ui';"),
    ],
    os.path.join(base, 'apps', 'wind', 'src', 'components', 'WinterRiderTemplate.jsx'): [
        ("import { SafeComponent } from './ErrorBoundary';",
         "import { SafeComponent } from '@utahwind/ui';"),
    ],
}

for filepath, pairs in replacements.items():
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    changed = False
    for old, new in pairs:
        if old in content:
            content = content.replace(old, new, 1)
            changed = True
            print(f"  OK: {os.path.basename(filepath)}: {old[:50]}...")
        else:
            print(f"  SKIP: {os.path.basename(filepath)}: not found: {old[:50]}...")
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print("All imports updated.")
