from fastapi import APIRouter
from .get_52_week_relative_strength import router as get_52_week_relative_strength_router
from .get_gapup import router as get_gapup_router
from .get_gapdown import router as get_gapdown_router
from .get_maxdate import router as get_maxdate_router
from .get_new_highs import router as get_new_highs_router
from .get_new_lows import router as get_new_lows_router
from .get_new_signals import router as get_new_signals_router
from .get_swing_high_cross import router as get_swing_high_cross_router
from .get_swing_low_cross import router as get_swing_low_cross_router
from .get_price_data import router as get_price_data_router

router = APIRouter()

router.include_router(get_52_week_relative_strength_router)
router.include_router(get_gapup_router)
router.include_router(get_gapdown_router)
router.include_router(get_maxdate_router)
router.include_router(get_new_highs_router)
router.include_router(get_new_lows_router)
router.include_router(get_new_signals_router)
router.include_router(get_swing_high_cross_router)
router.include_router(get_swing_low_cross_router)
router.include_router(get_price_data_router)
