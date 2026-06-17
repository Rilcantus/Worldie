import json
import os
import re
import sqlite3
import shutil
import tempfile
import uuid
from datetime import datetime

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTRY_DB_PATH = os.path.join(ROOT_DIR, "db", "projects_registry.db")
PROJECTS_DIR = os.path.join(ROOT_DIR, "projects")
OMITTED = object()
SURROGATE_PATTERN = re.compile(r"[\ud800-\udfff]")


def _now_iso():
    return datetime.now().isoformat()


def _ensure_parent_dir(path):
    parent_dir = os.path.dirname(path)
    if not parent_dir:
        return
    os.makedirs(parent_dir, exist_ok=True)


def _sanitize_text_for_storage(value):
    if isinstance(value, str):
        return SURROGATE_PATTERN.sub("\ufffd", value)
    return value


def _sanitize_text_values(*values):
    return tuple(_sanitize_text_for_storage(value) for value in values)


def _registry_conn():
    _ensure_parent_dir(REGISTRY_DB_PATH)
    return sqlite3.connect(REGISTRY_DB_PATH)


def _project_conn(db_path, create_if_missing=False):
    if not db_path:
        raise FileNotFoundError("Project file not found for requested project.")
    resolved_path = os.path.abspath(db_path)
    if not create_if_missing and not os.path.exists(resolved_path):
        raise FileNotFoundError(resolved_path)
    _ensure_parent_dir(resolved_path)
    return sqlite3.connect(resolved_path)


def _ensure_column(conn, table, column, col_type):
    c = conn.cursor()
    c.execute(f"PRAGMA table_info({table})")
    existing = {row[1] for row in c.fetchall()}
    if column not in existing:
        c.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        conn.commit()


def _ensure_unique_index(conn, table, column, index_name):
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?", (index_name,))
    if c.fetchone() is None:
        c.execute(f"CREATE UNIQUE INDEX IF NOT EXISTS {index_name} ON {table} ({column})")
        conn.commit()


def _update_partial(conn, table, id_column, id_value, updates):
    assignments = []
    values = []
    for column, value in updates:
        if value is OMITTED:
            continue
        assignments.append(f"{column} = ?")
        values.append(_sanitize_text_for_storage(value))
    assignments.append("updated_at = ?")
    values.append(_now_iso())
    values.append(id_value)
    c = conn.cursor()
    c.execute(
        f"""
        UPDATE {table}
        SET {", ".join(assignments)}
        WHERE {id_column} = ?
        """,
        values,
    )
    return c.rowcount


def _init_registry_db():
    conn = _registry_conn()
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY,
            uuid TEXT UNIQUE,
            title TEXT NOT NULL,
            filepath TEXT NOT NULL,
            last_edited TEXT NOT NULL,
            created_at TEXT
        )
        """
    )
    conn.commit()
    _ensure_column(conn, "projects", "uuid", "TEXT")
    _ensure_column(conn, "projects", "created_at", "TEXT")
    _ensure_unique_index(conn, "projects", "uuid", "idx_projects_uuid_unique")
    conn.close()


def _init_project_db(db_path, create_if_missing=False):
    conn = _project_conn(db_path, create_if_missing=create_if_missing)
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS project_meta (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            title TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS worlds (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS lore_pages (
            id TEXT PRIMARY KEY,
            world_id TEXT NOT NULL,
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            tags_json TEXT,
            fields_json TEXT,
            cover_image_path TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            world_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content_json TEXT,
            folder_path TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS relationships (
            id TEXT PRIMARY KEY,
            world_id TEXT NOT NULL,
            from_id TEXT NOT NULL,
            to_id TEXT NOT NULL,
            type TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS timeline_events (
            id TEXT PRIMARY KEY,
            world_id TEXT NOT NULL,
            title TEXT NOT NULL,
            date_text TEXT,
            event_type TEXT,
            linked_page_id TEXT,
            description TEXT,
            links_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS custom_field_schemas (
            id TEXT PRIMARY KEY,
            world_id TEXT NOT NULL,
            name TEXT NOT NULL,
            schema_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS lore_table_views (
            id TEXT PRIMARY KEY,
            world_id TEXT NOT NULL,
            name TEXT NOT NULL,
            lore_type_id TEXT,
            quick_filter TEXT,
            sort_key TEXT,
            sort_direction TEXT,
            visible_columns_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS lore_types (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            icon TEXT,
            field_definitions_json TEXT,
            display_order INTEGER NOT NULL,
            is_system INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS lore_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            lore_type_id TEXT NOT NULL,
            trait_definitions_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    _ensure_column(conn, "relationships", "notes", "TEXT")
    _ensure_column(conn, "relationships", "updated_at", "TEXT")
    _ensure_column(conn, "timeline_events", "event_type", "TEXT")
    _ensure_column(conn, "timeline_events", "linked_page_id", "TEXT")
    _ensure_column(conn, "lore_types", "icon", "TEXT")
    _ensure_column(conn, "lore_types", "field_definitions_json", "TEXT")
    _ensure_column(conn, "lore_table_views", "visible_columns_json", "TEXT")
    c.execute("SELECT id FROM project_meta WHERE id = 1")
    if c.fetchone() is None:
        now = _now_iso()
        c.execute(
            "INSERT INTO project_meta (id, title, created_at, updated_at) VALUES (1, ?, ?, ?)",
            ("Untitled Project", now, now),
        )
        conn.commit()
    conn.close()


def init_db():
    _init_registry_db()


def _slugify(value):
    slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or "project"


def _resolve_project_db_path(project_uuid, title, filepath):
    if filepath:
        resolved = filepath
    else:
        resolved = os.path.join(PROJECTS_DIR, f"{_slugify(title)}-{project_uuid[:8]}.worldie")
    return os.path.abspath(resolved)


def _normalize_filepath_for_match(filepath):
    return os.path.normcase(os.path.abspath(filepath))


def _timestamped_backup_path(filepath):
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    base_backup_path = f"{filepath}.bak-{timestamp}"
    backup_path = base_backup_path
    suffix = 1
    while os.path.exists(backup_path):
        suffix += 1
        backup_path = f"{base_backup_path}-{suffix}"
    return backup_path


def _copy_project_file_safely(source_path, destination_path):
    _ensure_parent_dir(destination_path)
    destination_dir = os.path.dirname(destination_path) or "."
    temp_path = None
    backup_path = None
    try:
        with tempfile.NamedTemporaryFile(
            prefix=f".{os.path.basename(destination_path)}.",
            suffix=".tmp",
            dir=destination_dir,
            delete=False,
        ) as temp_file:
            temp_path = temp_file.name
        shutil.copy2(source_path, temp_path)
        if os.path.exists(destination_path):
            backup_path = _timestamped_backup_path(destination_path)
            shutil.copy2(destination_path, backup_path)
        os.replace(temp_path, destination_path)
        temp_path = None
        return backup_path
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def _safe_export_name(value, fallback="untitled"):
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]+', "-", str(value or "").strip())
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .-")
    return cleaned or fallback


def _safe_export_segments(value):
    if not value:
        return []
    segments = re.split(r"[\\/]+", str(value))
    return [_safe_export_name(segment, "") for segment in segments if _safe_export_name(segment, "")]


def _dedupe_export_path(directory, filename, used_paths):
    stem, ext = os.path.splitext(filename)
    candidate = filename
    suffix = 2
    while os.path.normcase(os.path.abspath(os.path.join(directory, candidate))) in used_paths:
        candidate = f"{stem}-{suffix}{ext}"
        suffix += 1
    resolved = os.path.abspath(os.path.join(directory, candidate))
    used_paths.add(os.path.normcase(resolved))
    return resolved


def _dedupe_existing_export_path(directory, filename):
    stem, ext = os.path.splitext(filename)
    candidate = filename
    suffix = 2
    while os.path.exists(os.path.join(directory, candidate)):
        candidate = f"{stem}-{suffix}{ext}"
        suffix += 1
    return os.path.abspath(os.path.join(directory, candidate))


def _relative_export_path(path, root_path):
    return os.path.relpath(path, root_path).replace(os.sep, "/")


def _write_text_file(path, content):
    _ensure_parent_dir(path)
    with open(path, "w", encoding="utf-8", newline="\n") as file:
        file.write(content)


def _write_csv_file(path, content):
    _ensure_parent_dir(path)
    with open(path, "w", encoding="utf-8", newline="") as file:
        file.write(content)


def _parse_lore_fields(fields_json, field_definitions=None):
    if not fields_json:
        return [], "", []
    try:
        parsed = json.loads(fields_json)
    except (TypeError, ValueError):
        return [], "", []
    if not isinstance(parsed, dict):
        return [], "", []
    if isinstance(parsed.get("traits"), list) or "details" in parsed or "customFields" in parsed:
        traits = []
        for trait in parsed.get("traits") or []:
            if not isinstance(trait, dict):
                continue
            name = str(trait.get("name") or "Trait").strip() or "Trait"
            value = "" if trait.get("value") is None else str(trait.get("value"))
            if value.strip():
                traits.append((name, value))
        return traits, str(parsed.get("details") or ""), _parse_custom_fields(parsed.get("customFields"), field_definitions)
    traits = []
    for key, value in parsed.items():
        if key == "_details":
            continue
        if value is None or str(value).strip() == "":
            continue
        traits.append((str(key), str(value)))
    return traits, str(parsed.get("_details") or ""), []


def _parse_lore_type_field_definitions(field_definitions_json):
    if not field_definitions_json:
        return []
    try:
        parsed = json.loads(field_definitions_json)
    except (TypeError, ValueError):
        return []
    if not isinstance(parsed, list):
        return []
    definitions = []
    for index, definition in enumerate(parsed):
        if not isinstance(definition, dict):
            continue
        name = str(definition.get("name") or "Custom Field").strip() or "Custom Field"
        key = str(definition.get("key") or name).strip() or name
        definitions.append(
            {
                "name": name,
                "key": key,
                "order": definition.get("order", index),
            }
        )
    return sorted(definitions, key=lambda definition: (definition["order"], definition["name"]))


def _parse_custom_fields(custom_fields, field_definitions=None):
    if not isinstance(custom_fields, dict):
        return []
    fields = []
    used_names = set()
    for definition in field_definitions or []:
        key = definition.get("key")
        name = definition.get("name")
        if key in custom_fields:
            value = custom_fields.get(key)
            used_names.add(key)
        elif name in custom_fields:
            value = custom_fields.get(name)
            used_names.add(name)
        else:
            continue
        parsed = _format_custom_field_value(name, value)
        if parsed:
            fields.append(parsed)
    for name, value in custom_fields.items():
        if name in used_names:
            continue
        parsed = _format_custom_field_value(name, value)
        if parsed:
            fields.append(parsed)
    return fields


def _format_custom_field_value(name, value):
    label = str(name).strip()
    if not label:
        return None
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        display_value = "true" if value else "false"
    else:
        display_value = str(value)
    return (label, display_value)


def _build_document_markdown(document):
    _, _, title, content_json, folder_path, created_at, updated_at = document
    lines = [f"# {title}", ""]
    if folder_path:
        lines.extend([f"Folder: {folder_path}", ""])
    if created_at or updated_at:
        lines.extend([f"Created: {created_at or ''}", f"Updated: {updated_at or ''}", ""])
    lines.append(content_json or "")
    return "\n".join(lines).rstrip() + "\n"


def _build_lore_markdown(lore_page, field_definitions=None):
    _, _, title, page_type, tags_json, fields_json, _, created_at, updated_at = lore_page
    traits, details, custom_fields = _parse_lore_fields(fields_json, field_definitions)
    lines = [f"# {title}", "", f"Type: {page_type}"]
    if tags_json:
        lines.append(f"Tags: {tags_json}")
    if created_at or updated_at:
        lines.extend([f"Created: {created_at or ''}", f"Updated: {updated_at or ''}"])
    if custom_fields:
        lines.extend(["", "## Custom Fields", ""])
        for name, value in custom_fields:
            lines.append(f"- **{name}:** {value}")
    if traits:
        lines.extend(["", "## Traits", ""])
        for name, value in traits:
            lines.append(f"- **{name}:** {value}")
    if details:
        lines.extend(["", "## Details", "", details])
    return "\n".join(lines).rstrip() + "\n"


def _lore_title(lore_titles_by_id, lore_id):
    if not lore_id:
        return "Unlinked lore"
    return lore_titles_by_id.get(lore_id) or f"Missing lore ({lore_id})"


def _relationship_title(relationship, lore_titles_by_id):
    _, _, source_id, target_id, relation_type, _, _, _ = relationship
    source = _lore_title(lore_titles_by_id, source_id)
    target = _lore_title(lore_titles_by_id, target_id)
    if relation_type:
        return f"{source} - {relation_type} - {target}"
    return f"{source} - {target}"


def _build_relationship_markdown(relationship, lore_titles_by_id):
    _, _, source_id, target_id, relation_type, notes, created_at, updated_at = relationship
    title = _relationship_title(relationship, lore_titles_by_id)
    lines = [f"# {title}", "", f"Source: {_lore_title(lore_titles_by_id, source_id)}", f"Target: {_lore_title(lore_titles_by_id, target_id)}"]
    if relation_type:
        lines.append(f"Type: {relation_type}")
    if created_at or updated_at:
        lines.extend([f"Created: {created_at or ''}", f"Updated: {updated_at or ''}"])
    if notes:
        lines.extend(["", "## Notes", "", notes])
    return "\n".join(lines).rstrip() + "\n"


def _timeline_sort_key(event):
    date_text = event[3] or ""
    match = re.search(r"-?\d+", str(date_text))
    if not match:
        return (1, str(date_text).lower(), str(event[2]).lower(), event[0])
    return (0, int(match.group(0)), str(date_text).lower(), str(event[2]).lower(), event[0])


def _build_timeline_markdown(event, lore_titles_by_id):
    _, _, title, date_text, event_type, linked_page_id, description, created_at, updated_at = event
    lines = [f"# {title}", ""]
    if date_text:
        lines.append(f"Date: {date_text}")
    if event_type:
        lines.append(f"Type: {event_type}")
    if linked_page_id:
        lines.append(f"Linked lore: {_lore_title(lore_titles_by_id, linked_page_id)}")
    if created_at or updated_at:
        lines.extend([f"Created: {created_at or ''}", f"Updated: {updated_at or ''}"])
    if description:
        lines.extend(["", "## Details", "", description])
    return "\n".join(lines).rstrip() + "\n"


def _append_index_section(lines, title, entries, empty_message):
    lines.extend(["", f"## {title}", ""])
    if entries:
        for entry in entries:
            detail = f" - {entry['summary']}" if entry.get("summary") else ""
            lines.append(f"- [{entry['title']}]({entry['relativePath']}){detail}")
    else:
        lines.append(f"- {empty_message}")


def _build_export_index(project_title, world, document_entries, lore_entries, relationship_entries, timeline_entries):
    _, _, world_title, description, _, _ = world
    lines = [
        f"# {world_title}",
        "",
        f"Project: {project_title}",
        f"Documents: {len(document_entries)}",
        f"Lore pages: {len(lore_entries)}",
        f"Relationships: {len(relationship_entries)}",
        f"Timeline events: {len(timeline_entries)}",
    ]
    if description:
        lines.extend(["", "## World Notes", "", description])
    _append_index_section(lines, "Documents", document_entries, "No documents exported.")
    _append_index_section(lines, "Lore Pages", lore_entries, "No lore pages exported.")
    _append_index_section(lines, "Relationships", relationship_entries, "No relationships exported.")
    _append_index_section(lines, "Timeline", timeline_entries, "No timeline events exported.")
    return "\n".join(lines).rstrip() + "\n"


def _build_project_export_index(project_title, world_entries, totals):
    lines = [
        f"# {project_title}",
        "",
        f"Worlds: {totals['worldCount']}",
        f"Documents: {totals['documentCount']}",
        f"Lore pages: {totals['lorePageCount']}",
        f"Relationships: {totals['relationshipCount']}",
        f"Timeline events: {totals['timelineEventCount']}",
        "",
        "## Worlds",
        "",
    ]
    if world_entries:
        for entry in world_entries:
            summary = (
                f"{entry['documentCount']} docs, {entry['lorePageCount']} lore, "
                f"{entry['relationshipCount']} relationships, {entry['timelineEventCount']} timeline events"
            )
            lines.append(f"- [{entry['title']}]({entry['relativePath']}) - {summary}")
    else:
        lines.append("- No worlds exported.")
    return "\n".join(lines).rstrip() + "\n"


def _get_project_filepath(project_uuid):
    conn = _registry_conn()
    c = conn.cursor()
    c.execute("SELECT filepath FROM projects WHERE uuid = ?", (project_uuid,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise FileNotFoundError(f"Project not found: {project_uuid}")
    return row[0]


def _get_project_by_filepath(filepath):
    conn = _registry_conn()
    c = conn.cursor()
    c.execute("SELECT uuid, title, filepath, last_edited, created_at FROM projects")
    target = _normalize_filepath_for_match(filepath)
    row = next((item for item in c.fetchall() if _normalize_filepath_for_match(item[2]) == target), None)
    conn.close()
    return row


def _get_project_title(project_uuid):
    conn = _registry_conn()
    c = conn.cursor()
    c.execute("SELECT title FROM projects WHERE uuid = ?", (project_uuid,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise FileNotFoundError(f"Project not found: {project_uuid}")
    return row[0]


def _get_project_meta_title(db_path):
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute("SELECT title FROM project_meta WHERE id = 1")
    row = c.fetchone()
    conn.close()
    return row[0] if row and row[0] else None


def _set_project_meta_title(db_path, title):
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    now = _now_iso()
    title = _sanitize_text_for_storage(title)
    c.execute(
        """
        UPDATE project_meta
        SET title = ?, updated_at = ?
        WHERE id = 1
        """,
        (title, now),
    )
    conn.commit()
    conn.close()


def _rebind_project_entities(db_path, project_uuid):
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute("UPDATE worlds SET project_id = ?", (project_uuid,))
    conn.commit()
    conn.close()


def _touch_project(project_uuid):
    conn = _registry_conn()
    c = conn.cursor()
    c.execute("UPDATE projects SET last_edited = ? WHERE uuid = ?", (_now_iso(), project_uuid))
    conn.commit()
    conn.close()


def add_project(title, filepath):
    project_uuid = str(uuid.uuid4())
    title = _sanitize_text_for_storage(title)
    resolved_path = _resolve_project_db_path(project_uuid, title, filepath)
    if _get_project_by_filepath(resolved_path) or os.path.exists(resolved_path):
        raise ValueError("Choose a new filepath for project creation.")
    _init_project_db(resolved_path, create_if_missing=True)
    _set_project_meta_title(resolved_path, title)

    conn = _registry_conn()
    c = conn.cursor()
    now = _now_iso()
    c.execute(
        """
        INSERT INTO projects (uuid, title, filepath, last_edited, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (project_uuid, title, resolved_path, now, now),
    )
    conn.commit()
    conn.close()
    return project_uuid, resolved_path


def get_all_projects():
    conn = _registry_conn()
    c = conn.cursor()
    c.execute("SELECT uuid, title, filepath, last_edited, created_at FROM projects ORDER BY last_edited DESC")
    projects = c.fetchall()
    conn.close()
    return projects


def update_project_title(project_uuid, title):
    filepath = _get_project_filepath(project_uuid)
    title = _sanitize_text_for_storage(title)
    conn = _registry_conn()
    c = conn.cursor()
    now = _now_iso()
    c.execute("UPDATE projects SET title = ?, last_edited = ? WHERE uuid = ?", (title, now, project_uuid))
    conn.commit()
    conn.close()
    if filepath:
        _set_project_meta_title(filepath, title)


def open_project(filepath):
    resolved_path = os.path.abspath(filepath)
    if not os.path.exists(resolved_path):
        raise FileNotFoundError(resolved_path)

    existing = _get_project_by_filepath(resolved_path)
    title = _sanitize_text_for_storage(_get_project_meta_title(resolved_path))
    if not title or title == "Untitled Project":
        title = os.path.splitext(os.path.basename(resolved_path))[0]
        _set_project_meta_title(resolved_path, title)
    now = _now_iso()

    conn = _registry_conn()
    c = conn.cursor()
    if existing:
        project_uuid = existing[0]
        c.execute(
            "UPDATE projects SET title = ?, last_edited = ? WHERE uuid = ?",
            (title, now, project_uuid),
        )
    else:
        project_uuid = str(uuid.uuid4())
        c.execute(
            """
            INSERT INTO projects (uuid, title, filepath, last_edited, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (project_uuid, title, resolved_path, now, now),
        )
    conn.commit()
    conn.close()
    _rebind_project_entities(resolved_path, project_uuid)
    return project_uuid, title, resolved_path


def save_project_as(project_uuid, filepath):
    source_path = _get_project_filepath(project_uuid)
    if not source_path or not os.path.exists(source_path):
        raise FileNotFoundError(source_path or project_uuid)

    title = _get_project_meta_title(source_path) or "Untitled Project"
    resolved_path = os.path.abspath(filepath)
    if _normalize_filepath_for_match(source_path) == _normalize_filepath_for_match(resolved_path):
        raise ValueError("Choose a different project filepath for Save As.")
    _copy_project_file_safely(source_path, resolved_path)
    _init_project_db(resolved_path)
    _set_project_meta_title(resolved_path, title)
    return open_project(resolved_path)


def _fetch_world_export_data(conn, project_uuid, world_id):
    c = conn.cursor()
    c.execute(
        """
        SELECT id, project_id, title, description, created_at, updated_at
        FROM worlds
        WHERE id = ? AND project_id = ?
        """,
        (world_id, project_uuid),
    )
    world = c.fetchone()
    if not world:
        raise FileNotFoundError(f"World not found: {world_id}")
    c.execute(
        """
        SELECT id, world_id, title, content_json, folder_path, created_at, updated_at
        FROM documents
        WHERE world_id = ?
        ORDER BY title COLLATE NOCASE, id
        """,
        (world_id,),
    )
    documents = c.fetchall()
    c.execute(
        """
        SELECT id, world_id, title, type, tags_json, fields_json, cover_image_path, created_at, updated_at
        FROM lore_pages
        WHERE world_id = ?
        ORDER BY type COLLATE NOCASE, title COLLATE NOCASE, id
        """,
        (world_id,),
    )
    lore_pages = c.fetchall()
    c.execute(
        """
        SELECT name, slug, field_definitions_json
        FROM lore_types
        """
    )
    lore_types = c.fetchall()
    c.execute(
        """
        SELECT id, world_id, from_id, to_id, type, notes, created_at, updated_at
        FROM relationships
        WHERE world_id = ?
        ORDER BY type COLLATE NOCASE, id
        """,
        (world_id,),
    )
    relationships = c.fetchall()
    c.execute(
        """
        SELECT id, world_id, title, date_text, event_type, linked_page_id, description, created_at, updated_at
        FROM timeline_events
        WHERE world_id = ?
        ORDER BY title COLLATE NOCASE, id
        """,
        (world_id,),
    )
    timeline_events = c.fetchall()
    return {
        "world": world,
        "documents": documents,
        "lorePages": lore_pages,
        "loreTypes": lore_types,
        "relationships": relationships,
        "timelineEvents": timeline_events,
    }


def _write_world_markdown_export(project_title, world_data, export_path):
    os.makedirs(export_path, exist_ok=True)

    world = world_data["world"]
    documents = world_data["documents"]
    lore_pages = world_data["lorePages"]
    lore_types = world_data["loreTypes"]
    relationships = world_data["relationships"]
    timeline_events = world_data["timelineEvents"]
    used_paths = set()
    exported_files = []
    document_entries = []
    lore_entries = []
    relationship_entries = []
    timeline_entries = []
    lore_titles_by_id = {page[0]: page[2] for page in lore_pages}
    field_definitions_by_type = {}
    for name, slug, field_definitions_json in lore_types:
        definitions = _parse_lore_type_field_definitions(field_definitions_json)
        field_definitions_by_type[str(name).strip().lower()] = definitions
        field_definitions_by_type[str(slug).strip().lower()] = definitions

    documents_root = os.path.join(export_path, "Documents")
    for document in documents:
        _, _, title, _, folder_path, _, _ = document
        folder_segments = _safe_export_segments(folder_path)
        document_dir = os.path.join(documents_root, *folder_segments)
        filename = f"{_safe_export_name(title, 'document')}.md"
        file_path = _dedupe_export_path(document_dir, filename, used_paths)
        _write_text_file(file_path, _build_document_markdown(document))
        entry = {
            "kind": "document",
            "title": title,
            "path": file_path,
            "relativePath": _relative_export_path(file_path, export_path),
        }
        exported_files.append(entry)
        document_entries.append(entry)

    lore_root = os.path.join(export_path, "Lore")
    for lore_page in lore_pages:
        _, _, title, page_type, _, _, _, _, _ = lore_page
        lore_dir = os.path.join(lore_root, _safe_export_name(page_type, "Lore"))
        filename = f"{_safe_export_name(title, 'lore-page')}.md"
        file_path = _dedupe_export_path(lore_dir, filename, used_paths)
        field_definitions = field_definitions_by_type.get(str(page_type).strip().lower(), [])
        _write_text_file(file_path, _build_lore_markdown(lore_page, field_definitions))
        entry = {
            "kind": "lore",
            "title": title,
            "path": file_path,
            "relativePath": _relative_export_path(file_path, export_path),
        }
        exported_files.append(entry)
        lore_entries.append(entry)

    relationships_root = os.path.join(export_path, "Relationships")
    for relationship in relationships:
        title = _relationship_title(relationship, lore_titles_by_id)
        filename = f"{_safe_export_name(title, 'relationship')}.md"
        file_path = _dedupe_export_path(relationships_root, filename, used_paths)
        _write_text_file(file_path, _build_relationship_markdown(relationship, lore_titles_by_id))
        entry = {
            "kind": "relationship",
            "title": title,
            "path": file_path,
            "relativePath": _relative_export_path(file_path, export_path),
            "summary": relationship[4] or "",
        }
        exported_files.append(entry)
        relationship_entries.append(entry)

    timeline_root = os.path.join(export_path, "Timeline")
    for event in sorted(timeline_events, key=_timeline_sort_key):
        _, _, title, date_text, _, linked_page_id, _, _, _ = event
        filename = f"{_safe_export_name(title, 'timeline-event')}.md"
        file_path = _dedupe_export_path(timeline_root, filename, used_paths)
        _write_text_file(file_path, _build_timeline_markdown(event, lore_titles_by_id))
        entry = {
            "kind": "timeline",
            "title": title,
            "path": file_path,
            "relativePath": _relative_export_path(file_path, export_path),
            "summary": date_text or (_lore_title(lore_titles_by_id, linked_page_id) if linked_page_id else ""),
        }
        exported_files.append(entry)
        timeline_entries.append(entry)

    index_path = os.path.join(export_path, "index.md")
    _write_text_file(
        index_path,
        _build_export_index(project_title, world, document_entries, lore_entries, relationship_entries, timeline_entries),
    )
    exported_files.insert(
        0,
        {
            "kind": "index",
            "title": "Index",
            "path": index_path,
            "relativePath": "index.md",
        },
    )

    return {
        "exportPath": export_path,
        "projectTitle": project_title,
        "worldTitle": world[2],
        "documentCount": len(documents),
        "lorePageCount": len(lore_pages),
        "relationshipCount": len(relationships),
        "timelineEventCount": len(timeline_events),
        "files": exported_files,
    }


def export_world_markdown(project_uuid, world_id, export_root):
    if not export_root:
        raise ValueError("exportRoot required")
    source_path = _get_project_filepath(project_uuid)
    if not source_path or not os.path.exists(source_path):
        raise FileNotFoundError(source_path or project_uuid)

    project_title = _get_project_title(project_uuid)
    conn = _project_conn(source_path)
    try:
        world_data = _fetch_world_export_data(conn, project_uuid, world_id)
    finally:
        conn.close()
    export_folder_name = _safe_export_name(f"{project_title} - {world_data['world'][2]}", "worldie-export")
    export_path = os.path.abspath(os.path.join(export_root, export_folder_name))
    return _write_world_markdown_export(project_title, world_data, export_path)


def export_lore_table_csv(export_root, filename, csv_text):
    if not export_root:
        raise ValueError("exportRoot required")
    if csv_text is None:
        raise ValueError("csvText required")

    os.makedirs(export_root, exist_ok=True)
    raw_filename = str(filename or "Lore Table.csv")
    stem, ext = os.path.splitext(raw_filename)
    safe_filename = f"{_safe_export_name(stem, 'Lore Table')}{ext if ext.lower() == '.csv' else '.csv'}"
    export_path = _dedupe_existing_export_path(export_root, safe_filename)
    _write_csv_file(export_path, str(csv_text))
    return {
        "exportPath": export_path,
        "filename": os.path.basename(export_path),
    }


def export_project_markdown(project_uuid, export_root):
    if not export_root:
        raise ValueError("exportRoot required")
    source_path = _get_project_filepath(project_uuid)
    if not source_path or not os.path.exists(source_path):
        raise FileNotFoundError(source_path or project_uuid)

    project_title = _get_project_title(project_uuid)
    project_export_path = os.path.abspath(os.path.join(export_root, _safe_export_name(project_title, "worldie-project")))
    os.makedirs(project_export_path, exist_ok=True)

    conn = _project_conn(source_path)
    try:
        c = conn.cursor()
        c.execute(
            """
            SELECT id, project_id, title, description, created_at, updated_at
            FROM worlds
            WHERE project_id = ?
            ORDER BY title COLLATE NOCASE, id
            """,
            (project_uuid,),
        )
        worlds = c.fetchall()
        used_world_paths = set()
        world_exports = []
        project_files = []
        world_entries = []
        totals = {
            "worldCount": len(worlds),
            "documentCount": 0,
            "lorePageCount": 0,
            "relationshipCount": 0,
            "timelineEventCount": 0,
        }
        for world in worlds:
            world_data = _fetch_world_export_data(conn, project_uuid, world[0])
            world_folder = _dedupe_export_path(project_export_path, _safe_export_name(world[2], "world"), used_world_paths)
            world_export = _write_world_markdown_export(project_title, world_data, world_folder)
            world_exports.append(world_export)
            project_files.extend(world_export["files"])
            totals["documentCount"] += world_export["documentCount"]
            totals["lorePageCount"] += world_export["lorePageCount"]
            totals["relationshipCount"] += world_export["relationshipCount"]
            totals["timelineEventCount"] += world_export["timelineEventCount"]
            world_entries.append(
                {
                    "title": world[2],
                    "path": world_export["exportPath"],
                    "relativePath": _relative_export_path(os.path.join(world_export["exportPath"], "index.md"), project_export_path),
                    "documentCount": world_export["documentCount"],
                    "lorePageCount": world_export["lorePageCount"],
                    "relationshipCount": world_export["relationshipCount"],
                    "timelineEventCount": world_export["timelineEventCount"],
                }
            )
    finally:
        conn.close()

    index_path = os.path.join(project_export_path, "index.md")
    _write_text_file(index_path, _build_project_export_index(project_title, world_entries, totals))
    files = [
        {
            "kind": "index",
            "title": "Project Index",
            "path": index_path,
            "relativePath": "index.md",
        }
    ]
    files.extend(project_files)
    return {
        "exportPath": project_export_path,
        "projectTitle": project_title,
        "worldCount": totals["worldCount"],
        "documentCount": totals["documentCount"],
        "lorePageCount": totals["lorePageCount"],
        "relationshipCount": totals["relationshipCount"],
        "timelineEventCount": totals["timelineEventCount"],
        "worlds": world_entries,
        "files": files,
    }


def delete_project(project_uuid):
    filepath = _get_project_filepath(project_uuid)
    conn = _registry_conn()
    c = conn.cursor()
    c.execute("DELETE FROM projects WHERE uuid = ?", (project_uuid,))
    conn.commit()
    conn.close()
    if filepath and os.path.exists(filepath):
        os.remove(filepath)


def update_world_title(project_uuid, world_id, title):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    now = _now_iso()
    title = _sanitize_text_for_storage(title)
    c.execute("UPDATE worlds SET title = ?, updated_at = ? WHERE id = ?", (title, now, world_id))
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def delete_world(project_uuid, world_id):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute("DELETE FROM lore_pages WHERE world_id = ?", (world_id,))
    c.execute("DELETE FROM documents WHERE world_id = ?", (world_id,))
    c.execute("DELETE FROM timeline_events WHERE world_id = ?", (world_id,))
    c.execute("DELETE FROM relationships WHERE world_id = ?", (world_id,))
    c.execute("DELETE FROM custom_field_schemas WHERE world_id = ?", (world_id,))
    c.execute("DELETE FROM lore_table_views WHERE world_id = ?", (world_id,))
    c.execute("DELETE FROM worlds WHERE id = ?", (world_id,))
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def create_world(project_uuid, title, description=None):
    db_path = _get_project_filepath(project_uuid)
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    now = _now_iso()
    world_id = str(uuid.uuid4())
    title, description = _sanitize_text_values(title, description)
    c.execute(
        """
        INSERT INTO worlds (id, project_id, title, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (world_id, project_uuid, title, description, now, now),
    )
    conn.commit()
    conn.close()
    _touch_project(project_uuid)
    return world_id


def list_worlds(project_uuid):
    db_path = _get_project_filepath(project_uuid)
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute(
        """
        SELECT id, project_id, title, description, created_at, updated_at
        FROM worlds
        WHERE project_id = ?
        ORDER BY updated_at DESC
        """,
        (project_uuid,),
    )
    rows = c.fetchall()
    conn.close()
    return rows


def create_lore_page(project_uuid, world_id, title, page_type, tags_json=None, fields_json=None, cover_image_path=None):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    now = _now_iso()
    lore_id = str(uuid.uuid4())
    title, page_type, tags_json, fields_json, cover_image_path = _sanitize_text_values(
        title,
        page_type,
        tags_json,
        fields_json,
        cover_image_path,
    )
    c.execute(
        """
        INSERT INTO lore_pages (
            id, world_id, title, type, tags_json, fields_json, cover_image_path, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (lore_id, world_id, title, page_type, tags_json, fields_json, cover_image_path, now, now),
    )
    conn.commit()
    conn.close()
    _touch_project(project_uuid)
    return lore_id


def list_lore_pages(project_uuid, world_id, page_type=None):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    if page_type:
        c.execute(
            """
            SELECT id, world_id, title, type, tags_json, fields_json, cover_image_path, created_at, updated_at
            FROM lore_pages
            WHERE world_id = ? AND type = ?
            ORDER BY updated_at DESC
            """,
            (world_id, page_type),
        )
    else:
        c.execute(
            """
            SELECT id, world_id, title, type, tags_json, fields_json, cover_image_path, created_at, updated_at
            FROM lore_pages
            WHERE world_id = ?
            ORDER BY updated_at DESC
            """,
            (world_id,),
        )
    rows = c.fetchall()
    conn.close()
    return rows


def update_lore_page(
    project_uuid,
    lore_id,
    title=OMITTED,
    page_type=OMITTED,
    tags_json=OMITTED,
    fields_json=OMITTED,
    cover_image_path=OMITTED,
):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    _update_partial(
        conn,
        "lore_pages",
        "id",
        lore_id,
        [
            ("title", title),
            ("type", page_type),
            ("tags_json", tags_json),
            ("fields_json", fields_json),
            ("cover_image_path", cover_image_path),
        ],
    )
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def delete_lore_page(project_uuid, lore_id):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute("DELETE FROM lore_pages WHERE id = ?", (lore_id,))
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def create_document(project_uuid, world_id, title, content_json=None, folder_path=None):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    now = _now_iso()
    doc_id = str(uuid.uuid4())
    title, content_json, folder_path = _sanitize_text_values(title, content_json, folder_path)
    c.execute(
        """
        INSERT INTO documents (
            id, world_id, title, content_json, folder_path, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (doc_id, world_id, title, content_json, folder_path, now, now),
    )
    conn.commit()
    conn.close()
    _touch_project(project_uuid)
    return doc_id


def list_documents(project_uuid, world_id):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute(
        """
        SELECT id, world_id, title, content_json, folder_path, created_at, updated_at
        FROM documents
        WHERE world_id = ?
        ORDER BY updated_at DESC
        """,
        (world_id,),
    )
    rows = c.fetchall()
    conn.close()
    return rows


def update_document(project_uuid, doc_id, title=OMITTED, content_json=OMITTED, folder_path=OMITTED):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    updated_count = _update_partial(
        conn,
        "documents",
        "id",
        doc_id,
        [
            ("title", title),
            ("content_json", content_json),
            ("folder_path", folder_path),
        ],
    )
    if updated_count == 0:
        conn.close()
        raise ValueError(f"Document not found in active project file: {doc_id}")
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def delete_document(project_uuid, doc_id):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def create_relationship(project_uuid, world_id, source_page_id, target_page_id, relation_type, notes=None):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    now = _now_iso()
    relationship_id = str(uuid.uuid4())
    source_page_id, target_page_id, relation_type, notes = _sanitize_text_values(
        source_page_id,
        target_page_id,
        relation_type,
        notes,
    )
    c.execute(
        """
        INSERT INTO relationships (
            id, world_id, from_id, to_id, type, notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (relationship_id, world_id, source_page_id, target_page_id, relation_type, notes, now, now),
    )
    conn.commit()
    conn.close()
    _touch_project(project_uuid)
    return relationship_id


def list_relationships(project_uuid, world_id):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute(
        """
        SELECT id, world_id, from_id, to_id, type, notes, created_at, updated_at
        FROM relationships
        WHERE world_id = ?
        ORDER BY updated_at DESC
        """,
        (world_id,),
    )
    rows = c.fetchall()
    conn.close()
    return rows


def update_relationship(
    project_uuid,
    relationship_id,
    source_page_id=OMITTED,
    target_page_id=OMITTED,
    relation_type=OMITTED,
    notes=OMITTED,
):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    _update_partial(
        conn,
        "relationships",
        "id",
        relationship_id,
        [
            ("from_id", source_page_id),
            ("to_id", target_page_id),
            ("type", relation_type),
            ("notes", notes),
        ],
    )
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def delete_relationship(project_uuid, relationship_id):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute("DELETE FROM relationships WHERE id = ?", (relationship_id,))
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def create_timeline_event(project_uuid, world_id, title, event_date=None, event_type=None, linked_page_id=None, description=None):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    now = _now_iso()
    event_id = str(uuid.uuid4())
    title, event_date, event_type, linked_page_id, description = _sanitize_text_values(
        title,
        event_date,
        event_type,
        linked_page_id,
        description,
    )
    c.execute(
        """
        INSERT INTO timeline_events (
            id, world_id, title, date_text, event_type, linked_page_id, description, links_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (event_id, world_id, title, event_date, event_type, linked_page_id, description, None, now, now),
    )
    conn.commit()
    conn.close()
    _touch_project(project_uuid)
    return event_id


def list_timeline_events(project_uuid, world_id):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute(
        """
        SELECT id, world_id, title, date_text, event_type, linked_page_id, description, created_at, updated_at
        FROM timeline_events
        WHERE world_id = ?
        ORDER BY updated_at DESC
        """,
        (world_id,),
    )
    rows = c.fetchall()
    conn.close()
    return rows


def update_timeline_event(
    project_uuid,
    event_id,
    title=OMITTED,
    event_date=OMITTED,
    event_type=OMITTED,
    linked_page_id=OMITTED,
    description=OMITTED,
):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    _update_partial(
        conn,
        "timeline_events",
        "id",
        event_id,
        [
            ("title", title),
            ("date_text", event_date),
            ("event_type", event_type),
            ("linked_page_id", linked_page_id),
            ("description", description),
        ],
    )
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def delete_timeline_event(project_uuid, event_id):
    db_path = _get_project_filepath(project_uuid)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute("DELETE FROM timeline_events WHERE id = ?", (event_id,))
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def create_lore_table_view(
    project_uuid,
    world_id,
    name,
    lore_type_id=None,
    quick_filter=None,
    sort_key=None,
    sort_direction=None,
    visible_columns_json=None,
):
    db_path = _get_project_filepath(project_uuid)
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    now = _now_iso()
    view_id = str(uuid.uuid4())
    name, lore_type_id, quick_filter, sort_key, sort_direction, visible_columns_json = _sanitize_text_values(
        name,
        lore_type_id,
        quick_filter,
        sort_key,
        sort_direction,
        visible_columns_json,
    )
    c.execute(
        """
        INSERT INTO lore_table_views (
            id, world_id, name, lore_type_id, quick_filter, sort_key, sort_direction,
            visible_columns_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            view_id,
            world_id,
            name,
            lore_type_id,
            quick_filter,
            sort_key,
            sort_direction,
            visible_columns_json,
            now,
            now,
        ),
    )
    conn.commit()
    conn.close()
    _touch_project(project_uuid)
    return view_id


def list_lore_table_views(project_uuid, world_id):
    db_path = _get_project_filepath(project_uuid)
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute(
        """
        SELECT id, world_id, name, lore_type_id, quick_filter, sort_key, sort_direction,
               visible_columns_json, created_at, updated_at
        FROM lore_table_views
        WHERE world_id = ?
        ORDER BY updated_at DESC, name ASC
        """,
        (world_id,),
    )
    rows = c.fetchall()
    conn.close()
    return rows


def update_lore_table_view(
    project_uuid,
    view_id,
    name=OMITTED,
    lore_type_id=OMITTED,
    quick_filter=OMITTED,
    sort_key=OMITTED,
    sort_direction=OMITTED,
    visible_columns_json=OMITTED,
):
    db_path = _get_project_filepath(project_uuid)
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    _update_partial(
        conn,
        "lore_table_views",
        "id",
        view_id,
        [
            ("name", name),
            ("lore_type_id", lore_type_id),
            ("quick_filter", quick_filter),
            ("sort_key", sort_key),
            ("sort_direction", sort_direction),
            ("visible_columns_json", visible_columns_json),
        ],
    )
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def delete_lore_table_view(project_uuid, view_id):
    db_path = _get_project_filepath(project_uuid)
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute("DELETE FROM lore_table_views WHERE id = ?", (view_id,))
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def list_lore_types(project_uuid):
    db_path = _get_project_filepath(project_uuid)
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute(
        """
        SELECT id, name, slug, icon, field_definitions_json, display_order, is_system
        FROM lore_types
        ORDER BY display_order ASC, name ASC
        """
    )
    rows = c.fetchall()
    conn.close()
    return rows


def replace_lore_types(project_uuid, lore_types):
    db_path = _get_project_filepath(project_uuid)
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    now = _now_iso()
    c.execute("SELECT id, field_definitions_json FROM lore_types")
    existing_field_definitions = {row[0]: row[1] for row in c.fetchall()}
    c.execute("DELETE FROM lore_types")
    c.executemany(
        """
        INSERT INTO lore_types (id, name, slug, icon, field_definitions_json, display_order, is_system, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                lore_type["id"],
                lore_type["name"],
                lore_type["slug"],
                lore_type.get("icon"),
                _resolve_lore_type_field_definitions_json(
                    lore_type,
                    existing_field_definitions.get(lore_type["id"]),
                ),
                lore_type["order"],
                1 if lore_type.get("isSystem") else 0,
                now,
                now,
            )
            for lore_type in lore_types
        ],
    )
    conn.commit()
    conn.close()
    _touch_project(project_uuid)


def _resolve_lore_type_field_definitions_json(lore_type, existing_value):
    if "fieldDefinitions" not in lore_type:
        return existing_value
    field_definitions = lore_type.get("fieldDefinitions")
    if field_definitions is None:
        return None
    return json.dumps(field_definitions)


def list_lore_templates(project_uuid):
    db_path = _get_project_filepath(project_uuid)
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute(
        """
        SELECT id, name, lore_type_id, trait_definitions_json
        FROM lore_templates
        ORDER BY updated_at DESC, name ASC
        """
    )
    rows = c.fetchall()
    conn.close()
    return rows


def replace_lore_templates(project_uuid, lore_templates):
    db_path = _get_project_filepath(project_uuid)
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    now = _now_iso()
    c.execute("DELETE FROM lore_templates")
    c.executemany(
        """
        INSERT INTO lore_templates (id, name, lore_type_id, trait_definitions_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        [
            (
                lore_template["id"],
                lore_template["name"],
                lore_template["loreTypeId"],
                lore_template["traitDefinitionsJson"],
                now,
                now,
            )
            for lore_template in lore_templates
        ],
    )
    conn.commit()
    conn.close()
    _touch_project(project_uuid)
