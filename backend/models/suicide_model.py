from pydantic import BaseModel


class SuicideDetectionRequest(BaseModel):
    message: str


class SuicideDetectionResponse(BaseModel):
    risk_level: str
    risk_score: float
