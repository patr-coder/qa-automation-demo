import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Use JSX renderer middleware
app.use(renderer)

// API Routes for QA Automation Demo

// Authentication endpoints
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    
    if (!username || !password) {
      return c.json({ error: 'Username and password required' }, 400)
    }

    // In production, implement proper password hashing verification
    const user = await c.env.DB.prepare(`
      SELECT id, username, email, user_type, is_active 
      FROM users 
      WHERE username = ? OR email = ?
    `).bind(username, username).first()

    if (!user || !user.is_active) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Update last login
    await c.env.DB.prepare(`
      UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(user.id).run()

    // Log the login activity
    await c.env.DB.prepare(`
      INSERT INTO audit_logs (user_id, action, resource_type, details)
      VALUES (?, 'login', 'user', ?)
    `).bind(user.id, JSON.stringify({ username: user.username })).run()

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_type: user.user_type
      }
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.post('/api/auth/register', async (c) => {
  try {
    const { username, email, password, user_type = 'tester', accepted_terms, subscribed_newsletter } = await c.req.json()
    
    if (!username || !email || !password || !accepted_terms) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Check if user already exists
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE username = ? OR email = ?
    `).bind(username, email).first()

    if (existingUser) {
      return c.json({ error: 'Username or email already exists' }, 409)
    }

    // In production, hash the password properly
    const passwordHash = '$2b$10$' + password + '.dummy.hash.for.demo'

    const result = await c.env.DB.prepare(`
      INSERT INTO users (username, email, password_hash, user_type, accepted_terms, accepted_terms_at, subscribed_newsletter)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `).bind(username, email, passwordHash, user_type, accepted_terms, subscribed_newsletter || false).run()

    // Add to newsletter if subscribed
    if (subscribed_newsletter) {
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO newsletter_subscribers (email, source)
        VALUES (?, 'signup')
      `).bind(email).run()
    }

    return c.json({
      message: 'Registration successful',
      user_id: result.meta.last_row_id
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Logout endpoint
app.post('/api/auth/logout', async (c) => {
  try {
    const { user_id } = await c.req.json()
    
    if (user_id) {
      // Log the logout activity
      await c.env.DB.prepare(`
        INSERT INTO audit_logs (user_id, action, resource_type, details)
        VALUES (?, 'logout', 'user', ?)
      `).bind(user_id, JSON.stringify({ timestamp: new Date().toISOString() })).run()
    }

    return c.json({ message: 'Logout successful' })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get detailed information for a specific test run
app.get('/api/runs/:id', async (c) => {
  try {
    const runId = c.req.param('id')
    
    // First get the basic test run info
    const run = await c.env.DB.prepare(`
      SELECT tr.*, u.username as started_by_name
      FROM test_runs tr
      JOIN users u ON tr.started_by = u.id
      WHERE tr.id = ?
    `).bind(runId).first()
    
    if (!run) {
      return c.json({ error: 'Test run not found' }, 404)
    }
    
    // Get test name and API details if it's an API test
    if (run.api_test_id) {
      const apiTest = await c.env.DB.prepare(`
        SELECT name, endpoint_url, http_method, request_body, request_headers
        FROM api_tests 
        WHERE id = ?
      `).bind(run.api_test_id).first()
      
      if (apiTest) {
        run.test_name = apiTest.name
        run.endpoint_url = apiTest.endpoint_url
        run.http_method = apiTest.http_method
        run.request_body = apiTest.request_body
        run.request_headers = apiTest.request_headers
      }
    } else if (run.suite_id) {
      const suite = await c.env.DB.prepare(`
        SELECT name FROM test_suites WHERE id = ?
      `).bind(run.suite_id).first()
      
      if (suite) {
        run.test_name = suite.name
      }
    }
    
    // Get performance metrics for this run if available
    const metrics = await c.env.DB.prepare(`
      SELECT * FROM performance_metrics 
      WHERE test_run_id = ?
    `).bind(runId).all()
    
    return c.json({ 
      run,
      metrics: metrics.results || []
    })
  } catch (error) {
    console.error('Error fetching test run details:', error)
    return c.json({ error: 'Failed to fetch test run details', details: error.message }, 500)
  }
})

// Delete a test run
app.delete('/api/runs/:id', async (c) => {
  try {
    const runId = c.req.param('id')
    
    // Try to get request body - handle both JSON and empty body
    let user_id = null
    try {
      const body = await c.req.json()
      user_id = body.user_id
    } catch (bodyError) {
      console.log('No body provided, continuing with deletion')
    }
    
    console.log('Delete request for run:', runId, 'by user:', user_id)
    
    // Check if the run exists first
    const run = await c.env.DB.prepare(`
      SELECT id, name FROM test_runs WHERE id = ?
    `).bind(runId).first()
    
    if (!run) {
      return c.json({ error: 'Test run not found' }, 404)
    }
    
    console.log('Found run to delete:', run)
    
    // Simple delete without cascading for now
    const deleteResult = await c.env.DB.prepare(`
      DELETE FROM test_runs WHERE id = ?
    `).bind(runId).run()
    
    console.log('Delete result:', deleteResult)
    
    if (deleteResult.success) {
      return c.json({ 
        message: 'Test run deleted successfully',
        deleted_id: runId
      })
    } else {
      return c.json({ error: 'Failed to delete test run' }, 500)
    }
    
  } catch (error) {
    console.error('Delete error:', error)
    return c.json({ 
      error: 'Failed to delete test run', 
      details: error.message || 'Unknown error'
    }, 500)
  }
})

// Delete an API test
app.delete('/api/tests/:id', async (c) => {
  try {
    const testId = c.req.param('id')
    
    // Try to get request body - handle both JSON and empty body
    let user_id = null
    try {
      const body = await c.req.json()
      user_id = body.user_id
    } catch (bodyError) {
      console.log('No body provided, continuing with deletion')
    }
    
    console.log('Delete request for test:', testId, 'by user:', user_id)
    
    // Check if the test exists
    const test = await c.env.DB.prepare(`
      SELECT id, name FROM api_tests WHERE id = ?
    `).bind(testId).first()
    
    if (!test) {
      return c.json({ error: 'API test not found' }, 404)
    }
    
    console.log('Found test to delete:', test)
    
    // Simple delete - let database handle cascading if configured
    const deleteResult = await c.env.DB.prepare(`
      DELETE FROM api_tests WHERE id = ?
    `).bind(testId).run()
    
    console.log('Delete test result:', deleteResult)
    
    if (deleteResult.success) {
      return c.json({ 
        message: 'API test deleted successfully',
        deleted_id: testId
      })
    } else {
      return c.json({ error: 'Failed to delete API test' }, 500)
    }
    
  } catch (error) {
    console.error('Delete test error:', error)
    return c.json({ 
      error: 'Failed to delete API test', 
      details: error.message || 'Unknown error'
    }, 500)
  }
})

// API Test Management with pagination
app.get('/api/tests', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '10')
    const offset = (page - 1) * limit

    // Get total count
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM api_tests
    `).first()

    // Get paginated results
    const tests = await c.env.DB.prepare(`
      SELECT at.*, u.username as owner_name
      FROM api_tests at
      JOIN users u ON at.owner_user_id = u.id
      ORDER BY at.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()

    const total = countResult.total
    const totalPages = Math.ceil(total / limit)

    return c.json({ 
      tests: tests.results,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch tests' }, 500)
  }
})

app.post('/api/tests', async (c) => {
  try {
    const { name, description, endpoint_url, http_method, request_headers, request_body, owner_user_id, tags } = await c.req.json()
    
    if (!name || !endpoint_url || !http_method || !owner_user_id) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO api_tests (owner_user_id, name, description, endpoint_url, http_method, request_headers, request_body, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(owner_user_id, name, description || '', endpoint_url, http_method, request_headers || '{}', request_body || '', tags || '[]').run()

    return c.json({
      message: 'Test created successfully',
      test_id: result.meta.last_row_id
    })
  } catch (error) {
    return c.json({ error: 'Failed to create test' }, 500)
  }
})

// Test Execution
app.post('/api/tests/:id/run', async (c) => {
  try {
    const testId = c.req.param('id')
    const { started_by } = await c.req.json()
    
    if (!started_by) {
      return c.json({ error: 'started_by required' }, 400)
    }

    // Get the test details
    const test = await c.env.DB.prepare(`
      SELECT * FROM api_tests WHERE id = ?
    `).bind(testId).first()

    if (!test) {
      return c.json({ error: 'Test not found' }, 404)
    }

    // Create test run record
    const runResult = await c.env.DB.prepare(`
      INSERT INTO test_runs (api_test_id, started_by, name, status)
      VALUES (?, ?, ?, 'running')
    `).bind(testId, started_by, `${test.name} - Run ${Date.now()}`).run()

    const runId = runResult.meta.last_row_id

    // Simulate running the actual test (in production, this would be async)
    try {
      const startTime = Date.now()
      
      // Parse request configuration
      const headers = JSON.parse(test.request_headers || '{}')
      const requestOptions: RequestInit = {
        method: test.http_method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }

      if (test.request_body && ['POST', 'PUT', 'PATCH'].includes(test.http_method)) {
        requestOptions.body = test.request_body
      }

      // Execute the actual API call
      const response = await fetch(test.endpoint_url, requestOptions)
      const responseTime = Date.now() - startTime
      
      const responseText = await response.text()
      
      // Log the response
      await c.env.DB.prepare(`
        INSERT INTO response_logs (test_run_id, request_index, request_method, request_url, response_status, response_time_ms, is_success, response_body)
        VALUES (?, 1, ?, ?, ?, ?, ?, ?)
      `).bind(runId, test.http_method, test.endpoint_url, response.status, responseTime, response.ok, responseText).run()

      // Update test run with results
      const isSuccess = response.ok
      await c.env.DB.prepare(`
        UPDATE test_runs 
        SET status = ?, finished_at = CURRENT_TIMESTAMP, duration_ms = ?, 
            total_requests = 1, success_count = ?, failed_count = ?, success_rate = ?
        WHERE id = ?
      `).bind(
        isSuccess ? 'passed' : 'failed',
        responseTime,
        isSuccess ? 1 : 0,
        isSuccess ? 0 : 1,
        isSuccess ? 100.0 : 0.0,
        runId
      ).run()

      return c.json({
        message: 'Test executed successfully',
        run_id: runId,
        status: isSuccess ? 'passed' : 'failed',
        response_time: responseTime,
        response_status: response.status
      })

    } catch (testError) {
      // Update test run as failed
      await c.env.DB.prepare(`
        UPDATE test_runs 
        SET status = 'failed', finished_at = CURRENT_TIMESTAMP, 
            total_requests = 1, failed_count = 1, success_rate = 0.0
        WHERE id = ?
      `).bind(runId).run()

      return c.json({
        message: 'Test execution failed',
        run_id: runId,
        status: 'failed',
        error: testError.message
      })
    }

  } catch (error) {
    return c.json({ error: 'Failed to execute test' }, 500)
  }
})

// Test Run Results with pagination
app.get('/api/runs', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '10')
    const offset = (page - 1) * limit

    // Get total count
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM test_runs
    `).first()

    // Get paginated results
    const runs = await c.env.DB.prepare(`
      SELECT tr.*, 
             CASE 
               WHEN tr.suite_id IS NOT NULL THEN ts.name 
               ELSE at.name 
             END as test_name,
             u.username as started_by_name
      FROM test_runs tr
      LEFT JOIN test_suites ts ON tr.suite_id = ts.id
      LEFT JOIN api_tests at ON tr.api_test_id = at.id
      JOIN users u ON tr.started_by = u.id
      ORDER BY tr.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()

    const total = countResult.total
    const totalPages = Math.ceil(total / limit)

    return c.json({ 
      runs: runs.results,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch test runs' }, 500)
  }
})

// Performance Testing
app.post('/api/performance/run', async (c) => {
  try {
    const { virtual_users, test_duration_seconds, endpoint_url, started_by } = await c.req.json()
    
    if (!virtual_users || !test_duration_seconds || !endpoint_url || !started_by) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Create test run record
    const runResult = await c.env.DB.prepare(`
      INSERT INTO test_runs (started_by, name, status, environment)
      VALUES (?, ?, 'running', ?)
    `).bind(started_by, `Performance Test - ${virtual_users} users`, JSON.stringify({ endpoint_url })).run()

    const runId = runResult.meta.last_row_id

    // Simulate performance test execution
    const startTime = Date.now()
    
    // In a real implementation, you'd run actual load testing here
    // For demo purposes, we'll simulate results
    const simulatedResults = {
      average_ms: Math.random() * 500 + 100,
      min_ms: Math.random() * 100 + 50,
      max_ms: Math.random() * 1000 + 500,
      p95_ms: Math.random() * 800 + 200,
      requests_per_sec: virtual_users * (Math.random() * 2 + 0.5),
      total_requests: virtual_users * test_duration_seconds * (Math.random() * 2 + 0.5),
      error_rate: Math.random() * 10
    }

    const actualDuration = (test_duration_seconds * 1000) + (Math.random() * 2000)
    
    // Create performance run record
    await c.env.DB.prepare(`
      INSERT INTO performance_runs (test_run_id, virtual_users, test_duration_seconds, average_ms, min_ms, max_ms, p95_ms, requests_per_sec, total_requests, error_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      runId,
      virtual_users,
      test_duration_seconds,
      simulatedResults.average_ms,
      simulatedResults.min_ms,
      simulatedResults.max_ms,
      simulatedResults.p95_ms,
      simulatedResults.requests_per_sec,
      Math.floor(simulatedResults.total_requests),
      simulatedResults.error_rate
    ).run()

    // Update test run with results
    const successRate = 100 - simulatedResults.error_rate
    await c.env.DB.prepare(`
      UPDATE test_runs 
      SET status = 'passed', finished_at = CURRENT_TIMESTAMP, duration_ms = ?, 
          total_requests = ?, success_count = ?, failed_count = ?, success_rate = ?
      WHERE id = ?
    `).bind(
      actualDuration,
      Math.floor(simulatedResults.total_requests),
      Math.floor(simulatedResults.total_requests * successRate / 100),
      Math.floor(simulatedResults.total_requests * simulatedResults.error_rate / 100),
      successRate,
      runId
    ).run()

    return c.json({
      message: 'Performance test completed',
      run_id: runId,
      results: simulatedResults
    })

  } catch (error) {
    return c.json({ error: 'Failed to run performance test' }, 500)
  }
})

// Newsletter subscription
app.post('/api/newsletter/subscribe', async (c) => {
  try {
    const { email } = await c.req.json()
    
    if (!email) {
      return c.json({ error: 'Email required' }, 400)
    }

    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO newsletter_subscribers (email, source)
      VALUES (?, 'separate_form')
    `).bind(email).run()

    return c.json({ message: 'Subscribed successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to subscribe' }, 500)
  }
})

// Dashboard statistics
app.get('/api/dashboard/stats', async (c) => {
  try {
    const stats = await c.env.DB.batch([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE'),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM api_tests'),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM test_runs'),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM test_runs WHERE status = "passed"'),
      c.env.DB.prepare('SELECT AVG(success_rate) as avg_rate FROM test_runs WHERE status IN ("passed", "failed")')
    ])

    return c.json({
      active_users: stats[0].results[0].count,
      total_tests: stats[1].results[0].count,
      total_runs: stats[2].results[0].count,
      passed_runs: stats[3].results[0].count,
      average_success_rate: stats[4].results[0].avg_rate || 0
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch statistics' }, 500)
  }
})

// Main application page
// Main application page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QA Automation Demo Portal</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .gradient-bg {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .card-shadow {
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            }
            .status-passed { background: #10b981; }
            .status-failed { background: #ef4444; }
            .status-running { background: #f59e0b; }
            .status-queued { background: #6b7280; }
        </style>
    </head>
    <body class="min-h-screen gradient-bg">
        <div class="container mx-auto px-4 py-8">
            <div class="bg-white rounded-lg card-shadow overflow-hidden">
                
                <!-- Header -->
                <div class="bg-gradient-to-r from-gray-800 to-blue-600 text-white p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="text-3xl font-bold flex items-center">
                                <i class="fas fa-vial mr-3"></i>
                                QA Automation Demo Portal
                            </h1>
                            <p class="text-blue-100 mt-2">Professional Test Automation & API Testing Platform</p>
                        </div>
                        <div class="flex space-x-4">
                            <button id="loginBtn" class="bg-white text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                                <i class="fas fa-sign-in-alt mr-2"></i>Login
                            </button>
                            <button id="registerBtn" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                                <i class="fas fa-user-plus mr-2"></i>Register
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Navigation Tabs -->
                <div class="bg-gray-50 border-b">
                    <div class="flex space-x-0">
                        <button class="tab-btn active px-6 py-4 text-gray-700 border-b-2 border-blue-500 bg-white" data-tab="dashboard">
                            <i class="fas fa-tachometer-alt mr-2"></i>Dashboard
                        </button>
                        <button class="tab-btn px-6 py-4 text-gray-600 hover:text-gray-700 border-b-2 border-transparent" data-tab="api-testing">
                            <i class="fas fa-code mr-2"></i>API Testing
                        </button>
                        <button class="tab-btn px-6 py-4 text-gray-600 hover:text-gray-700 border-b-2 border-transparent" data-tab="performance">
                            <i class="fas fa-chart-line mr-2"></i>Performance
                        </button>
                        <button class="tab-btn px-6 py-4 text-gray-600 hover:text-gray-700 border-b-2 border-transparent" data-tab="reports">
                            <i class="fas fa-file-alt mr-2"></i>Reports
                        </button>
                        <button class="tab-btn px-6 py-4 text-gray-600 hover:text-gray-700 border-b-2 border-transparent" data-tab="ui-testing">
                            <i class="fas fa-mouse-pointer mr-2"></i>UI Testing
                        </button>
                    </div>
                </div>

                <!-- Tab Content -->
                <div class="p-6">
                    <!-- Dashboard Tab -->
                    <div id="dashboard-tab" class="tab-content">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                                <div class="flex items-center">
                                    <i class="fas fa-users text-2xl mr-4"></i>
                                    <div>
                                        <p class="text-blue-100">Active Users</p>
                                        <p id="activeUsers" class="text-2xl font-bold">--</p>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                                <div class="flex items-center">
                                    <i class="fas fa-vial text-2xl mr-4"></i>
                                    <div>
                                        <p class="text-green-100">Total Tests</p>
                                        <p id="totalTests" class="text-2xl font-bold">--</p>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                                <div class="flex items-center">
                                    <i class="fas fa-play text-2xl mr-4"></i>
                                    <div>
                                        <p class="text-purple-100">Test Runs</p>
                                        <p id="totalRuns" class="text-2xl font-bold">--</p>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
                                <div class="flex items-center">
                                    <i class="fas fa-percentage text-2xl mr-4"></i>
                                    <div>
                                        <p class="text-orange-100">Success Rate</p>
                                        <p id="successRate" class="text-2xl font-bold">--</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h3 class="text-xl font-semibold mb-4">Recent Test Executions</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full bg-white border border-gray-200 rounded-lg">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Suite</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passed</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failed</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="testRunsTable" class="divide-y divide-gray-200">
                                    <!-- Dynamic content will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- API Testing Tab -->
                    <div id="api-testing-tab" class="tab-content hidden">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <!-- API Test Configuration -->
                            <div>
                                <h3 class="text-xl font-semibold mb-4">
                                    <i class="fas fa-cogs mr-2"></i>API Test Configuration
                                </h3>
                                <form id="apiTestForm" class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Test Name</label>
                                        <input type="text" id="testName" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter test name" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">API Endpoint</label>
                                        <input type="url" id="apiEndpoint" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://api.example.com/endpoint" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">HTTP Method</label>
                                        <select id="httpMethod" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                            <option value="GET">GET</option>
                                            <option value="POST">POST</option>
                                            <option value="PUT">PUT</option>
                                            <option value="DELETE">DELETE</option>
                                            <option value="PATCH">PATCH</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Request Body (JSON)</label>
                                        <textarea id="requestBody" rows="4" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder='{"key": "value"}'></textarea>
                                    </div>
                                    <div class="flex space-x-4">
                                        <button type="submit" class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">
                                            <i class="fas fa-save mr-2"></i>Save Test
                                        </button>
                                        <button type="button" id="runTestBtn" class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors">
                                            <i class="fas fa-play mr-2"></i>Run Test
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <!-- Response Validation -->
                            <div>
                                <h3 class="text-xl font-semibold mb-4">
                                    <i class="fas fa-check-circle mr-2"></i>Response Validation
                                </h3>
                                <div class="space-y-4">
                                    <div class="border border-gray-200 rounded-lg p-4">
                                        <h4 class="font-medium mb-3">Status Code Tests</h4>
                                        <div class="space-y-2">
                                            <div class="flex items-center space-x-2">
                                                <input type="checkbox" id="statusCheck" class="rounded">
                                                <label for="statusCheck">Expected Status Code:</label>
                                                <input type="number" id="expectedStatus" value="200" class="w-20 p-1 border rounded">
                                            </div>
                                            <div class="flex items-center space-x-2">
                                                <input type="checkbox" id="timeCheck" class="rounded">
                                                <label for="timeCheck">Response Time &lt;</label>
                                                <input type="number" id="maxTime" value="2000" class="w-20 p-1 border rounded">
                                                <span>ms</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="border border-gray-200 rounded-lg p-4">
                                        <h4 class="font-medium mb-3">Content Validation</h4>
                                        <div class="space-y-2">
                                            <div class="flex items-center space-x-2">
                                                <input type="checkbox" id="contentTypeCheck" class="rounded">
                                                <label for="contentTypeCheck">Content-Type:</label>
                                                <select id="expectedContentType" class="p-1 border rounded">
                                                    <option value="application/json">application/json</option>
                                                    <option value="text/html">text/html</option>
                                                    <option value="text/plain">text/plain</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div id="testResult" class="hidden border rounded-lg p-4">
                                        <h4 class="font-medium mb-2">Test Result</h4>
                                        <div id="resultContent" class="text-sm"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Saved API Tests -->
                        <div class="mt-8">
                            <h3 class="text-xl font-semibold mb-4">Saved API Tests</h3>
                            <div id="savedTests" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <!-- Dynamic content will be loaded here -->
                            </div>
                        </div>
                    </div>

                    <!-- Performance Testing Tab -->
                    <div id="performance-tab" class="tab-content hidden">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <!-- Performance Test Configuration -->
                            <div>
                                <h3 class="text-xl font-semibold mb-4">
                                    <i class="fas fa-tachometer-alt mr-2"></i>Performance Test Configuration
                                </h3>
                                <form id="performanceTestForm" class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Target URL</label>
                                        <input type="url" id="perfEndpoint" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://api.example.com/endpoint" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Virtual Users</label>
                                        <input type="number" id="virtualUsers" value="10" min="1" max="1000" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Test Duration (seconds)</label>
                                        <input type="number" id="testDuration" value="60" min="10" max="3600" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                                    </div>
                                    <button type="submit" class="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors">
                                        <i class="fas fa-rocket mr-2"></i>Start Performance Test
                                    </button>
                                </form>
                            </div>

                            <!-- Performance Metrics -->
                            <div>
                                <h3 class="text-xl font-semibold mb-4">
                                    <i class="fas fa-chart-bar mr-2"></i>Performance Metrics
                                </h3>
                                <div id="performanceMetrics" class="space-y-4">
                                    <div class="grid grid-cols-2 gap-4">
                                        <div class="bg-blue-50 p-4 rounded-lg">
                                            <p class="text-sm text-gray-600">Average Response Time</p>
                                            <p id="avgTime" class="text-2xl font-bold text-blue-600">-- ms</p>
                                        </div>
                                        <div class="bg-green-50 p-4 rounded-lg">
                                            <p class="text-sm text-gray-600">Requests/sec</p>
                                            <p id="reqPerSec" class="text-2xl font-bold text-green-600">--</p>
                                        </div>
                                        <div class="bg-yellow-50 p-4 rounded-lg">
                                            <p class="text-sm text-gray-600">95th Percentile</p>
                                            <p id="p95Time" class="text-2xl font-bold text-yellow-600">-- ms</p>
                                        </div>
                                        <div class="bg-red-50 p-4 rounded-lg">
                                            <p class="text-sm text-gray-600">Error Rate</p>
                                            <p id="errorRate" class="text-2xl font-bold text-red-600">--%</p>
                                        </div>
                                    </div>
                                    <div id="performanceStatus" class="hidden bg-blue-100 border-l-4 border-blue-500 p-4 rounded">
                                        <p class="text-blue-700">
                                            <i class="fas fa-spinner fa-spin mr-2"></i>
                                            Performance test in progress...
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Reports Tab -->
                    <div id="reports-tab" class="tab-content hidden">
                        <h3 class="text-xl font-semibold mb-4">
                            <i class="fas fa-file-alt mr-2"></i>Test Reports & Analytics
                        </h3>
                        <div class="mb-6">
                            <button id="generateReportBtn" class="bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 transition-colors">
                                <i class="fas fa-file-pdf mr-2"></i>Generate Detailed Report
                            </button>
                        </div>
                        <div id="reportsContainer">
                            <!-- Reports will be loaded here -->
                        </div>
                    </div>

                    <!-- UI Testing Tab -->
                    <div id="ui-testing-tab" class="tab-content hidden">
                        <div>
                            <h3 class="text-xl font-semibold mb-4">
                                <i class="fas fa-mouse-pointer mr-2"></i>User Interface Testing
                            </h3>
                            <form id="uiTestForm" class="space-y-4 max-w-md">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Username (Required)</label>
                                    <input type="text" id="uiUsername" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                    <input type="email" id="uiEmail" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                    <input type="password" id="uiPassword" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">User Type</label>
                                    <select id="uiUserType" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="tester">Tester</option>
                                        <option value="developer">Developer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <input type="checkbox" id="acceptTerms" class="rounded" required>
                                    <label for="acceptTerms" class="text-sm">Accept Terms & Conditions *</label>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <input type="checkbox" id="subscribeNewsletter" class="rounded">
                                    <label for="subscribeNewsletter" class="text-sm">Subscribe to Newsletter</label>
                                </div>
                                <button type="submit" class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors w-full">
                                    <i class="fas fa-user-check mr-2"></i>Test Registration
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Login Modal -->
        <div id="loginModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
                    <div class="p-6">
                        <h2 class="text-2xl font-bold mb-4">Login</h2>
                        <form id="loginForm">
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Username or Email</label>
                                <input type="text" id="loginUsername" class="w-full p-3 border border-gray-300 rounded-lg" required>
                            </div>
                            <div class="mb-6">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                <input type="password" id="loginPassword" class="w-full p-3 border border-gray-300 rounded-lg" required>
                            </div>
                            <div class="flex justify-end space-x-4">
                                <button type="button" id="cancelLogin" class="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Login</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Register Modal -->
        <div id="registerModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
                    <div class="p-6">
                        <h2 class="text-2xl font-bold mb-4">Register</h2>
                        <form id="registerForm">
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                                <input type="text" id="regUsername" class="w-full p-3 border border-gray-300 rounded-lg" required>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <input type="email" id="regEmail" class="w-full p-3 border border-gray-300 rounded-lg" required>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                <input type="password" id="regPassword" class="w-full p-3 border border-gray-300 rounded-lg" required>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">User Type</label>
                                <select id="regUserType" class="w-full p-3 border border-gray-300 rounded-lg">
                                    <option value="tester">Tester</option>
                                    <option value="developer">Developer</option>
                                </select>
                            </div>
                            <div class="mb-4">
                                <div class="flex items-center space-x-2">
                                    <input type="checkbox" id="regAcceptTerms" class="rounded" required>
                                    <label for="regAcceptTerms" class="text-sm">Accept Terms & Conditions *</label>
                                </div>
                            </div>
                            <div class="mb-6">
                                <div class="flex items-center space-x-2">
                                    <input type="checkbox" id="regNewsletter" class="rounded">
                                    <label for="regNewsletter" class="text-sm">Subscribe to Newsletter</label>
                                </div>
                            </div>
                            <div class="flex justify-end space-x-4">
                                <button type="button" id="cancelRegister" class="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Register</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- View Details Modal -->
        <div id="viewDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold">Test Run Details</h2>
                            <button id="closeDetailsModal" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        
                        <!-- Test Run Information -->
                        <div id="testRunDetails" class="space-y-6">
                            <!-- Basic Info -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="bg-gray-50 p-4 rounded-lg">
                                    <h3 class="font-semibold text-gray-700 mb-3">Test Information</h3>
                                    <div class="space-y-2 text-sm">
                                        <div><span class="font-medium">Test Name:</span> <span id="detailTestName">-</span></div>
                                        <div><span class="font-medium">Run ID:</span> <span id="detailRunId">-</span></div>
                                        <div><span class="font-medium">Status:</span> <span id="detailStatus">-</span></div>
                                        <div><span class="font-medium">Started By:</span> <span id="detailStartedBy">-</span></div>
                                    </div>
                                </div>
                                
                                <div class="bg-gray-50 p-4 rounded-lg">
                                    <h3 class="font-semibold text-gray-700 mb-3">Execution Details</h3>
                                    <div class="space-y-2 text-sm">
                                        <div><span class="font-medium">Started At:</span> <span id="detailStartedAt">-</span></div>
                                        <div><span class="font-medium">Finished At:</span> <span id="detailFinishedAt">-</span></div>
                                        <div><span class="font-medium">Duration:</span> <span id="detailDuration">-</span></div>
                                        <div><span class="font-medium">Success Rate:</span> <span id="detailSuccessRate">-</span></div>
                                    </div>
                                </div>
                            </div>

                            <!-- API Test Details (if available) -->
                            <div id="apiTestDetails" class="bg-blue-50 p-4 rounded-lg">
                                <h3 class="font-semibold text-blue-700 mb-3">API Test Configuration</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div><span class="font-medium">Endpoint:</span> <span id="detailEndpoint">-</span></div>
                                    <div><span class="font-medium">HTTP Method:</span> <span id="detailHttpMethod">-</span></div>
                                </div>
                                <div class="mt-3">
                                    <div class="font-medium mb-1">Request Headers:</div>
                                    <pre id="detailHeaders" class="bg-white p-2 rounded text-xs overflow-x-auto">-</pre>
                                </div>
                                <div class="mt-3">
                                    <div class="font-medium mb-1">Request Body:</div>
                                    <pre id="detailRequestBody" class="bg-white p-2 rounded text-xs overflow-x-auto">-</pre>
                                </div>
                            </div>

                            <!-- Performance Metrics -->
                            <div class="bg-green-50 p-4 rounded-lg">
                                <h3 class="font-semibold text-green-700 mb-3">Performance Metrics</h3>
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div class="text-center">
                                        <div class="font-medium">Total Requests</div>
                                        <div id="detailTotalRequests" class="text-lg font-bold text-green-600">-</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="font-medium">Successful</div>
                                        <div id="detailSuccessCount" class="text-lg font-bold text-green-600">-</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="font-medium">Failed</div>
                                        <div id="detailFailedCount" class="text-lg font-bold text-red-600">-</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="font-medium">Skipped</div>
                                        <div id="detailSkippedCount" class="text-lg font-bold text-gray-600">-</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Additional Metrics (if available) -->
                            <div id="additionalMetrics" class="bg-purple-50 p-4 rounded-lg hidden">
                                <h3 class="font-semibold text-purple-700 mb-3">Detailed Performance Metrics</h3>
                                <div id="metricsContent" class="text-sm">
                                    <!-- Dynamic metrics will be loaded here -->
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex justify-end space-x-4 pt-4 border-t">
                                <button id="deleteRunBtn" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                                    <i class="fas fa-trash mr-2"></i>Delete Run
                                </button>
                                <button id="rerunTestBtn" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                                    <i class="fas fa-redo mr-2"></i>Run Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Confirmation Modal -->
        <div id="confirmationModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
                    <div class="p-6">
                        <div class="flex items-center mb-4">
                            <i class="fas fa-exclamation-triangle text-yellow-500 text-2xl mr-3"></i>
                            <h2 class="text-xl font-bold">Confirm Action</h2>
                        </div>
                        <p id="confirmationMessage" class="text-gray-600 mb-6">Are you sure you want to proceed?</p>
                        <div class="flex justify-end space-x-4">
                            <button id="cancelConfirmation" class="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
                            <button id="confirmAction" class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Scripts -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
