import argparse
import re
import shutil
import sqlite3
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable


MOJIBAKE_TOKEN_PATTERN = re.compile(r"Â|Ã.|â[\x80-\xff\u0080-\uffff]?", re.DOTALL)
SEVERE_MOJIBAKE_RUN_PATTERN = re.compile(r"[ÃÂâ€š‚ƒÆ†’‘“”„¢¬…Å¡¯¿½œŒ¢£¤¥¦§¨©ª«®¯°±²³´µ¶·¸¹º»¼½¾ÀÁÄÄÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞß]{6,}")

COMMON_REPLACEMENTS = {
    "â€œ": "“",
    "â€\x9c": "“",
    "â€": "“",
    "â‚¬Å“": "“",
    "â€�": "”",
    "â€\x9d": "”",
    "â€": "”",
    "â‚¬ï¿½": "”",
    "â‚¬Â": "”",
    "â€™": "’",
    "â€\x99": "’",
    "â€": "’",
    "â‚¬â„¢": "’",
    "â€˜": "‘",
    "â€\x98": "‘",
    "â€˜": "‘",
    "â‚¬Ëœ": "‘",
    "â€”": "—",
    "â€\x94": "—",
    "â€": "—",
    "â‚¬â€": "—",
    "â€“": "–",
    "â€\x93": "–",
    "â‚¬â€œ": "–",
    "â€¦": "…",
    "â€\xa6": "…",
    "â‚¬Â¦": "…",
    "â€¢": "•",
    "Â\xa0": "\xa0",
    "Â ": " ",
    "Â": "",
}


def _apply_common_replacements(text: str) -> str:
    repaired = text
    for source, replacement in COMMON_REPLACEMENTS.items():
        repaired = repaired.replace(source, replacement)
    return repaired


def _collapse_severe_mojibake_run(match: re.Match[str]) -> str:
    value = match.group(0)
    if any(marker in value for marker in ("\u0153", "\u0152", "\u00c5\u201c", "\u00e2\u20ac\u0153")):
        return "“"
    if any(marker in value for marker in ("\u2122", "\u20ac\u2122", "\u00e2\u20ac\u2122")):
        return "’"
    if any(marker in value for marker in ("\u201d", "\u00bd", "\u00bf", "\u00ef\u00bf\u00bd", "\u00e2\u20ac\u009d")):
        return "”"
    if any(marker in value for marker in ("\u2014", "\u0094", "\u00e2\u20ac\u201d")):
        return "—"
    if any(marker in value for marker in ("\u2013", "\u201c", "\u00e2\u20ac\u201c")):
        return "–"
    if any(marker in value for marker in ("\u2026", "\u00a6", "\u00e2\u20ac\u00a6")):
        return "…"
    return ""


def _collapse_severe_mojibake_runs(text: str) -> str:
    return SEVERE_MOJIBAKE_RUN_PATTERN.sub(_collapse_severe_mojibake_run, text)


def _repair_quote_like_dashes(text: str) -> str:
    repaired = re.sub(r"(?<![\w\]])–(?=[^\s])", "“", text)
    return re.sub(r"(?<![\w\]])– (?=[A-Z])", "“ ", repaired)


@dataclass
class DocumentRow:
    id: str
    title: str
    content: str
    folder_path: str | None
    created_at: str
    updated_at: str


@dataclass
class RepairPreview:
    document: DocumentRow
    repaired_content: str
    suspicious_count: int
    samples: list[dict[str, str]]

    @property
    def would_change(self) -> bool:
        return self.document.content != self.repaired_content


def _decode_cp1252_utf8_chunk(value: str) -> str:
    try:
        repaired = value.encode("cp1252").decode("utf-8")
    except UnicodeError:
        if count_suspicious_sequences(value) == 0:
            return value
        try:
            repaired = value.encode("cp1252", errors="replace").decode("utf-8", errors="replace")
        except UnicodeError:
            return value
        if count_suspicious_sequences(repaired) >= count_suspicious_sequences(value):
            return value
        return repaired
    if count_suspicious_sequences(repaired) > count_suspicious_sequences(value):
        return value
    return repaired


def _is_cp1252_encodable(character: str) -> bool:
    try:
        character.encode("cp1252")
    except UnicodeError:
        return False
    return True


def _decode_cp1252_utf8_pass(text: str) -> str:
    parts: list[str] = []
    chunk: list[str] = []

    def flush_chunk() -> None:
        if not chunk:
            return
        value = "".join(chunk)
        parts.append(_decode_cp1252_utf8_chunk(value))
        chunk.clear()

    for character in text:
        if _is_cp1252_encodable(character):
            chunk.append(character)
        else:
            flush_chunk()
            parts.append(character)
    flush_chunk()
    return "".join(parts)


def repair_mojibake_text(text: str) -> str:
    repaired = text
    for _ in range(8):
        current = _collapse_severe_mojibake_runs(_apply_common_replacements(repaired))
        decoded = _decode_cp1252_utf8_pass(current)
        decoded = _repair_quote_like_dashes(_collapse_severe_mojibake_runs(_apply_common_replacements(decoded)))
        if decoded == repaired:
            return decoded
        repaired = decoded
    return _repair_quote_like_dashes(_collapse_severe_mojibake_runs(_apply_common_replacements(repaired)))


def count_suspicious_sequences(text: str) -> int:
    return len(MOJIBAKE_TOKEN_PATTERN.findall(text))


def build_samples(original: str, repaired: str, limit: int = 6, radius: int = 80) -> list[dict[str, str]]:
    samples: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    last_sample_end = -1
    for match in MOJIBAKE_TOKEN_PATTERN.finditer(original):
        if match.start() < last_sample_end:
            continue
        start = max(0, match.start() - radius)
        end = min(len(original), match.end() + radius)
        before = original[start:end]
        after = repair_mojibake_text(before)
        key = (before, after)
        if key in seen:
            continue
        seen.add(key)
        samples.append({"before": before, "after": after})
        last_sample_end = end
        if len(samples) >= limit:
            break
    return samples


def connect_project(path: Path, read_only: bool) -> sqlite3.Connection:
    resolved = path.resolve()
    if read_only:
        uri = resolved.as_uri() + "?mode=ro"
        return sqlite3.connect(uri, uri=True)
    return sqlite3.connect(resolved)


def find_document(conn: sqlite3.Connection, *, title: str | None = None, document_id: str | None = None) -> DocumentRow:
    if not title and not document_id:
        raise ValueError("Provide --title or --document-id.")

    cursor = conn.cursor()
    if document_id:
        cursor.execute(
            """
            SELECT id, title, content_json, folder_path, created_at, updated_at
            FROM documents
            WHERE id = ?
            """,
            (document_id,),
        )
    else:
        cursor.execute(
            """
            SELECT id, title, content_json, folder_path, created_at, updated_at
            FROM documents
            WHERE title = ?
            ORDER BY updated_at DESC
            """,
            (title,),
        )

    rows = cursor.fetchall()
    if not rows:
        target = document_id if document_id else title
        raise ValueError(f"Document not found: {target}")
    if len(rows) > 1 and title and not document_id:
        raise ValueError(f"Multiple documents named {title!r}; rerun with --document-id.")

    row = rows[0]
    return DocumentRow(
        id=row[0],
        title=row[1],
        content=row[2] or "",
        folder_path=row[3],
        created_at=row[4],
        updated_at=row[5],
    )


def preview_document_repair(project_path: Path, *, title: str | None = None, document_id: str | None = None) -> RepairPreview:
    with connect_project(project_path, read_only=True) as conn:
        document = find_document(conn, title=title, document_id=document_id)
    repaired = repair_mojibake_text(document.content)
    return RepairPreview(
        document=document,
        repaired_content=repaired,
        suspicious_count=count_suspicious_sequences(document.content),
        samples=build_samples(document.content, repaired),
    )


def timestamped_backup_path(project_path: Path, now: Callable[[], datetime] = datetime.now) -> Path:
    timestamp = now().strftime("%Y%m%d-%H%M%S")
    backup_path = project_path.with_name(f"{project_path.name}.bak-{timestamp}")
    if not backup_path.exists():
        return backup_path
    suffix = 1
    while True:
        candidate = project_path.with_name(f"{project_path.name}.bak-{timestamp}-{suffix}")
        if not candidate.exists():
            return candidate
        suffix += 1


def apply_document_repair(
    project_path: Path,
    *,
    title: str | None = None,
    document_id: str | None = None,
    backup_copy: Callable[[Path, Path], object] = shutil.copy2,
    now: Callable[[], datetime] = datetime.now,
) -> tuple[RepairPreview, Path]:
    preview = preview_document_repair(project_path, title=title, document_id=document_id)
    backup_path = timestamped_backup_path(project_path, now)
    backup_copy(project_path, backup_path)

    if not preview.would_change:
        return preview, backup_path

    with connect_project(project_path, read_only=False) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE documents
            SET content_json = ?
            WHERE id = ?
            """,
            (preview.repaired_content, preview.document.id),
        )
        if cursor.rowcount != 1:
            raise RuntimeError(f"Document update failed for {preview.document.id}")
        conn.commit()

    return preview, backup_path


def print_preview(preview: RepairPreview) -> None:
    print(f"Document: {preview.document.title} ({preview.document.id})")
    print(f"Suspicious sequences: {preview.suspicious_count}")
    print(f"Would change: {'yes' if preview.would_change else 'no'}")
    if not preview.samples:
        print("Samples: none")
        return
    print("Samples:")
    for index, sample in enumerate(preview.samples, start=1):
        print(f"\n[{index}] before:")
        print(sample["before"])
        print(f"[{index}] after:")
        print(sample["after"])


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Preview or repair mojibake in one Worldie document.")
    parser.add_argument("project", help="Path to the .worldie project file.")
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--title", help="Document title to repair.")
    target.add_argument("--document-id", help="Document ID to repair.")
    parser.add_argument("--apply", action="store_true", help="Write the repair after creating a timestamped backup.")
    args = parser.parse_args()

    project_path = Path(args.project)
    if not project_path.exists():
        raise FileNotFoundError(project_path)

    if args.apply:
        preview, backup_path = apply_document_repair(
            project_path,
            title=args.title,
            document_id=args.document_id,
        )
        print_preview(preview)
        print(f"\nBackup: {backup_path}")
        print("Applied: yes" if preview.would_change else "Applied: no changes needed")
    else:
        preview = preview_document_repair(
            project_path,
            title=args.title,
            document_id=args.document_id,
        )
        print_preview(preview)
        print("\nDry run only. Rerun with --apply to write after backup.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
