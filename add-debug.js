const fs = require('fs');
let html = fs.readFileSync('products.html', 'utf8');

// loadProducts 함수에 디버그 로그 추가
const oldLoadStart = `        function loadProducts() {
            try {
                // products.js에서 로드된 데이터 사용
                if (typeof productData !== 'undefined' && productData.products) {
                    allProducts = productData.products;`;

const newLoadStart = `        function loadProducts() {
            try {
                console.log('🔍 loadProducts 호출됨');
                console.log('productData 존재:', typeof productData !== 'undefined');

                // products.js에서 로드된 데이터 사용
                if (typeof productData !== 'undefined' && productData.products) {
                    allProducts = productData.products;
                    console.log('✅ 제품 데이터 로드 성공:', allProducts.length, '개');`;

html = html.replace(oldLoadStart, newLoadStart);

// initializeCategories 함수에 디버그 추가
const oldInitCategories = `        function initializeCategories() {
            const categories = [...new Set(allProducts.map(p => p.category).filter(c => c))];`;

const newInitCategories = `        function initializeCategories() {
            const categories = [...new Set(allProducts.map(p => p.category).filter(c => c))];
            console.log('📋 카테고리:', categories);`;

html = html.replace(oldInitCategories, newInitCategories);

// selectCategory 함수에 디버그 추가
const oldSelectStart = `        function selectCategory(category) {
            // 카테고리가 존재하는지 확인
            const categoryExists = allProducts.some(p => p.category === category);`;

const newSelectStart = `        function selectCategory(category) {
            console.log('🎯 카테고리 선택:', category);

            // 카테고리가 존재하는지 확인
            const categoryExists = allProducts.some(p => p.category === category);
            console.log('카테고리 존재:', categoryExists);`;

html = html.replace(oldSelectStart, newSelectStart);

// createFilters 함수에 디버그 추가
const oldCreateStart = `        function createFilters(category) {
            const products = allProducts.filter(p => p.category === category);

            const diameters = [...new Set(products.map(p => p.diameter).filter(d => d))].sort((a, b) => parseFloat(a) - parseFloat(b));`;

const newCreateStart = `        function createFilters(category) {
            const products = allProducts.filter(p => p.category === category);
            console.log('🔧 필터 생성 - 카테고리:', category, '제품 수:', products.length);

            const diameters = [...new Set(products.map(p => p.diameter).filter(d => d))].sort((a, b) => parseFloat(a) - parseFloat(b));`;

html = html.replace(oldCreateStart, newCreateStart);

// displayProducts 함수에 디버그 추가
const oldDisplayStart = `        function displayProducts(category) {
            let products = allProducts.filter(p => p.category === category);

            // 검색 필터 적용`;

const newDisplayStart = `        function displayProducts(category) {
            let products = allProducts.filter(p => p.category === category);
            console.log('📦 제품 표시 시작 - 초기 제품 수:', products.length);

            // 검색 필터 적용`;

html = html.replace(oldDisplayStart, newDisplayStart);

fs.writeFileSync('products.html', html, 'utf8');
console.log('✅ 디버그 로그 추가 완료');
console.log('브라우저 콘솔(F12)에서 로그를 확인하세요!');
