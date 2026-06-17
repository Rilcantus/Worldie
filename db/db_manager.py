import os
import sqlite3
import shutil
import uuid
from datetime import datetime

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTRY_DB_PATH = os.path.join(ROOT_DIR, "db", "projects_registry.db")
PROJECTS_DIR = os.path.join(ROOT_DIR, "projects")
OMITTED = object()


def _now_iso():
    return datetime.now().isoformat()


def _ensure_parent_dir(path):
    parent_dir = os.path.dirname(path)
    if not parent_dir:
        return
    os.makedirs(parent_dir, exist_ok=True)


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
        values.append(value)
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
        CREATE TABLE IF NOT EXISTS lore_types (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            icon TEXT,
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
    title = _get_project_meta_title(resolved_path)
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
    if os.path.exists(resolved_path):
        raise ValueError("Choose a new filepath for Save As.")
    _ensure_parent_dir(resolved_path)
    shutil.copy2(source_path, resolved_path)
    _init_project_db(resolved_path)
    _set_project_meta_title(resolved_path, title)
    return open_project(resolved_path)


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
    _update_partial(
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


def list_lore_types(project_uuid):
    db_path = _get_project_filepath(project_uuid)
    _init_project_db(db_path)
    conn = _project_conn(db_path)
    c = conn.cursor()
    c.execute(
        """
        SELECT id, name, slug, icon, display_order, is_system
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
    c.execute("DELETE FROM lore_types")
    c.executemany(
        """
        INSERT INTO lore_types (id, name, slug, icon, display_order, is_system, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                lore_type["id"],
                lore_type["name"],
                lore_type["slug"],
                lore_type.get("icon"),
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
