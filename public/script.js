class StockTracker {
    constructor() {
        this.ws = null;
        this.stocks = [];
        this.filteredStocks = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectWebSocket();
        this.loadInitialData();
    }

    initializeElements() {
        this.elements = {
            stockTableBody: document.getElementById('stockTableBody'),
            loading: document.getElementById('loading'),
            connectionStatus: document.getElementById('connectionStatus'),
            searchInput: document.getElementById('searchInput'),
            filterButtons: document.querySelectorAll('.filter-btn'),
            refreshBtn: document.getElementById('refreshBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            settingsModal: document.getElementById('settingsModal'),
            closeModal: document.getElementById('closeModal'),
            symbolsInput: document.getElementById('symbolsInput'),
            saveBtn: document.getElementById('saveBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            gainersCount: document.getElementById('gainersCount'),
            losersCount: document.getElementById('losersCount'),
            totalStocks: document.getElementById('totalStocks'),
            lastUpdate: document.getElementById('lastUpdate')
        };
    }

    setupEventListeners() {
        this.elements.searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterAndDisplayStocks();
        });

        this.elements.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.elements.filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.filterAndDisplayStocks();
            });
        });

        this.elements.refreshBtn.addEventListener('click', () => {
            this.refreshData();
        });

        this.elements.settingsBtn.addEventListener('click', () => {
            this.openSettingsModal();
        });

        this.elements.closeModal.addEventListener('click', () => {
            this.closeSettingsModal();
        });

        this.elements.cancelBtn.addEventListener('click', () => {
            this.closeSettingsModal();
        });

        this.elements.saveBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettingsModal();
            }
        });
    }

    connectWebSocket() {
        try {
            this.ws = new WebSocket('ws://localhost:8080');
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.updateConnectionStatus(true);
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.updateConnectionStatus(false);
                setTimeout(() => this.connectWebSocket(), 3000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus(false);
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.updateConnectionStatus(false);
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'initial':
            case 'update':
                this.stocks = data.data;
                this.filterAndDisplayStocks();
                this.updateStats();
                this.hideLoading();
                break;
        }
    }

    async loadInitialData() {
        this.showLoading();
        try {
            const response = await fetch('/api/stocks');
            const data = await response.json();
            this.stocks = data;
            this.filterAndDisplayStocks();
            this.updateStats();
        } catch (error) {
            console.error('Failed to load initial data:', error);
        } finally {
            this.hideLoading();
        }
    }

    async refreshData() {
        const originalText = this.elements.refreshBtn.innerHTML;
        this.elements.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        this.elements.refreshBtn.disabled = true;

        try {
            const response = await fetch('/api/stocks');
            const data = await response.json();
            this.stocks = data;
            this.filterAndDisplayStocks();
            this.updateStats();
        } catch (error) {
            console.error('Failed to refresh data:', error);
        } finally {
            this.elements.refreshBtn.innerHTML = originalText;
            this.elements.refreshBtn.disabled = false;
        }
    }

    filterAndDisplayStocks() {
        this.filteredStocks = this.stocks.filter(stock => {
            const matchesSearch = !this.searchTerm || 
                stock.symbol.toLowerCase().includes(this.searchTerm) ||
                stock.companyName.toLowerCase().includes(this.searchTerm);

            if (this.currentFilter === 'all') {
                return matchesSearch;
            } else if (this.currentFilter === 'gainers') {
                return matchesSearch && stock.change > 0;
            } else if (this.currentFilter === 'losers') {
                return matchesSearch && stock.change < 0;
            }
            return matchesSearch;
        });

        this.displayStocks();
    }

    displayStocks() {
        const tbody = this.elements.stockTableBody;
        tbody.innerHTML = '';

        if (this.filteredStocks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-search" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
                        No stocks found matching your criteria
                    </td>
                </tr>
            `;
            return;
        }

        this.filteredStocks.forEach(stock => {
            const row = this.createStockRow(stock);
            tbody.appendChild(row);
        });
    }

    createStockRow(stock) {
        const row = document.createElement('tr');
        row.className = 'stock-row';

        const formatNumber = (num) => {
            if (num === 'N/A' || num === null || num === undefined) return 'N/A';
            if (typeof num === 'string') return num;
            return new Intl.NumberFormat('en-US').format(num);
        };

        const formatCurrency = (num) => {
            if (num === 'N/A' || num === null || num === undefined || num === 0) return 'N/A';
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
            }).format(num);
        };

        const formatTime = (timestamp) => {
            return new Date(timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        };

        const changeClass = stock.change >= 0 ? 'change-positive' : 'change-negative';
        const changeIcon = stock.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

        row.innerHTML = `
            <td>
                <div class="symbol">${stock.symbol}</div>
            </td>
            <td>
                <div class="company-name">${stock.companyName}</div>
            </td>
            <td>
                <div class="price">${formatCurrency(stock.price)}</div>
            </td>
            <td>
                <div class="${changeClass}">
                    <i class="fas ${changeIcon}"></i>
                    ${formatCurrency(Math.abs(stock.change))}
                </div>
            </td>
            <td>
                <div class="${changeClass}">
                    <i class="fas ${changeIcon}"></i>
                    ${Math.abs(stock.changePercent).toFixed(2)}%
                </div>
            </td>
            <td>${formatNumber(stock.marketCap)}</td>
            <td>${formatNumber(stock.volume)}</td>
            <td>
                <div class="timestamp">${formatTime(stock.lastUpdated)}</div>
            </td>
            <td>
                <span class="status-badge ${stock.status === 'success' ? 'status-success' : 'status-error'}">
                    ${stock.status === 'success' ? 'Live' : 'Error'}
                </span>
            </td>
        `;

        return row;
    }

    updateStats() {
        const gainers = this.stocks.filter(stock => stock.change > 0).length;
        const losers = this.stocks.filter(stock => stock.change < 0).length;
        const total = this.stocks.length;
        const lastUpdate = this.stocks.length > 0 ? 
            new Date(Math.max(...this.stocks.map(s => new Date(s.lastUpdated)))).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            }) : '--:--';

        this.elements.gainersCount.textContent = gainers;
        this.elements.losersCount.textContent = losers;
        this.elements.totalStocks.textContent = total;
        this.elements.lastUpdate.textContent = lastUpdate;
    }

    updateConnectionStatus(connected) {
        const status = this.elements.connectionStatus;
        if (connected) {
            status.className = 'connection-status';
            status.innerHTML = '<i class="fas fa-wifi"></i><span>Connected</span>';
        } else {
            status.className = 'connection-status disconnected';
            status.innerHTML = '<i class="fas fa-wifi"></i><span>Disconnected</span>';
        }
    }

    showLoading() {
        this.elements.loading.classList.add('show');
    }

    hideLoading() {
        this.elements.loading.classList.remove('show');
    }

    async openSettingsModal() {
        try {
            const response = await fetch('/api/symbols');
            const symbols = await response.json();
            this.elements.symbolsInput.value = symbols.join('\n');
            this.elements.settingsModal.classList.add('show');
        } catch (error) {
            console.error('Failed to load symbols:', error);
        }
    }

    closeSettingsModal() {
        this.elements.settingsModal.classList.remove('show');
    }

    async saveSettings() {
        const symbolsText = this.elements.symbolsInput.value;
        const symbols = symbolsText.split('\n')
            .map(s => s.trim().toUpperCase())
            .filter(s => s.length > 0);

        if (symbols.length === 0) {
            alert('Please enter at least one stock symbol');
            return;
        }

        try {
            const response = await fetch('/api/symbols', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ symbols })
            });

            if (response.ok) {
                this.closeSettingsModal();
                this.showLoading();
            } else {
                throw new Error('Failed to save symbols');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings. Please try again.');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new StockTracker();
});