from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from webdriver_manager.chrome import ChromeDriverManager
from datetime import datetime


def init_driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # comment for visible window
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--ignore-certificate-errors")
    chrome_options.add_argument("--allow-insecure-localhost")
    chrome_options.add_argument("--disable-web-security")
    chrome_options.add_argument("--allow-running-insecure-content")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)


def fetch_stock_data(driver, stock_symbol):
    driver.get(f"https://finance.yahoo.com/quote/{stock_symbol}?t={int(datetime.now().timestamp())}")

    try:
        WebDriverWait(driver, 3).until(
            EC.element_to_be_clickable((By.NAME, "agree"))
        ).click()
    except:
        pass  # consent popup not shown

    WebDriverWait(driver, 5).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, 'span[data-testid="qsp-price"]'))
    )

    html = driver.page_source
    return extract_stock_data(html, stock_symbol)


def extract_stock_data(html, stock_symbol):
    soup = BeautifulSoup(html, "lxml")
    
    try:
        # Extract price
        price_tag = soup.select_one('span[data-testid="qsp-price"]')
        price = float(price_tag.text.strip()) if price_tag else 0.0

        # Extract company name
        company_tag = soup.select_one('h1[data-testid="quote-header"]')
        company = company_tag.text.split('(')[0].strip() if company_tag else stock_symbol

        # Extract change
        change_tag = soup.select_one('span[data-testid="qsp-price-change"]')
        change = float(change_tag.text.strip()) if change_tag else 0.0

        # Extract change percent
        change_percent_tag = soup.select_one('span[data-testid="qsp-price-change-percent"]')
        change_percent = float(change_percent_tag.text.strip().strip('()%')) if change_percent_tag else 0.0

        # Extract market cap
        market_cap_tag = soup.select_one('fin-streamer[data-field="marketCap"]')
        market_cap = market_cap_tag['data-value'] if market_cap_tag and 'data-value' in market_cap_tag.attrs else (soup.select_one('td[data-test="MARKET_CAP-value"]').text.strip() if soup.select_one('td[data-test="MARKET_CAP-value"]') else "N/A")
        if market_cap != "N/A":
            if 'T' in market_cap:
                market_cap = float(market_cap.replace('T', '')) * 1_000_000_000_000
            elif 'B' in market_cap:
                market_cap = float(market_cap.replace('B', '')) * 1_000_000_000
            elif 'M' in market_cap:
                market_cap = float(market_cap.replace('M', '')) * 1_000_000
            else:
                market_cap = float(market_cap) or 0

        # Extract volume
        volume_tag = soup.select_one('fin-streamer[data-field="regularMarketVolume"]')
        volume = volume_tag['data-value'] if volume_tag and 'data-value' in volume_tag.attrs else (soup.select_one('span.d60f3b00.f80689d3').text.strip() if soup.select_one('span.d60f3b00.f80689d3') else (soup.select_one('td[data-test="TD_VOLUME-value"]').text.strip() if soup.select_one('td[data-test="TD_VOLUME-value"]') else "N/A"))
        if volume != "N/A":
            volume = float(volume.replace(',', '')) or 0

        print(f"Extracted {stock_symbol}: market_cap={market_cap}, volume={volume}")
        return {
            "symbol": stock_symbol,
            "company": company,
            "price": price,
            "change": change,
            "change_percent": change_percent,
            "market_cap": market_cap,
            "volume": volume,
            "last_updated": datetime.now().isoformat(),
            "status": "success"
        }
    except Exception as e:
        print(f"Error extracting data for {stock_symbol}: {e}")
        return {
            "symbol": stock_symbol,
            "company": stock_symbol,
            "price": 0.0,
            "change": 0.0,
            "change_percent": 0.0,
            "market_cap": "N/A",
            "volume": "N/A",
            "last_updated": datetime.now().isoformat(),
            "status": "error",
            "error": str(e)
        }