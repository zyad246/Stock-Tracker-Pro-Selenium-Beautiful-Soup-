import tkinter as tk
from tkinter import ttk
from scraper import init_driver, fetch_price
import threading
import schedule
import time


def read_symbols(file_path="symbols.txt"):
def read_symbols(file_path="../symbols.txt"):
    with open(file_path, "r") as f:
        return [line.strip().upper() for line in f if line.strip()]


class StockApp:
    def __init__(self, root):
        self.root = root
        self.root.title("📈 Real-Time Stock Prices")
        self.root.geometry("600x350")

        # Table setup: Add timestamp column
        self.tree = ttk.Treeview(root, columns=("Symbol", "Price", "Time"), show="headings")
        self.tree.heading("Symbol", text="Symbol")
        self.tree.heading("Price", text="Price")
        self.tree.heading("Time", text="Last Updated")
        self.tree.pack(fill=tk.BOTH, expand=True)

        self.symbols = read_symbols()
        self.symbol_rows = {}

        # Insert initial rows
        for symbol in self.symbols:
            row_id = self.tree.insert("", tk.END, values=(symbol, "Loading...", "--"))
            self.symbol_rows[symbol] = row_id

        # Global label for last run (optional)
        self.status_label = tk.Label(root, text="Last check: --", font=("Arial", 10))
        self.status_label.pack(pady=5)

        threading.Thread(target=self.start_scheduler, daemon=True).start()

    def update_prices(self):
        driver = init_driver()

        try:
            for symbol in self.symbols:
                try:
                    price = fetch_price(driver, symbol)
                except Exception as e:
                    price = "Error"

                timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

                # ✅ Update per-symbol row with price and timestamp
                self.root.after(0, lambda s=symbol, p=price, t=timestamp:
                                self.tree.item(self.symbol_rows[s], values=(s, p, t)))

            # Update the global timestamp label
            global_time = time.strftime("%Y-%m-%d %H:%M:%S")
            self.root.after(0, lambda: self.status_label.config(text=f"Last check: {global_time}"))

        finally:
            driver.quit()

    def start_scheduler(self):
        schedule.every(1).minutes.do(self.update_prices)
        self.update_prices()  # Run immediately on start

        while True:
            schedule.run_pending()
            time.sleep(1)


def main():
    root = tk.Tk()
    app = StockApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
