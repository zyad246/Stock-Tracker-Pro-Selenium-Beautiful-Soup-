const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// In-memory storage for stock data
let stockData = new Map();
let clients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');
  
  // Send current data to new client
  const currentData = Array.from(stockData.values());
  ws.send(JSON.stringify({ type: 'initial', data: currentData }));
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Read symbols from file
async function readSymbols() {
  try {
    const data = await fs.readFile('symbols.txt', 'utf8');
    return data.split('\n').filter(line => line.trim()).map(line => line.trim().toUpperCase());
  } catch (error) {
    console.error('Error reading symbols:', error);
    return ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA']; // Default symbols
  }
}

// Fetch stock data from Yahoo Finance
async function fetchStockData(symbol) {
  try {
    const url = `https://finance.yahoo.com/quote/${symbol}?t=${Date.now()}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // Extract data using multiple selectors
    const price = $('span[data-testid="qsp-price"]').text() ||
                  $('fin-streamer[data-field="regularMarketPrice"]').attr('value') ||
                  $('fin-streamer[data-symbol="' + symbol + '"][data-field="regularMarketPrice"]').attr('value') ||
                  '0';
    
    const change = $('span[data-testid="qsp-price-change"]').text() || 
                   $('fin-streamer[data-field="regularMarketChange"]').attr('value') || 
                   '0';
    
    const changePercent = $('span[data-testid="qsp-price-change-percent"]').text() || 
                          $('fin-streamer[data-field="regularMarketChangePercent"]').attr('value') || 
                          '0';
    
    // Get company name
    const companyName = $('h1[data-testid="quote-header"]').text() || 
                       $('h1.D\\(ib\\)').text() || 
                       symbol;

    // Get market cap
    let marketCap = $('fin-streamer[data-field="marketCap"]').attr('data-value') ||
                    $('td[data-test="MARKET_CAP-value"]').text() ||
                    'N/A';
    
    // Get volume
    let volume = $('fin-streamer[data-field="regularMarketVolume"]').attr('data-value') ||
                 $('span.d60f3b00.f80689d3').text() ||
                 $('td[data-test="TD_VOLUME-value"]').text() ||
                 'N/A';

    // Log raw values for debugging
    console.log(`Raw values for ${symbol}:`, {
      marketCapRaw: marketCap,
      volumeRaw: volume
    });

    // Parse marketCap
    if (marketCap !== 'N/A') {
      if (marketCap.includes('T')) {
        marketCap = parseFloat(marketCap.replace('T', '')) * 1_000_000_000_000;
      } else if (marketCap.includes('B')) {
        marketCap = parseFloat(marketCap.replace('B', '')) * 1_000_000_000;
      } else if (marketCap.includes('M')) {
        marketCap = parseFloat(marketCap.replace('M', '')) * 1_000_000;
      } else {
        marketCap = parseFloat(marketCap) || 0;
      }
    }

    // Parse volume
    if (volume !== 'N/A') {
      volume = parseFloat(volume.replace(/,/g, '')) || 0;
    }

    const data = {
      symbol,
      companyName: companyName.split('(')[0].trim(),
      price: parseFloat(price) || 0,
      change: parseFloat(change) || 0,
      changePercent: parseFloat(changePercent.replace(/[()%]/g, '')) || 0,
      marketCap: marketCap === 'N/A' ? 'N/A' : marketCap,
      volume: volume === 'N/A' ? 'N/A' : volume,
      lastUpdated: new Date().toISOString(),
      status: 'success'
    };

    console.log(`Fetched ${symbol}:`, {
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      marketCap: data.marketCap,
      volume: data.volume
    });
    return data;
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error.message);
    return {
      symbol,
      companyName: symbol,
      price: 0,
      change: 0,
      changePercent: 0,
      marketCap: 'N/A',
      volume: 'N/A',
      lastUpdated: new Date().toISOString(),
      status: 'error',
      error: error.message
    };
  }
}

// Update all stock data
async function updateStockData() {
  console.log(`Starting update at ${new Date().toISOString()}`);
  const symbols = await readSymbols();
  
  const promises = symbols.map(symbol => fetchStockData(symbol));
  const results = await Promise.allSettled(promises);
  
  const updatedData = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      stockData.set(data.symbol, data);
      updatedData.push(data);
    }
  });
  
  broadcast({ type: 'update', data: updatedData });
  console.log(`Updated ${updatedData.length} stocks`);
}

// API Routes
app.get('/api/stocks', async (req, res) => {
  const data = Array.from(stockData.values());
  res.json(data);
});

app.post('/api/symbols', async (req, res) => {
  try {
    const { symbols } = req.body;
    const symbolsText = symbols.join('\n');
    await fs.writeFile('symbols.txt', symbolsText);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/symbols', async (req, res) => {
  try {
    const symbols = await readSymbols();
    res.json(symbols);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule updates every minute
cron.schedule('*/1 * * * *', updateStockData);

// Initial data fetch
updateStockData();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:8080`);
});