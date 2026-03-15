from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import workflows, steps, rules, executions

app = FastAPI(
    title="Workflow Engine API",
    description="A workflow engine with dynamic rules, branching, and execution tracking",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(workflows.router)
app.include_router(steps.router)
app.include_router(rules.router)
app.include_router(executions.router)


@app.get("/")
async def root():
    return {
        "message": "Workflow Engine API",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
