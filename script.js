let refreshInterval;
let autoRefreshEnabled = true;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initial load
    refreshData();
    
    // Setup auto-refresh
    setupAutoRefresh();
    
    // Add event listeners
    document.getElementById('refresh-btn').addEventListener('click', refreshData);
    document.getElementById('auto-refresh').addEventListener('change', toggleAutoRefresh);
}

function setupAutoRefresh() {
    if (autoRefreshEnabled) {
        refreshInterval = setInterval(refreshData, 10000);
    }
}

function toggleAutoRefresh() {
    const checkbox = document.getElementById('auto-refresh');
    autoRefreshEnabled = checkbox.checked;
    
    if (autoRefreshEnabled) {
        refreshInterval = setInterval(refreshData, 10000);
        showNotification('Auto-refresh enabled');
    } else {
        clearInterval(refreshInterval);
        showNotification('Auto-refresh disabled');
    }
}

async function refreshData() {
    showLoadingState();
    
    try {
        // Fetch all data concurrently
        const [guardiansData, platinumData, dhData] = await Promise.all([
            fetch('/api/guardians').then(r => r.json()),
            fetch('/api/platinum').then(r => r.json()),
            fetch('/api/dh-insurance').then(r => r.json())
        ]);
        
        const combinedData = {
            guardians: guardiansData.ready,
            platinum: platinumData.available_agents,
            dhStates: dhData
        };
        
        displayData(combinedData);
    } catch (error) {
        console.error('Refresh error:', error);
        showError(error);
    }
}

function showLoadingState() {
    const stateContainer = document.getElementById('state-container');
    const platinumCount = document.getElementById('platinum-count');
    const guardiansCount = document.getElementById('guardians-count');
    
    stateContainer.innerHTML = '<div class="loading">Refreshing data...</div>';
    platinumCount.className = 'count loading';
    platinumCount.textContent = 'Loading...';
    guardiansCount.className = 'count loading';
    guardiansCount.textContent = 'Loading...';
    
    document.getElementById('refreshing-message').textContent = 'Refreshing data...';
    document.getElementById('summary').textContent = '';
}

function displayData(data) {
    updateGuardiansData(data.guardians);
    updatePlatinumData(data.platinum);
    updateDHInsuranceData(data.dhStates);
    updateTimestamp();
    
    document.getElementById('refreshing-message').textContent = '';
}

function updateGuardiansData(count) {
    const guardiansCount = document.getElementById('guardians-count');
    guardiansCount.classList.remove('loading', 'positive', 'error');
    
    if (typeof count === 'number') {
        guardiansCount.textContent = count;
        if (count > 0) {
            guardiansCount.classList.add('positive');
        }
    } else {
        guardiansCount.textContent = 'Error';
        guardiansCount.classList.add('error');
    }
}

function updatePlatinumData(count) {
    const platinumCount = document.getElementById('platinum-count');
    platinumCount.classList.remove('loading', 'positive', 'error');
    
    if (typeof count === 'number') {
        platinumCount.textContent = count;
        if (count > 0) {
            platinumCount.classList.add('positive');
        }
    } else {
        platinumCount.textContent = 'Error';
        platinumCount.classList.add('error');
    }
}

function updateDHInsuranceData(dhStates) {
    const stateContainer = document.getElementById('state-container');
    stateContainer.innerHTML = '';
    
    let availableStates = 0;
    let totalStates = dhStates.length;
    
    dhStates.forEach(result => {
        const stateElement = document.createElement('div');
        stateElement.className = 'state-card';
        
        const stateCode = document.createElement('div');
        stateCode.className = 'state-code';
        stateCode.textContent = result.state;
        
        const agentCount = document.createElement('div');
        agentCount.className = 'agent-count';
        
        if (result.error) {
            agentCount.textContent = 'Error';
            agentCount.classList.add('error');
        } else {
            agentCount.textContent = result.ready;
            
            if (result.ready > 0) {
                stateElement.classList.add('available');
                agentCount.classList.add('available');
                availableStates++;
            }
        }
        
        stateElement.appendChild(stateCode);
        stateElement.appendChild(agentCount);
        stateContainer.appendChild(stateElement);
    });
    
    updateSummary(availableStates, totalStates);
}

function updateSummary(availableStates, totalStates) {
    const summaryElement = document.getElementById('summary');
    
    if (availableStates > 0) {
        summaryElement.textContent = `${availableStates} state(s) have agents available!`;
        summaryElement.classList.add('highlight');
    } else {
        summaryElement.textContent = 'No agents currently available';
        summaryElement.classList.remove('highlight');
    }
}

function updateTimestamp() {
    const now = new Date();
    document.getElementById('last-updated').textContent = 
        `Last updated: ${now.toLocaleTimeString()}`;
}

function showError(error) {
    const stateContainer = document.getElementById('state-container');
    const platinumCount = document.getElementById('platinum-count');
    const guardiansCount = document.getElementById('guardians-count');
    
    stateContainer.innerHTML = '<div class="error">Error loading data: ' + error.message + '</div>';
    platinumCount.textContent = 'Error';
    platinumCount.className = 'count error';
    guardiansCount.textContent = 'Error';
    guardiansCount.className = 'count error';
    
    document.getElementById('refreshing-message').textContent = '';
    document.getElementById('summary').textContent = '';
}

function showNotification(message) {
    // Simple notification implementation
    console.log('Notification:', message);
}
