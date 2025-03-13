// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "stockAnalysis",
    title: "Send stock quote to Webull",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "stockAnalysis") {
    const selectedText = info.selectionText;
    const prompt = `Extrapolate the ticker, entry price, and stop loss from this quote and put in a bracketed format where the ticker is first, entry price, and then stop loss: ${selectedText}`;
    const url = `https://text.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

    fetch(url)
      .then((response) => response.text())
      .then((data) => {
        const regex = /\[(.*?)\]/;
        const match = regex.exec(data);

        if (match && match[1]) {
          const extractedData = match[1];
          let [ticker, entryPrice] = extractedData.split(',').map(item => item.trim());

          // Remove the $ symbol from entryPrice if it exists
          if (entryPrice.startsWith('$')) {
            entryPrice = entryPrice.slice(1);
          }

          chrome.tabs.create({ url: "https://app.webull.com/stocks" }, (newTab) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
              if (tabId === newTab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);

                chrome.scripting.executeScript({
                  target: { tabId: newTab.id },
                  function: (ticker, entryPrice) => {
                    function performActions(ticker, entryPrice) {
                      const input = document.querySelector('input[placeholder="Symbol/Name"]');
                      if (input) {
                        input.value = ticker;
                        input.dispatchEvent(new Event('input', { bubbles: true }));

                        setTimeout(() => {
                          console.log("Searching for floating div");
                          const floatingDiv = document.querySelector('div[data-floating-ui-portal]');
                          if (floatingDiv) {
                            console.log("Floating div found");
                            setTimeout(() => {
                                console.log("Searching for first button");
                                const firstButton = floatingDiv.querySelector('div:first-child button:first-child');
                                if(firstButton){
                                    console.log("first button found");
                                    firstButton.click();

                                    setTimeout(() => {
                                      console.log("Searching for span");
                                      const limitPriceSpan = Array.from(document.querySelectorAll('span')).find(span => span.textContent.trim() === 'Limit Price');
                                      console.log(limitPriceSpan);
                                      if (limitPriceSpan) {
                                        const limitPriceDiv = limitPriceSpan.closest('div');
                                        if (limitPriceDiv) {
                                          const nextDiv = limitPriceDiv.nextElementSibling;

                                          if (nextDiv) {
                                            const nestedInput = nextDiv.querySelector('div input');
                                            if (nestedInput) {
                                              console.log("Entry Price:", entryPrice);
                                              nestedInput.focus();
                                              nestedInput.value = String(entryPrice);
                                              nestedInput.dispatchEvent(new Event('input', { bubbles: true }));
                                              nestedInput.blur();

                                              const observer = new MutationObserver(mutations => {
                                                  mutations.forEach(mutation => {
                                                      if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                                                          console.log('Value changed:', mutation.target.value);
                                                      }
                                                  });
                                              });

                                              observer.observe(nestedInput, { attributes: true, attributeFilter: ['value'] });

                                              setTimeout(() => {
                                                  observer.disconnect();
                                              }, 5000)

                                            } else {
                                              alert('Nested input below "Limit price" not found.');
                                            }
                                          } else {
                                            alert('Div below "Limit price" not found.');
                                          }
                                        } else {
                                          alert("Parent div of limit price span not found.");
                                        }
                                      } else {
                                        alert('Span with "Limit price" not found.');
                                      }
                                    }, 1500); // reduced to 2000 milliseconds (2 seconds)
                                } else {
                                    console.log("first button not found");
                                    alert('First button not found.');
                                }
                            }, 1000) // reduced to 1000 milliseconds (1 second)
                          } else {
                            console.log("floating div not found");
                            alert('Floating div not found.');
                          }
                        }, 1000);
                      } else {
                        alert('Input field not found.');
                      }
                    }
                    performActions(ticker, entryPrice);
                  },
                  args: [ticker, entryPrice],
                });
              }
            });
          });
        } else {
          alert("No bracketed data found in the response.");
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        alert("An error occurred while fetching data.");
      });
  }
});