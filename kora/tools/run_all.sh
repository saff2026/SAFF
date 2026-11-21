#!/usr/bin/env bash
# يبني بيانات «تحدّي الكورة» من الصفر: Wikidata + Wikipedia -> kora/data/kora.json
set -euo pipefail
cd "$(dirname "$0")"
python3 -u build_data.py
python3 -u build_stage2.py
python3 -u build_stage3.py
python3 -u build_final.py
python3 -u check_data.py
