import importlib
import io
import json
import os
import shutil
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch


class ProjectStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp_path = Path("tests") / ".tmp" / f"project-store-{uuid.uuid4().hex}"
        self.temp_path.mkdir(parents=True, exist_ok=True)

        self.db_manager = importlib.import_module("db.db_manager")
        self.sidecar = importlib.import_module("backend.sidecar")

        self.original_registry_path = self.db_manager.REGISTRY_DB_PATH
        self.original_projects_dir = self.db_manager.PROJECTS_DIR

        self.db_manager.REGISTRY_DB_PATH = str(self.temp_path / "registry" / "projects_registry.db")
        self.db_manager.PROJECTS_DIR = str(self.temp_path / "projects")
        self.db_manager.init_db()

    def tearDown(self):
        self.db_manager.REGISTRY_DB_PATH = self.original_registry_path
        self.db_manager.PROJECTS_DIR = self.original_projects_dir
        shutil.rmtree(self.temp_path, ignore_errors=True)

    def test_project_file_crud_round_trip(self):
        project_uuid, project_path = self.db_manager.add_project("Iron Age Chronicles", "")
        self.assertTrue(Path(project_path).exists())

        worlds = self.db_manager.list_worlds(project_uuid)
        self.assertEqual(worlds, [])

        world_id = self.db_manager.create_world(project_uuid, "Duskfen", "Bog kingdom")
        listed_worlds = self.db_manager.list_worlds(project_uuid)
        self.assertEqual(len(listed_worlds), 1)
        self.assertEqual(listed_worlds[0][0], world_id)

        doc_id = self.db_manager.create_document(project_uuid, world_id, "Chapter 01")
        self.db_manager.update_document(
            project_uuid,
            doc_id,
            content_json="The road into Duskfen was quiet.",
            folder_path="Scenes/Act 1",
        )
        documents = self.db_manager.list_documents(project_uuid, world_id)
        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0][0], doc_id)
        self.assertEqual(documents[0][3], "The road into Duskfen was quiet.")
        self.assertEqual(documents[0][4], "Scenes/Act 1")

        lore_id = self.db_manager.create_lore_page(project_uuid, world_id, "Mara Quill", "Character")
        self.db_manager.update_lore_page(
            project_uuid,
            lore_id,
            tags_json="protagonist, courier",
            fields_json='{"status":"active"}',
        )
        lore_pages = self.db_manager.list_lore_pages(project_uuid, world_id)
        self.assertEqual(len(lore_pages), 1)
        self.assertEqual(lore_pages[0][0], lore_id)
        self.assertEqual(lore_pages[0][4], "protagonist, courier")

        relationship_id = self.db_manager.create_relationship(
            project_uuid,
            world_id,
            lore_id,
            lore_id,
            "self",
            "Intentional test relationship",
        )
        relationships = self.db_manager.list_relationships(project_uuid, world_id)
        self.assertEqual(len(relationships), 1)
        self.assertEqual(relationships[0][0], relationship_id)

        event_id = self.db_manager.create_timeline_event(
            project_uuid,
            world_id,
            "The Quiet Arrival",
            event_date="847 AE",
            event_type="arrival",
            linked_page_id=lore_id,
            description="Mara arrives in Duskfen.",
        )
        events = self.db_manager.list_timeline_events(project_uuid, world_id)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0][0], event_id)
        self.assertEqual(events[0][3], "847 AE")

        copy_path = self.temp_path / "copies" / "iron-age-copy.worldie"
        reopened_uuid, reopened_title, reopened_path = self.db_manager.save_project_as(project_uuid, str(copy_path))
        self.assertTrue(copy_path.exists())
        self.assertTrue(Path(reopened_path).exists())
        self.assertEqual(reopened_title, "Iron Age Chronicles")

        reopened_worlds = self.db_manager.list_worlds(reopened_uuid)
        self.assertEqual(len(reopened_worlds), 1)
        reopened_documents = self.db_manager.list_documents(reopened_uuid, world_id)
        self.assertEqual(len(reopened_documents), 1)
        reopened_lore = self.db_manager.list_lore_pages(reopened_uuid, world_id)
        self.assertEqual(len(reopened_lore), 1)

    def test_add_project_rejects_existing_filepath(self):
        existing_path = self.temp_path / "existing.worldie"
        self.db_manager.add_project("Original Project", str(existing_path))

        with self.assertRaisesRegex(ValueError, "Choose a new filepath for project creation."):
            self.db_manager.add_project("Duplicate Project", str(existing_path))

    def test_project_operations_reject_unknown_project_ids(self):
        with self.assertRaisesRegex(FileNotFoundError, "Project not found: missing-project"):
            self.db_manager.list_worlds("missing-project")

    def test_project_entity_updates_can_clear_optional_fields(self):
        project_uuid, _ = self.db_manager.add_project("Nullable Fields", "")
        world_id = self.db_manager.create_world(project_uuid, "Duskfen")
        lore_id = self.db_manager.create_lore_page(
            project_uuid,
            world_id,
            "Mara Quill",
            "Character",
            tags_json="protagonist",
            fields_json='{"status":"active"}',
            cover_image_path="covers/mara.png",
        )
        document_id = self.db_manager.create_document(
            project_uuid,
            world_id,
            "Chapter 01",
            content_json="Draft text",
            folder_path="Scenes",
        )
        relationship_id = self.db_manager.create_relationship(
            project_uuid,
            world_id,
            lore_id,
            lore_id,
            "self",
            notes="Intentional test relationship",
        )
        event_id = self.db_manager.create_timeline_event(
            project_uuid,
            world_id,
            "The Quiet Arrival",
            event_date="847 AE",
            event_type="arrival",
            linked_page_id=lore_id,
            description="Mara arrives in Duskfen.",
        )

        self.db_manager.update_document(project_uuid, document_id, content_json=None, folder_path=None)
        document = self.db_manager.list_documents(project_uuid, world_id)[0]
        self.assertIsNone(document[3])
        self.assertIsNone(document[4])

        self.db_manager.update_lore_page(
            project_uuid,
            lore_id,
            tags_json=None,
            fields_json=None,
            cover_image_path=None,
        )
        lore_page = self.db_manager.list_lore_pages(project_uuid, world_id)[0]
        self.assertIsNone(lore_page[4])
        self.assertIsNone(lore_page[5])
        self.assertIsNone(lore_page[6])

        self.db_manager.update_relationship(project_uuid, relationship_id, notes=None)
        relationship = self.db_manager.list_relationships(project_uuid, world_id)[0]
        self.assertIsNone(relationship[5])

        self.db_manager.update_timeline_event(
            project_uuid,
            event_id,
            event_date=None,
            event_type=None,
            linked_page_id=None,
            description=None,
        )
        event = self.db_manager.list_timeline_events(project_uuid, world_id)[0]
        self.assertIsNone(event[3])
        self.assertIsNone(event[4])
        self.assertIsNone(event[5])
        self.assertIsNone(event[6])

    def test_document_update_handles_large_unicode_pasted_content(self):
        project_uuid, project_path = self.db_manager.add_project("Large Paste", "")
        world_id = self.db_manager.create_world(project_uuid, "Draft World")
        document_id = self.db_manager.create_document(project_uuid, world_id, "New Document 1")
        pasted_text = "\n\n".join(
            [
                "Chapter opening: Mara said, \u201cWe don\u2019t leave the Blacktooth clan behind.\u201d",
                "A long road stretched across the valley\u2014wet, silver, and loud with stormwater.",
                "Line with apostrophes, commas, quotes, and [[Lore Links]] for good measure.",
            ]
            * 1200
        )

        self.db_manager.update_document(
            project_uuid,
            document_id,
            content_json=pasted_text,
            folder_path="Drafts/Large Paste",
        )

        documents = self.db_manager.list_documents(project_uuid, world_id)
        self.assertEqual(len(documents), 1)
        self.assertEqual(documents[0][0], document_id)
        self.assertEqual(documents[0][3], pasted_text)
        self.assertEqual(documents[0][4], "Drafts/Large Paste")

        reopened_uuid, _, _ = self.db_manager.open_project(str(project_path))
        reopened_documents = self.db_manager.list_documents(reopened_uuid, world_id)
        self.assertEqual(reopened_documents[0][3], pasted_text)

    def test_sidecar_updates_new_document_with_large_unicode_content(self):
        project_uuid, _ = self.db_manager.add_project("Sidecar Large Paste", "")
        world_id = self.db_manager.create_world(project_uuid, "Draft World")
        create_response = self.sidecar._handle_request(
            {
                "action": "create_document",
                "data": {
                    "projectId": project_uuid,
                    "worldId": world_id,
                    "title": "New Document 1",
                },
            }
        )
        self.assertEqual(create_response["status"], "ok")
        document_id = create_response["documentId"]
        pasted_text = "\n".join(
            f"{index}: Smart quotes \u201cBlacktooth\u201d, apostrophe \u2019, dash \u2014, link [[Clan]]"
            for index in range(2500)
        )

        update_response = self.sidecar._handle_request(
            {
                "action": "update_document",
                "data": {
                    "projectId": project_uuid,
                    "documentId": document_id,
                    "contentJson": pasted_text,
                    "folderPath": "Drafts",
                },
            }
        )

        self.assertEqual(update_response["status"], "ok")
        document = self.db_manager.list_documents(project_uuid, world_id)[0]
        self.assertEqual(document[3], pasted_text)
        self.assertEqual(document[4], "Drafts")

    def test_missing_document_update_returns_clear_error(self):
        project_uuid, _ = self.db_manager.add_project("Missing Document", "")
        world_id = self.db_manager.create_world(project_uuid, "Draft World")
        missing_document_id = "missing-document-id"

        with self.assertRaisesRegex(ValueError, f"Document not found in active project file: {missing_document_id}"):
            self.db_manager.update_document(project_uuid, missing_document_id, content_json="Unsaved text")

        response = self.sidecar._handle_request(
            {
                "action": "update_document",
                "data": {
                    "projectId": project_uuid,
                    "documentId": missing_document_id,
                    "contentJson": "Unsaved text",
                },
            }
        )

        self.assertEqual(response["status"], "error")
        self.assertEqual(response["message"], f"Document not found in active project file: {missing_document_id}")
        self.assertEqual(self.db_manager.list_documents(project_uuid, world_id), [])

    def test_lore_page_custom_fields_persist_update_clear_and_reopen(self):
        project_uuid, project_path = self.db_manager.add_project("Custom Fields", "")
        world_id = self.db_manager.create_world(project_uuid, "Duskfen")
        initial_fields = {
            "loreTypeId": "character",
            "templateId": "character-sheet",
            "traits": [{"id": "trait-1", "name": "Role", "value": "Courier"}],
            "details": "Carries sealed letters.",
            "customFields": {
                "Age": 31,
                "Species": "Human",
                "Active": True,
                "Faction": "Ashwake Company",
            },
        }
        lore_id = self.db_manager.create_lore_page(
            project_uuid,
            world_id,
            "Mara Quill",
            "Character",
            fields_json=json.dumps(initial_fields),
        )

        listed = self.db_manager.list_lore_pages(project_uuid, world_id)[0]
        self.assertEqual(json.loads(listed[5])["customFields"]["Age"], 31)
        self.assertEqual(json.loads(listed[5])["customFields"]["Active"], True)

        self.db_manager.update_lore_page(project_uuid, lore_id, title="Mara Quill Revised")
        preserved = self.db_manager.list_lore_pages(project_uuid, world_id)[0]
        self.assertEqual(json.loads(preserved[5])["customFields"]["Faction"], "Ashwake Company")

        updated_fields = {
            **initial_fields,
            "customFields": {
                "Age": 32,
                "Species": "Human",
                "Active": False,
                "Faction": None,
                "First appearance": "Chapter 01",
            },
        }
        self.db_manager.update_lore_page(project_uuid, lore_id, fields_json=json.dumps(updated_fields))
        updated = self.db_manager.list_lore_pages(project_uuid, world_id)[0]
        updated_custom_fields = json.loads(updated[5])["customFields"]
        self.assertEqual(updated_custom_fields["Age"], 32)
        self.assertEqual(updated_custom_fields["Active"], False)
        self.assertIsNone(updated_custom_fields["Faction"])
        self.assertEqual(updated_custom_fields["First appearance"], "Chapter 01")

        reopened_uuid, _, _ = self.db_manager.open_project(str(project_path))
        reopened = self.db_manager.list_lore_pages(reopened_uuid, world_id)[0]
        self.assertEqual(json.loads(reopened[5])["customFields"]["First appearance"], "Chapter 01")

        self.db_manager.update_lore_page(project_uuid, lore_id, fields_json=None)
        cleared = self.db_manager.list_lore_pages(project_uuid, world_id)[0]
        self.assertIsNone(cleared[5])

    def test_lore_table_views_persist_update_clear_delete_and_reopen(self):
        project_uuid, project_path = self.db_manager.add_project("Saved Lore Table Views", "")
        world_id = self.db_manager.create_world(project_uuid, "Duskfen")
        self.assertEqual(self.db_manager.list_lore_table_views(project_uuid, world_id), [])

        view_id = self.db_manager.create_lore_table_view(
            project_uuid,
            world_id,
            "Characters",
            lore_type_id="type-character",
            quick_filter="active",
            sort_key="field-age",
            sort_direction="asc",
            visible_columns_json=json.dumps(["field-species", "field-age"]),
        )
        listed = self.db_manager.list_lore_table_views(project_uuid, world_id)
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0][0], view_id)
        self.assertEqual(listed[0][2], "Characters")
        self.assertEqual(listed[0][3], "type-character")
        self.assertEqual(listed[0][4], "active")
        self.assertEqual(listed[0][5], "field-age")
        self.assertEqual(listed[0][6], "asc")
        self.assertEqual(json.loads(listed[0][7]), ["field-species", "field-age"])

        self.db_manager.update_lore_table_view(project_uuid, view_id, name="Characters - Active")
        preserved = self.db_manager.list_lore_table_views(project_uuid, world_id)[0]
        self.assertEqual(preserved[2], "Characters - Active")
        self.assertEqual(preserved[3], "type-character")
        self.assertEqual(preserved[4], "active")
        self.assertEqual(preserved[5], "field-age")
        self.assertEqual(json.loads(preserved[7]), ["field-species", "field-age"])

        self.db_manager.update_lore_table_view(
            project_uuid,
            view_id,
            visible_columns_json=json.dumps(["field-status"]),
        )
        updated_visibility = self.db_manager.list_lore_table_views(project_uuid, world_id)[0]
        self.assertEqual(json.loads(updated_visibility[7]), ["field-status"])

        self.db_manager.update_lore_table_view(
            project_uuid,
            view_id,
            quick_filter=None,
            sort_key=None,
            sort_direction=None,
            visible_columns_json=None,
        )
        cleared = self.db_manager.list_lore_table_views(project_uuid, world_id)[0]
        self.assertIsNone(cleared[4])
        self.assertIsNone(cleared[5])
        self.assertIsNone(cleared[6])
        self.assertIsNone(cleared[7])

        reopened_uuid, _, _ = self.db_manager.open_project(str(project_path))
        reopened = self.db_manager.list_lore_table_views(reopened_uuid, world_id)
        self.assertEqual(len(reopened), 1)
        self.assertEqual(reopened[0][2], "Characters - Active")

        self.db_manager.delete_lore_table_view(project_uuid, view_id)
        self.assertEqual(self.db_manager.list_lore_table_views(project_uuid, world_id), [])

    def test_sidecar_lore_table_view_crud_uses_project_file(self):
        project_uuid, _ = self.db_manager.add_project("Sidecar Saved Lore Table Views", "")
        world_id = self.db_manager.create_world(project_uuid, "Duskfen")

        empty_response = self.sidecar._handle_request(
            {"action": "list_lore_table_views", "data": {"projectId": project_uuid, "worldId": world_id}}
        )
        self.assertEqual(empty_response["status"], "ok")
        self.assertEqual(empty_response["views"], [])

        create_response = self.sidecar._handle_request(
            {
                "action": "create_lore_table_view",
                "data": {
                    "projectId": project_uuid,
                    "worldId": world_id,
                    "name": "Characters",
                    "loreTypeId": "type-character",
                    "quickFilter": "active",
                    "sortKey": "field-age",
                    "sortDirection": "desc",
                    "visibleColumnsJson": json.dumps(["field-species", "field-age"]),
                },
            }
        )
        self.assertEqual(create_response["status"], "ok")
        view_id = create_response["viewId"]

        self.sidecar._handle_request(
            {
                "action": "update_lore_table_view",
                "data": {
                    "projectId": project_uuid,
                    "viewId": view_id,
                    "name": "Characters by Age",
                },
            }
        )
        preserved_response = self.sidecar._handle_request(
            {"action": "list_lore_table_views", "data": {"projectId": project_uuid, "worldId": world_id}}
        )
        preserved = preserved_response["views"][0]
        self.assertEqual(preserved["name"], "Characters by Age")
        self.assertEqual(preserved["quickFilter"], "active")
        self.assertEqual(preserved["sortKey"], "field-age")
        self.assertEqual(json.loads(preserved["visibleColumnsJson"]), ["field-species", "field-age"])

        self.sidecar._handle_request(
            {
                "action": "update_lore_table_view",
                "data": {
                    "projectId": project_uuid,
                    "viewId": view_id,
                    "visibleColumnsJson": json.dumps(["field-status"]),
                },
            }
        )
        visibility_response = self.sidecar._handle_request(
            {"action": "list_lore_table_views", "data": {"projectId": project_uuid, "worldId": world_id}}
        )
        visibility = visibility_response["views"][0]
        self.assertEqual(json.loads(visibility["visibleColumnsJson"]), ["field-status"])

        self.sidecar._handle_request(
            {
                "action": "update_lore_table_view",
                "data": {
                    "projectId": project_uuid,
                    "viewId": view_id,
                    "quickFilter": None,
                    "sortKey": None,
                    "sortDirection": None,
                    "visibleColumnsJson": None,
                },
            }
        )
        cleared_response = self.sidecar._handle_request(
            {"action": "list_lore_table_views", "data": {"projectId": project_uuid, "worldId": world_id}}
        )
        cleared = cleared_response["views"][0]
        self.assertIsNone(cleared["quickFilter"])
        self.assertIsNone(cleared["sortKey"])
        self.assertIsNone(cleared["sortDirection"])
        self.assertIsNone(cleared["visibleColumnsJson"])

        delete_response = self.sidecar._handle_request(
            {"action": "delete_lore_table_view", "data": {"projectId": project_uuid, "viewId": view_id}}
        )
        self.assertEqual(delete_response["status"], "ok")
        final_response = self.sidecar._handle_request(
            {"action": "list_lore_table_views", "data": {"projectId": project_uuid, "worldId": world_id}}
        )
        self.assertEqual(final_response["views"], [])

    def test_sidecar_updates_preserve_omitted_fields_and_clear_explicit_nulls(self):
        project_uuid, _ = self.db_manager.add_project("Sidecar Nullable Fields", "")
        world_id = self.db_manager.create_world(project_uuid, "Duskfen")
        lore_id = self.db_manager.create_lore_page(
            project_uuid,
            world_id,
            "Mara Quill",
            "Character",
            tags_json="protagonist",
            fields_json='{"status":"active"}',
            cover_image_path="covers/mara.png",
        )
        document_id = self.db_manager.create_document(
            project_uuid,
            world_id,
            "Chapter 01",
            content_json="Draft text",
            folder_path="Scenes",
        )
        relationship_id = self.db_manager.create_relationship(
            project_uuid,
            world_id,
            lore_id,
            lore_id,
            "self",
            notes="Intentional test relationship",
        )
        event_id = self.db_manager.create_timeline_event(
            project_uuid,
            world_id,
            "The Quiet Arrival",
            event_date="847 AE",
            event_type="arrival",
            linked_page_id=lore_id,
            description="Mara arrives in Duskfen.",
        )

        preserve_document_response = self.sidecar._handle_request(
            {
                "action": "update_document",
                "data": {
                    "projectId": project_uuid,
                    "documentId": document_id,
                    "title": "Chapter 01 Revised",
                },
            }
        )
        self.assertEqual(preserve_document_response["status"], "ok")
        document = self.db_manager.list_documents(project_uuid, world_id)[0]
        self.assertEqual(document[2], "Chapter 01 Revised")
        self.assertEqual(document[3], "Draft text")
        self.assertEqual(document[4], "Scenes")

        self.sidecar._handle_request(
            {
                "action": "update_document",
                "data": {
                    "projectId": project_uuid,
                    "documentId": document_id,
                    "contentJson": None,
                    "folderPath": None,
                },
            }
        )
        document = self.db_manager.list_documents(project_uuid, world_id)[0]
        self.assertIsNone(document[3])
        self.assertIsNone(document[4])

        self.sidecar._handle_request(
            {
                "action": "update_lore_page",
                "data": {
                    "projectId": project_uuid,
                    "loreId": lore_id,
                    "tagsJson": None,
                    "fieldsJson": None,
                    "coverImagePath": None,
                },
            }
        )
        lore_page = self.db_manager.list_lore_pages(project_uuid, world_id)[0]
        self.assertIsNone(lore_page[4])
        self.assertIsNone(lore_page[5])
        self.assertIsNone(lore_page[6])

        self.sidecar._handle_request(
            {
                "action": "update_relationship",
                "data": {
                    "projectId": project_uuid,
                    "relationshipId": relationship_id,
                    "notes": None,
                },
            }
        )
        relationship = self.db_manager.list_relationships(project_uuid, world_id)[0]
        self.assertIsNone(relationship[5])

        self.sidecar._handle_request(
            {
                "action": "update_timeline_event",
                "data": {
                    "projectId": project_uuid,
                    "eventId": event_id,
                    "eventDate": None,
                    "eventType": None,
                    "linkedPageId": None,
                    "description": None,
                },
            }
        )
        event = self.db_manager.list_timeline_events(project_uuid, world_id)[0]
        self.assertIsNone(event[3])
        self.assertIsNone(event[4])
        self.assertIsNone(event[5])
        self.assertIsNone(event[6])

    def test_sidecar_request_flow_persists_project_entities(self):
        create_response = self.sidecar._handle_request(
            {
                "action": "create_project",
                "data": {
                    "title": "Sidecar Project",
                    "filepath": str(self.temp_path / "sidecar.worldie"),
                },
            }
        )
        self.assertEqual(create_response["status"], "ok")
        project = create_response["project"]
        project_id = project["id"]
        self.assertEqual(Path(project["filepath"]), (self.temp_path / "sidecar.worldie").resolve())

        create_world_response = self.sidecar._handle_request(
            {"action": "create_world", "data": {"projectId": project_id, "title": "Emberfall"}}
        )
        self.assertEqual(create_world_response["status"], "ok")
        world_id = create_world_response["worldId"]

        create_document_response = self.sidecar._handle_request(
            {
                "action": "create_document",
                "data": {"projectId": project_id, "worldId": world_id, "title": "Arrival"},
            }
        )
        self.assertEqual(create_document_response["status"], "ok")
        document_id = create_document_response["documentId"]

        self.sidecar._handle_request(
            {
                "action": "update_document",
                "data": {
                    "projectId": project_id,
                    "documentId": document_id,
                    "contentJson": "Smoke drifted over the harbor.",
                    "folderPath": "Scenes",
                },
            }
        )

        documents_response = self.sidecar._handle_request(
            {"action": "list_documents", "data": {"projectId": project_id, "worldId": world_id}}
        )
        self.assertEqual(documents_response["status"], "ok")
        self.assertEqual(len(documents_response["documents"]), 1)
        self.assertEqual(documents_response["documents"][0]["contentJson"], "Smoke drifted over the harbor.")

        lore_types = [
            {
                "id": "type-character",
                "name": "Character",
                "slug": "character",
                "icon": "C",
                "order": 0,
                "isSystem": True,
            }
        ]
        save_types_response = self.sidecar._handle_request(
            {"action": "save_lore_types", "data": {"projectId": project_id, "loreTypes": lore_types}}
        )
        self.assertEqual(save_types_response["status"], "ok")

        templates = [
            {
                "id": "template-character",
                "name": "Hero",
                "loreTypeId": "type-character",
                "traitDefinitionsJson": '[{"id":"trait-role","label":"Role","order":0}]',
            }
        ]
        save_templates_response = self.sidecar._handle_request(
            {"action": "save_lore_templates", "data": {"projectId": project_id, "templates": templates}}
        )
        self.assertEqual(save_templates_response["status"], "ok")

        list_types_response = self.sidecar._handle_request(
            {"action": "list_lore_types", "data": {"projectId": project_id}}
        )
        self.assertEqual(len(list_types_response["loreTypes"]), 1)
        self.assertEqual(list_types_response["loreTypes"][0]["slug"], "character")

        list_templates_response = self.sidecar._handle_request(
            {"action": "list_lore_templates", "data": {"projectId": project_id}}
        )
        self.assertEqual(len(list_templates_response["templates"]), 1)
        self.assertEqual(list_templates_response["templates"][0]["name"], "Hero")

    def test_lore_type_field_definitions_persist_update_clear_and_preserve_omitted(self):
        project_uuid, _ = self.db_manager.add_project("Lore Type Field Definitions", "")
        field_definitions = [
            {
                "id": "field-age",
                "name": "Age",
                "key": "age",
                "type": "number",
                "options": [],
                "required": False,
                "order": 1,
            },
            {
                "id": "field-status",
                "name": "Status",
                "key": "status",
                "type": "select",
                "options": ["Active", "Missing"],
                "required": True,
                "order": 0,
            },
        ]
        self.db_manager.replace_lore_types(
            project_uuid,
            [
                {
                    "id": "type-character",
                    "name": "Character",
                    "slug": "character",
                    "icon": "C",
                    "order": 0,
                    "isSystem": True,
                    "fieldDefinitions": field_definitions,
                }
            ],
        )

        listed = self.db_manager.list_lore_types(project_uuid)
        self.assertEqual(len(listed), 1)
        self.assertEqual(json.loads(listed[0][4])[0]["id"], "field-age")

        self.db_manager.replace_lore_types(
            project_uuid,
            [
                {
                    "id": "type-character",
                    "name": "Character Revised",
                    "slug": "character",
                    "icon": "C",
                    "order": 0,
                    "isSystem": True,
                }
            ],
        )
        preserved = self.db_manager.list_lore_types(project_uuid)
        self.assertEqual(preserved[0][1], "Character Revised")
        self.assertEqual(json.loads(preserved[0][4])[1]["name"], "Status")

        updated_definitions = [
            {
                **field_definitions[0],
                "name": "Current age",
                "order": 0,
            }
        ]
        self.db_manager.replace_lore_types(
            project_uuid,
            [
                {
                    "id": "type-character",
                    "name": "Character Revised",
                    "slug": "character",
                    "icon": "C",
                    "order": 0,
                    "isSystem": True,
                    "fieldDefinitions": updated_definitions,
                }
            ],
        )
        updated = self.db_manager.list_lore_types(project_uuid)
        self.assertEqual(json.loads(updated[0][4])[0]["name"], "Current age")

        self.db_manager.replace_lore_types(
            project_uuid,
            [
                {
                    "id": "type-character",
                    "name": "Character Revised",
                    "slug": "character",
                    "icon": "C",
                    "order": 0,
                    "isSystem": True,
                    "fieldDefinitions": None,
                }
            ],
        )
        cleared = self.db_manager.list_lore_types(project_uuid)
        self.assertIsNone(cleared[0][4])

    def test_sidecar_lore_type_field_definitions_load_empty_for_legacy_and_clear_explicit_nulls(self):
        project_uuid, _ = self.db_manager.add_project("Sidecar Field Definitions", "")
        self.db_manager.replace_lore_types(
            project_uuid,
            [
                {
                    "id": "type-place",
                    "name": "Place",
                    "slug": "place",
                    "icon": "P",
                    "order": 0,
                    "isSystem": False,
                }
            ],
        )

        legacy_response = self.sidecar._handle_request(
            {"action": "list_lore_types", "data": {"projectId": project_uuid}}
        )
        self.assertEqual(legacy_response["loreTypes"][0]["fieldDefinitions"], [])

        self.sidecar._handle_request(
            {
                "action": "save_lore_types",
                "data": {
                    "projectId": project_uuid,
                    "loreTypes": [
                        {
                            "id": "type-place",
                            "name": "Place",
                            "slug": "place",
                            "icon": "P",
                            "order": 0,
                            "isSystem": False,
                            "fieldDefinitions": [
                                {
                                    "id": "field-region",
                                    "name": "Region",
                                    "key": "region",
                                    "type": "text",
                                    "options": [],
                                    "required": False,
                                    "order": 0,
                                }
                            ],
                        }
                    ],
                },
            }
        )
        saved_response = self.sidecar._handle_request(
            {"action": "list_lore_types", "data": {"projectId": project_uuid}}
        )
        self.assertEqual(saved_response["loreTypes"][0]["fieldDefinitions"][0]["key"], "region")

        self.sidecar._handle_request(
            {
                "action": "save_lore_types",
                "data": {
                    "projectId": project_uuid,
                    "loreTypes": [
                        {
                            "id": "type-place",
                            "name": "Place",
                            "slug": "place",
                            "icon": "P",
                            "order": 0,
                            "isSystem": False,
                            "fieldDefinitions": None,
                        }
                    ],
                },
            }
        )
        cleared_response = self.sidecar._handle_request(
            {"action": "list_lore_types", "data": {"projectId": project_uuid}}
        )
        self.assertEqual(cleared_response["loreTypes"][0]["fieldDefinitions"], [])

    def test_sidecar_returns_structured_error_for_existing_create_project_filepath(self):
        existing_path = self.temp_path / "existing-sidecar.worldie"
        self.db_manager.add_project("Existing Project", str(existing_path))

        response = self.sidecar._handle_request(
            {
                "action": "create_project",
                "data": {"title": "Replacement Project", "filepath": str(existing_path)},
            }
        )

        self.assertEqual(response["status"], "error")
        self.assertEqual(response["message"], "Choose a new filepath for project creation.")

    def test_sidecar_project_file_actions_return_target_project(self):
        create_response = self.sidecar._handle_request(
            {
                "action": "create_project",
                "data": {
                    "title": "Targeted Project",
                    "filepath": str(self.temp_path / "targeted.worldie"),
                },
            }
        )
        self.assertEqual(create_response["status"], "ok")
        created_project = create_response["project"]

        open_response = self.sidecar._handle_request(
            {"action": "open_project", "data": {"filepath": str(self.temp_path / "targeted.worldie")}}
        )
        self.assertEqual(open_response["status"], "ok")
        self.assertEqual(open_response["project"]["id"], created_project["id"])
        self.assertEqual(Path(open_response["project"]["filepath"]), (self.temp_path / "targeted.worldie").resolve())

        copy_path = self.temp_path / "copies" / "targeted-copy.worldie"
        save_as_response = self.sidecar._handle_request(
            {"action": "save_project_as", "data": {"projectId": created_project["id"], "filepath": str(copy_path)}}
        )
        self.assertEqual(save_as_response["status"], "ok")
        self.assertEqual(Path(save_as_response["project"]["filepath"]), copy_path.resolve())
        self.assertNotEqual(save_as_response["project"]["id"], created_project["id"])

    def test_delete_world_cascades_world_scoped_content(self):
        project_uuid, _ = self.db_manager.add_project("Cascade Test", "")
        world_id = self.db_manager.create_world(project_uuid, "Valdris Prime")
        lore_id = self.db_manager.create_lore_page(project_uuid, world_id, "Red Harbor", "Place")
        self.db_manager.create_document(project_uuid, world_id, "Scene Notes")
        self.db_manager.create_relationship(project_uuid, world_id, lore_id, lore_id, "linked", "")
        self.db_manager.create_timeline_event(project_uuid, world_id, "Dock Fire", event_date="Late Spring")

        self.db_manager.delete_world(project_uuid, world_id)

        self.assertEqual(self.db_manager.list_worlds(project_uuid), [])
        self.assertEqual(self.db_manager.list_documents(project_uuid, world_id), [])
        self.assertEqual(self.db_manager.list_lore_pages(project_uuid, world_id), [])
        self.assertEqual(self.db_manager.list_relationships(project_uuid, world_id), [])
        self.assertEqual(self.db_manager.list_timeline_events(project_uuid, world_id), [])

    def test_save_project_as_preserves_lore_types_and_templates(self):
        project_uuid, _ = self.db_manager.add_project("Template World", "")
        self.db_manager.replace_lore_types(
            project_uuid,
            [
                {
                    "id": "type-faction",
                    "name": "Faction",
                    "slug": "faction",
                    "icon": "F",
                    "order": 0,
                    "isSystem": False,
                }
            ],
        )
        self.db_manager.replace_lore_templates(
            project_uuid,
            [
                {
                    "id": "template-faction",
                    "name": "Guild",
                    "loreTypeId": "type-faction",
                    "traitDefinitionsJson": '[{"id":"trait-goal","label":"Goal","order":0}]',
                }
            ],
        )

        copy_path = self.temp_path / "copies" / "template-world-copy.worldie"
        copied_project_uuid, _, _ = self.db_manager.save_project_as(project_uuid, str(copy_path))

        copied_types = self.db_manager.list_lore_types(copied_project_uuid)
        copied_templates = self.db_manager.list_lore_templates(copied_project_uuid)

        self.assertEqual(len(copied_types), 1)
        self.assertEqual(copied_types[0][1], "Faction")
        self.assertEqual(len(copied_templates), 1)
        self.assertEqual(copied_templates[0][1], "Guild")

    def test_save_project_as_rejects_same_filepath(self):
        project_uuid, project_path = self.db_manager.add_project("Same Path", "")

        with self.assertRaisesRegex(ValueError, "Choose a different project filepath for Save As."):
            self.db_manager.save_project_as(project_uuid, project_path)

    def test_save_project_as_backs_up_existing_destination_before_replace(self):
        project_uuid, _ = self.db_manager.add_project("Source Project", "")
        existing_path = self.temp_path / "existing-copy.worldie"
        existing_uuid, _ = self.db_manager.add_project("Existing Destination", str(existing_path))
        old_world_id = self.db_manager.create_world(existing_uuid, "Old World")
        source_world_id = self.db_manager.create_world(project_uuid, "Source World")

        reopened_uuid, reopened_title, reopened_path = self.db_manager.save_project_as(project_uuid, str(existing_path))

        self.assertEqual(reopened_uuid, existing_uuid)
        self.assertEqual(reopened_title, "Source Project")
        self.assertEqual(Path(reopened_path), existing_path.resolve())
        backups = list(existing_path.parent.glob("existing-copy.worldie.bak-*"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(self.db_manager._get_project_meta_title(str(backups[0])), "Existing Destination")
        self.assertEqual(self.db_manager.list_worlds(reopened_uuid)[0][0], source_world_id)
        self.assertEqual(self.db_manager.list_worlds(existing_uuid)[0][2], "Source World")
        self.assertNotIn(old_world_id, [row[0] for row in self.db_manager.list_worlds(existing_uuid)])

    def test_save_project_as_backup_failure_prevents_overwrite(self):
        project_uuid, _ = self.db_manager.add_project("Source Project", "")
        self.db_manager.create_world(project_uuid, "Source World")
        existing_path = self.temp_path / "existing-copy.worldie"
        existing_uuid, _ = self.db_manager.add_project("Existing Destination", str(existing_path))
        self.db_manager.create_world(existing_uuid, "Old World")
        original_bytes = existing_path.read_bytes()

        original_copy2 = self.db_manager.shutil.copy2

        def fail_destination_backup(src, dst, *args, **kwargs):
            if Path(src).resolve() == existing_path.resolve():
                raise OSError("backup failed")
            return original_copy2(src, dst, *args, **kwargs)

        with patch.object(self.db_manager.shutil, "copy2", side_effect=fail_destination_backup):
            with self.assertRaisesRegex(OSError, "backup failed"):
                self.db_manager.save_project_as(project_uuid, str(existing_path))

        self.assertEqual(existing_path.read_bytes(), original_bytes)
        self.assertEqual(self.db_manager._get_project_meta_title(str(existing_path)), "Existing Destination")
        self.assertEqual(self.db_manager.list_worlds(existing_uuid)[0][2], "Old World")
        self.assertEqual(list(existing_path.parent.glob("existing-copy.worldie.bak-*")), [])

    def test_save_project_as_copy_failure_does_not_corrupt_source_or_destination(self):
        project_uuid, source_path = self.db_manager.add_project("Source Project", "")
        existing_path = self.temp_path / "existing-copy.worldie"
        self.db_manager.add_project("Existing Destination", str(existing_path))
        source_bytes = Path(source_path).read_bytes()
        destination_bytes = existing_path.read_bytes()
        original_copy2 = self.db_manager.shutil.copy2

        def fail_source_copy(src, dst, *args, **kwargs):
            if Path(src).resolve() == Path(source_path).resolve():
                raise OSError("copy failed")
            return original_copy2(src, dst, *args, **kwargs)

        with patch.object(self.db_manager.shutil, "copy2", side_effect=fail_source_copy):
            with self.assertRaisesRegex(OSError, "copy failed"):
                self.db_manager.save_project_as(project_uuid, str(existing_path))

        self.assertEqual(Path(source_path).read_bytes(), source_bytes)
        self.assertEqual(existing_path.read_bytes(), destination_bytes)
        self.assertEqual(list(existing_path.parent.glob("existing-copy.worldie.bak-*")), [])

    def test_export_world_markdown_writes_documents_lore_and_index(self):
        project_uuid, project_path = self.db_manager.add_project("Iron Age: Chronicles", "")
        world_id = self.db_manager.create_world(project_uuid, "Duskfen/Marsh", "A wet and watchful borderland.")
        doc_id = self.db_manager.create_document(project_uuid, world_id, "Chapter: 01 / Arrival?")
        self.db_manager.replace_lore_types(
            project_uuid,
            [
                {
                    "id": "type-character",
                    "name": "Character",
                    "slug": "character",
                    "icon": "C",
                    "order": 0,
                    "isSystem": True,
                    "fieldDefinitions": [
                        {
                            "id": "field-faction",
                            "name": "Faction",
                            "key": "faction",
                            "type": "text",
                            "options": [],
                            "required": False,
                            "order": 0,
                        },
                        {
                            "id": "field-age",
                            "name": "Age",
                            "key": "age",
                            "type": "number",
                            "options": [],
                            "required": False,
                            "order": 1,
                        },
                    ],
                }
            ],
        )
        self.db_manager.update_document(
            project_uuid,
            doc_id,
            content_json="Mara enters [[Red Harbor]] with a sealed letter.",
            folder_path="Scenes/Act: 1",
        )
        lore_id = self.db_manager.create_lore_page(
            project_uuid,
            world_id,
            "Mara: Quill*",
            "Character",
            tags_json="courier, protagonist",
            fields_json=json.dumps(
                {
                    "traits": [{"name": "Goal", "value": "Find [[Red Harbor]] answers"}],
                    "details": "Knows the [[Ashwake Company]].",
                    "customFields": {
                        "age": 31,
                        "faction": "Ashwake Company",
                        "Active": True,
                        "Cleared field": None,
                    },
                }
            ),
        )

        source_bytes = Path(project_path).read_bytes()
        result = self.db_manager.export_world_markdown(project_uuid, world_id, str(self.temp_path / "exports"))

        self.assertEqual(result["projectTitle"], "Iron Age: Chronicles")
        self.assertEqual(result["worldTitle"], "Duskfen/Marsh")
        self.assertEqual(result["documentCount"], 1)
        self.assertEqual(result["lorePageCount"], 1)
        self.assertEqual(result["relationshipCount"], 0)
        self.assertEqual(result["timelineEventCount"], 0)
        self.assertTrue(Path(result["exportPath"]).is_dir())
        self.assertEqual(Path(project_path).read_bytes(), source_bytes)

        index_path = Path(result["exportPath"]) / "index.md"
        self.assertTrue(index_path.exists())
        index_text = index_path.read_text(encoding="utf-8")
        self.assertIn("# Duskfen/Marsh", index_text)
        self.assertIn("Documents: 1", index_text)
        self.assertIn("Lore pages: 1", index_text)

        document_files = [Path(file["path"]) for file in result["files"] if file["kind"] == "document"]
        lore_files = [Path(file["path"]) for file in result["files"] if file["kind"] == "lore"]
        self.assertEqual(len(document_files), 1)
        self.assertEqual(len(lore_files), 1)
        self.assertIn("Scenes", document_files[0].parts)
        self.assertIn("Act- 1", document_files[0].parts)
        self.assertEqual(document_files[0].name, "Chapter- 01 - Arrival.md")
        self.assertEqual(lore_files[0].name, "Mara- Quill.md")

        document_text = document_files[0].read_text(encoding="utf-8")
        lore_text = lore_files[0].read_text(encoding="utf-8")
        self.assertIn("# Chapter: 01 / Arrival?", document_text)
        self.assertIn("[[Red Harbor]]", document_text)
        self.assertIn("# Mara: Quill*", lore_text)
        self.assertIn("Tags: courier, protagonist", lore_text)
        self.assertIn("## Custom Fields", lore_text)
        self.assertIn("- **Age:** 31", lore_text)
        self.assertIn("- **Faction:** Ashwake Company", lore_text)
        self.assertIn("- **Active:** true", lore_text)
        self.assertLess(lore_text.index("- **Faction:** Ashwake Company"), lore_text.index("- **Age:** 31"))
        self.assertLess(lore_text.index("- **Age:** 31"), lore_text.index("- **Active:** true"))
        self.assertNotIn("Cleared field", lore_text)
        self.assertIn("- **Goal:** Find [[Red Harbor]] answers", lore_text)
        self.assertIn("Knows the [[Ashwake Company]].", lore_text)
        self.assertIn(lore_id, [row[0] for row in self.db_manager.list_lore_pages(project_uuid, world_id)])

    def test_export_world_markdown_dedupes_duplicate_titles(self):
        project_uuid, _ = self.db_manager.add_project("Duplicate Export", "")
        world_id = self.db_manager.create_world(project_uuid, "Mirror World")
        first_doc = self.db_manager.create_document(project_uuid, world_id, "Scene")
        second_doc = self.db_manager.create_document(project_uuid, world_id, "Scene")
        self.db_manager.update_document(project_uuid, first_doc, content_json="First scene.")
        self.db_manager.update_document(project_uuid, second_doc, content_json="Second scene.")

        result = self.db_manager.export_world_markdown(project_uuid, world_id, str(self.temp_path / "exports"))

        document_names = sorted(Path(file["path"]).name for file in result["files"] if file["kind"] == "document")
        self.assertEqual(document_names, ["Scene-2.md", "Scene.md"])

    def test_export_world_markdown_writes_relationships_and_timeline(self):
        project_uuid, project_path = self.db_manager.add_project("World Bible", "")
        world_id = self.db_manager.create_world(project_uuid, "Emberfall")
        mara_id = self.db_manager.create_lore_page(project_uuid, world_id, "Mara Quill", "Character")
        harbor_id = self.db_manager.create_lore_page(project_uuid, world_id, "Red Harbor", "Place")
        self.db_manager.create_relationship(
            project_uuid,
            world_id,
            mara_id,
            harbor_id,
            "investigates",
            "Mara follows clues toward [[Red Harbor]].",
        )
        self.db_manager.create_relationship(
            project_uuid,
            world_id,
            "missing-source",
            harbor_id,
            "rumored",
            "A missing source should not break export.",
        )
        first_event = self.db_manager.create_timeline_event(
            project_uuid,
            world_id,
            "Arrival",
            event_date="847 AE",
            event_type="arrival",
            linked_page_id=mara_id,
            description="Mara reaches [[Red Harbor]].",
        )
        self.db_manager.create_timeline_event(
            project_uuid,
            world_id,
            "Founding",
            event_date="102 AE",
            event_type="founding",
            linked_page_id="missing-lore",
            description="Old records mention a vanished founder.",
        )
        source_bytes = Path(project_path).read_bytes()

        result = self.db_manager.export_world_markdown(project_uuid, world_id, str(self.temp_path / "exports"))

        self.assertEqual(result["relationshipCount"], 2)
        self.assertEqual(result["timelineEventCount"], 2)
        self.assertEqual(Path(project_path).read_bytes(), source_bytes)

        relationship_files = [Path(file["path"]) for file in result["files"] if file["kind"] == "relationship"]
        timeline_files = [Path(file["path"]) for file in result["files"] if file["kind"] == "timeline"]
        self.assertEqual(len(relationship_files), 2)
        self.assertEqual(len(timeline_files), 2)

        relationship_text = "\n".join(path.read_text(encoding="utf-8") for path in relationship_files)
        self.assertIn("# Mara Quill - investigates - Red Harbor", relationship_text)
        self.assertIn("Source: Mara Quill", relationship_text)
        self.assertIn("Target: Red Harbor", relationship_text)
        self.assertIn("Type: investigates", relationship_text)
        self.assertIn("Mara follows clues toward [[Red Harbor]].", relationship_text)
        self.assertIn("Missing lore (missing-source)", relationship_text)

        timeline_text = "\n".join(path.read_text(encoding="utf-8") for path in timeline_files)
        self.assertIn("# Arrival", timeline_text)
        self.assertIn("Date: 847 AE", timeline_text)
        self.assertIn("Type: arrival", timeline_text)
        self.assertIn("Linked lore: Mara Quill", timeline_text)
        self.assertIn("Mara reaches [[Red Harbor]].", timeline_text)
        self.assertIn("Linked lore: Missing lore (missing-lore)", timeline_text)
        self.assertIn(first_event, [row[0] for row in self.db_manager.list_timeline_events(project_uuid, world_id)])

        index_text = (Path(result["exportPath"]) / "index.md").read_text(encoding="utf-8")
        self.assertIn("Relationships: 2", index_text)
        self.assertIn("Timeline events: 2", index_text)
        self.assertIn("## Relationships", index_text)
        self.assertIn("## Timeline", index_text)
        self.assertLess(index_text.index("[Founding]"), index_text.index("[Arrival]"))

    def test_export_world_markdown_dedupes_duplicate_relationship_and_timeline_titles(self):
        project_uuid, _ = self.db_manager.add_project("Duplicate World Bible", "")
        world_id = self.db_manager.create_world(project_uuid, "Mirror World")
        source_id = self.db_manager.create_lore_page(project_uuid, world_id, "Source", "Character")
        target_id = self.db_manager.create_lore_page(project_uuid, world_id, "Target", "Character")
        self.db_manager.create_relationship(project_uuid, world_id, source_id, target_id, "knows", "First.")
        self.db_manager.create_relationship(project_uuid, world_id, source_id, target_id, "knows", "Second.")
        self.db_manager.create_timeline_event(project_uuid, world_id, "Discovery", event_date="2 AE")
        self.db_manager.create_timeline_event(project_uuid, world_id, "Discovery", event_date="3 AE")

        result = self.db_manager.export_world_markdown(project_uuid, world_id, str(self.temp_path / "exports"))

        relationship_names = sorted(Path(file["path"]).name for file in result["files"] if file["kind"] == "relationship")
        timeline_names = sorted(Path(file["path"]).name for file in result["files"] if file["kind"] == "timeline")
        self.assertEqual(relationship_names, ["Source - knows - Target-2.md", "Source - knows - Target.md"])
        self.assertEqual(timeline_names, ["Discovery-2.md", "Discovery.md"])

    def test_export_project_markdown_writes_project_index_and_world_folders(self):
        project_uuid, project_path = self.db_manager.add_project("Atlas: Project", "")
        emberfall_id = self.db_manager.create_world(project_uuid, "Emberfall")
        glass_coast_id = self.db_manager.create_world(project_uuid, "Glass/Coast")
        mara_id = self.db_manager.create_lore_page(project_uuid, emberfall_id, "Mara Quill", "Character")
        harbor_id = self.db_manager.create_lore_page(project_uuid, emberfall_id, "Red Harbor", "Place")
        doc_id = self.db_manager.create_document(project_uuid, emberfall_id, "Chapter 01")
        self.db_manager.update_document(project_uuid, doc_id, content_json="Mara visits [[Red Harbor]].")
        self.db_manager.create_relationship(project_uuid, emberfall_id, mara_id, harbor_id, "visits", "Route notes.")
        self.db_manager.create_timeline_event(project_uuid, emberfall_id, "Arrival", event_date="847 AE")
        self.db_manager.create_document(project_uuid, glass_coast_id, "Coast Notes")
        self.db_manager.create_lore_page(project_uuid, glass_coast_id, "Salt Market", "Place")
        source_bytes = Path(project_path).read_bytes()

        result = self.db_manager.export_project_markdown(project_uuid, str(self.temp_path / "exports"))

        self.assertEqual(result["projectTitle"], "Atlas: Project")
        self.assertEqual(result["worldCount"], 2)
        self.assertEqual(result["documentCount"], 2)
        self.assertEqual(result["lorePageCount"], 3)
        self.assertEqual(result["relationshipCount"], 1)
        self.assertEqual(result["timelineEventCount"], 1)
        self.assertEqual(Path(project_path).read_bytes(), source_bytes)

        export_path = Path(result["exportPath"])
        self.assertEqual(export_path.name, "Atlas- Project")
        self.assertTrue((export_path / "index.md").exists())
        self.assertTrue((export_path / "Emberfall" / "index.md").exists())
        self.assertTrue((export_path / "Glass-Coast" / "index.md").exists())
        self.assertTrue((export_path / "Emberfall" / "Documents" / "Chapter 01.md").exists())
        self.assertTrue((export_path / "Emberfall" / "Relationships").is_dir())
        self.assertTrue((export_path / "Emberfall" / "Timeline").is_dir())

        index_text = (export_path / "index.md").read_text(encoding="utf-8")
        self.assertIn("# Atlas: Project", index_text)
        self.assertIn("Worlds: 2", index_text)
        self.assertIn("Documents: 2", index_text)
        self.assertIn("Lore pages: 3", index_text)
        self.assertIn("Relationships: 1", index_text)
        self.assertIn("Timeline events: 1", index_text)
        self.assertIn("[Emberfall](Emberfall/index.md)", index_text)
        self.assertIn("[Glass/Coast](Glass-Coast/index.md)", index_text)

    def test_export_project_markdown_dedupes_duplicate_world_folder_names(self):
        project_uuid, _ = self.db_manager.add_project("Duplicate Worlds", "")
        self.db_manager.create_world(project_uuid, "Mirror/World")
        self.db_manager.create_world(project_uuid, "Mirror:World")

        result = self.db_manager.export_project_markdown(project_uuid, str(self.temp_path / "exports"))

        export_path = Path(result["exportPath"])
        world_folders = sorted(path.name for path in export_path.iterdir() if path.is_dir())
        self.assertEqual(world_folders, ["Mirror-World", "Mirror-World-2"])
        index_text = (export_path / "index.md").read_text(encoding="utf-8")
        self.assertIn("Mirror-World/index.md", index_text)
        self.assertIn("Mirror-World-2/index.md", index_text)

    def test_export_lore_table_csv_writes_utf8_sanitized_and_deduped_files(self):
        export_root = self.temp_path / "csv-exports"
        csv_text = 'Name,Type\n"Mara, ""Ash""",Character\nRune,Place\n'

        result = self.db_manager.export_lore_table_csv(
            str(export_root),
            "Dusk/Fen: Character Table.csv",
            csv_text,
        )
        duplicate = self.db_manager.export_lore_table_csv(
            str(export_root),
            "Dusk/Fen: Character Table.csv",
            "Name,Type\nSecond,Character\n",
        )

        exported_path = Path(result["exportPath"])
        duplicate_path = Path(duplicate["exportPath"])
        self.assertEqual(exported_path.name, "Dusk-Fen- Character Table.csv")
        self.assertEqual(duplicate_path.name, "Dusk-Fen- Character Table-2.csv")
        self.assertEqual(exported_path.read_text(encoding="utf-8"), csv_text)
        self.assertEqual(duplicate_path.read_text(encoding="utf-8"), "Name,Type\nSecond,Character\n")

    def test_sidecar_exports_project_markdown_with_metadata(self):
        project_uuid, _ = self.db_manager.add_project("Sidecar Project Export", "")
        world_id = self.db_manager.create_world(project_uuid, "Test World")
        self.db_manager.create_document(project_uuid, world_id, "Scene")

        response = self.sidecar._handle_request(
            {
                "action": "export_project_markdown",
                "data": {
                    "projectId": project_uuid,
                    "exportRoot": str(self.temp_path / "exports"),
                },
            }
        )

        self.assertEqual(response["status"], "ok")
        export = response["export"]
        self.assertEqual(export["worldCount"], 1)
        self.assertEqual(export["documentCount"], 1)
        self.assertEqual(export["lorePageCount"], 0)
        self.assertEqual(export["relationshipCount"], 0)
        self.assertEqual(export["timelineEventCount"], 0)
        self.assertTrue(Path(export["exportPath"]).exists())
        self.assertIn("index.md", [file["relativePath"] for file in export["files"]])

    def test_sidecar_export_project_markdown_requires_target_data(self):
        response = self.sidecar._handle_request({"action": "export_project_markdown", "data": {}})

        self.assertEqual(response["status"], "error")
        self.assertEqual(response["message"], "projectId and exportRoot required")

    def test_sidecar_export_lore_table_csv_requires_target_data(self):
        response = self.sidecar._handle_request({"action": "export_lore_table_csv", "data": {}})

        self.assertEqual(response["status"], "error")
        self.assertEqual(response["message"], "exportRoot, filename, and csvText required")

    def test_sidecar_exports_world_markdown_with_metadata(self):
        project_uuid, _ = self.db_manager.add_project("Sidecar Export", "")
        world_id = self.db_manager.create_world(project_uuid, "Test World")
        self.db_manager.create_document(project_uuid, world_id, "Scene")

        response = self.sidecar._handle_request(
            {
                "action": "export_world_markdown",
                "data": {
                    "projectId": project_uuid,
                    "worldId": world_id,
                    "exportRoot": str(self.temp_path / "exports"),
                },
            }
        )

        self.assertEqual(response["status"], "ok")
        export = response["export"]
        self.assertEqual(export["documentCount"], 1)
        self.assertEqual(export["lorePageCount"], 0)
        self.assertEqual(export["relationshipCount"], 0)
        self.assertEqual(export["timelineEventCount"], 0)
        self.assertTrue(Path(export["exportPath"]).exists())
        self.assertIn("index.md", [file["relativePath"] for file in export["files"]])

    def test_sidecar_export_world_markdown_requires_target_data(self):
        response = self.sidecar._handle_request({"action": "export_world_markdown", "data": {}})

        self.assertEqual(response["status"], "error")
        self.assertEqual(response["message"], "projectId, worldId, and exportRoot required")

    def test_open_project_uses_filename_when_project_meta_is_untitled(self):
        manual_path = self.temp_path / "manual" / "ashen-sky.worldie"
        self.db_manager._init_project_db(str(manual_path), create_if_missing=True)
        self.db_manager._set_project_meta_title(str(manual_path), "Untitled Project")

        reopened_uuid, reopened_title, reopened_path = self.db_manager.open_project(str(manual_path))

        self.assertEqual(reopened_title, "ashen-sky")
        self.assertEqual(Path(reopened_path), manual_path.resolve())
        registry_projects = self.db_manager.get_all_projects()
        self.assertEqual(len(registry_projects), 1)
        self.assertEqual(registry_projects[0][0], reopened_uuid)
        self.assertEqual(registry_projects[0][1], "ashen-sky")

    def test_open_project_reuses_registry_entry_for_windows_case_variant_path(self):
        if os.name != "nt":
            self.skipTest("Windows path normalization behavior only applies on nt")

        project_path = self.temp_path / "manual" / "mistvale.worldie"
        created_uuid, _ = self.db_manager.add_project("Mistvale", str(project_path))

        reopened_uuid, reopened_title, reopened_path = self.db_manager.open_project(str(project_path).upper())

        self.assertEqual(reopened_uuid, created_uuid)
        self.assertEqual(reopened_title, "Mistvale")
        self.assertEqual(Path(reopened_path), project_path.resolve())
        self.assertEqual(len(self.db_manager.get_all_projects()), 1)

    def test_sidecar_returns_structured_error_when_project_file_is_missing_for_world_actions(self):
        project_uuid, project_path = self.db_manager.add_project("Missing File Project", "")
        os.remove(project_path)

        response = self.sidecar._handle_request(
            {"action": "create_world", "data": {"projectId": project_uuid, "title": "Broken World"}}
        )

        self.assertEqual(response["status"], "error")
        self.assertIn(Path(project_path).name, response["message"])
        self.assertFalse(Path(project_path).exists())

    def test_delete_project_removes_registry_entry_even_if_project_file_is_missing(self):
        project_uuid, project_path = self.db_manager.add_project("Deleted Missing File", "")
        os.remove(project_path)

        self.db_manager.delete_project(project_uuid)

        self.assertEqual(self.db_manager.get_all_projects(), [])

    def test_sidecar_delete_project_succeeds_when_project_file_is_missing(self):
        project_uuid, project_path = self.db_manager.add_project("Sidecar Missing Delete", "")
        os.remove(project_path)

        response = self.sidecar._handle_request(
            {"action": "delete_project", "data": {"projectId": project_uuid}}
        )

        self.assertEqual(response["status"], "ok")
        self.assertEqual(response["projects"], [])

    def test_sidecar_returns_structured_error_for_unknown_project_id(self):
        response = self.sidecar._handle_request(
            {"action": "list_worlds", "data": {"projectId": "missing-project"}}
        )

        self.assertEqual(response["status"], "error")
        self.assertEqual(response["message"], "Project not found: missing-project")

    def test_sidecar_returns_structured_error_for_missing_project_file(self):
        missing_path = self.temp_path / "missing" / "does-not-exist.worldie"
        response = self.sidecar._handle_request(
            {"action": "open_project", "data": {"filepath": str(missing_path)}}
        )

        self.assertEqual(response["status"], "error")
        self.assertIn("does-not-exist.worldie", response["message"])

    def test_sidecar_returns_structured_error_for_same_path_save_as(self):
        project_uuid, project_path = self.db_manager.add_project("Duplicate Path", "")
        response = self.sidecar._handle_request(
            {"action": "save_project_as", "data": {"projectId": project_uuid, "filepath": project_path}}
        )

        self.assertEqual(response["status"], "error")
        self.assertEqual(response["message"], "Choose a different project filepath for Save As.")

    def test_sidecar_save_as_replaces_existing_destination_with_backup(self):
        project_uuid, _ = self.db_manager.add_project("Source Copy", "")
        existing_path = self.temp_path / "existing-sidecar-copy.worldie"
        existing_uuid, _ = self.db_manager.add_project("Existing Copy", str(existing_path))
        response = self.sidecar._handle_request(
            {"action": "save_project_as", "data": {"projectId": project_uuid, "filepath": str(existing_path)}}
        )

        self.assertEqual(response["status"], "ok")
        self.assertEqual(response["project"]["id"], existing_uuid)
        self.assertEqual(Path(response["project"]["filepath"]), existing_path.resolve())
        self.assertEqual(len(list(existing_path.parent.glob("existing-sidecar-copy.worldie.bak-*"))), 1)

    def test_sidecar_main_returns_error_payload_when_request_read_fails(self):
        with patch.object(self.sidecar, "_read_request", side_effect=ValueError("bad request payload")):
            with patch("sys.stdout", new=io.StringIO()) as stdout:
                self.sidecar.main()

        response = json.loads(stdout.getvalue())
        self.assertEqual(response["status"], "error")
        self.assertEqual(response["message"], "bad request payload")

    def test_db_init_supports_paths_without_parent_directory_components(self):
        original_cwd = Path.cwd()
        try:
            os.chdir(self.temp_path)
            self.db_manager.REGISTRY_DB_PATH = "projects_registry.db"
            registry_path = Path(self.db_manager.REGISTRY_DB_PATH).resolve()
            project_path = Path("local.worldie").resolve()

            self.db_manager.init_db()
            self.db_manager._init_project_db("local.worldie", create_if_missing=True)

            self.assertTrue(registry_path.exists())
            self.assertTrue(project_path.exists())
        finally:
            os.chdir(original_cwd)


if __name__ == "__main__":
    unittest.main()
