/** @typedef {import('pear-interface')} */ /* global Pear */
import ui from 'pear-electron'

import { test } from '../whatever/test.js'
import { RpcClient } from '../src/startIpc.js'




// Pear.updates((update) => {
//     console.log('update available:', update)
//     // document.getElementById('update').style.display = 'revert'
//     // const action = document.getElementById('action')
//     // action.style.display = 'revert'
//     // action.onclick = () => { Pear.restart({ platform: !update.app }) }
//     // action.innerText = 'Restart ' + (update.app ? 'App' : 'Pear') + ' [' + update.version.fork + '.' + update.version.length + ']'
//   })

// State
let currentView = 'dashboard';
let currentLogType = 'output';
let statusInterval = null;
let rpcClient = null;
// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded and parsed');
    initNavigation();
    initDashboard();
    initConfigureForm();
    initLogs();
    initSettings();
    startStatusPolling();
    rpcClient = new RpcClient()

    rpcClient.on('event', (data) => {
        console.log('Received event from RPC client:', data);
        // Handle different event types as needed
        if (data.type === 'serviceUpdate') {
            // For example, refresh services status on service update events
            refreshStatus();
        }
    });

    const res = await rpcClient.sendTestCommand() // Send a test command to verify IPC communication
    console.log('Test command response:', res);
    // Listen for daemon status changes

    // window.electronAPI.onDaemonStatusChanged((status) => {
    //     updateDaemonStatus(status);
    // });
});

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            switchView(viewName);

            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Show selected view
    const selectedView = document.getElementById(viewId);
    if (selectedView) {
        selectedView.classList.add('active');
        currentView = viewId;

        // Lazy-load Ace Editor when logs view is opened for the first time
        if (viewId === 'logs') {
            loadAceEditor().then(() => {
                if (editor) {
                    setTimeout(() => {
                        editor.resize();
                        editor.renderer.updateFull();
                    }, 0);
                }
                refreshLogs();
            });
        }

        // Refresh data when switching to certain views
        if (viewId === 'services') {
            refreshStatus();
        }
    }
}

// Dashboard
function initDashboard() {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const restartBtn = document.getElementById('restartBtn');
    const configureBtn = document.getElementById('configureBtn');
    const viewServicesBtn = document.getElementById('viewServicesBtn');
    const autoLaunchToggle = document.getElementById('autoLaunchToggle');

    startBtn.addEventListener('click', async () => {
        startBtn.disabled = true;
        startBtn.textContent = 'Starting...';

        try {
            const result = await window.electronAPI.startDaemon(false);

            if (result.success) {
                showToast('Daemon started successfully', 'success');
                // Wait a bit for the daemon to fully initialize
                await new Promise(resolve => setTimeout(resolve, 300));
                await refreshStatus();
            } else {
                showToast(`Failed to start: ${result.error}`, 'error');
                // Force refresh to ensure correct button state
                await refreshStatus();
            }
        } catch (error) {
            showToast(`Error starting daemon: ${error.message}`, 'error');
            // Force refresh to ensure correct button state
            await refreshStatus();
        }
    });

    stopBtn.addEventListener('click', async () => {
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping...';

        try {
            const result = await window.electronAPI.stopDaemon();

            if (result.success) {
                showToast('Daemon stopped', 'info');
                // Wait for backend state to fully update
                await new Promise(resolve => setTimeout(resolve, 300));
                await refreshStatus();
            } else {
                showToast(`Failed to stop: ${result.error}`, 'error');
                // Force refresh to ensure correct button state
                await refreshStatus();
            }
        } catch (error) {
            showToast(`Error stopping daemon: ${error.message}`, 'error');
            // Force refresh to ensure correct button state
            await refreshStatus();
        }
    });

    restartBtn.addEventListener('click', async () => {
        restartBtn.disabled = true;
        restartBtn.textContent = 'Restarting...';

        try {
            const result = await window.electronAPI.restartDaemon(false);

            if (result.success) {
                showToast('Daemon restarted', 'success');
                // Wait for daemon to fully restart
                await new Promise(resolve => setTimeout(resolve, 500));
                await refreshStatus();
            } else {
                showToast(`Failed to restart: ${result.error}`, 'error');
                // Force refresh to ensure correct button state
                await refreshStatus();
            }
        } catch (error) {
            showToast(`Error restarting daemon: ${error.message}`, 'error');
            // Force refresh to ensure correct button state
            await refreshStatus();
        }
    });

    configureBtn.addEventListener('click', () => {
        switchView('configure');
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelector('.nav-item[data-view="configure"]').classList.add('active');
    });

    viewServicesBtn.addEventListener('click', () => {
        switchView('services');
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelector('.nav-item[data-view="services"]').classList.add('active');
    });

    autoLaunchToggle.addEventListener('change', async (e) => {
        const result = await window.electronAPI.setAutoLaunch(e.target.checked);

        if (result.success) {
            showToast(`Auto-launch ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
        } else {
            showToast(`Failed to update auto-launch: ${result.error}`, 'error');
            e.target.checked = !e.target.checked;
        }
    });
}

// Configure Form
function initConfigureForm() {
    const form = document.getElementById('configForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('password').value;
        const seed = document.getElementById('seed').value;

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const result = await window.electronAPI.configure(password, seed);

        if (result.success) {
            showToast('Configuration saved successfully', 'success');
            form.reset();
            await refreshStatus();

            // Switch back to dashboard
            setTimeout(() => {
                switchView('dashboard');
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                document.querySelector('.nav-item[data-view="dashboard"]').classList.add('active');
            }, 1000);
        } else {
            showToast(`Configuration failed: ${result.error}`, 'error');
        }

        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Configuration';
    });
}

// Logs
let editor;
let aceLoaded = false;
let aceLoading = false;

// Lazy-load Ace Editor
function loadAceEditor() {
    return new Promise((resolve, reject) => {
        // Already loaded
        if (aceLoaded && editor) {
            resolve();
            return;
        }

        // Currently loading
        if (aceLoading) {
            // Wait for it to finish
            const checkInterval = setInterval(() => {
                if (aceLoaded) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            return;
        }

        aceLoading = true;

        // Load Ace Editor script
        const script = document.createElement('script');
        script.src = 'assets/ace/ace.js';
        script.onload = () => {
            aceLoaded = true;
            aceLoading = false;
            initAceEditor();
            resolve();
        };
        script.onerror = () => {
            aceLoading = false;
            console.error('Failed to load Ace Editor');
            // Fallback to simple text display
            document.getElementById('logsEditor').innerHTML = '<pre style="padding: 16px; color: #ccc;">Ace Editor failed to load. Logs will be displayed here.</pre>';
            reject(new Error('Failed to load Ace Editor'));
        };
        document.head.appendChild(script);
    });
}

function initAceEditor() {
    try {
        if (typeof ace !== 'undefined' && !editor) {
            ace.config.set('basePath', 'assets/ace');

            // Initialize Ace Editor
            editor = ace.edit("logsEditor");
            editor.setTheme("ace/theme/twilight");
            editor.session.setMode("ace/mode/text");
            editor.setReadOnly(true);
            editor.setShowPrintMargin(false);
            editor.setOptions({
                fontFamily: "monospace",
                fontSize: "12px"
            });
        }
    } catch (error) {
        console.error('Error initializing Ace editor:', error);
    }
}

function initLogs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const refreshBtn = document.getElementById('refreshLogsBtn');
    const downloadBtn = document.getElementById('downloadLogsBtn');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const logType = btn.dataset.logType;
            currentLogType = logType;

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            refreshLogs();
        });
    });

    refreshBtn.addEventListener('click', () => {
        refreshLogs();
    });

    downloadBtn.addEventListener('click', () => {
        if (!editor) return;

        const content = editor.getValue();
        if (!content) return;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `oniri-${currentLogType}-${new Date().toISOString().split('T')[0]}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

async function refreshLogs() {
    if (!editor) {
        console.error('Editor not initialized');
        return;
    }

    // Only show loading if we don't have content yet or if explicitly refreshing
    if (!editor.getValue()) {
        editor.setValue('Loading logs...', -1);
    }

    console.log('Fetching logs, type:', currentLogType);
    const result = await window.electronAPI.getLogs(currentLogType);
    console.log('Logs result:', result);

    if (result.success) {
        editor.setValue(result.logs || '', -1);
        editor.clearSelection();
        editor.scrollToLine(editor.session.getLength(), true, true, function () { });
    } else {
        editor.setValue(`Error loading logs: ${result.error}`, -1);
    }
}

// Settings
function initSettings() {
    const autoLaunchSettingToggle = document.getElementById('autoLaunchSettingToggle');
    const autoStartDaemonToggle = document.getElementById('autoStartDaemonToggle');
    const resetBtn = document.getElementById('resetBtn');

    autoLaunchSettingToggle.addEventListener('change', async (e) => {
        const result = await window.electronAPI.setAutoLaunch(e.target.checked);

        if (result.success) {
            showToast(`Auto-launch ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
            // Sync with dashboard toggle
            document.getElementById('autoLaunchToggle').checked = e.target.checked;
        } else {
            showToast(`Failed to update auto-launch: ${result.error}`, 'error');
            e.target.checked = !e.target.checked;
        }
    });

    autoStartDaemonToggle.addEventListener('change', async (e) => {
        const result = await window.electronAPI.setAutoStartDaemon(e.target.checked);

        if (result.success) {
            showToast(`Auto-start daemon ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
        } else {
            showToast(`Failed to update auto-start daemon: ${result.error}`, 'error');
            e.target.checked = !e.target.checked;
        }
    });

    resetBtn.addEventListener('click', async () => {
        const confirmed = confirm('Are you sure you want to reset all configuration? This cannot be undone.');

        if (!confirmed) return;

        resetBtn.disabled = true;
        resetBtn.textContent = 'Resetting...';

        const result = await window.electronAPI.resetConfig();

        if (result.success) {
            showToast('Configuration reset successfully', 'success');
            await refreshStatus();

            // Switch to configure view
            setTimeout(() => {
                switchView('configure');
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                document.querySelector('.nav-item[data-view="configure"]').classList.add('active');
            }, 1000);
        } else {
            showToast(`Reset failed: ${result.error}`, 'error');
        }

        resetBtn.disabled = false;
        resetBtn.textContent = 'Reset';
    });
}

// Status Polling
function startStatusPolling() {
    refreshStatus();
    statusInterval = setInterval(refreshStatus, 5000);
}

async function refreshStatus() {
    //const result = await window.electronAPI.getStatus();

    // if (result.success) {
    //     updateDaemonStatus(result.daemon);
    //     updateConfigStatus(result.configured);
    //     updateServicesStatus(result.services);
    //     updateAutoLaunchStatus(result.autoLaunch);
    //     updateAutoStartDaemonStatus(result.autoStartDaemon);
    // }
}

function updateDaemonStatus(status) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const daemonBadge = document.getElementById('daemonBadge');
    const daemonPid = document.getElementById('daemonPid');
    const daemonUptime = document.getElementById('daemonUptime');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const restartBtn = document.getElementById('restartBtn');

    if (status && status.status === 'online') {
        // Running
        statusDot.className = 'status-dot online';
        statusText.textContent = 'Running';
        daemonBadge.textContent = 'Running';
        daemonBadge.className = 'status-badge running';
        daemonPid.textContent = status.pid;
        daemonUptime.textContent = new Date(status.uptime).toLocaleString();

        startBtn.disabled = true;
        startBtn.textContent = 'Start';
        stopBtn.disabled = false;
        stopBtn.textContent = 'Stop';
        restartBtn.disabled = false;
        restartBtn.textContent = 'Restart';
    } else {
        // Stopped
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Stopped';
        daemonBadge.textContent = 'Stopped';
        daemonBadge.className = 'status-badge stopped';
        daemonPid.textContent = '-';
        daemonUptime.textContent = '-';

        startBtn.disabled = false;
        startBtn.textContent = 'Start';
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stop';
        restartBtn.disabled = true;
        restartBtn.textContent = 'Restart';
    }
}

function updateConfigStatus(configured) {
    const configBadge = document.getElementById('configBadge');
    const configStatus = document.getElementById('configStatus');

    if (configured) {
        configBadge.textContent = 'Configured';
        configBadge.className = 'status-badge configured';
        configStatus.textContent = 'Encryption key is configured';
    } else {
        configBadge.textContent = 'Not Configured';
        configBadge.className = 'status-badge stopped';
        configStatus.textContent = 'No encryption key configured';
    }
}

function updateServicesStatus(services) {
    const localCount = Object.keys(services.local || {}).length;
    const remoteCount = Object.keys(services.remote || {}).length;

    document.getElementById('localServicesCount').textContent = localCount;
    document.getElementById('remoteServicesCount').textContent = remoteCount;

    // Update services tables
    updateServicesTable('local', services.local || {});
    updateServicesTable('remote', services.remote || {});
}

function updateServicesTable(type, services) {
    const tbody = document.getElementById(`${type}ServicesBody`);
    tbody.innerHTML = '';

    const entries = Object.entries(services);

    if (entries.length === 0) {
        tbody.innerHTML = `<tr class="empty-state"><td colspan="5">No ${type} services configured</td></tr>`;
        return;
    }

    entries.forEach(([key, service]) => {
        const row = document.createElement('tr');

        if (type === 'local') {
            row.innerHTML = `
                <td>${service.name || key}</td>
                <td>${service.transport || 'N/A'}</td>
                <td>${service.targetHost || '127.0.0.1'}</td>
                <td>${service.targetPort || 'N/A'}</td>
                <td>${service.topic ? service.topic.substring(0, 20) + '...' : 'N/A'}</td>
            `;
        } else {
            row.innerHTML = `
                <td>${service.name || key}</td>
                <td>${service.transport || 'N/A'}</td>
                <td>${service.proxyHost || 'N/A'}</td>
                <td>${service.proxyPort || 'N/A'}</td>
                <td>${service.topic ? service.topic.substring(0, 20) + '...' : 'N/A'}</td>
            `;
        }

        tbody.appendChild(row);
    });
}

function updateAutoLaunchStatus(enabled) {
    document.getElementById('autoLaunchToggle').checked = enabled;
    document.getElementById('autoLaunchSettingToggle').checked = enabled;
}

function updateAutoStartDaemonStatus(enabled) {
    document.getElementById('autoStartDaemonToggle').checked = enabled;
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


//console.log(await ui.dimensions()) // log app dimensions