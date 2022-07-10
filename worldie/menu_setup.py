import tkinter as tk
from tkinter import *

class Menu_Setup():
    """Class to create menu bar at top of tkinter"""
    def __init__(self, menu, text_area, actions):
        self.menu = menu
        self.text_area = text_area
        self.actions = actions

    def _file_drop_handler(self):
        pass

    def _view_drop_handler(self):
        pass

class File_Drop(Menu_Setup):
    """Class to handle the File drop part of menu"""
    def __init__(self, menu, text_area, actions):
        super().__init__(menu, text_area, actions)
        file_drop = Menu(menu, tearoff=False)

    def add_to_file(self):
        for name, action in self.actions.items():
           self.menu.add_command(label=name)

        

class View_Drop(Menu_Setup):
    """Class to handle the View drop part of menu"""
    def __init__(self, menu, text_area, actions):
        super().__init__(menu, text_area, actions)

    def add_to_view(self):
        pass