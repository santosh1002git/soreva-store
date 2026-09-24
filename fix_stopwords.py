import re

with open('server.py', 'r', encoding='utf-8') as f:
    code = f.read()

old_stopwords = "stopwords = ['want', 'need', 'looking', 'show', 'some', 'the', 'for', 'can', 'you', 'please', 'give', 'me', 'find', 'have', 'any', 'that', 'with', 'like', 'this', 'and', 'are', 'color']"
new_stopwords = "stopwords = ['want', 'need', 'looking', 'show', 'some', 'the', 'for', 'can', 'you', 'please', 'give', 'me', 'find', 'have', 'any', 'that', 'with', 'like', 'this', 'and', 'are', 'color', 'what', 'about', 'how', 'does', 'would', 'could', 'should', 'then', 'there', 'here', 'we', 'they', 'them', 'their', 'our', 'my', 'mine', 'yours', 'from', 'where', 'when', 'who', 'why', 'which', 'those', 'these']"

code = code.replace(old_stopwords, new_stopwords)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(code)
