const menuButton = document.getElementById('menuButton');
    const historyButton = document.getElementById('historyButton');
    const uploadButton = document.getElementById('uploadButton');
    const toggleMode = document.getElementById('toggleMode');
    const messageInput = document.getElementById('messageInput');
    const talkButton = document.getElementById('talkButton');
    const conversation = document.getElementById('conversation');
    const applet = document.getElementById('applet');
    const history = document.getElementById('history');
    const closeSettings = document.getElementById('closeSettings');
    const closeHistory = document.getElementById('closeHistory');
    const historyList = document.getElementById('historyList');
    const copyHistory = document.getElementById('copyHistory');
    const exportHistory = document.getElementById('exportHistory');
    const saveSettings = document.getElementById('saveSettings');
    const decreaseTextSize = document.getElementById('decreaseTextSize');
    const increaseTextSize = document.getElementById('increaseTextSize');
    const aiSpeechToggle = document.getElementById('aiSpeechToggle');
    const baseUrlInput = document.getElementById('baseUrl');
    const apiKeyInput = document.getElementById('apiKey');
    const preferredModelInput = document.getElementById('preferredModel');
    const userInfoInput = document.getElementById('userInfo');
    const responseInstructionsInput = document.getElementById('responseInstructions');
    const fileInput = document.getElementById('fileInput');

    let baseUrl = '';
    let apiKey = '';
    let preferredModel = '';
    let userInfo = '';
    let responseInstructions = '';
    let textSize = 24;
    let recognizing = false;
    let recognition;
    let currentUtterance = null;
    let aiSpeechEnabled = true;
    let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

    if ('webkitSpeechRecognition' in window) {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = function() {
        recognizing = true;
        talkButton.innerHTML = '<i class="fas fa-stop"></i>';
      };

      recognition.onend = function() {
        recognizing = false;
        updateTalkButtonText();
      };

      recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        messageInput.value = transcript;
        addMessage();
      };
    } else {
      alert('Speech recognition not supported in this browser.');
    }

    uploadButton.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
      const files = event.target.files;
      if (files.length > 0) {
        const file = files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
          const fileElement = document.createElement('div');
          fileElement.classList.add('message', 'user-message');
          if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            fileElement.appendChild(img);
          } else {
            fileElement.textContent = `Uploaded: ${file.name}`;
          }
          conversation.appendChild(fileElement);
          conversation.scrollTop = conversation.scrollHeight;
        };

        if (file.type.startsWith('image/')) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      }
    });

    async function addMessage() {
      const message = messageInput.value.trim();
      if (message) {
        const userMessageElement = document.createElement('div');
        userMessageElement.classList.add('message', 'user-message');
        userMessageElement.textContent = message;
        conversation.appendChild(userMessageElement);
        messageInput.value = '';
        conversation.scrollTop = conversation.scrollHeight;

        const typingElement = document.createElement('div');
        typingElement.classList.add('message', 'ai-message', 'typing-indicator');
        typingElement.innerHTML = `
          <span></span>
          <span></span>
          <span></span>
        `;
        conversation.appendChild(typingElement);
        conversation.scrollTop = conversation.scrollHeight;

        try {
          const payload = {
            model: preferredModel,
            messages: [
              { role: "system", content: `What you should know about me: ${userInfo}\nHow I want you to respond: ${responseInstructions}` },
              { role: "user", content: message }
            ]
          };

          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
          }

          const data = await response.json();
          const aiMessageContent = data.choices[0].message.content.trim();
          const aiMessageElement = document.createElement('div');
          aiMessageElement.innerHTML = marked(aiMessageContent);
          aiMessageElement.classList.add('message', 'ai-message');
          const ttsIcon = document.createElement('span');
          ttsIcon.innerHTML = '<i class="fas fa-volume-up"></i>';
          ttsIcon.style.cursor = 'pointer';
          ttsIcon.onclick = () => {
            if (currentUtterance) {
              speechSynthesis.cancel();
              currentUtterance = null;
            }
            currentUtterance = new SpeechSynthesisUtterance(aiMessageContent);
            speechSynthesis.speak(currentUtterance);
          };
          aiMessageElement.appendChild(ttsIcon);
          conversation.appendChild(aiMessageElement);
          conversation.scrollTop = conversation.scrollHeight;

          saveToHistory(message, aiMessageContent);

          if (aiSpeechEnabled) {
            currentUtterance = new SpeechSynthesisUtterance(aiMessageContent);
            currentUtterance.onend = () => {
              talkButton.click();
            };
            speechSynthesis.speak(currentUtterance);
          }
        } catch (error) {
          console.error('Error:', error);
          const errorMessageElement = document.createElement('div');
          errorMessageElement.classList.add('message', 'ai-message');
          errorMessageElement.textContent = `Error: ${error.message}`;
          conversation.appendChild(errorMessageElement);
          conversation.scrollTop = conversation.scrollHeight;
        } finally {
          conversation.removeChild(typingElement);
        }
      }
    }

    function saveToHistory(userMessage, aiMessage) {
      const timestamp = new Date().toLocaleString();
      chatHistory.push({ timestamp, userMessage, aiMessage });
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }

    function loadChatHistory() {
      historyList.innerHTML = '';
      chatHistory.forEach((chat, index) => {
        const chatItem = document.createElement('div');
        chatItem.classList.add('mb-2', 'p-2', 'rounded-md');
        chatItem.innerHTML = `
          <p class="text-xs text-secondary">${chat.timestamp}</p>
          <p class="text-sm"><strong>You:</strong> ${chat.userMessage}</p>
          <p class="text-sm"><strong>AI:</strong> ${chat.aiMessage}</p>
          <button class="delete-button">Delete</button>
        `;
        const deleteButton = chatItem.querySelector('.delete-button');
        deleteButton.addEventListener('click', () => {
          chatHistory.splice(index, 1);
          localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
          loadChatHistory();
        });
        historyList.appendChild(chatItem);
      });
    }

    menuButton.addEventListener('click', () => {
      applet.classList.toggle('open');
    });

    historyButton.addEventListener('click', () => {
      history.classList.toggle('open');
      loadChatHistory();
    });

    closeSettings.addEventListener('click', () => {
      applet.classList.remove('open');
    });

    closeHistory.addEventListener('click', () => {
      history.classList.remove('open');
    });

    copyHistory.addEventListener('click', () => {
      const historyText = chatHistory.map(chat => `You: ${chat.userMessage}\nAI: ${chat.aiMessage}`).join('\n\n');
      navigator.clipboard.writeText(historyText).then(() => {
        alert('Chat history copied to clipboard');
      });
    });

    exportHistory.addEventListener('click', () => {
      const historyText = chatHistory.map(chat => `You: ${chat.userMessage}\nAI: ${chat.aiMessage}`).join('\n\n');
      const blob = new Blob([historyText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chat_history.txt';
      a.click();
      URL.revokeObjectURL(url);
    });

    toggleMode.addEventListener('click', () => {
      if (document.body.classList.contains('dark-mode')) {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        toggleMode.innerHTML = '<i class="fas fa-sun"></i>';
      } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        toggleMode.innerHTML = '<i class="fas fa-moon"></i>';
      }
    });

    saveSettings.addEventListener('click', () => {
      const newBaseUrl = baseUrlInput.value;
      if (!isValidUrl(newBaseUrl)) {
        alert("Please enter a valid URL.");
        return;
      }
      baseUrl = newBaseUrl;
      apiKey = apiKeyInput.value;
      preferredModel = preferredModelInput.value;
      userInfo = userInfoInput.value;
      responseInstructions = responseInstructionsInput.value;
      aiSpeechEnabled = aiSpeechToggle.checked;

      localStorage.setItem('baseUrl', baseUrl);
      localStorage.setItem('apiKey', apiKey);
      localStorage.setItem('preferredModel', preferredModel);
      localStorage.setItem('userInfo', userInfo);
      localStorage.setItem('responseInstructions', responseInstructions);
      localStorage.setItem('aiSpeechEnabled', aiSpeechEnabled);

      updateTalkButtonText();
      applet.classList.remove('open');
    });

    talkButton.addEventListener('click', () => {
      if (recognizing) {
        recognition.stop();
      } else if (!aiSpeechEnabled) {
        addMessage();
      } else {
        if (currentUtterance) {
          speechSynthesis.cancel();
          currentUtterance = null;
        }
        recognition.start();
      }
    });

    messageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        addMessage();
      }
    });

    decreaseTextSize.addEventListener('click', () => {
      textSize = Math.max(12, textSize - 2);
      conversation.style.fontSize = `${textSize}px`;
    });

    increaseTextSize.addEventListener('click', () => {
      textSize = Math.min(48, textSize + 2);
      conversation.style.fontSize = `${textSize}px`;
    });

    function isValidUrl(url) {
      const pattern = new RegExp('^(https?:\\/\\/)?'+
        '((([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\\.)+[a-z]{2,}|'+
        'localhost|'+
        '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|'+
        '\\[?[a-f0-9]*:[a-f0-9:%.]*\\]?)'+
        '(\\:\\d+)?(\\/[-a-z0-9%_.~+]*)*'+
        '(\\?[;&a-z0-9%_.~+=-]*)?'+
        '(\\#[-a-z0-9_]*)?$','i');
      return !!pattern.test(url);
    }

    function updateTalkButtonText() {
      talkButton.innerHTML = aiSpeechEnabled ? (recognizing ? '<i class="fas fa-stop"></i>' : '<i class="fas fa-microphone"></i>') : '<i class="fas fa-paper-plane"></i>';
    }

    window.onload = () => {
      baseUrl = localStorage.getItem('baseUrl') || '';
      apiKey = localStorage.getItem('apiKey') || '';
      preferredModel = localStorage.getItem('preferredModel') || '';
      userInfo = localStorage.getItem('userInfo') || '';
      responseInstructions = localStorage.getItem('responseInstructions') || '';
      aiSpeechEnabled = localStorage.getItem('aiSpeechEnabled') === 'true';

      baseUrlInput.value = baseUrl;
      apiKeyInput.value = apiKey;
      preferredModelInput.value = preferredModel;
      userInfoInput.value = userInfo;
      responseInstructionsInput.value = responseInstructions;
      aiSpeechToggle.checked = aiSpeechEnabled;

      updateTalkButtonText();
      conversation.style.fontSize = `${textSize}px`;
    };
