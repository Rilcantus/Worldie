import tkinter as tk

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
        self._setup()

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

        view = View_Drop(
            self.title,
            self.window,
            self.menu,
            self.text,
            view_actions
        )
        view.add_to_view()

    def _setup(self):
        """Setup for primary window for editor"""
        
        self._setup_main_window()
        self._setup_main_text()
        self._setup_main_frame()
        self._setup_main_menu()

        self.window.config(menu=self.menu)
        self.window.mainloop()

        
         

class Window:
    pass
