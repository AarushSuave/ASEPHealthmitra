"""Setup database script - initializes tables.

Universal fracture detection is stateless in this version, so it does not add
new tables yet. This script remains the place to add result history tables later.
"""
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db

def main():
    print("Initializing database...")
    init_db()
    print("Database initialized successfully.")

if __name__ == "__main__":
    main()
