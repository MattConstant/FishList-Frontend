(function () {
  try {
    var raw = sessionStorage.getItem("fishlist-session");
    if (!raw) return;
    var parsed = JSON.parse(raw);
    if (parsed && parsed.authorizationHeader) {
      document.documentElement.classList.add("fishlist-has-session");
    }
  } catch (_err) {}
})();
