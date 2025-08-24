from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List
import logging
from database import execute_query
from models import SymbolTypeResponse

router = APIRouter()

@router.get("/swing-low-cross", response_model=List[SymbolTypeResponse])
async def get_swing_low_cross(
    date: str = Query(..., description="Date to check for swing low cross (YYYY-MM-DD)"),
    direction: str = Query(..., description="Direction: 'up' or 'down'"),
    limit: int = Query(None, description="Maximum number of records to return. If not set, return all.")
):
    try:
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        if direction not in ("up", "down"):
            raise HTTPException(status_code=400, detail="Direction must be 'up' or 'down'")
        col = "swing_low_cross_up" if direction == "up" else "swing_low_cross_down"
        base_query = f"""
        SELECT symbol, type
        FROM stock_data_daily
        WHERE date = ? AND {col} = 1
        ORDER BY rs DESC NULLS LAST
        """
        params = [date]
        if limit is not None:
            base_query += "LIMIT ?"
            params.append(limit)
        results = execute_query(base_query, tuple(params))
        if not results:
            raise HTTPException(status_code=404, detail=f"No swing low cross {direction} found for {date}")
        return [SymbolTypeResponse(**row) for row in results]
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching swing low cross: {e}")
        raise HTTPException(status_code=500, detail="Error fetching swing low cross")

