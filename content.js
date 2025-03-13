chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "stockAnalysis",
    title: "Analyze Stock Quote",
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
        // Find the bracketed content
        const regex = /\[(.*?)\]/;
        const match = regex.exec(data);

        if (match && match[1]) {
          const extractedData = match[1];

          // Create a new tab with the extracted data
          chrome.tabs.create({ url: "about:blank" }, (newTab) => {
            chrome.scripting.executeScript({
              target: { tabId: newTab.id },
              function: (text) => {
                document.body.innerText = text;
              },
              args: [extractedData],
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