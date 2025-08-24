from fastapi import APIRouter, HTTPException
from database import execute_query

router = APIRouter()

@router.get("/maxdate", response_model=str)
async def get_maxdate():
    try:
        query = "SELECT MAX(date) as max_date FROM stock_data_daily WHERE symbol = 'SPY'"
        results = execute_query(query)
        if not results or not results[0]["max_date"]:
            raise HTTPException(status_code=404, detail="No date found for SPY")
        return results[0]["max_date"]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching max date: {e}")

