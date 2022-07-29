import tkinter as tk
from tkinter import Menu, scrolledtext
from editor_window import Main


class Worldie:
    """Main Worldie Class"""

    def __init__(self, title):
        # Create Main Tk app, common widgets
        self.title = title
        self.worldie = tk.Tk()
        self.text_area = scrolledtext.ScrolledText(self.worldie)
        self.worldie_menu = Menu(self.worldie)

 

app = Worldie('Worlie')
app = Main(app.title, app.worldie, app.text_area, app.worldie_menu)

