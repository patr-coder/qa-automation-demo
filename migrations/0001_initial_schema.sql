-- QA Automation Demo Portal Database Schema
-- Initial migration: Users, Test Management, API Testing, Performance Testing

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    user_type TEXT NOT NULL DEFAULT 'tester', -- tester, admin, developer
    accepted_terms BOOLEAN DEFAULT FALSE,
    accepted_terms_at DATETIME,
    subscribed_newsletter BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);

-- Newsletter subscribers (can be separate from users)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    subscribed BOOLEAN DEFAULT TRUE,
    source TEXT DEFAULT 'signup', -- signup, separate_form, api
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at DATETIME
);

-- API test definitions
CREATE TABLE IF NOT EXISTS api_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    endpoint_url TEXT NOT NULL,
    http_method TEXT NOT NULL DEFAULT 'GET', -- GET, POST, PUT, DELETE, PATCH
    request_headers TEXT, -- JSON string
    request_body TEXT, -- JSON string for request body
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT, -- JSON array of tags
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Validation rules for API tests
CREATE TABLE IF NOT EXISTS validation_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_test_id INTEGER NOT NULL,
    rule_type TEXT NOT NULL, -- status_code, response_time, content_type, schema, field_type, field_length
    rule_config TEXT NOT NULL, -- JSON configuration for the rule
    severity TEXT DEFAULT 'fail', -- warn, fail
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (api_test_id) REFERENCES api_tests(id) ON DELETE CASCADE
);

-- Test suites for grouping tests
CREATE TABLE IF NOT EXISTS test_suites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    owner_user_id INTEGER NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Test cases within suites
CREATE TABLE IF NOT EXISTS test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- api, ui, performance, dynamic
    referenced_api_test_id INTEGER, -- FK to api_tests if type is 'api'
    test_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (suite_id) REFERENCES test_suites(id) ON DELETE CASCADE,
    FOREIGN KEY (referenced_api_test_id) REFERENCES api_tests(id) ON DELETE SET NULL
);

-- Test runs (execution instances)
CREATE TABLE IF NOT EXISTS test_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id INTEGER, -- Can be suite or individual API test
    api_test_id INTEGER, -- For individual API test runs
    started_by INTEGER NOT NULL,
    name TEXT, -- Custom name for the run
    status TEXT NOT NULL DEFAULT 'queued', -- queued, running, passed, failed, canceled
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    duration_ms INTEGER,
    total_requests INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0,
    environment TEXT, -- JSON configuration like base URL, variables
    raw_results_location TEXT, -- URL to detailed results
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (suite_id) REFERENCES test_suites(id) ON DELETE CASCADE,
    FOREIGN KEY (api_test_id) REFERENCES api_tests(id) ON DELETE CASCADE,
    FOREIGN KEY (started_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance testing configurations and results
CREATE TABLE IF NOT EXISTS performance_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,
    virtual_users INTEGER NOT NULL DEFAULT 1,
    test_duration_seconds INTEGER NOT NULL DEFAULT 60,
    ramp_up_time INTEGER DEFAULT 0,
    average_ms REAL DEFAULT 0,
    min_ms REAL DEFAULT 0,
    max_ms REAL DEFAULT 0,
    p95_ms REAL DEFAULT 0, -- 95th percentile
    requests_per_sec REAL DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    error_rate REAL DEFAULT 0,
    throughput_kb_sec REAL DEFAULT 0,
    series_data_location TEXT, -- URL to time-series data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- Individual request/response logs (optional, for debugging)
CREATE TABLE IF NOT EXISTS response_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,
    request_index INTEGER,
    request_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    request_method TEXT,
    request_url TEXT,
    request_headers TEXT, -- JSON
    request_payload TEXT, -- JSON or text
    response_status INTEGER,
    response_headers TEXT, -- JSON
    response_body TEXT, -- Consider size limits
    response_time_ms REAL,
    is_success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- Generated reports
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,
    report_type TEXT NOT NULL DEFAULT 'detailed', -- summary, detailed, performance
    generated_by INTEGER NOT NULL,
    report_name TEXT,
    file_url TEXT, -- URL to generated report file
    file_format TEXT DEFAULT 'html', -- html, pdf, json
    status TEXT DEFAULT 'pending', -- pending, ready, failed
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, -- Optional expiration for temporary reports
    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit logs for tracking user activities
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL, -- created_test, updated_test, started_run, generated_report, login, etc.
    resource_type TEXT, -- api_test, test_suite, test_run, user, etc.
    resource_id INTEGER,
    details TEXT, -- JSON with additional details
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_api_tests_owner ON api_tests(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_validation_rules_test ON validation_rules(api_test_id);
CREATE INDEX IF NOT EXISTS idx_test_suites_owner ON test_suites(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_suite ON test_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_suite ON test_runs(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_api_test ON test_runs(api_test_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_user ON test_runs(started_by);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
CREATE INDEX IF NOT EXISTS idx_performance_runs_test ON performance_runs(test_run_id);
CREATE INDEX IF NOT EXISTS idx_response_logs_run ON response_logs(test_run_id);
CREATE INDEX IF NOT EXISTS idx_reports_run ON reports(test_run_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);