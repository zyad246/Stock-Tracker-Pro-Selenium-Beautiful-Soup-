import schedule
import time
import csv
from scraper import init_driver, fetch_stock_data


def read_symbols(file_path="../symbols.txt"):
    try:
        with open(file_path, "r") as f:
            return [line.strip().upper() for line in f if line.strip()]
    except Exception as e:
        print(f"Error reading symbols: {e}")
        return ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']  # Default symbols


def save_to_csv(results, filename="output.csv"):
    with open(filename, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Symbol", "Company", "Price", "Change", "Change %", "Market Cap", "Volume", "Last Updated", "Status"])
        for result in results:
            writer.writerow([
                result["symbol"],
                result["company"],
                result["price"],
                result["change"],
                result["change_percent"],
                result["market_cap"],
                result["volume"],
                result["last_updated"],
                result["status"]
            ])


def scrape_job():
    symbols = read_symbols()
    driver = init_driver()
    results = []

    print(f"\n🕐 Running job at {time.strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        for symbol in symbols:
            try:
                data = fetch_stock_data(driver, symbol)
                print(f"✅ {symbol}: Company={data['company']}, Price={data['price']}, Change={data['change']}, Change %={data['change_percent']}, Market Cap={data['market_cap']}, Volume={data['volume']}")
                results.append(data)
            except Exception as e:
                print(f"❌ Failed to fetch {symbol}: {e}")
                results.append({
                    "symbol": symbol,
                    "company": symbol,
                    "price": 0.0,
                    "change": 0.0,
                    "change_percent": 0.0,
                    "market_cap": "N/A",
                    "volume": "N/A",
                    "last_updated": time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
                    "status": "error",
                    "error": str(e)
                })
    finally:
        driver.quit()

    save_to_csv(results)


def main():
    schedule.every(1).minutes.do(scrape_job)

    print("🕒 Scheduler started. Press Ctrl+C to stop.\n")
    scrape_job()

    while True:
        schedule.run_pending()
        time.sleep(1)


if __name__ == "__main__":
    main()