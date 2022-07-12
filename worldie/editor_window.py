import tkinter as tk
import sys
import ctypes
from tkinter import INSERT, END, Menu, scrolledtext, filedialog
from tkinter.filedialog import askopenfilename, asksaveasfilename

from export_view import ExportData
from menu_setup import File_Drop, View_Drop


class Main:
    """Main view for Worldie"""
    def __init__(self, title, tk_root, text_root, menu_root):
        self.title = title
        self.window = tk_root
        self.text = text_root
        self.menu = menu_root 
        self.no_file_opened_str = 'New File'
        self.currentPath = self.no_file_opened_str
        self.file_types = [("Text Document", "*.txt"), ("Markdown", "*.md")]

        # Run set up script for main view
        # text is mains active text area
        text = self._setup()

        # enable "open with" second argument passed
        if len(sys.argv) == 2:
            self.currentPath = sys.argv[1]

            self.window.title(f'{self.title} - ' + self.currentPath)

            with open(self.currentPath, 'r') as f:
                text.delete(1.0,END)
                text.insert(INSERT,f.read())



    # Internal functions for Main view control

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


    def _view_drop_handler(self, action, text_area):
        """View menu drop down handler"""

        # export text from text_area
        if action == 'export':
            text = text_area.get('1.0','end')
            data = ExportData(text)
            

    def _setup_main_window(self):
        """Create Main window display"""

        self.window.title(f"{self.title}")
        self.window.rowconfigure(0, minsize=600, weight=1)
        self.window.columnconfigure(1, minsize=600, weight=1)

    def _setup_main_text(self):
        """Create Main text area"""

        txt_edit = self.text
        txt_edit.grid(row=0, column=1, sticky="nsew")

    def _setup_main_frame(self):
        """Create Main frame area on left side of text"""

        frm_connections = tk.Frame(self.window, bd=2)
        lbl_connections = tk.Label(frm_connections, text="Connections..", bd=2)

        frm_connections.grid(row=0, column=0, sticky="ns")
        lbl_connections.grid(row=0, column=0, sticky="n")

    def _setup_main_menu(self):
        """Create Main top meny widget"""
        # Create dict of possible file actions
        file_actions = {
            'New' : 'new',
            'Open' : 'open',
            'Save' : 'save', 
            'Save As' : 'saveAs',
        }
        # Create dict of possible view actions
        view_actions = {
            'Find Keys' : 'keys'
        }

        # create respective drop menus
        file = File_Drop(
            self.title,
            self.window,
            self.menu,
            self.text,
            file_actions
        )
        file.add_to_file()
        #View_Drop(view_drop, self.text, view_actions)


    def _setup(self):
        """Setup for primary window for editor"""
        
        self._setup_main_window()
        self._setup_main_text()
        self._setup_main_frame()
        self._setup_main_menu()

        # Create Menu widget
        menu = self.menu

        # Create File cascade
        file_dropdown = Menu(menu, tearoff=False)

        file_dropdown.add_command(label="New", command=lambda: self._file_drop_handler('new',self.text))
        file_dropdown.add_command(label="Open", command=lambda: self._file_drop_handler('open',self.text))

        file_dropdown.add_separator()
        file_dropdown.add_command(label="Save", command=lambda: self._file_drop_handler('save',self.text))
        file_dropdown.add_command(label="Save as", command=lambda: self._file_drop_handler('saveAs',self.text))
        #menu.add_cascade(label='File', menu=file_dropdown)

        # Create View cascade (Woldie specfic functions)
        view_dropdown = Menu(menu, tearoff=False)

        view_dropdown.add_command(label='Export Data', command=lambda: self._view_drop_handler('export',self.text))

        menu.add_cascade(label='View', menu=view_dropdown)

        self.window.config(menu=menu)
        self.window.mainloop()

        

        
         

class Window:
    pass
