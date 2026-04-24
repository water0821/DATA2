let allData = [];
let filteredData = [];
let displayCount = 20; // 每次載入的筆數
const CHUNK_SIZE = 20;

// 初始化載入 CSV
document.addEventListener("DOMContentLoaded", () => {
    d3.csv("A05_basic_all.csv").then(data => {
        // 清理數據：去除逗號並轉為數字
        allData = data.map(d => ({
            ...d,
            總收入: parseInt(d.總收入.replace(/,/g, ''), 10) || 0,
            營利事業捐贈比例: parseFloat(d.營利事業捐贈比例.replace('%', '')) || 0
        }));
        
        filteredData = [...allData];
        updateSummary();
        renderData();
    }).catch(error => {
        console.error("Error loading CSV: ", error);
        document.getElementById('quickSummary').innerText = "Data Archive Unavailable.";
    });
});

// 搜尋功能
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
    const input = e.target.value.trim();
    filterAndRender(input);
});

function quickSearch(location) {
    searchInput.value = location;
    filterAndRender(location);
}

function filterAndRender(query) {
    if (query === "") {
        filteredData = [...allData];
    } else {
        filteredData = allData.filter(d => d.地區.includes(query));
    }
    displayCount = CHUNK_SIZE; // 重置載入數量
    updateSummary();
    renderData();
}

// 排序功能
function sortData(criteria) {
    if (criteria === 'total') {
        filteredData.sort((a, b) => b.總收入 - a.總收入);
    } else if (criteria === 'corporate') {
        filteredData.sort((a, b) => b.營利事業捐贈比例 - a.營利事業捐贈比例);
    }
    displayCount = CHUNK_SIZE; // 排序後重置顯示數量
    renderData();
}

// 更新頂部 Summary
function updateSummary() {
    const locationText = searchInput.value.trim() ? `for ${searchInput.value}` : 'in Total';
    document.getElementById('quickSummary').innerText = `Found ${filteredData.length} Candidates ${locationText}`;
}

// 渲染資料 (支援 Infinite Scroll 概念的 Batch Render)
function renderData() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = ''; // 清空現有內容

    const dataToRender = filteredData.slice(0, displayCount);

    dataToRender.forEach(d => {
        const row = document.createElement('div');
        row.className = 'data-row';
        
        // 格式化總金額 (加入千分位)
        const formattedIncome = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(d.總收入).replace('$', '$ ');

        row.innerHTML = `
            <div>
                <div class="data-name">${d.姓名}</div>
                <div class="data-meta">${d.地區}</div>
            </div>
            <div>
                <div class="data-meta" style="margin-bottom: 5px;">Party</div>
                <div style="font-weight: 700;">${d.推薦政黨}</div>
            </div>
            <div>
                <div class="data-meta" style="margin-bottom: 5px;">Total Income</div>
                <div class="data-value">${formattedIncome}</div>
            </div>
            <div>
                <div class="data-meta" style="margin-bottom: 5px;">Corporate Donors (${d.營利事業捐贈比例}%)</div>
                <div class="bar-wrap">
                    <div class="bar-fill" style="width: ${d.營利事業捐贈比例}%;"></div>
                </div>
            </div>
        `;
        container.appendChild(row);
    });

    // 控制 Loading Marker 的顯示
    const marker = document.getElementById('loadingMarker');
    if (displayCount >= filteredData.length) {
        marker.style.display = 'none';
    } else {
        marker.style.display = 'block';
    }
}

// Infinite Scroll 監聽器
window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    // 當距離底部小於 100px 時觸發載入
    if (scrollTop + clientHeight >= scrollHeight - 100) {
        if (displayCount < filteredData.length) {
            displayCount += CHUNK_SIZE;
            renderData();
        }
    }
});
