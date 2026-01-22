"""
Local proxy server for SEC EDGAR API
Handles CORS and adds proper User-Agent header
"""

import http.server
import urllib.request
import urllib.error
import os
from urllib.parse import unquote

PORT = 8080
SEC_USER_AGENT = "FinancialAnalyzer/1.0 (Educational Tool; Contact: user@example.com)"

class CORSProxyHandler(http.server.SimpleHTTPRequestHandler):

    def end_headers(self):
        # Add CORS headers to all responses
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Check if this is a proxy request
        if self.path.startswith('/proxy/'):
            self.handle_proxy()
        else:
            # Serve static files
            super().do_GET()

    def handle_proxy(self):
        # Extract the target URL from the path
        # Format: /proxy/https://data.sec.gov/...
        target_url = unquote(self.path[7:])  # Remove '/proxy/' and decode

        print(f"[PROXY] {target_url}")

        if not target_url.startswith('https://data.sec.gov/'):
            self.send_response(400)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Only SEC EDGAR URLs are allowed')
            return

        try:
            # Create request with proper headers
            req = urllib.request.Request(target_url)
            req.add_header('User-Agent', SEC_USER_AGENT)
            req.add_header('Accept', 'application/json')

            # Make the request
            with urllib.request.urlopen(req, timeout=30) as response:
                data = response.read()

            # Send successful response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(data)
            print(f"[OK] {len(data):,} bytes")

        except urllib.error.HTTPError as e:
            print(f"[ERROR] HTTP {e.code}: {e.reason}")
            self.send_response(e.code)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(str(e.reason).encode())

        except urllib.error.URLError as e:
            print(f"[ERROR] URL: {e.reason}")
            self.send_response(502)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(f'Failed to reach SEC: {e.reason}'.encode())

        except Exception as e:
            print(f"[ERROR] {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(str(e).encode())

    def log_message(self, format, *args):
        # Only log non-proxy requests (proxy has its own logging)
        if not args[0].startswith('GET /proxy/'):
            print(f"[FILE] {args[0]}")

def run_server():
    # Change to script directory for serving static files
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    server = http.server.HTTPServer(('', PORT), CORSProxyHandler)
    print("=" * 50)
    print("  Financial Analyzer Server")
    print("=" * 50)
    print(f"  App:   http://localhost:{PORT}")
    print(f"  Proxy: http://localhost:{PORT}/proxy/")
    print("=" * 50)
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()

if __name__ == '__main__':
    run_server()
