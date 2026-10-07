// 로그인 모달 / 게임 방법 모달 열기·닫기
document.addEventListener('DOMContentLoaded', () => {
  /* ===== 게임 시작: 게임 화면(page/game.html)으로 이동 ===== */
  const goGame = () => {
    location.href = 'page/game.html';
  };

  // 메인 가운데 '게임 시작' 버튼
  const startBtn = document.querySelector('.btn-start');
  if (startBtn) startBtn.addEventListener('click', goGame);

  /* ===== 로그인 모달 ===== */
  const loginTrigger = document.getElementById('loginTrigger');
  const loginModal = document.getElementById('loginModal');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const guestLoginBtn = document.getElementById('guestLoginBtn');

  const openLoginModal = () => {
    loginModal.classList.add('active');
  };

  const closeLoginModal = () => {
    loginModal.classList.remove('active');
  };

  if (loginTrigger && loginModal) {
    loginTrigger.addEventListener('click', openLoginModal);

    // 모달 바깥(오버레이) 클릭 시 닫기
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) closeLoginModal();
    });
  }

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

  /* ===== 게임 방법 모달 ===== */
  const ruleTrigger = document.getElementById('ruleTrigger');
  const ruleModal = document.getElementById('ruleModal');
  const ruleClose = document.getElementById('ruleClose');
  const rulePrev = document.getElementById('rulePrev');
  const ruleNext = document.getElementById('ruleNext');
  const rulePageNum = document.getElementById('rulePageNum');
  const rulePages = ruleModal ? ruleModal.querySelectorAll('.rule-page') : [];
  const ruleDots = ruleModal ? ruleModal.querySelectorAll('#ruleDots button') : [];
  const lastPage = rulePages.length - 1;
  let currentPage = 0;

  // 해당 페이지만 보이게 + 진행 점·버튼 상태 갱신
  const showRulePage = (index) => {
    const nextPage = Math.max(0, Math.min(index, lastPage));
    const direction = nextPage > currentPage ? 'enter-next' : 'enter-prev';
    const changed = nextPage !== currentPage;
    currentPage = nextPage;

    rulePages.forEach((page, i) => {
      page.hidden = i !== currentPage;
      page.classList.remove('enter-next', 'enter-prev');
    });
    // 페이지가 바뀔 때만 위/아래로 살짝 미끄러지며 등장
    if (changed) {
      const page = rulePages[currentPage];
      void page.offsetWidth; // 애니메이션 재시작용
      page.classList.add(direction);
    }
    ruleDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentPage);
      dot.setAttribute('aria-current', i === currentPage ? 'step' : 'false');
    });

    rulePageNum.textContent = `${currentPage + 1} / ${rulePages.length}`;
    rulePrev.disabled = currentPage === 0;
    // 마지막 페이지에서는 '다음' 대신 '게임 시작'
    ruleNext.textContent = currentPage === lastPage ? '게임 시작' : '다음';

    // 페이지가 바뀌면 본문 스크롤을 맨 위로 (작은 화면 대비)
    ruleModal.querySelector('.rule-body').scrollTop = 0;
  };

  // 기본 750×720 기준 → 약 771×740, 작은 화면에선 화면에 맞춰 줄임
  const RULE_BASE_W = 750;
  const RULE_BASE_H = 720;
  const RULE_MAX_SCALE = 740 / 720; // 최대 높이 740px
  const ruleCard = ruleModal ? ruleModal.querySelector('.rule-modal-card') : null;
  const ruleBody = ruleModal ? ruleModal.querySelector('.rule-body') : null;

  const fitRuleModal = () => {
    if (!ruleCard) return;
    // 800px 이하는 모바일 레이아웃(CSS 미디어쿼리)을 그대로 사용
    if (window.innerWidth <= 800) {
      ruleCard.style.zoom = '';
      ruleCard.style.maxHeight = '';
      return;
    }
    const scale = Math.min(
      RULE_MAX_SCALE,
      (window.innerWidth - 80) / RULE_BASE_W,
      (window.innerHeight - 60) / RULE_BASE_H
    );
    ruleCard.style.zoom = Math.max(scale, 0.7).toFixed(3);
    ruleCard.style.maxHeight = 'none'; // 크기는 위에서 화면에 맞춰 계산함
  };

  const openRuleModal = () => {
    currentPage = 0;
    showRulePage(0);
    fitRuleModal();
    ruleModal.classList.add('active');
    ruleNext.focus();
  };

  const closeRuleModal = () => {
    ruleModal.classList.remove('active');
    if (ruleTrigger) ruleTrigger.focus();
  };

  if (ruleTrigger && ruleModal) {
    ruleTrigger.addEventListener('click', openRuleModal);
    ruleClose.addEventListener('click', closeRuleModal);

    // 모달 바깥(오버레이) 클릭 시 닫기
    ruleModal.addEventListener('click', (e) => {
      if (e.target === ruleModal) closeRuleModal();
    });

    rulePrev.addEventListener('click', () => showRulePage(currentPage - 1));

    ruleNext.addEventListener('click', () => {
      if (currentPage < lastPage) {
        showRulePage(currentPage + 1);
      } else {
        // 마지막(5번째) 페이지의 '게임 시작' → 게임 화면으로
        goGame();
      }
    });

    // 진행 점 클릭 시 해당 페이지로 이동
    ruleDots.forEach((dot, i) => {
      dot.addEventListener('click', () => showRulePage(i));
    });

    window.addEventListener('resize', () => {
      if (ruleModal.classList.contains('active')) fitRuleModal();
    });

    /* --- 마우스 휠로 페이지 넘기기 ---
       아래로 굴리면 다음, 위로 굴리면 이전.
       트랙패드는 한 번 쓸어도 휠 이벤트가 수십 번 오기 때문에,
       한 번 넘긴 뒤에는 휠이 잠깐 멈출 때까지 잠가서 여러 장이 한꺼번에 넘어가지 않게 함 */
    let wheelLocked = false;
    let wheelIdleTimer = null;
    let lastFlipAt = 0;

    ruleModal.addEventListener('wheel', (e) => {
      if (!ruleModal.classList.contains('active')) return;
      const goingDown = e.deltaY > 0;

      // 작은 화면에서 본문이 스크롤되는 경우: 끝에 닿기 전까지는 본문을 그대로 스크롤
      const canScrollBody = ruleBody.scrollHeight - ruleBody.clientHeight > 24;
      if (canScrollBody) {
        const atTop = ruleBody.scrollTop <= 0;
        const atBottom = ruleBody.scrollTop + ruleBody.clientHeight >= ruleBody.scrollHeight - 1;
        if ((goingDown && !atBottom) || (!goingDown && !atTop)) return;
      }

      e.preventDefault(); // 뒤쪽 메인 페이지가 스크롤되지 않게

      // 휠이 멈추면(160ms 동안 이벤트 없음) 잠금 해제, 단 넘긴 뒤 최소 450ms는 유지
      clearTimeout(wheelIdleTimer);
      wheelIdleTimer = setTimeout(() => {
        const wait = Math.max(0, 450 - (Date.now() - lastFlipAt));
        setTimeout(() => { wheelLocked = false; }, wait);
      }, 160);

      if (wheelLocked || Math.abs(e.deltaY) < 4) return;

      const target = currentPage + (goingDown ? 1 : -1);
      if (target < 0 || target > lastPage) return; // 처음/마지막 페이지에서는 그대로

      showRulePage(target);
      wheelLocked = true;
      lastFlipAt = Date.now();
    }, { passive: false });

    /* --- 모바일: 좌우로 밀어서 넘기기 --- */
    let touchStartX = 0;
    let touchStartY = 0;
    ruleCard.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    ruleCard.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        showRulePage(currentPage + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
  }

  /* ===== 키보드: ESC 닫기, ←/→ ↑/↓ 페이지 이동 ===== */
  document.addEventListener('keydown', (e) => {
    const ruleOpen = ruleModal && ruleModal.classList.contains('active');

    if (e.key === 'Escape') {
      if (loginModal) closeLoginModal();
      if (ruleOpen) closeRuleModal();
      return;
    }

    if (ruleOpen && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
      e.preventDefault();
      showRulePage(currentPage + 1);
    }
    if (ruleOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
      e.preventDefault();
      showRulePage(currentPage - 1);
    }
  });
});
