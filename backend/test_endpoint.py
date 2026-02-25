import urllib.request
import urllib.error
import json

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/dcf/calculate', 
    data=json.dumps({'ticker': 'SNAP', 'wacc': 0.10, 'growth_rates': [0.05]*5, 'terminal_growth': 0.02}).encode('utf-8'), 
    headers={'Content-Type': 'application/json'}
)

try:
    r = urllib.request.urlopen(req)
    print(json.loads(r.read()))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code)
    try:
        print("DETAIL:", json.loads(e.read().decode()))
    except:
        print("RAW:", e.read().decode())
