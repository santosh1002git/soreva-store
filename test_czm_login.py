import urllib.request
import urllib.parse
import ssl
import re
import http.cookiejar

def login(email, password):
    ssl_ctx = ssl.create_default_context()
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ssl_ctx))
    urllib.request.install_opener(opener)

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }

    # 1. Get the login page and token
    req = urllib.request.Request('https://czmakers.com/login', headers=headers)
    resp = opener.open(req)
    html = resp.read().decode('utf-8')
    m = re.search(r'name="_token"\s+value="([^"]+)"', html)
    if not m:
        print("Token not found")
        return
    token = m.group(1)
    
    # 2. Post login
    data = urllib.parse.urlencode({
        '_token': token,
        'email': email,
        'password': password
    }).encode('utf-8')
    req = urllib.request.Request('https://czmakers.com/login', data=data, headers=headers)
    
    try:
        resp = opener.open(req)
        final_url = resp.geturl()
        print("Final URL:", final_url)
        
        # Save cookies
        cookie_dict = {}
        for c in cj:
            cookie_dict[c.name] = c.value
        print("Cookies:", cookie_dict)
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    login('test@example.com', 'wrongpassword')
