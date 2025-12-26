import base64
import hashlib
import json
import os
import time
from datetime import datetime, timezone
from typing import Any
import uuid

from fastapi import Body, Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .security import API_KEY, require_api_key

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
APP_START_TIME = time.time()

app = FastAPI(title="Toolbox", openapi_url=None, docs_url=None, redoc_url=None)
app.mount("/toolbox/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")


def make_response(payload: dict[str, Any], request_id: str, started_at: float):
    duration_ms = round((time.time() - started_at) * 1000, 2)
    payload_with_meta = {
        "request_id": request_id,
        "duration_ms": duration_ms,
        **payload,
    }
    return JSONResponse(payload_with_meta)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    request.state.started_at = time.time()
    response = await call_next(request)
    if isinstance(response, JSONResponse):
        body = json.loads(response.body.decode())
        body.setdefault("request_id", request_id)
        body.setdefault("duration_ms", round((time.time() - request.state.started_at) * 1000, 2))
        response = JSONResponse(body, status_code=response.status_code, headers=dict(response.headers))
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/toolbox/api/ip", dependencies=[Depends(require_api_key)])
async def get_ip(request: Request):
    client_host = request.headers.get("x-forwarded-for", request.client.host)
    user_agent = request.headers.get("user-agent", "")
    payload = {"ip": client_host, "user_agent": user_agent}
    return make_response(payload, request.state.request_id, request.state.started_at)


@app.get("/toolbox/api/time", dependencies=[Depends(require_api_key)])
async def get_time(request: Request):
    now = datetime.now(timezone.utc)
    local_now = datetime.now()
    payload = {
        "timestamp": int(now.timestamp()),
        "utc": now.isoformat(),
        "local": local_now.isoformat(),
    }
    return make_response(payload, request.state.request_id, request.state.started_at)


@app.get("/toolbox/api/uuid", dependencies=[Depends(require_api_key)])
async def generate_uuid(request: Request, count: int = Query(default=1, ge=1, le=20)):
    uuids = [str(uuid.uuid4()) for _ in range(count)]
    payload = {"count": count, "uuids": uuids}
    return make_response(payload, request.state.request_id, request.state.started_at)


@app.post("/toolbox/api/json/format", dependencies=[Depends(require_api_key)])
async def format_json(request: Request):
    raw_body = await request.body()
    if not raw_body:
        raise HTTPException(status_code=400, detail="Empty body")
    try:
        parsed = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    pretty = json.dumps(parsed, indent=2, ensure_ascii=False)
    payload = {"formatted": pretty}
    return make_response(payload, request.state.request_id, request.state.started_at)


@app.post("/toolbox/api/hash", dependencies=[Depends(require_api_key)])
async def hash_text(request: Request, data: dict = Body(...)):
    text = data.get("text")
    algo = (data.get("algo") or "").lower()
    if not text:
        raise HTTPException(status_code=400, detail="Missing text")
    if algo not in {"md5", "sha256"}:
        raise HTTPException(status_code=400, detail="Invalid algo, use md5 or sha256")

    hasher = hashlib.md5() if algo == "md5" else hashlib.sha256()
    hasher.update(str(text).encode("utf-8"))
    payload = {"algo": algo, "hash": hasher.hexdigest()}
    return make_response(payload, request.state.request_id, request.state.started_at)


def decode_segment(segment: str) -> Any:
    padded = segment + "=" * (-len(segment) % 4)
    decoded = base64.urlsafe_b64decode(padded.encode())
    return json.loads(decoded.decode())


@app.post("/toolbox/api/jwt/decode", dependencies=[Depends(require_api_key)])
async def decode_jwt(request: Request, data: dict = Body(...)):
    token = data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")
    parts = token.split(".")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid JWT format")
    try:
        header = decode_segment(parts[0])
        payload_data = decode_segment(parts[1])
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to decode JWT")

    exp = payload_data.get("exp")
    now = int(time.time())
    is_expired = exp is not None and now >= int(exp)
    payload = {
        "header": header,
        "payload": payload_data,
        "expired": is_expired,
        "now": now,
    }
    return make_response(payload, request.state.request_id, request.state.started_at)


@app.api_route("/toolbox/api/echo", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"], dependencies=[Depends(require_api_key)])
async def echo(request: Request):
    body_bytes = await request.body()
    body_text = body_bytes.decode(errors="ignore") if body_bytes else ""
    payload = {
        "method": request.method,
        "headers": {k: v for k, v in request.headers.items()},
        "query": dict(request.query_params),
        "body": body_text,
    }
    return make_response(payload, request.state.request_id, request.state.started_at)


@app.get("/toolbox/api/health")
async def health(request: Request):
    uptime_seconds = round(time.time() - APP_START_TIME, 2)
    payload = {"version": APP_VERSION, "uptime_seconds": uptime_seconds}
    return make_response(payload, request.state.request_id, request.state.started_at)


# Views
@app.get("/toolbox/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "home.html",
        {
            "request": request,
            "version": APP_VERSION,
            "api_key": API_KEY,
        },
    )


@app.get("/toolbox/ip", response_class=HTMLResponse)
async def ip_page(request: Request):
    return templates.TemplateResponse("ip.html", {"request": request, "api_key": API_KEY})


@app.get("/toolbox/time", response_class=HTMLResponse)
async def time_page(request: Request):
    return templates.TemplateResponse("time.html", {"request": request, "api_key": API_KEY})


@app.get("/toolbox/uuid", response_class=HTMLResponse)
async def uuid_page(request: Request):
    return templates.TemplateResponse("uuid.html", {"request": request, "api_key": API_KEY})


@app.get("/toolbox/json", response_class=HTMLResponse)
async def json_page(request: Request):
    return templates.TemplateResponse("json_format.html", {"request": request, "api_key": API_KEY})


@app.get("/toolbox/hash", response_class=HTMLResponse)
async def hash_page(request: Request):
    return templates.TemplateResponse("hash.html", {"request": request, "api_key": API_KEY})


@app.get("/toolbox/jwt", response_class=HTMLResponse)
async def jwt_page(request: Request):
    return templates.TemplateResponse("jwt.html", {"request": request, "api_key": API_KEY})


@app.get("/toolbox/echo", response_class=HTMLResponse)
async def echo_page(request: Request):
    return templates.TemplateResponse("echo.html", {"request": request, "api_key": API_KEY})


@app.get("/", response_class=HTMLResponse)
async def root_redirect(request: Request):
    return templates.TemplateResponse("redirect.html", {"request": request})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
