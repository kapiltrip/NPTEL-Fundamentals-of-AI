"""Copy the tested browser files into an internal static-site checkout."""
from pathlib import Path
import argparse
import shutil

GAME = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--destination', type=Path, required=True)
args = parser.parse_args()
destination = args.destination.resolve()
try:
    destination.relative_to((GAME / '.local').resolve())
except ValueError:
    parser.error('The destination must be inside game/.local/.')
files = [GAME / name for name in ['index.html', 'app.mjs', 'quiz-core.mjs', 'styles.css', 'data/questions.json']]
files += [p for name in ['figures', 'vendor'] for p in (GAME / name).rglob('*') if p.is_file()]
for source in files:
    target = (destination / source.relative_to(GAME)).resolve()
    target.relative_to(destination)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
print(f'Prepared {len(files)} static files; private state and source-building inputs are excluded.')
