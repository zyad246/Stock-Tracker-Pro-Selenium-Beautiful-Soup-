# Stock Tracking Application

This application fetches real-time stock data from Yahoo Finance using a Python scraper and displays it directly in a web-based GUI. The Python scraper retrieves data and sends it to the frontend GUI, with a Node.js server delivering static files.

## File Structure and Connections

### Files and Their Roles
- **index.html** (in `public/`): The HTML file for the GUI, with a table for stock data (Symbol, Company, Price, Change, Change %, Market Cap, Volume, Last Updated, Status), a stats grid (Gainers, Losers, Total Stocks, Last Update), and inputs for searching/managing symbols. Links to styles.css and script.js.
- **script.js** (in `public/`): JavaScript that manages the frontend, receiving stock data, handling user interactions (search, add/remove symbols), and updating the table and stats grid with formatted data and visual styles.
- **styles.css** (in `public/`): CSS that styles the GUI’s table, stats grid, and inputs, ensuring a responsive layout with conditional formatting (green for positive changes, red for negative).
- **scraper.py**: Python script that fetches stock data from Yahoo Finance using Selenium for dynamic content and BeautifulSoup for HTML parsing.
- **full_script_test.py**: Python script that reads symbols from symbols.txt, calls scraper.py for each symbol, and sends data directly to the GUI.
- **symbols.txt**: Text file with stock symbols (e.g., AAPL, GOOGL, MSFT, TSLA, AMZN, NVDA), used by full_script_test.py.
- **server.js**: Node.js/Express server that serves index.html, script.js, and styles.css from the public directory.

### File Connections
- **Python Scraper to Frontend**: full_script_test.py reads symbols.txt, uses scraper.py to fetch data, and sends it to script.js. script.js updates index.html’s table and stats grid.
- **Static File Serving**: server.js serves index.html, script.js, and styles.css to display the GUI.
- **Symbol Management**: User interactions in script.js update symbols.txt, which full_script_test.py reads to refresh data.

### Data Flow
full_script_test.py reads symbols from symbols.txt, uses scraper.py to fetch data from Yahoo Finance, and sends it to script.js. script.js formats the data (e.g., market cap as 3.13T, volume as 31.59M) and updates index.html’s table and stats grid. server.js serves the frontend files. User interactions (e.g., adding symbols) update symbols.txt, triggering new data fetches.

## How Selenium and BeautifulSoup Work in scraper.py

### Selenium
Selenium automates a Chrome browser to load Yahoo Finance pages, handling JavaScript-rendered content like market cap and volume. It navigates to each stock’s page, manages consent popups, waits for key elements (e.g., price), and retrieves the HTML source.

### BeautifulSoup (bs4)
BeautifulSoup parses the HTML from Selenium, using CSS selectors to extract price, company name, change, change percentage, market cap, and volume. It handles page variations with fallback selectors, converts strings to numbers, removes commas from volume, and processes suffixes (T, B, M) for market cap, returning a structured dictionary.

### Data Flow in Scraper
full_script_test.py reads symbols.txt, calls scraper.py to fetch and parse data for each symbol using Selenium and BeautifulSoup, and sends the data directly to the frontend.

## How Data is Sent to the GUI
full_script_test.py reads symbols from symbols.txt and uses scraper.py to scrape data from Yahoo Finance, including symbol, company, price, change, change percentage, market cap, volume, last updated, and status. It sends this data directly to script.js, which formats it and updates the table and stats grid in index.html. server.js serves the frontend files at http://localhost:3000. User interactions (e.g., search, add/remove symbols) update symbols.txt, prompting full_script_test.py to fetch new data.

## Running the Application
### Prerequisites
- Install Node.js and dependencies (express, cors).
- Install Python and dependencies (schedule, selenium, beautifulsoup4, webdriver-manager).
- Place server.js, symbols.txt, scraper.py, and full_script_test.py in the project root.
- Place index.html, script.js, and styles.css in public/.
- Ensure symbols.txt lists symbols (e.g., AAPL, GOOGL, MSFT, TSLA, AMZN, NVDA).

### Steps
1. Run full_script_test.py to scrape data and send it to the frontend.
2. Run server.js to serve the GUI files.
3. Open http://localhost:3000 to view the GUI, verifying the table and stats grid update.
4. Test search and add/remove symbol functionality.

