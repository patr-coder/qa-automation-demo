import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Use JSX renderer middleware
app.use(renderer)

// Mock data for demo without database
const mockUsers = [
  { id: 1, username: 'demo_admin', email: 'admin@qademo.com', user_type: 'admin', is_active: true },
  { id: 2, username: 'test_engineer1', email: 'engineer1@qademo.com', user_type: 'tester', is_active: true }
]

const mockTests = [
  { id: 1, name: 'Login API Test', endpoint_url: 'https://jsonplaceholder.typicode.com/posts', http_method: 'POST', owner_name: 'demo_admin' },
  { id: 2, name: 'Get User Profile', endpoint_url: 'https://jsonplaceholder.typicode.com/users/1', http_method: 'GET', owner_name: 'demo_admin' }
]

const mockRuns = [
  { id: 1, test_name: 'Login API Test', status: 'passed', success_count: 8, failed_count: 1, duration_ms: 2300, success_rate: 80.0 },
  { id: 2, test_name: 'User Profile Test', status: 'failed', success_count: 3, failed_count: 5, duration_ms: 4500, success_rate: 37.5 }
]

// Authentication endpoints (mock)
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    
    if (!username || !password) {
      return c.json({ error: 'Username and password required' }, 400)
    }

    // Mock authentication
    const user = mockUsers.find(u => u.username === username || u.email === username)
    
    if (!user || !user.is_active) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    return c.json({
      message: 'Login successful (Demo Mode)',
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
    const { username, email, password, user_type = 'tester', accepted_terms } = await c.req.json()
    
    if (!username || !email || !password || !accepted_terms) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    return c.json({
      message: 'Registration successful (Demo Mode)',
      user_id: Math.floor(Math.random() * 1000)
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// API Test Management (mock)
app.get('/api/tests', async (c) => {
  return c.json({ tests: mockTests })
})

app.post('/api/tests', async (c) => {
  try {
    const { name, endpoint_url, http_method } = await c.req.json()
    
    if (!name || !endpoint_url || !http_method) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    return c.json({
      message: 'Test created successfully (Demo Mode)',
      test_id: Math.floor(Math.random() * 1000)
    })
  } catch (error) {
    return c.json({ error: 'Failed to create test' }, 500)
  }
})

// Test Execution (mock with real API calls)
app.post('/api/tests/:id/run', async (c) => {
  try {
    const testId = c.req.param('id')
    
    // For demo, we'll try to run a real API call to JSONPlaceholder
    const startTime = Date.now()
    
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1')
      const responseTime = Date.now() - startTime
      
      return c.json({
        message: 'Test executed successfully (Demo Mode)',
        run_id: Math.floor(Math.random() * 1000),
        status: response.ok ? 'passed' : 'failed',
        response_time: responseTime,
        response_status: response.status
      })
    } catch (error) {
      return c.json({
        message: 'Test execution failed (Demo Mode)',
        run_id: Math.floor(Math.random() * 1000),
        status: 'failed',
        error: 'Network error'
      })
    }
  } catch (error) {
    return c.json({ error: 'Failed to execute test' }, 500)
  }
})

// Test Run Results (mock)
app.get('/api/runs', async (c) => {
  return c.json({ runs: mockRuns })
})

// Performance Testing (mock)
app.post('/api/performance/run', async (c) => {
  try {
    const { virtual_users, test_duration_seconds } = await c.req.json()
    
    // Simulate performance test results
    const simulatedResults = {
      average_ms: Math.random() * 500 + 100,
      min_ms: Math.random() * 100 + 50,
      max_ms: Math.random() * 1000 + 500,
      p95_ms: Math.random() * 800 + 200,
      requests_per_sec: virtual_users * (Math.random() * 2 + 0.5),
      total_requests: virtual_users * test_duration_seconds * (Math.random() * 2 + 0.5),
      error_rate: Math.random() * 10
    }

    return c.json({
      message: 'Performance test completed (Demo Mode)',
      run_id: Math.floor(Math.random() * 1000),
      results: simulatedResults
    })
  } catch (error) {
    return c.json({ error: 'Failed to run performance test' }, 500)
  }
})

// Dashboard statistics (mock)
app.get('/api/dashboard/stats', async (c) => {
  return c.json({
    active_users: 4,
    total_tests: 6,
    total_runs: 12,
    passed_runs: 8,
    average_success_rate: 67.5
  })
})

// Newsletter subscription (mock)
app.post('/api/newsletter/subscribe', async (c) => {
  const { email } = await c.req.json()
  return c.json({ message: 'Subscribed successfully (Demo Mode)' })
})

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
            .demo-banner {
                background: linear-gradient(45deg, #ff6b6b, #feca57);
                color: white;
                text-align: center;
                padding: 10px;
                font-weight: bold;
            }
        </style>
    </head>
    <body class="min-h-screen gradient-bg">
        <!-- Demo Mode Banner -->
        <div class="demo-banner">
            <i class="fas fa-info-circle mr-2"></i>
            DEMO MODE - Database not connected yet. All data is temporary and for demonstration purposes.
        </div>
        
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
                        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-yellow-700">
                                        This is a demo deployment. Database functionality will be available after D1 setup is complete.
                                        All current data is mock data for demonstration purposes.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
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

                        <h3 class="text-xl font-semibold mb-4">Recent Test Executions (Demo Data)</h3>
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
                        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-info-circle text-blue-400"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-blue-700">
                                        API testing is functional! Try testing real endpoints like JSONPlaceholder APIs.
                                        Results will be shown but not permanently stored until database is connected.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
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
                                        <input type="url" id="apiEndpoint" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://jsonplaceholder.typicode.com/posts/1" value="https://jsonplaceholder.typicode.com/posts/1" required>
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
                                            <i class="fas fa-save mr-2"></i>Save Test (Demo)
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
                                    <div id="testResult" class="hidden border rounded-lg p-4">
                                        <h4 class="font-medium mb-2">Test Result</h4>
                                        <div id="resultContent" class="text-sm"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Saved API Tests (Demo Data) -->
                        <div class="mt-8">
                            <h3 class="text-xl font-semibold mb-4">Saved API Tests (Demo Data)</h3>
                            <div id="savedTests" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <!-- Dynamic content will be loaded here -->
                            </div>
                        </div>
                    </div>

                    <!-- Performance Testing Tab -->
                    <div id="performance-tab" class="tab-content hidden">
                        <div class="bg-purple-50 border-l-4 border-purple-400 p-4 mb-6">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-info-circle text-purple-400"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-purple-700">
                                        Performance testing generates simulated results for demonstration.
                                        Real load testing would be available with proper infrastructure setup.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <!-- Performance Test Configuration -->
                            <div>
                                <h3 class="text-xl font-semibold mb-4">
                                    <i class="fas fa-tachometer-alt mr-2"></i>Performance Test Configuration
                                </h3>
                                <form id="performanceTestForm" class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Target URL</label>
                                        <input type="url" id="perfEndpoint" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://jsonplaceholder.typicode.com/posts" value="https://jsonplaceholder.typicode.com/posts" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Virtual Users</label>
                                        <input type="number" id="virtualUsers" value="10" min="1" max="100" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Test Duration (seconds)</label>
                                        <input type="number" id="testDuration" value="30" min="10" max="300" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                                    </div>
                                    <button type="submit" class="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors">
                                        <i class="fas fa-rocket mr-2"></i>Start Performance Test (Demo)
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
                            <i class="fas fa-file-alt mr-2"></i>Test Reports & Analytics (Demo)
                        </h3>
                        <div class="mb-6">
                            <button id="generateReportBtn" class="bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 transition-colors">
                                <i class="fas fa-file-pdf mr-2"></i>Generate Demo Report
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
                                <i class="fas fa-mouse-pointer mr-2"></i>User Interface Testing (Demo)
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
                                    <i class="fas fa-user-check mr-2"></i>Test Registration (Demo)
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
                        <h2 class="text-2xl font-bold mb-4">Login (Demo)</h2>
                        <form id="loginForm">
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Username or Email</label>
                                <input type="text" id="loginUsername" class="w-full p-3 border border-gray-300 rounded-lg" placeholder="Try: demo_admin or test_engineer1" required>
                            </div>
                            <div class="mb-6">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                <input type="password" id="loginPassword" class="w-full p-3 border border-gray-300 rounded-lg" placeholder="Any password works in demo mode" required>
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
                        <h2 class="text-2xl font-bold mb-4">Register (Demo)</h2>
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

        <!-- Scripts -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app