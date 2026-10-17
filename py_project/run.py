#!/usr/bin/env python3
"""
TenderBridge AI Engine Launcher
Starts the FastAPI server with uvicorn.
"""
import sys
import uvicorn

def main():
    port = 8000
    host = "127.0.0.1"
    print(f"=====================================================")
    print(f"🚀 Starting TenderBridge AI Engine on http://{host}:{port}")
    print(f"📖 OpenAPI / Swagger Docs: http://{host}:{port}/docs")
    print(f"=====================================================")
    uvicorn.run("main:app", host=host, port=port, reload=True)

if __name__ == "__main__":
    main()
