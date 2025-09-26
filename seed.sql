-- Seed data for QA Automation Demo Portal

-- Insert demo users
INSERT OR IGNORE INTO users (username, email, password_hash, user_type, accepted_terms, accepted_terms_at, subscribed_newsletter) VALUES 
  ('demo_admin', 'admin@qademo.com', '$2b$10$dummy.hash.for.demo.purposes.only', 'admin', TRUE, CURRENT_TIMESTAMP, TRUE),
  ('test_engineer1', 'engineer1@qademo.com', '$2b$10$dummy.hash.for.demo.purposes.only', 'tester', TRUE, CURRENT_TIMESTAMP, FALSE),
  ('test_engineer2', 'engineer2@qademo.com', '$2b$10$dummy.hash.for.demo.purposes.only', 'tester', TRUE, CURRENT_TIMESTAMP, TRUE),
  ('developer1', 'dev1@qademo.com', '$2b$10$dummy.hash.for.demo.purposes.only', 'developer', TRUE, CURRENT_TIMESTAMP, FALSE);

-- Insert sample API tests
INSERT OR IGNORE INTO api_tests (owner_user_id, name, description, endpoint_url, http_method, request_headers, request_body, tags) VALUES 
  (1, 'Login API Test', 'Test user login functionality', 'https://jsonplaceholder.typicode.com/posts', 'POST', '{"Content-Type": "application/json"}', '{"title": "foo", "body": "bar", "userId": 1}', '["authentication", "api"]'),
  (1, 'Get User Profile', 'Retrieve user profile information', 'https://jsonplaceholder.typicode.com/users/1', 'GET', '{"Accept": "application/json"}', '', '["user", "profile"]'),
  (2, 'Create Post API', 'Test post creation endpoint', 'https://jsonplaceholder.typicode.com/posts', 'POST', '{"Content-Type": "application/json"}', '{"title": "Test Post", "body": "Test Content", "userId": 2}', '["posts", "crud"]'),
  (2, 'Update User Info', 'Test user information update', 'https://jsonplaceholder.typicode.com/users/1', 'PUT', '{"Content-Type": "application/json"}', '{"name": "Updated Name", "email": "updated@example.com"}', '["user", "update"]');

-- Insert validation rules for API tests
INSERT OR IGNORE INTO validation_rules (api_test_id, rule_type, rule_config, severity) VALUES 
  (1, 'status_code', '{"expected": 201}', 'fail'),
  (1, 'response_time', '{"max_ms": 2000}', 'warn'),
  (1, 'content_type', '{"expected": "application/json"}', 'fail'),
  (2, 'status_code', '{"expected": 200}', 'fail'),
  (2, 'response_time', '{"max_ms": 1500}', 'warn'),
  (3, 'status_code', '{"expected": 201}', 'fail'),
  (4, 'status_code', '{"expected": 200}', 'fail');

-- Insert test suites
INSERT OR IGNORE INTO test_suites (name, description, owner_user_id) VALUES 
  ('Login Functionality', 'Complete test suite for user authentication', 1),
  ('User Management', 'Tests for user profile and account management', 2),
  ('API Endpoints', 'General API endpoint testing', 1),
  ('Performance Tests', 'Load and performance testing scenarios', 3);

-- Insert test cases
INSERT OR IGNORE INTO test_cases (suite_id, name, description, type, referenced_api_test_id, test_order) VALUES 
  (1, 'Valid Login Test', 'Test login with valid credentials', 'api', 1, 1),
  (1, 'Invalid Login Test', 'Test login with invalid credentials', 'api', NULL, 2),
  (2, 'Get Profile Test', 'Retrieve user profile', 'api', 2, 1),
  (2, 'Update Profile Test', 'Update user information', 'api', 4, 2),
  (3, 'Create Resource', 'Test resource creation', 'api', 3, 1),
  (4, 'Load Test 100 Users', 'Performance test with 100 concurrent users', 'performance', NULL, 1);

-- Insert sample test runs
INSERT OR IGNORE INTO test_runs (suite_id, started_by, name, status, finished_at, duration_ms, total_requests, success_count, failed_count, skipped_count, success_rate) VALUES 
  (1, 1, 'Login Tests - Daily Run', 'passed', datetime('now', '-1 hour'), 2300, 10, 8, 1, 1, 80.0),
  (2, 2, 'User Management Tests', 'failed', datetime('now', '-30 minutes'), 4500, 15, 10, 5, 0, 66.7),
  (3, 1, 'API Endpoint Validation', 'running', NULL, NULL, 0, 0, 0, 0, 0.0),
  (4, 3, 'Performance Baseline', 'passed', datetime('now', '-2 hours'), 60000, 1000, 950, 50, 0, 95.0);

-- Insert performance test results
INSERT OR IGNORE INTO performance_runs (test_run_id, virtual_users, test_duration_seconds, average_ms, min_ms, max_ms, p95_ms, requests_per_sec, total_requests, error_rate) VALUES 
  (4, 100, 60, 245.8, 89.2, 1843.7, 756.2, 16.7, 1000, 5.0);

-- Insert sample response logs
INSERT OR IGNORE INTO response_logs (test_run_id, request_index, request_method, request_url, response_status, response_time_ms, is_success) VALUES 
  (1, 1, 'POST', 'https://jsonplaceholder.typicode.com/posts', 201, 234.5, TRUE),
  (1, 2, 'POST', 'https://jsonplaceholder.typicode.com/posts', 201, 198.7, TRUE),
  (1, 3, 'POST', 'https://jsonplaceholder.typicode.com/posts', 500, 1205.3, FALSE),
  (2, 1, 'GET', 'https://jsonplaceholder.typicode.com/users/1', 200, 145.2, TRUE),
  (2, 2, 'PUT', 'https://jsonplaceholder.typicode.com/users/1', 404, 234.8, FALSE);

-- Insert sample reports
INSERT OR IGNORE INTO reports (test_run_id, report_type, generated_by, report_name, status) VALUES 
  (1, 'detailed', 1, 'Login Tests Detailed Report', 'ready'),
  (4, 'performance', 3, 'Performance Baseline Report', 'ready');

-- Insert newsletter subscribers
INSERT OR IGNORE INTO newsletter_subscribers (email, source) VALUES 
  ('subscriber1@example.com', 'signup'),
  ('subscriber2@example.com', 'separate_form'),
  ('engineer1@qademo.com', 'signup');

-- Insert audit logs
INSERT OR IGNORE INTO audit_logs (user_id, action, resource_type, resource_id, details) VALUES 
  (1, 'created_test', 'api_test', 1, '{"name": "Login API Test"}'),
  (2, 'started_run', 'test_run', 2, '{"suite_name": "User Management Tests"}'),
  (1, 'generated_report', 'report', 1, '{"report_type": "detailed"}'),
  (3, 'started_run', 'test_run', 4, '{"suite_name": "Performance Baseline"}');