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
