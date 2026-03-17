  # Workflow Engine

  A full-stack workflow automation system that lets users design workflows, define rules, execute processes, and track every step. Built with **Next.js** (frontend), **FastAPI** (backend), and **Supabase** (database).

  ## Architecture

  ```
  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
  │   Next.js UI    │────▶│  FastAPI Backend │────▶│    Supabase     │
  │   (Port 3000)   │     │   (Port 8000)   │     │   (PostgreSQL)  │
  └─────────────────┘     └─────────────────┘     └─────────────────┘
  ```

  ## Features

  - **Workflow CRUD** - Create, edit, delete workflows with input schemas
  - **Step Management** - Task, Approval, and Notification step types
  - **Rule Engine** - Dynamic condition evaluation with:
    - Comparison operators: `==`, `!=`, `<`, `>`, `<=`, `>=`
    - Logical operators: `&&` (AND), `||` (OR)
    - String functions: `contains()`, `startsWith()`, `endsWith()`
    - `DEFAULT` fallback rules
    - Priority-based evaluation (lowest number = highest priority)
  - **Branching & Looping** - Rules can route to any step; max iteration guard prevents infinite loops
  - **Execution Engine** - Run workflows with input data, track step-by-step progress
  - **Retry & Cancel** - Retry failed steps or cancel running executions
  - **Audit Log** - Full execution history with detailed logs and rule evaluation traces

  ## Prerequisites

  - Python 3.10+
  - Node.js 18+
  - Supabase project (or the provided credentials)
    
  ## DEMO
  [Watch Video](./Halleyx-done.mp4)
  
  ## Setup

  ### 1. Database Setup

  Run the SQL schema in your Supabase SQL Editor:

  ```sql
  -- Copy contents of backend/schema.sql and run in Supabase SQL Editor
  ```

  The schema creates tables: `workflows`, `steps`, `rules`, `executions` with proper foreign keys, indexes, triggers, and RLS policies.

  ### 2. Backend Setup

  ```bash
  cd backend

  # Install dependencies
  pip install -r requirements.txt

  # Configure environment
  cp .env.example .env  # Or edit .env directly
  # Set SUPABASE_URL and SUPABASE_KEY in .env

  # Seed sample data (optional)
  python3 seed.py

  # Start the server
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```

  The API docs are available at http://localhost:8000/docs (Swagger UI).

  ### 3. Frontend Setup

  ```bash
  cd frontend

  # Install dependencies
  npm install

  # Configure environment
  echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

  # Start dev server
  npm run dev
  ```

  Open http://localhost:3000 in your browser.

  ## API Endpoints

  ### Workflows
  | Method | Endpoint | Description |
  |--------|----------|-------------|
  | POST | `/workflows` | Create workflow |
  | GET | `/workflows` | List workflows (pagination & search) |
  | GET | `/workflows/:id` | Get workflow with steps & rules |
  | PUT | `/workflows/:id` | Update workflow (increments version) |
  | DELETE | `/workflows/:id` | Delete workflow |

  ### Steps
  | Method | Endpoint | Description |
  |--------|----------|-------------|
  | POST | `/workflows/:workflow_id/steps` | Add step |
  | GET | `/workflows/:workflow_id/steps` | List steps |
  | PUT | `/steps/:id` | Update step |
  | DELETE | `/steps/:id` | Delete step |

  ### Rules
  | Method | Endpoint | Description |
  |--------|----------|-------------|
  | POST | `/steps/:step_id/rules` | Add rule |
  | GET | `/steps/:step_id/rules` | List rules |
  | PUT | `/rules/:id` | Update rule |
  | DELETE | `/rules/:id` | Delete rule |

  ### Execution
  | Method | Endpoint | Description |
  |--------|----------|-------------|
  | POST | `/workflows/:workflow_id/execute` | Start execution |
  | GET | `/executions` | List executions (audit log) |
  | GET | `/executions/:id` | Get execution details & logs |
  | POST | `/executions/:id/cancel` | Cancel execution |
  | POST | `/executions/:id/retry` | Retry failed step |

  ## Sample Workflows

  ### 1. Expense Approval
  A 5-step workflow: Manager Approval → Finance Notification → CEO Approval → Task Completion (or Task Rejection).

  **Rules on Manager Approval step:**
  | Priority | Condition | Next Step |
  |----------|-----------|-----------|
  | 1 | `amount > 100 && country == 'US' && priority == 'High'` | Finance Notification |
  | 2 | `amount <= 100` | Task Completion |
  | 3 | `priority == 'Low' && country != 'US'` | Task Rejection |
  | 4 | `DEFAULT` | Task Rejection |

  **Sample Execution Input:**
  ```json
  {
    "amount": 250,
    "country": "US",
    "priority": "High",
    "description": "Conference travel"
  }
  ```

  ### 2. Employee Onboarding
  A 4-step workflow: HR Review → IT Equipment Setup → Welcome Notification → Onboarding Complete.

  **Sample Execution Input:**
  ```json
  {
    "employee_name": "Jane Smith",
    "department": "Engineering",
    "role": "Senior Developer",
    "needs_laptop": true
  }
  ```

  ## Rule Engine Design

  The rule engine (`backend/app/engine/rule_engine.py`) evaluates conditions against input data:

  1. **Parsing** - Conditions are parsed into an expression tree respecting operator precedence
  2. **Evaluation** - Rules are evaluated in priority order (ascending); first match wins
  3. **DEFAULT** - A `DEFAULT` rule always matches and serves as the fallback
  4. **Error Handling** - Invalid rules are logged as errors; execution falls through to next rule
  5. **Loop Prevention** - Max 100 iterations per step to prevent infinite loops
  6. **Branching** - Rules can route execution to any step in the workflow

  ## Project Structure

  ```
  ├── backend/
  │   ├── app/
  │   │   ├── main.py              # FastAPI app entry point
  │   │   ├── database.py          # Supabase client
  │   │   ├── models/
  │   │   │   └── schemas.py       # Pydantic request/response models
  │   │   ├── routers/
  │   │   │   ├── workflows.py     # Workflow CRUD endpoints
  │   │   │   ├── steps.py         # Step CRUD endpoints
  │   │   │   ├── rules.py         # Rule CRUD endpoints
  │   │   │   └── executions.py    # Execution endpoints
  │   │   └── engine/
  │   │       └── rule_engine.py   # Rule evaluation engine
  │   ├── schema.sql               # Database schema
  │   ├── seed.py                  # Sample data seeder
  │   ├── requirements.txt
  │   └── .env
  ├── frontend/
  │   ├── app/
  │   │   ├── layout.tsx           # Root layout with navigation
  │   │   ├── page.tsx             # Home page
  │   │   ├── workflows/
  │   │   │   ├── page.tsx         # Workflow list
  │   │   │   ├── new/page.tsx     # Create workflow
  │   │   │   └── [id]/
  │   │   │       ├── page.tsx     # Workflow details
  │   │   │       ├── edit/page.tsx# Workflow editor
  │   │   │       ├── execute/page.tsx # Execute workflow
  │   │   │       └── steps/[stepId]/rules/page.tsx # Rule editor
  │   │   ├── executions/
  │   │   │   └── [id]/page.tsx    # Execution details
  │   │   └── audit/page.tsx       # Audit log
  │   ├── lib/
  │   │   ├── api.ts               # API client
  │   │   └── types.ts             # TypeScript interfaces
  │   └── .env.local
  └── README.md
  ```
