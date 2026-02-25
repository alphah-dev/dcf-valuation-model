import urllib.request
import urllib.error

try:
    response = urllib.request.urlopen('http://localhost:8000/api/stocks/overview?market=US&page=1&limit=20')
    print("SUCCESS", response.read().decode('utf-8')[:100])
except urllib.error.HTTPError as e:
    print("ERROR", e.read().decode('utf-8'))
except Exception as e:
    print("OTHER ERROR", e)
