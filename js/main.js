// 로그인 모달 열기/닫기
document.addEventListener('DOMContentLoaded', () => {
  const loginTrigger = document.getElementById('loginTrigger');
  const loginModal = document.getElementById('loginModal');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const guestLoginBtn = document.getElementById('guestLoginBtn');

  if (!loginTrigger || !loginModal) return;

  const openModal = () => {
    loginModal.classList.add('active');
  };

  const closeModal = () => {
    loginModal.classList.remove('active');
  };

  loginTrigger.addEventListener('click', openModal);

  // 모달 바깥(오버레이) 클릭 시 닫기
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeModal();
  });

  // ESC 키로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // 구글/게스트 로그인 버튼 (실제 로그인 로직은 추후 연결)
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
      // TODO: 구글 로그인 연동
    });
  }
  if (guestLoginBtn) {
    guestLoginBtn.addEventListener('click', () => {
      // TODO: 게스트 체험판 진입 로직 연결
    });
  }
});
