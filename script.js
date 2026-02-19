
    // 카테고리 카드 클릭 시 제품 페이지로 이동
    document.addEventListener('DOMContentLoaded', function() {
        const categoryCards = document.querySelectorAll('.category-card');
        const categoryNames = [
            '마이크로스크류/평머리',
            '바인드헤드', 
            '팬헤드',
            '플랫헤드'
        ];
        
        categoryCards.forEach((card, index) => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', function() {
                const category = encodeURIComponent(categoryNames[index]);
                window.location.href = 'products.html?category=' + category;
            });
        });
    });

    // 장바구니 카운트 업데이트
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const count = cart.reduce((sum, item) => sum + item.qty, 0);
        const el = document.getElementById('cart-count');
        if (el) el.textContent = count;
    }
    updateCartCount();

    // 사용자 메뉴 업데이트
    function updateUserMenu() {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const userMenu = document.getElementById('user-menu');
        if (!userMenu) return;

        if (user) {
            userMenu.innerHTML = `
                <a href="#" style="display:flex;align-items:center;gap:0.5rem">
                    ${user.profile_image ? `<img src="${user.profile_image}" style="width:30px;height:30px;border-radius:50%">` : '👤'}
                    ${user.name}
                </a>
                <a href="#" onclick="logout();return false" style="color:#ff6b35">로그아웃</a>
            `;
            userMenu.style.display = 'flex';
            userMenu.style.gap = '1rem';
        } else {
            userMenu.innerHTML = '<a href="login.html">로그인</a>';
        }
    }

    function logout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            localStorage.removeItem('user');
            alert('로그아웃되었습니다.');
            updateUserMenu();
        }
    }

    updateUserMenu();
    