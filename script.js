let refreshInterval;
let autoRefreshEnabled = true;

// DOM Elements
let stateContainer, platinumCount, guardiansCount, lastUpdated, refreshingMessage, summaryElement;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    initializeElements();
    
    // Load initial data
    refreshData();
    
    // Set up auto-refresh
    setupAutoRefresh();
    
    // Add event listeners
    setupEventListeners();
});

function initializeElements() {
    stateContainer = document.getElementById('state-container');
    platinumCount = document.getElementById('platinum-count');
    guardiansCount = document.getElementById('guardians-count');
    lastUpdated = document.getElementById('last-updated');
    refreshingMessage = document.getElementById('refreshing-message');
    summaryElement = document.getElementById('summary');
}

function setupEventListeners() {
    // Manual refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
    
    // Auto-refresh toggle
    const autoRefreshCheckbox = document.getElementById('auto-refresh');
    if (autoRefreshCheckbox) {
        autoRefreshCheckbox.addEventListener('change', toggleAutoRefresh);
    }
}

function setupAutoRefresh() {
    if (autoRefreshEnabled) {
        refreshInterval = setInterval(refreshData, 10000); // 10 seconds
    }
}

function toggleAutoRefresh() {
    const checkbox = document.getElementById('auto-refresh');
    if (checkbox) {
        autoRefreshEnabled = checkbox.checked;
        
        if (autoRefreshEnabled) {
            refreshInterval = setInterval(refreshData, 10000);
            showNotification('Auto-refresh enabled');
        } else {
            clearInterval(refreshInterval);
            showNotification('Auto-refresh disabled');
        }
    }
}

async function refreshData() {
    showLoadingState();
    
    try {
        // Fetch all data concurrently for better performance
        const [guardiansData, platinumData, dhData] = await Promise.allSettled([
            fetchData('/api/guardians'),
            fetchData('/api/platinum'),
            fetchData('/api/dh-insurance')
        ]);
        
        const combinedData = {
            guardians: guardiansData.status === 'fulfilled' ? guardiansData.value.ready : null,
            platinum: platinumData.status === 'fulfilled' ? platinumData.value.available_agents : null,
            dhStates: dhData.status === 'fulfilled' ? dhData.value : []
        };
        
        // Handle individual errors
        if (guardiansData.status === 'rejected') {
            console.error('GUARDIANS data error:', guardiansData.reason);
        }
        if (platinumData.status === 'rejected') {
            console.error('PLATINUM data error:', platinumData.reason);
        }
        if (dhData.status === 'rejected') {
            console.error('DH Insurance data error:', dhData.reason);
        }
        
        displayData(combinedData);
        
    } catch (error) {
        console.error('Refresh error:', error);
        showError(error);
    }
}

async function fetchData(endpoint) {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

function showLoadingState() {
    refreshingMessage.textContent = 'Refreshing data...';
    refreshingMessage.style.color = '#3498db';
    
    // Show loading spinners
    stateContainer.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            Loading agent data...
        </div>
    `;
    
    platinumCount.className = 'count loading';
    platinumCount.textContent = '...';
    
    guardiansCount.className = 'count loading';
    guardiansCount.textContent = '...';
    
    summaryElement.textContent = '';
}

function displayData(data) {
    // Update GUARDIANS count
    updateCountElement(guardiansCount, data.guardians, 'GUARDIANS');
    
    // Update PLATINUM count
    updateCountElement(platinumCount, data.platinum, 'PLATINUM');
    
    // Update DH Insurance states
    updateDHInsuranceData(data.dhStates);
    
    // Update last updated time
    updateTimestamp();
    
    // Clear refreshing message
    refreshingMessage.textContent = '';
}

function updateCountElement(element, count, serviceName) {
    element.classList.remove('loading', 'positive', 'error');
    
    if (count === null || count === undefined) {
        element.textContent = 'Error';
        element.classList.add('error');
        return;
    }
    
    if (typeof count === 'number') {
        element.textContent = count;
        if (count > 0) {
            element.classList.add('positive');
            showNotification(`${serviceName}: ${count} agents available!`, 'success');
        }
    } else {
        element.textContent = count;
        element.classList.add('error');
    }
}

function updateDHInsuranceData(dhStates) {
    stateContainer.innerHTML = '';
    
    if (!Array.isArray(dhStates)) {
        stateContainer.innerHTML = '<div class="error">Invalid data format</div>';
        return;
    }
    
    let availableStates = 0;
    let totalStates = dhStates.length;
    
    dhStates.forEach(result => {
        const stateElement = createStateElement(result);
        stateContainer.appendChild(stateElement);
        
        if (result.ready > 0) {
            availableStates++;
        }
    });
    
    updateSummary(availableStates, totalStates);
}

function createStateElement(result) {
    const stateElement = document.createElement('div');
    stateElement.className = 'state-card';
    
    const stateCode = document.createElement('div');
    stateCode.className = 'state-code';
    stateCode.textContent = result.state;
    
    const agentCount = document.createElement('div');
    agentCount.className = 'agent-count';
    
    if (result.error) {
        agentCount.textContent = 'Err';
        agentCount.classList.add('error');
        stateElement.classList.add('error');
    } else {
        agentCount.textContent = result.ready;
        
        if (result.ready > 0) {
            stateElement.classList.add('available');
            agentCount.classList.add('available');
        }
    }
    
    // Add tooltip for error details
    if (result.error) {
        stateElement.title = result.error;
    }
    
    stateElement.appendChild(stateCode);
    stateElement.appendChild(agentCount);
    
    return stateElement;
}

function updateSummary(availableStates, totalStates) {
    summaryElement.classList.remove('highlight');
    
    if (availableStates > 0) {
        summaryElement.textContent = `🎉 ${availableStates} out of ${totalStates} states have agents available!`;
        summaryElement.classList.add('highlight');
    } else {
        summaryElement.textContent = `No agents currently available across ${totalStates} states`;
    }
}

function updateTimestamp() {
    const now = new Date();
    lastUpdated.textContent = `Last updated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
}

function showError(error) {
    const errorMessage = error.message || 'Unknown error occurred';
    
    stateContainer.innerHTML = `
        <div class="error">
            <strong>Error loading data:</strong><br>
            ${errorMessage}
        </div>
    `;
    
    platinumCount.textContent = 'Error';
    platinumCount.className = 'count error';
    
    guardiansCount.textContent = 'Error';
    guardiansCount.className = 'count error';
    
    refreshingMessage.textContent = '';
    summaryElement.textContent = 'Unable to load data';
    
    showNotification('Failed to refresh data', 'error');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
        ${type === 'error' ? 'background: #e74c3c;' : 'background: #27ae60;'}
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.style.opacity = '1', 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        refreshData,
        displayData,
        showError
    };
}
