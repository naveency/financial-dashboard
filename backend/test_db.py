#!/usr/bin/env python3
"""
Test script to verify SQLite database connection and basic operations
"""

import sqlite3
from database import init_database, execute_query, execute_insert
from models import StockDataCreate

def test_database_connection():
    """Test basic database operations"""
    print("Testing database connection...")

    try:
        # Initialize database
        init_database()
        print("✅ Database initialized successfully")

        # Test basic query
        symbols = execute_query("SELECT DISTINCT symbol FROM stock_data_daily LIMIT 5")
        print(f"✅ Query executed successfully. Found {len(symbols)} symbols")

        # If we have existing data, show some samples
        if symbols:
            print("Sample symbols in database:")
            for symbol in symbols[:3]:
                print(f"  - {symbol['symbol']}")
        else:
            print("📝 Database is empty - ready for data insertion")

            # Test insert operation with sample data
            print("Testing data insertion...")
            sample_data = {
                "symbol": "TEST",
                "name": "Test Stock",
                "type": "stock",
                "interval": "1day",
                "date": "2024-01-01",
                "open": 100.0,
                "high": 105.0,
                "low": 98.0,
                "close": 103.0,
                "adjusted_close": 103.0,
                "volume": 1000000
            }

            query = """
            INSERT OR REPLACE INTO stock_data_daily 
            (symbol, name, type, interval, date, open, high, low, close, adjusted_close, volume)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            params = (
                sample_data["symbol"], sample_data["name"], sample_data["type"],
                sample_data["interval"], sample_data["date"], sample_data["open"],
                sample_data["high"], sample_data["low"], sample_data["close"],
                sample_data["adjusted_close"], sample_data["volume"]
            )

            execute_insert(query, params)
            print("✅ Sample data inserted successfully")

            # Verify the insert
            test_result = execute_query("SELECT * FROM stock_data_daily WHERE symbol = ?", ("TEST",))
            if test_result:
                print(f"✅ Data verification successful: {test_result[0]['symbol']} - {test_result[0]['date']}")

        print("\n🎉 Database connection test completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

if __name__ == "__main__":
    test_database_connection()
