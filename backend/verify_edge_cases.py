import urllib.request
import json

tickers = [
    "RELIANCE.NS",
    "SNAP",
    "YESBANK.NS",
    "LICI.NS"
]

results = {}

for ticker in tickers:
    try:
        req = urllib.request.Request(
            'http://127.0.0.1:8000/api/dcf/calculate', 
            data=json.dumps({
                'ticker': ticker, 
                'wacc': 0.12, 
                'growth_rates': [0.05]*5, 
                'terminal_growth': 0.02
            }).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req) as response:
            raw_text = response.read().decode('utf-8')
            data = json.loads(raw_text)
            results[ticker] = {
                "status": "SUCCESS", 
                "methodology": data.get("methodology", "Standard DCF"), 
                "error": data.get("error"),
                "raw": data
            }
    except Exception as e:
        results[ticker] = {"status": "FAILED", "error": str(e)}

with open("verify_out.json", "w") as f:
    json.dump(results, f, indent=4)
