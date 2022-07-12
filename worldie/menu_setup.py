import tkinter as tk
import sys
from tkinter import *
from tkinter import filedialog
from tkinter.filedialog import askopenfilename, asksaveasfilename

class Menu_Setup():
    """Class to create menu bar at top of tkinter"""
    def __init__(self, title, root, menu, text_area, actions):
        self.title = title
        self.window = root
        self.menu = menu
        self.text_area = text_area
        self.actions = actions
        self.no_file_opened_str = 'New File'
        self.currentPath = self.no_file_opened_str
        self.file_types = [("Text Document", "*.txt"), ("Markdown", "*.md")]


        # enable "open with" second argument passed
        if len(sys.argv) == 2:
            self.currentPath = sys.argv[1]

            self.window.title(f'{self.title} - ' + self.currentPath)

            with open(self.currentPath, 'r') as f:
                self.text_area.delete(1.0,END)
                self.text_area.text.insert(INSERT,f.read())


    def _file_drop_handler(self, action, text_area):
        """File menu drop down handler""" 

        # open a file       
        if action == "open":
            file = filedialog.askopenfilename(filetypes = self.file_types)
            self.window.title(self.title + ' - ' + file)
            self.currentPath = file
        
            with open(file, 'r') as f:
                text_area.delete(1.0,END)
                text_area.insert(INSERT, f.read())
        
        # Create a new file
        elif action == "new":
            self.currentPath = self.no_file_opened_str
            text_area.delete(1.0, END)
            self.window.title(self.title + ' - ' + self.currentPath)

        # Save file
        elif action == "save" or action == "saveAs":
            if self.currentPath == self.no_file_opened_str or action =='saveAs':
                self.currentPath = filedialog.asksaveasfilename(
                        defaultextension=".txt",
                        filetypes= self.file_types
                    )
            with open(self.currentPath, 'w') as f:
                f.write(text_area.get('1.0','end'))
            self.window.title(self.title + ' - ' + self.currentPath)
                        

        
    def _view_drop_handler(self):
        pass

class File_Drop(Menu_Setup):
    """Class to handle the File drop part of menu"""
    def __init__(self, title, root, menu, text_area, actions):
        super().__init__(title, root, menu, text_area, actions)
        self.file_drop = Menu(menu, tearoff=False)
        

    def add_to_file(self):
        for name, action in self.actions.items():
            print(name + action)
            self.file_drop.add_command(label=name,
                command=lambda: self._file_drop_handler(action, self.text_area))
        self.menu.add_cascade(label='File2', menu=self.file_drop)


class View_Drop(Menu_Setup):
    """Class to handle the View drop part of menu"""
    def __init__(self, menu, text_area, actions):
        super().__init__(menu, text_area, actions)

    def add_to_view(self):
        pass