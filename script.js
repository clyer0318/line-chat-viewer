let allMessages = []; 

// 監聽檔案上傳
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const myName = document.getElementById('myName').value.trim();
    
    if (!file) return;
    if (!myName) {
        alert("請先輸入你的顯示名稱！");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parseChatData(text, myName);
        
        document.getElementById('searchInput').disabled = false;
        document.getElementById('exportBtn').disabled = false;
        renderChat(''); 
    };
    reader.readAsText(file);
});

// 監聽搜尋輸入
document.getElementById('searchInput').addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// 監聽下拉選單跳轉
document.getElementById('matchDropdown').addEventListener('change', function(e) {
    focusMatch(this.value);
});

// ============================================
// 【修改優化版】匯出圖片按鈕事件
// ============================================
document.getElementById('exportBtn').addEventListener('click', function() {
    const chatWindow = document.querySelector('.chat-window');
    const chatContainer = document.getElementById('chat'); // 改為對內部實際裝載對話的容器截圖
    const originalText = this.innerText;
    
    this.innerText = "⏳ 圖片生成中，請稍候...";
    this.disabled = true;

    // 暫時解除外層的捲動限制，讓 DOM 完全展開
    const originalHeight = chatWindow.style.height;
    const originalOverflow = chatWindow.style.overflow;
    const originalScrollTop = chatWindow.scrollTop;
    
    chatWindow.style.height = 'auto';
    chatWindow.style.overflow = 'visible';

    // 給瀏覽器一點時間重新排版 DOM，再開始截圖
    setTimeout(() => {
        html2canvas(chatContainer, {
            backgroundColor: "#8da4be", 
            scale: 1, // 將比例降為 1，大幅減少長對話突破瀏覽器 Canvas 極限變白圖的問題
            useCORS: true,
            windowWidth: chatContainer.scrollWidth,
            windowHeight: chatContainer.scrollHeight
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'LINE對話紀錄_匯出.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            console.error("匯出失敗", err);
            alert("匯出失敗！如果對話長達幾千行，可能已突破瀏覽器圖片大小的極限。建議先用關鍵字搜尋過濾對話後，再進行匯出。");
        }).finally(() => {
            // 截圖結束，把版面恢復原狀
            chatWindow.style.height = originalHeight || '70vh';
            chatWindow.style.overflow = originalOverflow || 'auto';
            chatWindow.scrollTop = originalScrollTop;

            this.innerText = originalText;
            this.disabled = false;
        });
    }, 300);
});

// 解析 txt 資料
function parseChatData(text, myName) {
    allMessages = [];
    const lines = text.split('\n');
    let currentDate = '';
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        if (line.match(/^\d{4}\.\d{2}\.\d{2}/)) {
            currentDate = line;
            return;
        }

        const match = line.match(/^(\d{2}:\d{2})\s+(\S+)\s+(.*)$/);
        if (match) {
            allMessages.push({
                date: currentDate,
                time: match[1],
                sender: match[2],
                msg: match[3],
                isMe: (match[2] === myName)
            });
        }
    });
}

// 渲染對話到畫面上
function renderChat(keyword) {
    const chatContainer = document.getElementById('chat');
    const dropdown = document.getElementById('matchDropdown');
    
    chatContainer.innerHTML = ''; 
    dropdown.innerHTML = ''; 
    
    let lastRenderedDate = '';
    let matchIndex = 0; 

    allMessages.forEach(item => {
        let isMatch = false;
        let displayMsg = escapeHtml(item.msg); 
        let displayDate = escapeHtml(item.date); // 對日期也進行轉義 xss防護
        let displaySender = escapeHtml(item.sender);
        
        if (keyword && item.msg.toLowerCase().includes(keyword.toLowerCase())) {
            isMatch = true;
            const safeKeyword = escapeHtml(keyword);
            const regex = new RegExp(`(${escapeRegExp(safeKeyword)})`, 'gi');
            displayMsg = displayMsg.replace(regex, '<mark class="search-match">$1</mark>');
            
            const option = document.createElement('option');
            option.value = matchIndex;
            const snippet = item.msg.length > 25 ? item.msg.substring(0, 25) + '...' : item.msg;
            option.textContent = `[${item.date} ${item.time}] ${item.sender}：${snippet}`;
            dropdown.appendChild(option);
        }

        if (item.date !== lastRenderedDate) {
            const dateDiv = document.createElement('div');
            dateDiv.className = 'date-divider';
            dateDiv.innerHTML = `<span>${displayDate}</span>`;
            chatContainer.appendChild(dateDiv);
            lastRenderedDate = item.date;
        }

        const rowDiv = document.createElement('div');
        rowDiv.className = `message-row ${item.isMe ? 'me' : 'other'}`;
        
        if (isMatch) {
            rowDiv.id = `match-${matchIndex}`;
            matchIndex++;
        }
        
        let profilePicHtml = item.isMe ? '' : `<div class="profile-pic"></div>`;
        let senderNameHtml = item.isMe ? '' : `<div class="sender-name">${displaySender}</div>`;
        
        rowDiv.innerHTML = `
            ${profilePicHtml}
            <div class="message-content">
                ${senderNameHtml}
                <div class="bubble-wrapper">
                    ${item.isMe ? `<span class="time">${item.time}</span>` : ''}
                    <div class="bubble">${displayMsg}</div>
                    ${!item.isMe ? `<span class="time">${item.time}</span>` : ''}
                </div>
            </div>
        `;
        chatContainer.appendChild(rowDiv);
    });

    return matchIndex; 
}

// 執行搜尋
function performSearch() {
    const keyword = document.getElementById('searchInput').value.trim();
    const dropdown = document.getElementById('matchDropdown');

    if (!keyword) {
        renderChat('');
        dropdown.style.display = 'none';
        return;
    }

    const totalMatches = renderChat(keyword);

    if (totalMatches > 0) {
        const defaultOption = document.createElement('option');
        defaultOption.textContent = `✅ 找到 ${totalMatches} 筆結果 (點擊展開清單)`;
        defaultOption.value = "-1";
        defaultOption.selected = true;
        defaultOption.disabled = true; 
        dropdown.insertBefore(defaultOption, dropdown.firstChild);
        
        dropdown.style.display = 'block';
        focusMatch(0);
        dropdown.value = "0";
    } else {
        dropdown.style.display = 'none';
        alert("找不到包含此關鍵字的對話！");
    }
}

// 跳轉到對應對話並發光
function focusMatch(index) {
    if (index === "-1") return;

    document.querySelectorAll('.active-row').forEach(el => el.classList.remove('active-row'));
    
    const target = document.getElementById(`match-${index}`);
    if (target) {
        target.classList.add('active-row');
        target.parentNode.parentNode.scrollTo({
            top: target.offsetTop - 100,
            behavior: 'smooth'
        });
    }
}

// 字元轉義防 XSS
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}