from fastapi import FastAPI
from fastapi.responses import JSONResponse
import json
import os

app = FastAPI()

RUNE_JSON_PATH = os.path.join(os.path.dirname(__file__), "payload.json")

@app.get("/api/v1/instructions/fi")
async def status():
    try:
        with open(RUNE_JSON_PATH, "r") as f:
            data = json.load(f)
        return {"callsign": "battlelog_user", "instructions": json.dumps(data), "language": "fi"}
    except Exception as e:
        return JSONResponse(content={"error": "Could not read rune.json", "details": str(e)}, status_code=500)

