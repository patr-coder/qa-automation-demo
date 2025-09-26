// QA Automation Demo Portal - Frontend JavaScript
class QAAutomationApp {
    constructor() {
        this.currentUser = null;
        this.currentTestsPage = 1;
        this.currentRunsPage = 1;
        this.testsPerPage = 10;
        this.runsPerPage = 10;
        this.init();
    }

    init() {
        this.bindEvents();
        this.showTab('dashboard');
        this.loadDashboardData();
        this.loadAPITests(1);
        this.loadTestRuns(1);
    }

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.showTab(tabName);
            });
        });

        // Modal events
        this.bindModalEvents();
        
        // Form events
        this.bindFormEvents();
    }

    bindModalEvents() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        const cancelLogin = document.getElementById('cancelLogin');
        const cancelRegister = document.getElementById('cancelRegister');

        loginBtn.addEventListener('click', () => {
            if (this.currentUser) {
                // Already logged in, show logout option
                this.handleLogout();
            } else {
                // Not logged in, show login modal
                loginModal.classList.remove('hidden');
            }
        });

        registerBtn.addEventListener('click', () => {
            registerModal.classList.remove('hidden');
        });

        cancelLogin.addEventListener('click', () => {
            loginModal.classList.add('hidden');
        });

        cancelRegister.addEventListener('click', () => {
            registerModal.classList.add('hidden');
        });

        // Close modals when clicking outside
        [loginModal, registerModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    bindFormEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Register form
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });

        // API Test form
        document.getElementById('apiTestForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateAPITest();
        });

        // Run Test button
        document.getElementById('runTestBtn').addEventListener('click', async () => {
            await this.handleRunTest();
        });

        // Performance Test form
        document.getElementById('performanceTestForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handlePerformanceTest();
        });

        // UI Test form
        document.getElementById('uiTestForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleUITest();
        });

        // Generate Report button
        document.getElementById('generateReportBtn').addEventListener('click', () => {
            this.generateReport();
        });
    }

    showTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active', 'border-blue-500', 'bg-white');
            btn.classList.add('border-transparent');
        });
        
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'border-blue-500', 'bg-white');
            activeBtn.classList.remove('border-transparent');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        const activeTab = document.getElementById(`${tabName}-tab`);
        if (activeTab) {
            activeTab.classList.remove('hidden');
        }
    }

    async handleLogin() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await axios.post('/api/auth/login', {
                username,
                password
            });

            this.currentUser = response.data.user;
            document.getElementById('loginModal').classList.add('hidden');
            this.updateUIForUser();
            this.showNotification('Login successful!', 'success');
        } catch (error) {
            this.showNotification(error.response?.data?.error || 'Login failed', 'error');
        }
    }

    async handleRegister() {
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const user_type = document.getElementById('regUserType').value;
        const accepted_terms = document.getElementById('regAcceptTerms').checked;
        const subscribed_newsletter = document.getElementById('regNewsletter').checked;

        try {
            const response = await axios.post('/api/auth/register', {
                username,
                email,
                password,
                user_type,
                accepted_terms,
                subscribed_newsletter
            });

            document.getElementById('registerModal').classList.add('hidden');
            this.showNotification('Registration successful! You can now login.', 'success');
            
            // Clear form
            document.getElementById('registerForm').reset();
        } catch (error) {
            this.showNotification(error.response?.data?.error || 'Registration failed', 'error');
        }
    }

    async handleLogout() {
        if (!this.currentUser) {
            return;
        }

        try {
            await axios.post('/api/auth/logout', {
                user_id: this.currentUser.id
            });

            this.currentUser = null;
            this.updateUIForUser();
            this.showNotification('Logout successful!', 'success');
            
            // Reset to dashboard and refresh data
            this.showTab('dashboard');
            this.loadDashboardData();
            this.loadAPITests(1);
            this.loadTestRuns(1);
        } catch (error) {
            this.showNotification('Logout failed', 'error');
        }
    }

    async handleCreateAPITest() {
        if (!this.currentUser) {
            this.showNotification('Please login first', 'error');
            return;
        }

        const name = document.getElementById('testName').value;
        const endpoint_url = document.getElementById('apiEndpoint').value;
        const http_method = document.getElementById('httpMethod').value;
        const request_body = document.getElementById('requestBody').value;

        try {
            const response = await axios.post('/api/tests', {
                name,
                endpoint_url,
                http_method,
                request_body,
                owner_user_id: this.currentUser.id,
                description: `API test for ${endpoint_url}`
            });

            this.showNotification('API test created successfully!', 'success');
            document.getElementById('apiTestForm').reset();
            this.loadAPITests(this.currentTestsPage); // Reload the tests list
        } catch (error) {
            this.showNotification(error.response?.data?.error || 'Failed to create test', 'error');
        }
    }

    async handleRunTest() {
        if (!this.currentUser) {
            this.showNotification('Please login first', 'error');
            return;
        }

        const endpoint_url = document.getElementById('apiEndpoint').value;
        const http_method = document.getElementById('httpMethod').value;
        const request_body = document.getElementById('requestBody').value;

        if (!endpoint_url) {
            this.showNotification('Please enter an API endpoint', 'error');
            return;
        }

        // Create a temporary test and run it
        try {
            // First create the test
            const testResponse = await axios.post('/api/tests', {
                name: `Quick Test - ${Date.now()}`,
                endpoint_url,
                http_method,
                request_body,
                owner_user_id: this.currentUser.id,
                description: 'Quick test run'
            });

            const testId = testResponse.data.test_id;

            // Then run the test
            const runResponse = await axios.post(`/api/tests/${testId}/run`, {
                started_by: this.currentUser.id
            });

            this.displayTestResult(runResponse.data);
            this.loadTestRuns(1); // Refresh test runs
        } catch (error) {
            this.showNotification(error.response?.data?.error || 'Failed to run test', 'error');
        }
    }

    async handlePerformanceTest() {
        if (!this.currentUser) {
            this.showNotification('Please login first', 'error');
            return;
        }

        const endpoint_url = document.getElementById('perfEndpoint').value;
        const virtual_users = parseInt(document.getElementById('virtualUsers').value);
        const test_duration_seconds = parseInt(document.getElementById('testDuration').value);

        // Show loading state
        document.getElementById('performanceStatus').classList.remove('hidden');
        
        try {
            const response = await axios.post('/api/performance/run', {
                endpoint_url,
                virtual_users,
                test_duration_seconds,
                started_by: this.currentUser.id
            });

            this.displayPerformanceResults(response.data.results);
            this.showNotification('Performance test completed!', 'success');
        } catch (error) {
            this.showNotification(error.response?.data?.error || 'Performance test failed', 'error');
        } finally {
            document.getElementById('performanceStatus').classList.add('hidden');
        }
    }

    async handleUITest() {
        const username = document.getElementById('uiUsername').value;
        const email = document.getElementById('uiEmail').value;
        const password = document.getElementById('uiPassword').value;
        const user_type = document.getElementById('uiUserType').value;
        const accepted_terms = document.getElementById('acceptTerms').checked;
        const subscribed_newsletter = document.getElementById('subscribeNewsletter').checked;

        if (!accepted_terms) {
            this.showNotification('Please accept terms and conditions', 'error');
            return;
        }

        // Simulate UI testing by creating a test user
        try {
            const response = await axios.post('/api/auth/register', {
                username: `test_${username}_${Date.now()}`,
                email: email || `test_${Date.now()}@example.com`,
                password: password || 'test123',
                user_type,
                accepted_terms,
                subscribed_newsletter
            });

            this.showNotification('UI test completed successfully! Test user created.', 'success');
            document.getElementById('uiTestForm').reset();
        } catch (error) {
            this.showNotification('UI test failed: ' + (error.response?.data?.error || 'Unknown error'), 'error');
        }
    }

    displayTestResult(result) {
        const testResult = document.getElementById('testResult');
        const resultContent = document.getElementById('resultContent');

        const statusClass = result.status === 'passed' ? 'text-green-600' : 'text-red-600';
        
        resultContent.innerHTML = `
            <div class="space-y-2">
                <p><strong>Status:</strong> <span class="${statusClass}">${result.status.toUpperCase()}</span></p>
                <p><strong>Response Time:</strong> ${result.response_time}ms</p>
                <p><strong>HTTP Status:</strong> ${result.response_status}</p>
                <p><strong>Run ID:</strong> ${result.run_id}</p>
            </div>
        `;

        testResult.classList.remove('hidden');
    }

    displayPerformanceResults(results) {
        document.getElementById('avgTime').textContent = Math.round(results.average_ms) + ' ms';
        document.getElementById('reqPerSec').textContent = Math.round(results.requests_per_sec * 10) / 10;
        document.getElementById('p95Time').textContent = Math.round(results.p95_ms) + ' ms';
        document.getElementById('errorRate').textContent = Math.round(results.error_rate * 10) / 10 + '%';
    }

    async loadDashboardData() {
        try {
            const response = await axios.get('/api/dashboard/stats');
            const stats = response.data;

            document.getElementById('activeUsers').textContent = stats.active_users;
            document.getElementById('totalTests').textContent = stats.total_tests;
            document.getElementById('totalRuns').textContent = stats.total_runs;
            document.getElementById('successRate').textContent = Math.round(stats.average_success_rate || 0) + '%';
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    async loadAPITests(page = 1) {
        try {
            const response = await axios.get(`/api/tests?page=${page}&limit=${this.testsPerPage}`);
            const { tests, pagination } = response.data;

            const container = document.getElementById('savedTests');
            container.innerHTML = '';

            // Create tests grid
            const testsGrid = document.createElement('div');
            testsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6';

            tests.forEach(test => {
                const testCard = document.createElement('div');
                testCard.className = 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow';
                testCard.innerHTML = `
                    <h4 class="font-semibold text-lg mb-2">${test.name}</h4>
                    <p class="text-sm text-gray-600 mb-2">${test.endpoint_url}</p>
                    <p class="text-sm text-gray-500 mb-3">Method: ${test.http_method}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-xs text-gray-400">by ${test.owner_name}</span>
                        <button onclick="app.runSavedTest(${test.id})" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                            <i class="fas fa-play mr-1"></i>Run
                        </button>
                    </div>
                `;
                testsGrid.appendChild(testCard);
            });

            container.appendChild(testsGrid);

            // Add pagination controls
            if (pagination.totalPages > 1) {
                const paginationDiv = document.createElement('div');
                paginationDiv.className = 'flex justify-center items-center space-x-2';
                paginationDiv.innerHTML = `
                    <button ${!pagination.hasPrev ? 'disabled' : ''} 
                            onclick="app.loadAPITests(${page - 1})" 
                            class="px-3 py-1 rounded ${pagination.hasPrev ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}">
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <span class="text-sm text-gray-600">
                        Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} tests)
                    </span>
                    <button ${!pagination.hasNext ? 'disabled' : ''} 
                            onclick="app.loadAPITests(${page + 1})" 
                            class="px-3 py-1 rounded ${pagination.hasNext ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}">
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                `;
                container.appendChild(paginationDiv);
            }

            this.currentTestsPage = page;
        } catch (error) {
            console.error('Failed to load API tests:', error);
        }
    }

    async loadTestRuns(page = 1) {
        try {
            const response = await axios.get(`/api/runs?page=${page}&limit=${this.runsPerPage}`);
            const { runs, pagination } = response.data;

            const tbody = document.getElementById('testRunsTable');
            tbody.innerHTML = '';

            runs.forEach(run => {
                const row = document.createElement('tr');
                const statusClass = run.status === 'passed' ? 'status-passed' : 
                                  run.status === 'failed' ? 'status-failed' :
                                  run.status === 'running' ? 'status-running' : 'status-queued';
                
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${run.test_name || 'Unknown Test'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${statusClass}">
                            ${run.status.toUpperCase()}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${run.success_count || 0}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${run.failed_count || 0}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${run.duration_ms ? (run.duration_ms / 1000).toFixed(1) + 's' : '--'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${run.success_rate ? run.success_rate.toFixed(1) + '%' : '--'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="text-indigo-600 hover:text-indigo-900">View Details</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // Add pagination controls below the table
            const tableContainer = document.querySelector('#testRunsTable').parentElement.parentElement;
            let paginationContainer = document.getElementById('runsPagination');
            
            if (!paginationContainer) {
                paginationContainer = document.createElement('div');
                paginationContainer.id = 'runsPagination';
                paginationContainer.className = 'mt-4 flex justify-center items-center space-x-2';
                tableContainer.appendChild(paginationContainer);
            }

            if (pagination.totalPages > 1) {
                paginationContainer.innerHTML = `
                    <button ${!pagination.hasPrev ? 'disabled' : ''} 
                            onclick="app.loadTestRuns(${page - 1})" 
                            class="px-3 py-1 rounded ${pagination.hasPrev ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}">
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <span class="text-sm text-gray-600">
                        Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} runs)
                    </span>
                    <button ${!pagination.hasNext ? 'disabled' : ''} 
                            onclick="app.loadTestRuns(${page + 1})" 
                            class="px-3 py-1 rounded ${pagination.hasNext ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}">
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                `;
            } else {
                paginationContainer.innerHTML = '';
            }

            this.currentRunsPage = page;
        } catch (error) {
            console.error('Failed to load test runs:', error);
        }
    }

    async runSavedTest(testId) {
        if (!this.currentUser) {
            this.showNotification('Please login first', 'error');
            return;
        }

        try {
            const response = await axios.post(`/api/tests/${testId}/run`, {
                started_by: this.currentUser.id
            });

            this.displayTestResult(response.data);
            this.loadTestRuns(this.currentRunsPage);
            this.showNotification('Test executed successfully!', 'success');
        } catch (error) {
            this.showNotification(error.response?.data?.error || 'Failed to run test', 'error');
        }
    }

    generateReport() {
        const reportContent = `
            <h4 class="font-semibold mb-4">Test Execution Summary Report</h4>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="mb-2"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                <p class="mb-2"><strong>Total Tests:</strong> ${document.getElementById('totalTests').textContent}</p>
                <p class="mb-2"><strong>Total Runs:</strong> ${document.getElementById('totalRuns').textContent}</p>
                <p class="mb-2"><strong>Overall Success Rate:</strong> ${document.getElementById('successRate').textContent}</p>
                <p class="text-sm text-gray-600 mt-4">This is a demo report. In a production environment, this would generate a detailed PDF or HTML report with comprehensive test results, performance metrics, and analysis.</p>
            </div>
        `;

        document.getElementById('reportsContainer').innerHTML = reportContent;
        this.showNotification('Report generated successfully!', 'success');
    }

    updateUIForUser() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        
        if (this.currentUser) {
            loginBtn.innerHTML = `<i class="fas fa-sign-out-alt mr-2"></i>Logout (${this.currentUser.username})`;
            loginBtn.className = 'bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors';
            registerBtn.style.display = 'none';
        } else {
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
            loginBtn.className = 'bg-white text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors';
            registerBtn.style.display = 'inline-block';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
        
        notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-transform`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'} mr-2"></i>
                ${message}
            </div>
        `;

        document.body.appendChild(notification);

        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }
}

// Initialize the app
const app = new QAAutomationApp();

// Auto-refresh dashboard every 30 seconds
setInterval(() => {
    app.loadDashboardData();
    app.loadTestRuns();
}, 30000);