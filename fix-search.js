const fs = require('fs');
let html = fs.readFileSync('products.html', 'utf8');

// createFilters 함수 전체 교체 (오류 수정)
const createFiltersStart = '        function createFilters(category) {';
const createFiltersEnd = '        }';

// 시작과 끝 찾기
const startIndex = html.indexOf(createFiltersStart);
const endIndex = html.indexOf('        // 필터 적용', startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error('함수를 찾을 수 없습니다!');
    process.exit(1);
}

const newCreateFilters = `        function createFilters(category) {
            const products = allProducts.filter(p => p.category === category);

            const diameters = [...new Set(products.map(p => p.diameter).filter(d => d))].sort((a, b) => parseFloat(a) - parseFloat(b));
            const lengths = [...new Set(products.map(p => p.length).filter(l => l))].sort((a, b) => parseFloat(a) - parseFloat(b));
            const colors = [...new Set(products.map(p => p.color).filter(c => c))].sort();
            const types = [...new Set(products.map(p => p.type).filter(t => t))].sort();

            // 마이크로스크류/평머리 카테고리일 때 Type 필터 추가
            let typeFilter = '';
            if (category === '마이크로스크류/평머리' && types.length > 0) {
                typeFilter = \`
                    <div class="filter-group">
                        <label><i class="fa-solid fa-tag"></i> 타입</label>
                        <select id="filterType" onchange="applyFilters()">
                            <option value="">전체</option>
                            \${types.map(t => \`<option value="\${t}">\${t === 'M' ? 'M/C' : t === 'T' ? 'T/C' : t}</option>\`).join('')}
                        </select>
                    </div>
                \`;
            }

            document.getElementById('filters').innerHTML = \`
                <div class="search-container">
                    <div class="search-box">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input
                            type="text"
                            id="searchInput"
                            placeholder="예: M2, 블랙, S20-2200, 12mm 등으로 검색..."
                            oninput="handleSearch()"
                        >
                        <button class="search-clear" id="searchClear" onclick="clearSearch()">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div class="search-results-count" id="searchResults"></div>
                </div>
                \${typeFilter}
                <div class="filter-group">
                    <label><i class="fa-solid fa-ruler"></i> 직경 (mm)</label>
                    <select id="filterDiameter" onchange="applyFilters()">
                        <option value="">전체</option>
                        \${diameters.map(d => \`<option value="\${d}">M\${d}</option>\`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label><i class="fa-solid fa-arrows-left-right"></i> 길이 (mm)</label>
                    <select id="filterLength" onchange="applyFilters()">
                        <option value="">전체</option>
                        \${lengths.map(l => \`<option value="\${l}">\${l}mm</option>\`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label><i class="fa-solid fa-palette"></i> 색상/코팅</label>
                    <select id="filterColor" onchange="applyFilters()">
                        <option value="">전체</option>
                        \${colors.map(c => \`<option value="\${c}">\${c}</option>\`).join('')}
                    </select>
                </div>
            \`;
        }

`;

html = html.substring(0, startIndex) + newCreateFilters + html.substring(endIndex);

fs.writeFileSync('products.html', html, 'utf8');
console.log('✅ createFilters 함수 수정 완료');
console.log('  - M/C, T/C 오류 수정');
console.log('  - 검색창 placeholder에 예시 추가');
