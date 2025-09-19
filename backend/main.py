from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import phone

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(phone.router)


@app.get("/") 
def read_root():
    return {"message": "Hello from FastAPI backend!"}
