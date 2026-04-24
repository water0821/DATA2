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
<section class="map-section">
        <h2 class="section-title">The Geography of Power</h2>
        <p class="section-subtitle">SELECT A REGION</p>
        <div id="taiwanMap" class="map-container"></div>
    </section>

// --- Map Initialization ---
function initMap() {
    const width = 500;
    const height = 600;

    // 建立 SVG 畫布
    const svg = d3.select("#taiwanMap")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // 設定台灣地圖的投影比例與中心點
    const projection = d3.geoMercator()
        .center([121, 23.6]) // 台灣中心經緯度
        .scale(7000)         // 放大倍率
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // 讀取開源的台灣 GeoJSON 資料 (這裡使用 g0v 提供的穩定版)
    d3.json("https://raw.githubusercontent.com/g0v/twgeojson/master/json/twCounty2010.geo.json")
        .then(geoData => {
            svg.selectAll("path")
                .data(geoData.features)
                .enter()
                .append("path")
                .attr("class", "county")
                .attr("d", path)
                .on("click", function(event, d) {
                    // d.properties.name 會抓到如 "台北市", "高雄市"
                    const countyName = d.properties.name || d.properties.COUNTYNAME; 
                    
                    // 視覺反饋：移除所有 active，給當前點擊的加上 active
                    d3.selectAll(".county").classed("active", false);
                    d3.select(this).classed("active", true);

                    // 觸發已寫好的搜尋功能
                    quickSearch(countyName);
                    
                    // 讓頁面平滑滾動到結果區塊
                    document.getElementById('resultsContainer').scrollIntoView({ behavior: 'smooth' });
                })
                .append("title") // 加入原生的滑鼠懸停提示
                .text(d => d.properties.name || d.properties.COUNTYNAME);
        })
        .catch(error => {
            console.error("地圖載入失敗:", error);
            document.getElementById("taiwanMap").innerHTML = "<p style='color:#999; font-style:italic;'>Map data unavailable.</p>";
        });
}

// 記得在最上面的 DOMContentLoaded 裡面加上 initMap() 呼叫：
// document.addEventListener("DOMContentLoaded", () => {
//     initMap(); // 新增這一行
//     d3.csv("A05_basic_all.csv").then(...)
// });
