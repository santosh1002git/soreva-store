import re

with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Locate initProductPage and add rendering for the new table
target = r"pdpDetailsList.innerHTML = detailsHtml;"

replacement = r'''pdpDetailsList.innerHTML = detailsHtml;

        // Render "More Product Details" accordion
        const moreDetailsContainer = document.getElementById('pdpMoreDetailsContainer');
        if (moreDetailsContainer) {
            let detailsObj = product.moreDetails;
            
            // Fallback boilerplate if scrape hasn't finished for this item yet
            if (!detailsObj) {
                detailsObj = {
                    "Availability": "In-Stock. Available for immediate Worldwide Delivery.",
                    "Metal": "Superior Quality Brass. Brass is an alloy of Copper, Zinc and certain other metals. The Secret composition technique is well preserved with very few Traditional Craftsmen of India.",
                    "Interesting Facts": "Our Wedding Jewelry Sets are the most difficult ones to make. It takes over 80 hours of Designing work to design each of these handcrafted Masterpieces.",
                    "Gemstone Setting Process": "Even the tiniest gemstones in this piece are hand set securely with prongs on all 4 sides. This is known as Diamond Setting or Prong Setting.",
                    "Plating Process": "Electroplating is done with generous amounts of 24 carat Gold and Rhodium for our Jewelry.",
                    "Jewelry Care": "Do not store in velvet Box. Do not apply Perfumes directly. Store in a box preferable with plastic cover. After use please rub it with a dry cotton cloth."
                };
                if (product.category === 'necklace') {
                    detailsObj["Back Chain Details"] = "This Necklace contains a matching back chain along with extensions.";
                    detailsObj["Size Info"] = "If you are not sure about the size of the Necklace, then you can contact us and we can provide you a video of the same so that you can understand the size properly.";
                }
            }
            
            let tableRowsHtml = '';
            for (const [key, value] of Object.entries(detailsObj)) {
                tableRowsHtml += `
                    <tr>
                        <td style="padding: 12px 16px; font-weight: 500; color: var(--text-dark); background: #f9f9f9; width: 30%; border: 1px solid var(--border-color);">${key}</td>
                        <td style="padding: 12px 16px; color: var(--text-dark); border: 1px solid var(--border-color);">${value}</td>
                    </tr>
                `;
            }
            
            moreDetailsContainer.innerHTML = `
                <div style="margin-top: 30px; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden;">
                    <div style="background: #000; color: #fff; padding: 14px 20px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="const t = document.getElementById('moreDetailsTableWrapper'); t.style.display = t.style.display === 'none' ? 'block' : 'none';">
                        <span style="font-size: 1.05rem; letter-spacing: 0.5px;">More Product Details</span>
                        <i class="fa-solid fa-caret-down"></i>
                    </div>
                    <div id="moreDetailsTableWrapper" style="display: block;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem; line-height: 1.5;">
                            <tbody>
                                ${tableRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
'''

app_js = app_js.replace(target, replacement)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

