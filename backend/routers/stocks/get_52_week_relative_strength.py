from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List
import logging
from database import execute_query
from models import SymbolTypeResponse

router = APIRouter()

@router.get("/relative-strength/52-week", response_model=List[SymbolTypeResponse])
async def get_52_week_relative_strength(
    date: str = Query(..., description="Date to check for 52-week RS high (YYYY-MM-DD)"),
    limit: int = Query(None, description="Maximum number of records to return. If not set, return all.")
):
    try:
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        base_query = """
        SELECT symbol, type
        FROM stock_data_daily
        WHERE date = ? AND is_rs_52_week_high = 1
        ORDER BY rs DESC NULLS LAST
        """
        params = [date]
        if limit is not None:
            base_query += "LIMIT ?"
            params.append(limit)
        results = execute_query(base_query, tuple(params))
        if not results:
            raise HTTPException(status_code=404, detail=f"No 52-week RS high data found for {date}")
        return [SymbolTypeResponse(**row) for row in results]
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching 52-week relative strength: {e}")
        raise HTTPException(status_code=500, detail="Error fetching relative strength data")

