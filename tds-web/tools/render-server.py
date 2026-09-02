import http.server, base64, os, sys, re
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'sprites')
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        n=int(self.headers.get('Content-Length',0)); body=self.rfile.read(n).decode()
        name=re.sub(r'[^a-z0-9_]','',self.path.split('name=')[-1])
        data=body.split(',',1)[1]
        open(os.path.join(OUT,name+'.png'),'wb').write(base64.b64decode(data))
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self,*a): pass
os.chdir(os.path.dirname(os.path.abspath(__file__)))
http.server.ThreadingHTTPServer(('127.0.0.1',8766),H).serve_forever()
