document.addEventListener('DOMContentLoaded', function() {
    // 現在のページのURLを取得
    var currentPageUrl = window.location.href;
    
    // すべてのナビゲーションリンクを取得
    var navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    navLinks.forEach(function(link) {
        // リンクが現在のページのURLに一致する場合、.activeクラスを追加
        if (link.href === currentPageUrl) {
            link.classList.add('active');
        }
    });
});
