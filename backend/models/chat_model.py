from pydantic import BaseModel
from typing import List, Optional, Union, Dict, Any


class Message(BaseModel):
    role: str
    content: Union[str, List[Dict[str, Any]]]


class ChatRequest(BaseModel):
    message: str
    message_history: Optional[List[Message]] = None
    mood: Optional[str] = None
    risk_score: Optional[float] = None


class ChatResponse(BaseModel):
    response: Union[str, dict]
