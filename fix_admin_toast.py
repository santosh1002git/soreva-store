import re

with open('admin.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix showNotification to showToast
js = js.replace("showNotification('Badge updated successfully', 'success')", "showToast('Badge updated successfully')")
js = js.replace("showNotification(data.error || 'Failed to update badge', 'error')", "showToast(data.error || 'Failed to update badge')")
js = js.replace("showNotification(e.message, 'error')", "showToast(e.message)")
js = js.replace("showNotification(`Product ${newDisabled ? 'disabled' : 'enabled'} successfully`, 'success')", "showToast(`Product ${newDisabled ? 'disabled' : 'enabled'} successfully`)")
js = js.replace("showNotification(data.error || 'Failed to toggle product', 'error')", "showToast(data.error || 'Failed to toggle product')")

with open('admin.js', 'w', encoding='utf-8') as f:
    f.write(js)
