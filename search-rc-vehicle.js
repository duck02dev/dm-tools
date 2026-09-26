// VS Code에서 가독성 있게 작성하는 원본 코드
(function () {
  const pageTitle = document.title;
  const pageUrl = window.location.href;
  const markdownLink = `[${pageTitle}](${pageUrl})`;

  // 클립보드 복사 API 사용
  navigator.clipboard.writeText(markdownLink)
    .then(() => {
      alert('마크다운 링크가 클립보드에 복사되었습니다!\n' + markdownLink);
    })
    .catch(err => {
      alert('복사 실패: ' + err);
    });
})();
