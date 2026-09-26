// Màn khởi động: sau 10 giây mà React chưa thay màn này thì gói JS không chạy được — hiện nút tải lại.
// Tách khỏi index.html (26/09/2026) để CSP cấm được mọi script nội tuyến.
(function () {
  setTimeout(function () {
    var s = document.getElementById('boot-spinner');
    var f = document.getElementById('boot-failed');
    if (s && f && document.body.contains(s)) {
      s.style.display = 'none';
      f.style.display = 'block';
    }
  }, 10000);
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || t.id !== 'boot-reload') return;
    try { localStorage.clear(); sessionStorage.clear(); } catch (err) { /* chế độ riêng tư */ }
    location.reload();
  });
})();
