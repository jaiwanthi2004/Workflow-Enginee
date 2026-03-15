-- Supabase SQL Schema for Workflow Engine
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- WORKFLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    input_schema JSONB DEFAULT '{}',
    start_step_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- STEPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    step_type VARCHAR(20) NOT NULL CHECK (step_type IN ('task', 'approval', 'notification')),
    "order" INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
    condition VARCHAR(1000) NOT NULL,
    next_step_id UUID REFERENCES steps(id) ON DELETE SET NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- EXECUTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    workflow_version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'canceled')),
    data JSONB DEFAULT '{}',
    logs JSONB DEFAULT '[]',
    current_step_id UUID REFERENCES steps(id) ON DELETE SET NULL,
    retries INTEGER NOT NULL DEFAULT 0,
    triggered_by VARCHAR(255) DEFAULT 'system',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_steps_workflow_id ON steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_rules_step_id ON rules(step_id);
CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);

-- ============================================
-- Add foreign key for start_step_id after steps table exists
-- ============================================
ALTER TABLE workflows 
    ADD CONSTRAINT fk_start_step 
    FOREIGN KEY (start_step_id) 
    REFERENCES steps(id) 
    ON DELETE SET NULL;

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_steps_updated_at BEFORE UPDATE ON steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (allow all for anon key)
-- ============================================
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on workflows" ON workflows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on steps" ON steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on rules" ON rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on executions" ON executions FOR ALL USING (true) WITH CHECK (true);
