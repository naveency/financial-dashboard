from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List
import logging
from database import execute_query
from models import SymbolTypeResponse

router = APIRouter()

@router.get("/gapdown", response_model=List[SymbolTypeResponse])
async def get_gapdown(
    date: str = Query(..., description="Date to check for gap down (YYYY-MM-DD)"),
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
        WHERE date = ? AND is_gap_down = 1
        ORDER BY rs ASC NULLS LAST
        """
        params = [date]
        if limit is not None:
            base_query += "LIMIT ?"
            params.append(limit)
        results = execute_query(base_query, tuple(params))
        if not results:
            raise HTTPException(status_code=404, detail=f"No gap down data found for {date}")
        return [SymbolTypeResponse(**row) for row in results]
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching gap down data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching gap down data")

