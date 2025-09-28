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
        const loginBtnMobile = document.getElementById('loginBtnMobile');
        const registerBtnMobile = document.getElementById('registerBtnMobile');
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        const cancelLogin = document.getElementById('cancelLogin');
        const cancelRegister = document.getElementById('cancelRegister');

        // Desktop login button
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                if (this.currentUser) {
                    this.handleLogout();
                } else {
                    loginModal.classList.remove('hidden');
                }
            });
        }

        // Mobile login button
        if (loginBtnMobile) {
            loginBtnMobile.addEventListener('click', () => {
                if (this.currentUser) {
                    this.handleLogout();
                } else {
                    loginModal.classList.remove('hidden');
                }
            });
        }

        // Desktop register button
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                registerModal.classList.remove('hidden');
            });
        }

        // Mobile register button  
        if (registerBtnMobile) {
            registerBtnMobile.addEventListener('click', () => {
                registerModal.classList.remove('hidden');
            });
        }

        cancelLogin.addEventListener('click', () => {
            loginModal.classList.add('hidden');
        });

        cancelRegister.addEventListener('click', () => {
            registerModal.classList.add('hidden');
        });

        // View Details Modal events
        const viewDetailsModal = document.getElementById('viewDetailsModal');
        const closeDetailsModal = document.getElementById('closeDetailsModal');
        
        closeDetailsModal.addEventListener('click', () => {
            viewDetailsModal.classList.add('hidden');
        });

        // Confirmation Modal events
        const confirmationModal = document.getElementById('confirmationModal');
        const cancelConfirmation = document.getElementById('cancelConfirmation');
        const confirmAction = document.getElementById('confirmAction');
        
        cancelConfirmation.addEventListener('click', () => {
            confirmationModal.classList.add('hidden');
        });

        confirmAction.addEventListener('click', () => {
            if (this.pendingAction) {
                this.pendingAction();
                this.pendingAction = null;
            }
            confirmationModal.classList.add('hidden');
        });

        // Details modal action buttons
        const deleteRunBtn = document.getElementById('deleteRunBtn');
        const rerunTestBtn = document.getElementById('rerunTestBtn');
        
        deleteRunBtn.addEventListener('click', () => {
            if (this.currentRunId) {
                // Close details modal and show confirmation
                viewDetailsModal.classList.add('hidden');
                this.confirmDeleteRun(this.currentRunId, document.getElementById('detailTestName').textContent);
            }
        });

        rerunTestBtn.addEventListener('click', () => {
            // TODO: Implement rerun functionality
            this.showNotification('Rerun functionality coming soon!', 'info');
        });

        // Close modals when clicking outside
        [loginModal, registerModal, viewDetailsModal, confirmationModal].forEach(modal => {
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
    
    getMethodColor(method) {
        const colors = {
            'GET': 'bg-blue-100 text-blue-800',
            'POST': 'bg-green-100 text-green-800',
            'PUT': 'bg-yellow-100 text-yellow-800',
            'PATCH': 'bg-orange-100 text-orange-800',
            'DELETE': 'bg-red-100 text-red-800'
        };
        return colors[method] || 'bg-gray-100 text-gray-800';
    }

    async loadAPITests(page = 1) {
        try {
            const response = await axios.get(`/api/tests?page=${page}&limit=${this.testsPerPage}`);
            const { tests, pagination } = response.data;

            const container = document.getElementById('savedTests');
            container.innerHTML = '';

            // Create tests grid
            const testsGrid = document.createElement('div');
            testsGrid.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6';

            tests.forEach(test => {
                const testCard = document.createElement('div');
                testCard.className = 'bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow relative overflow-hidden';
                
                // Parse and display request body if available
                let requestBodyDisplay = '';
                if (test.request_body && test.request_body.trim() !== '') {
                    try {
                        const parsed = JSON.parse(test.request_body);
                        const bodyPreview = JSON.stringify(parsed, null, 2);
                        // Limit preview to first 3 lines
                        const lines = bodyPreview.split('\\n');
                        const preview = lines.slice(0, 3).join('\\n');
                        const hasMore = lines.length > 3;
                        requestBodyDisplay = `
                            <div class="mt-3 mb-3">
                                <p class="text-xs font-medium text-gray-700 mb-1">Request Body (JSON):</p>
                                <pre class="text-xs bg-gray-50 p-2 rounded border overflow-x-auto text-gray-600">${preview}${hasMore ? '\\n...' : ''}</pre>
                            </div>
                        `;
                    } catch (e) {
                        requestBodyDisplay = `
                            <div class="mt-3 mb-3">
                                <p class="text-xs font-medium text-gray-700 mb-1">Request Body:</p>
                                <pre class="text-xs bg-gray-50 p-2 rounded border overflow-x-auto text-gray-600">${test.request_body.substring(0, 100)}${test.request_body.length > 100 ? '...' : ''}</pre>
                            </div>
                        `;
                    }
                }
                
                testCard.innerHTML = `
                    <div class="h-full flex flex-col">
                        <div class="flex-1 mb-4">
                            <h4 class="font-bold text-lg text-gray-900 mb-3 break-words">${test.name}</h4>
                            
                            <div class="space-y-2 mb-4">
                                <div>
                                    <p class="text-xs font-medium text-gray-500 mb-1">API Endpoint:</p>
                                    <p class="text-sm text-gray-700 break-all">${test.endpoint_url}</p>
                                </div>
                                
                                <div>
                                    <p class="text-xs font-medium text-gray-500 mb-1">HTTP Method:</p>
                                    <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${this.getMethodColor(test.http_method)}">${test.http_method}</span>
                                </div>
                            </div>
                            
                            ${requestBodyDisplay}
                        </div>
                        
                        <div class="mt-auto pt-3 border-t border-gray-100">
                            <div class="flex flex-col gap-3">
                                <span class="text-xs text-gray-400">by ${test.owner_name}</span>
                                <div class="flex gap-2 w-full">
                                    <button onclick="app.runSavedTest(${test.id})" class="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors duration-200 shadow-sm flex items-center justify-center">
                                        <i class="fas fa-play mr-2"></i>Run
                                    </button>
                                    <button onclick="app.confirmDeleteTest(${test.id}, '${test.name}')" class="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors duration-200 shadow-sm flex items-center justify-center">
                                        <i class="fas fa-trash mr-2"></i>Delete
                                    </button>
                                </div>
                            </div>
                        </div>
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
                        <div class="flex space-x-2">
                            <button onclick="app.viewTestRunDetails(${run.id})" class="bg-blue-500 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-blue-600 transition-colors duration-200 flex items-center">
                                <i class="fas fa-eye mr-1"></i>View Details
                            </button>
                            <button onclick="app.confirmDeleteRun(${run.id}, '${run.test_name || 'Unknown Test'}')" class="bg-red-500 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-red-600 transition-colors duration-200 flex items-center">
                                <i class="fas fa-trash mr-1"></i>Delete
                            </button>
                        </div>
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
        const loginBtnMobile = document.getElementById('loginBtnMobile');
        const registerBtnMobile = document.getElementById('registerBtnMobile');
        
        if (this.currentUser) {
            // Update desktop buttons
            if (loginBtn) {
                loginBtn.innerHTML = `<i class="fas fa-sign-out-alt mr-2"></i>Logout (${this.currentUser.username})`;
                loginBtn.className = 'bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors';
            }
            if (registerBtn) {
                registerBtn.style.display = 'none';
            }
            
            // Update mobile buttons
            if (loginBtnMobile) {
                loginBtnMobile.innerHTML = `<i class="fas fa-sign-out-alt mr-1"></i>Logout`;
                loginBtnMobile.className = 'bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm';
            }
            if (registerBtnMobile) {
                registerBtnMobile.style.display = 'none';
            }
        } else {
            // Update desktop buttons
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
                loginBtn.className = 'bg-white text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors';
            }
            if (registerBtn) {
                registerBtn.style.display = 'inline-block';
            }
            
            // Update mobile buttons
            if (loginBtnMobile) {
                loginBtnMobile.innerHTML = '<i class="fas fa-sign-in-alt mr-1"></i>Login';
                loginBtnMobile.className = 'bg-white text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm';
            }
            if (registerBtnMobile) {
                registerBtnMobile.style.display = 'inline-block';
            }
        }
    }

    async viewTestRunDetails(runId) {
        try {
            console.log('Attempting to view details for run:', runId);
            
            const response = await axios.get(`/api/runs/${runId}`);
            console.log('API response:', response.data);
            
            const { run, metrics } = response.data;
            
            if (!run) {
                throw new Error('No run data received from API');
            }
            
            // Helper function to safely set text content
            const safeSetText = (elementId, text) => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.textContent = text;
                } else {
                    console.warn(`Element with ID '${elementId}' not found`);
                }
            };
            
            // Populate modal with run details
            safeSetText('detailTestName', run.test_name || 'Unknown Test');
            safeSetText('detailRunId', run.id || 'N/A');
            safeSetText('detailStatus', (run.status || 'unknown').toUpperCase());
            safeSetText('detailStartedBy', run.started_by_name || 'Unknown');
            safeSetText('detailStartedAt', run.started_at ? new Date(run.started_at).toLocaleString() : 'Not available');
            safeSetText('detailFinishedAt', run.finished_at ? new Date(run.finished_at).toLocaleString() : 'Not finished');
            safeSetText('detailDuration', run.duration_ms ? (run.duration_ms / 1000).toFixed(1) + ' seconds' : 'Not available');
            safeSetText('detailSuccessRate', run.success_rate ? run.success_rate.toFixed(1) + '%' : 'Not available');
            
            // API Test details
            const apiTestDetails = document.getElementById('apiTestDetails');
            if (run.endpoint_url && apiTestDetails) {
                safeSetText('detailEndpoint', run.endpoint_url);
                safeSetText('detailHttpMethod', run.http_method || 'GET');
                safeSetText('detailHeaders', run.request_headers || '{}');
                safeSetText('detailRequestBody', run.request_body || '(empty)');
                apiTestDetails.classList.remove('hidden');
            } else if (apiTestDetails) {
                apiTestDetails.classList.add('hidden');
            }
            
            // Performance metrics
            safeSetText('detailTotalRequests', run.total_requests || 0);
            safeSetText('detailSuccessCount', run.success_count || 0);
            safeSetText('detailFailedCount', run.failed_count || 0);
            safeSetText('detailSkippedCount', run.skipped_count || 0);
            
            // Additional metrics if available
            const additionalMetrics = document.getElementById('additionalMetrics');
            const metricsContent = document.getElementById('metricsContent');
            
            if (metrics && metrics.length > 0 && metricsContent && additionalMetrics) {
                metricsContent.innerHTML = metrics.map(metric => `
                    <div class="mb-2">
                        <span class="font-medium">${metric.metric_name || 'Unknown Metric'}:</span> ${metric.metric_value || 'N/A'}
                    </div>
                `).join('');
                additionalMetrics.classList.remove('hidden');
            } else if (additionalMetrics) {
                additionalMetrics.classList.add('hidden');
            }
            
            // Store run ID for delete action
            this.currentRunId = runId;
            
            // Show modal
            const modal = document.getElementById('viewDetailsModal');
            if (modal) {
                console.log('Opening View Details modal');
                modal.classList.remove('hidden');
                this.showNotification('Test run details loaded successfully', 'success');
            } else {
                throw new Error('View Details modal element not found');
            }
            
        } catch (error) {
            console.error('Error fetching run details:', error);
            if (error.response) {
                console.error('API Error:', error.response.data);
                this.showNotification(`Failed to load test run details: ${error.response.data.error}`, 'error');
            } else {
                this.showNotification('Failed to load test run details: ' + error.message, 'error');
            }
        }
    }
    
    confirmDeleteRun(runId, testName) {
        if (!this.currentUser) {
            this.showNotification('Please login first', 'error');
            return;
        }
        
        const message = `Are you sure you want to delete the test run "${testName}"? This action cannot be undone.`;
        document.getElementById('confirmationMessage').textContent = message;
        
        this.pendingAction = () => this.deleteTestRun(runId);
        document.getElementById('confirmationModal').classList.remove('hidden');
    }
    
    async deleteTestRun(runId) {
        try {
            console.log('Deleting run:', runId, 'Current user:', this.currentUser);
            
            if (!this.currentUser || !this.currentUser.id) {
                this.showNotification('Please login first to delete test runs', 'error');
                return;
            }
            
            const response = await axios.delete(`/api/runs/${runId}`, {
                data: { user_id: this.currentUser.id }
            });
            
            console.log('Delete response:', response.data);
            this.showNotification('Test run deleted successfully', 'success');
            
            // Refresh the test runs table
            this.loadTestRuns(this.currentRunsPage);
            
            // Close the details modal if it's open
            document.getElementById('viewDetailsModal').classList.add('hidden');
            
        } catch (error) {
            console.error('Error deleting test run:', error);
            if (error.response) {
                console.error('Error response:', error.response.data);
                this.showNotification(`Failed to delete test run: ${error.response.data.error}`, 'error');
            } else {
                this.showNotification('Failed to delete test run: Network error', 'error');
            }
        }
    }
    
    confirmDeleteTest(testId, testName) {
        if (!this.currentUser) {
            this.showNotification('Please login first', 'error');
            return;
        }
        
        const message = `Are you sure you want to delete the API test "${testName}"? This will also delete all associated test runs. This action cannot be undone.`;
        document.getElementById('confirmationMessage').textContent = message;
        
        this.pendingAction = () => this.deleteAPITest(testId);
        document.getElementById('confirmationModal').classList.remove('hidden');
    }
    
    async deleteAPITest(testId) {
        try {
            console.log('Deleting test:', testId, 'Current user:', this.currentUser);
            
            if (!this.currentUser || !this.currentUser.id) {
                this.showNotification('Please login first to delete API tests', 'error');
                return;
            }
            
            const response = await axios.delete(`/api/tests/${testId}`, {
                data: { user_id: this.currentUser.id }
            });
            
            console.log('Delete response:', response.data);
            this.showNotification('API test deleted successfully', 'success');
            
            // Refresh the API tests
            this.loadAPITests(this.currentTestsPage);
            
            // Also refresh test runs since they might be affected
            this.loadTestRuns(this.currentRunsPage);
            
        } catch (error) {
            console.error('Error deleting API test:', error);
            if (error.response) {
                console.error('Error response:', error.response.data);
                this.showNotification(`Failed to delete API test: ${error.response.data.error}`, 'error');
            } else {
                this.showNotification('Failed to delete API test: Network error', 'error');
            }
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