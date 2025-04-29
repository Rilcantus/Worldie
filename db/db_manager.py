import sqlite3
from datetime import datetime

DB_PATH = 'db/worldie.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            filepath TEXT NOT NULL,
            last_edited TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def add_project(title, filepath):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO projects (title, filepath, last_edited)
        VALUES (?, ?, ?)
    ''', (title, filepath, datetime.now().isoformat()))
    conn.commit()
    conn.close()

def get_all_projects():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM projects')
    projects = c.fetchall()
    conn.close()
    return projects()