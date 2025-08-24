import sqlite3
import logging
import os
from typing import List
from contextlib import contextmanager

# Database configuration - can be overridden by environment variable
DATABASE_PATH = os.getenv("DATABASE_PATH", "stockdb.sqlite")

def init_database():
    """Initialize the database with the schema from stockdb.sql"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            # Check if table already exists
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='stock_data_daily'")
            table_exists = cursor.fetchone() is not None

            if not table_exists:
                # Read and execute the SQL schema only if table doesn't exist
                with open("stockdb.sql", "r") as f:
                    schema_sql = f.read()

                conn.executescript(schema_sql)
                conn.commit()
                logging.info("Database schema created successfully")
            else:
                logging.info("Database schema already exists - skipping initialization")

    except Exception as e:
        logging.error(f"Error initializing database: {e}")
        raise

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    conn = None
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row  # This allows dict-like access to rows
        yield conn
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Database error: {e}")
        raise
    finally:
        if conn:
            conn.close()

def execute_query(query: str, params: tuple = ()) -> List[dict]:
    """Execute a SELECT query and return results as list of dictionaries"""
    with get_db_connection() as conn:
        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def execute_insert(query: str, params: tuple = ()) -> int:
    """Execute an INSERT query and return the last row id"""
    with get_db_connection() as conn:
        cursor = conn.execute(query, params)
        conn.commit()
        return cursor.lastrowid

def execute_update(query: str, params: tuple = ()) -> int:
    """Execute an UPDATE/DELETE query and return affected rows count"""
    with get_db_connection() as conn:
        cursor = conn.execute(query, params)
        conn.commit()
        return cursor.rowcount
