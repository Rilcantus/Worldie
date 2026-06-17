import json
import os
import sys
from typing import Any, Dict

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from db.db_manager import (
    OMITTED,
    add_project,
    create_document,
    create_lore_page,
    create_lore_table_view,
    create_relationship,
    create_timeline_event,
    create_world,
    delete_document,
    delete_lore_page,
    delete_lore_table_view,
    delete_project,
    delete_relationship,
    delete_timeline_event,
    delete_world,
    export_project_markdown,
    export_world_markdown,
    get_all_projects,
    init_db,
    list_documents,
    list_lore_templates,
    list_lore_table_views,
    list_lore_types,
    open_project,
    list_lore_pages,
    list_relationships,
    list_timeline_events,
    list_worlds,
    replace_lore_templates,
    replace_lore_types,
    save_project_as,
    update_document,
    update_lore_page,
    update_lore_table_view,
    update_project_title,
    update_relationship,
    update_timeline_event,
    update_world_title,
)


def _read_request() -> Dict[str, Any]:
    raw = sys.stdin.read()
    if not raw:
        return {"action": "ping"}
    return json.loads(raw)


def _reply(payload: Dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload))


def _serialize_project(row: Any) -> Dict[str, Any]:
    return {
        "id": row[0],
        "title": row[1],
        "filepath": row[2],
        "lastEdited": row[3],
        "createdAt": row[4],
    }


def _serialize_projects(rows: Any) -> list[Dict[str, Any]]:
    return [_serialize_project(row) for row in rows]


def _optional(data: Dict[str, Any], key: str) -> Any:
    return data[key] if key in data else OMITTED


def _handle_request(request: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return _dispatch_request(request)
    except Exception as error:
        return {"status": "error", "message": str(error)}


def _dispatch_request(request: Dict[str, Any]) -> Dict[str, Any]:
    action = request.get("action")
    data = request.get("data", {})

    if action == "ping":
        return {"status": "ok"}

    if action == "list_projects":
        projects = get_all_projects()
        return {
            "status": "ok",
            "projects": _serialize_projects(projects),
        }

    if action == "create_project":
        title = data.get("title", "Untitled Project")
        filepath = data.get("filepath", "")
        project_id, project_filepath = add_project(title, filepath)
        projects = get_all_projects()
        project = next((row for row in projects if row[0] == project_id), None)
        return {
            "status": "ok",
            "projects": _serialize_projects(projects),
            "project": _serialize_project(project)
            if project
            else {"id": project_id, "title": title, "filepath": project_filepath},
        }

    if action == "open_project":
        filepath = data.get("filepath")
        if not filepath:
            return {"status": "error", "message": "filepath required"}
        project_id, _, resolved_path = open_project(filepath)
        projects = get_all_projects()
        project = next((row for row in projects if row[0] == project_id), None)
        return {
            "status": "ok",
            "projects": _serialize_projects(projects),
            "project": _serialize_project(project) if project else {"id": project_id, "filepath": resolved_path},
        }

    if action == "save_project_as":
        project_id = data.get("projectId")
        filepath = data.get("filepath")
        if not project_id or not filepath:
            return {"status": "error", "message": "projectId and filepath required"}
        copied_project_id, _, resolved_path = save_project_as(project_id, filepath)
        projects = get_all_projects()
        project = next((row for row in projects if row[0] == copied_project_id), None)
        return {
            "status": "ok",
            "projects": _serialize_projects(projects),
            "project": _serialize_project(project)
            if project
            else {"id": copied_project_id, "filepath": resolved_path},
        }

    if action == "export_world_markdown":
        project_id = data.get("projectId")
        world_id = data.get("worldId")
        export_root = data.get("exportRoot")
        if not project_id or not world_id or not export_root:
            return {"status": "error", "message": "projectId, worldId, and exportRoot required"}
        return {
            "status": "ok",
            "export": export_world_markdown(project_id, world_id, export_root),
        }

    if action == "export_project_markdown":
        project_id = data.get("projectId")
        export_root = data.get("exportRoot")
        if not project_id or not export_root:
            return {"status": "error", "message": "projectId and exportRoot required"}
        return {
            "status": "ok",
            "export": export_project_markdown(project_id, export_root),
        }

    if action == "update_project":
        project_id = data.get("projectId")
        title = data.get("title")
        if not project_id or not title:
            return {"status": "error", "message": "projectId and title required"}
        update_project_title(project_id, title)
        projects = get_all_projects()
        return {
            "status": "ok",
            "projects": _serialize_projects(projects),
        }

    if action == "delete_project":
        project_id = data.get("projectId")
        if not project_id:
            return {"status": "error", "message": "projectId required"}
        delete_project(project_id)
        projects = get_all_projects()
        return {
            "status": "ok",
            "projects": _serialize_projects(projects),
        }
    if action == "list_worlds":
        project_id = data.get("projectId")
        if not project_id:
            return {"status": "error", "message": "projectId required"}
        worlds = list_worlds(project_id)
        return {
            "status": "ok",
            "worlds": [
                {
                    "id": row[0],
                    "projectId": row[1],
                    "title": row[2],
                    "description": row[3],
                    "createdAt": row[4],
                    "updatedAt": row[5],
                }
                for row in worlds
            ],
        }

    if action == "create_world":
        project_id = data.get("projectId")
        title = data.get("title", "New World")
        description = data.get("description")
        if not project_id:
            return {"status": "error", "message": "projectId required"}
        world_id = create_world(project_id, title, description)
        return {"status": "ok", "worldId": world_id}

    if action == "list_lore_types":
        project_id = data.get("projectId")
        if not project_id:
            return {"status": "error", "message": "projectId required"}
        rows = list_lore_types(project_id)
        return {
            "status": "ok",
            "loreTypes": [
                {
                    "id": row[0],
                    "name": row[1],
                    "slug": row[2],
                    "icon": row[3],
                    "fieldDefinitions": json.loads(row[4]) if row[4] else [],
                    "order": row[5],
                    "isSystem": bool(row[6]),
                }
                for row in rows
            ],
        }

    if action == "save_lore_types":
        project_id = data.get("projectId")
        lore_types = data.get("loreTypes", [])
        if not project_id:
            return {"status": "error", "message": "projectId required"}
        replace_lore_types(project_id, lore_types)
        return {"status": "ok"}

    if action == "list_lore_templates":
        project_id = data.get("projectId")
        if not project_id:
            return {"status": "error", "message": "projectId required"}
        rows = list_lore_templates(project_id)
        return {
            "status": "ok",
            "templates": [
                {
                    "id": row[0],
                    "name": row[1],
                    "loreTypeId": row[2],
                    "traitDefinitionsJson": row[3],
                }
                for row in rows
            ],
        }

    if action == "save_lore_templates":
        project_id = data.get("projectId")
        templates = data.get("templates", [])
        if not project_id:
            return {"status": "error", "message": "projectId required"}
        replace_lore_templates(project_id, templates)
        return {"status": "ok"}

    if action == "delete_world":
        project_id = data.get("projectId")
        world_id = data.get("worldId")
        if not project_id or not world_id:
            return {"status": "error", "message": "projectId and worldId required"}
        delete_world(project_id, world_id)
        return {"status": "ok"}

    if action == "list_lore_pages":
        world_id = data.get("worldId")
        page_type = data.get("type")
        project_id = data.get("projectId")
        if not project_id or not world_id:
            return {"status": "error", "message": "projectId and worldId required"}
        rows = list_lore_pages(project_id, world_id, page_type)
        return {
            "status": "ok",
            "lorePages": [
                {
                    "id": row[0],
                    "worldId": row[1],
                    "title": row[2],
                    "type": row[3],
                    "tagsJson": row[4],
                    "fieldsJson": row[5],
                    "coverImagePath": row[6],
                    "createdAt": row[7],
                    "updatedAt": row[8],
                }
                for row in rows
            ],
        }

    if action == "create_lore_page":
        world_id = data.get("worldId")
        title = data.get("title", "New Lore Page")
        page_type = data.get("type", "Character")
        tags_json = data.get("tagsJson")
        fields_json = data.get("fieldsJson")
        project_id = data.get("projectId")
        if not project_id or not world_id:
            return {"status": "error", "message": "projectId and worldId required"}
        lore_id = create_lore_page(project_id, world_id, title, page_type, tags_json, fields_json)
        return {"status": "ok", "loreId": lore_id}

    if action == "update_lore_page":
        project_id = data.get("projectId")
        lore_id = data.get("loreId")
        if not project_id or not lore_id:
            return {"status": "error", "message": "projectId and loreId required"}
        update_lore_page(
            project_id,
            lore_id,
            title=_optional(data, "title"),
            page_type=_optional(data, "type"),
            tags_json=_optional(data, "tagsJson"),
            fields_json=_optional(data, "fieldsJson"),
            cover_image_path=_optional(data, "coverImagePath"),
        )
        return {"status": "ok"}

    if action == "delete_lore_page":
        project_id = data.get("projectId")
        lore_id = data.get("loreId")
        if not project_id or not lore_id:
            return {"status": "error", "message": "projectId and loreId required"}
        delete_lore_page(project_id, lore_id)
        return {"status": "ok"}

    if action == "list_documents":
        project_id = data.get("projectId")
        world_id = data.get("worldId")
        if not project_id or not world_id:
            return {"status": "error", "message": "projectId and worldId required"}
        rows = list_documents(project_id, world_id)
        return {
            "status": "ok",
            "documents": [
                {
                    "id": row[0],
                    "worldId": row[1],
                    "title": row[2],
                    "contentJson": row[3],
                    "folderPath": row[4],
                    "createdAt": row[5],
                    "updatedAt": row[6],
                }
                for row in rows
            ],
        }

    if action == "create_document":
        world_id = data.get("worldId")
        title = data.get("title", "New Document")
        content_json = data.get("contentJson")
        project_id = data.get("projectId")
        if not project_id or not world_id:
            return {"status": "error", "message": "projectId and worldId required"}
        doc_id = create_document(project_id, world_id, title, content_json)
        return {"status": "ok", "documentId": doc_id}

    if action == "update_document":
        project_id = data.get("projectId")
        doc_id = data.get("documentId")
        if not project_id or not doc_id:
            return {"status": "error", "message": "projectId and documentId required"}
        update_document(
            project_id,
            doc_id,
            title=_optional(data, "title"),
            content_json=_optional(data, "contentJson"),
            folder_path=_optional(data, "folderPath"),
        )
        return {"status": "ok"}

    if action == "delete_document":
        project_id = data.get("projectId")
        doc_id = data.get("documentId")
        if not project_id or not doc_id:
            return {"status": "error", "message": "projectId and documentId required"}
        delete_document(project_id, doc_id)
        return {"status": "ok"}

    if action == "update_world":
        project_id = data.get("projectId")
        world_id = data.get("worldId")
        title = data.get("title")
        if not project_id or not world_id or not title:
            return {"status": "error", "message": "projectId, worldId, and title required"}
        update_world_title(project_id, world_id, title)
        return {"status": "ok"}

    if action == "list_relationships":
        project_id = data.get("projectId")
        world_id = data.get("worldId")
        if not project_id or not world_id:
            return {"status": "error", "message": "projectId and worldId required"}
        rows = list_relationships(project_id, world_id)
        return {
            "status": "ok",
            "relationships": [
                {
                    "id": row[0],
                    "worldId": row[1],
                    "sourcePageId": row[2],
                    "targetPageId": row[3],
                    "relationType": row[4],
                    "notes": row[5],
                    "createdAt": row[6],
                    "updatedAt": row[7],
                }
                for row in rows
            ],
        }

    if action == "create_relationship":
        world_id = data.get("worldId")
        source_page_id = data.get("sourcePageId")
        target_page_id = data.get("targetPageId")
        relation_type = data.get("relationType")
        notes = data.get("notes")
        project_id = data.get("projectId")
        if not project_id or not world_id:
            return {"status": "error", "message": "projectId and worldId required"}
        if not source_page_id or not target_page_id or not relation_type:
            return {
                "status": "error",
                "message": "sourcePageId, targetPageId, and relationType required",
            }
        relationship_id = create_relationship(
            project_id,
            world_id,
            source_page_id,
            target_page_id,
            relation_type,
            notes,
        )
        return {"status": "ok", "relationshipId": relationship_id}

    if action == "update_relationship":
        project_id = data.get("projectId")
        relationship_id = data.get("relationshipId")
        if not project_id or not relationship_id:
            return {"status": "error", "message": "projectId and relationshipId required"}
        update_relationship(
            project_id,
            relationship_id,
            source_page_id=_optional(data, "sourcePageId"),
            target_page_id=_optional(data, "targetPageId"),
            relation_type=_optional(data, "relationType"),
            notes=_optional(data, "notes"),
        )
        return {"status": "ok"}

    if action == "delete_relationship":
        project_id = data.get("projectId")
        relationship_id = data.get("relationshipId")
        if not project_id or not relationship_id:
            return {"status": "error", "message": "projectId and relationshipId required"}
        delete_relationship(project_id, relationship_id)
        return {"status": "ok"}

    if action == "list_timeline_events":
        project_id = data.get("projectId")
        world_id = data.get("worldId")
        if not project_id or not world_id:
            return {"status": "error", "message": "projectId and worldId required"}
        rows = list_timeline_events(project_id, world_id)
        return {
            "status": "ok",
            "events": [
                {
                    "id": row[0],
                    "worldId": row[1],
                    "title": row[2],
                    "eventDate": row[3],
                    "eventType": row[4],
                    "linkedPageId": row[5],
                    "description": row[6],
                    "createdAt": row[7],
                    "updatedAt": row[8],
                }
                for row in rows
            ],
        }

    if action == "create_timeline_event":
        project_id = data.get("projectId")
        world_id = data.get("worldId")
        title = data.get("title", "New Event")
        if not project_id or not world_id:
            return {"status": "error", "message": "projectId and worldId required"}
        event_id = create_timeline_event(
            project_id,
            world_id,
            title,
            event_date=data.get("eventDate"),
            event_type=data.get("eventType"),
            linked_page_id=data.get("linkedPageId"),
            description=data.get("description"),
        )
        return {"status": "ok", "eventId": event_id}

    if action == "update_timeline_event":
        project_id = data.get("projectId")
        event_id = data.get("eventId")
        if not project_id or not event_id:
            return {"status": "error", "message": "projectId and eventId required"}
        update_timeline_event(
            project_id,
            event_id,
            title=_optional(data, "title"),
            event_date=_optional(data, "eventDate"),
            event_type=_optional(data, "eventType"),
            linked_page_id=_optional(data, "linkedPageId"),
            description=_optional(data, "description"),
        )
        return {"status": "ok"}

    if action == "delete_timeline_event":
        project_id = data.get("projectId")
        event_id = data.get("eventId")
        if not project_id or not event_id:
            return {"status": "error", "message": "projectId and eventId required"}
        delete_timeline_event(project_id, event_id)
        return {"status": "ok"}

    if action == "list_lore_table_views":
        project_id = data.get("projectId")
        world_id = data.get("worldId")
        if not project_id or not world_id:
            return {"status": "error", "message": "projectId and worldId required"}
        rows = list_lore_table_views(project_id, world_id)
        return {
            "status": "ok",
            "views": [
                {
                    "id": row[0],
                    "worldId": row[1],
                    "name": row[2],
                    "loreTypeId": row[3],
                    "quickFilter": row[4],
                    "sortKey": row[5],
                    "sortDirection": row[6],
                    "visibleColumnsJson": row[7],
                    "createdAt": row[8],
                    "updatedAt": row[9],
                }
                for row in rows
            ],
        }

    if action == "create_lore_table_view":
        project_id = data.get("projectId")
        world_id = data.get("worldId")
        name = data.get("name")
        if not project_id or not world_id or not name:
            return {"status": "error", "message": "projectId, worldId, and name required"}
        view_id = create_lore_table_view(
            project_id,
            world_id,
            name,
            lore_type_id=data.get("loreTypeId"),
            quick_filter=data.get("quickFilter"),
            sort_key=data.get("sortKey"),
            sort_direction=data.get("sortDirection"),
            visible_columns_json=data.get("visibleColumnsJson"),
        )
        return {"status": "ok", "viewId": view_id}

    if action == "update_lore_table_view":
        project_id = data.get("projectId")
        view_id = data.get("viewId")
        if not project_id or not view_id:
            return {"status": "error", "message": "projectId and viewId required"}
        update_lore_table_view(
            project_id,
            view_id,
            name=_optional(data, "name"),
            lore_type_id=_optional(data, "loreTypeId"),
            quick_filter=_optional(data, "quickFilter"),
            sort_key=_optional(data, "sortKey"),
            sort_direction=_optional(data, "sortDirection"),
            visible_columns_json=_optional(data, "visibleColumnsJson"),
        )
        return {"status": "ok"}

    if action == "delete_lore_table_view":
        project_id = data.get("projectId")
        view_id = data.get("viewId")
        if not project_id or not view_id:
            return {"status": "error", "message": "projectId and viewId required"}
        delete_lore_table_view(project_id, view_id)
        return {"status": "ok"}

    return {"status": "error", "message": f"Unknown action: {action}"}


def main():
    try:
        init_db()
        request = _read_request()
        response = _handle_request(request)
    except Exception as error:
        response = {"status": "error", "message": str(error)}
    _reply(response)


if __name__ == "__main__":
    main()
