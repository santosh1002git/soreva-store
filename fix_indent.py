import re

with open('server.py', 'r', encoding='utf-8') as f:
    code = f.read()

old = """                        if matches:
                        matches.sort(key=lambda x: x[0], reverse=True)
                        top_product = matches[0][1]"""

new = """                        if matches:
                            matches.sort(key=lambda x: x[0], reverse=True)
                            top_product = matches[0][1]"""

code = code.replace(old, new)

old2 = """                        # Add a second recommendation if available
                        if len(matches) > 1 and matches[1][0] == matches[0][0]:
                            alt = matches[1][1]
                            alt_link = f"<a href='product.html?id={alt['id']}' style='color: #c5a059; font-weight: bold; text-decoration: underline;'>{alt.get('name', 'This piece')}</a>"
                            reply += f" We also have {alt_link} available."
                    else:
                        reply = "I'm sorry, I couldn't find any specific pieces matching that description right now. Could you try searching for something broader like 'choker', 'jhumkas', or 'tennis bracelet'?"
"""

new2 = """                            # Add a second recommendation if available
                            if len(matches) > 1 and matches[1][0] == matches[0][0]:
                                alt = matches[1][1]
                                alt_link = f"<a href='product.html?id={alt['id']}' style='color: #c5a059; font-weight: bold; text-decoration: underline;'>{alt.get('name', 'This piece')}</a>"
                                reply += f" We also have {alt_link} available."
                        else:
                            reply = "I'm sorry, I couldn't find any specific pieces matching that description right now. Could you try searching for something broader like 'choker', 'jhumkas', or 'tennis bracelet'?"
"""

code = code.replace(old2, new2)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(code)
