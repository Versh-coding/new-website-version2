/**
 * 網站主控制器 (Main App Logic)
 * 整合：三色桶檢索、AI每日提醒打卡、知識小測驗、音效與互動反饋
 */

(function() {
  'use strict';

  // --- 簡易 Web Audio API 提示音合成器 (無需外部音檔) ---
  const SoundFX = {
    ctx: null,
    muted: false,
    init: function() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
    },
    playSuccess: function() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } catch(e) {}
    },
    playPop: function() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } catch(e) {}
    },
    playError: function() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(180, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } catch(e) {}
    }
  };

  // --- Toast 氣泡提示 ---
  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ==========================================
  // 1. 三色垃圾桶分類模組
  // ==========================================
  function initBinSearch() {
    const searchInput = document.getElementById('binSearchInput');
    const searchResults = document.getElementById('binSearchResults');
    const quickTags = document.querySelectorAll('.quick-tag');
    const binCards = document.querySelectorAll('.bin-card');

    function performSearch(query) {
      if (!query || !query.trim()) {
        searchResults.innerHTML = '';
        searchResults.classList.remove('active');
        binCards.forEach(c => c.classList.remove('highlight-bin', 'dimmed-bin'));
        return;
      }

      const results = window.EcoBins.searchItem(query);
      searchResults.classList.add('active');

      if (results.length === 0) {
        searchResults.innerHTML = `
          <div class="search-empty">
            <p>🔍 找不到與「<strong>${escapeHtml(query)}</strong>」相符的常見項目。</p>
            <p class="search-tip">💡 小提示：若為油污髒損容器請丟【橘色桶】，生熟食材請瀝水丟【小藍桶】，乾淨瓶罐丟【藍色桶】！</p>
          </div>
        `;
        binCards.forEach(c => c.classList.remove('highlight-bin', 'dimmed-bin'));
        return;
      }

      let html = `<div class="search-results-list">`;
      results.forEach(res => {
        const binInfo = window.EcoBins.data[res.bin];
        html += `
          <div class="search-item-card bin-border-${res.bin.toLowerCase()}">
            <div class="search-item-header">
              <span class="search-item-name">${escapeHtml(res.name)}</span>
              <span class="search-item-badge ${binInfo.badgeClass}">
                ${binInfo.icon} 請投入：${binInfo.name}（${binInfo.role}）
              </span>
            </div>
            <p class="search-item-hint">${escapeHtml(res.hint)}</p>
          </div>
        `;
      });
      html += `</div>`;
      searchResults.innerHTML = html;

      // 如果只有單一結果或首個結果，自動高亮對應的大卡片
      const primaryBin = results[0].bin;
      binCards.forEach(card => {
        if (card.dataset.bin === primaryBin) {
          card.classList.add('highlight-bin');
          card.classList.remove('dimmed-bin');
        } else {
          card.classList.remove('highlight-bin');
          card.classList.add('dimmed-bin');
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
      });
    }

    quickTags.forEach(tag => {
      tag.addEventListener('click', () => {
        SoundFX.playPop();
        const kw = tag.dataset.keyword;
        if (searchInput) {
          searchInput.value = kw;
          performSearch(kw);
          searchInput.focus();
        }
      });
    });
  }

  // ==========================================
  // 2. AI 每日提醒事項與打卡系統
  // ==========================================
  function initReminders() {
    const listContainer = document.getElementById('remindersList');
    const form = document.getElementById('addReminderForm');
    const input = document.getElementById('newReminderInput');
    const progressFill = document.getElementById('ecoProgressFill');
    const progressPercent = document.getElementById('ecoProgressPercent');
    const progressCount = document.getElementById('ecoProgressCount');
    const co2Counter = document.getElementById('ecoCo2Count');
    const treeStageIcon = document.getElementById('treeStageIcon');
    const treeStageName = document.getElementById('treeStageName');
    const treeStageMsg = document.getElementById('treeStageMsg');
    const resetBtn = document.getElementById('resetRemindersBtn');

    function renderReminders() {
      const items = window.EcoReminders.getItems();
      const checked = window.EcoReminders.getCheckedIds();
      const stats = window.EcoReminders.calculateStats();

      // 更新進度與統計
      if (progressFill) progressFill.style.width = `${stats.percentage}%`;
      if (progressPercent) progressPercent.textContent = `${stats.percentage}%`;
      if (progressCount) progressCount.textContent = `${stats.completed} / ${stats.total}`;
      if (co2Counter) co2Counter.textContent = `${stats.totalCo2}`;
      
      if (treeStageIcon) treeStageIcon.textContent = stats.stage.emoji;
      if (treeStageName) treeStageName.textContent = stats.stage.name;
      if (treeStageMsg) treeStageMsg.textContent = stats.stage.msg;

      if (!listContainer) return;
      listContainer.innerHTML = '';

      if (items.length === 0) {
        listContainer.innerHTML = `<div class="empty-list-msg">目前沒有提醒事項，點擊上方快速重置或新增自訂習慣！</div>`;
        return;
      }

      items.forEach(item => {
        const isChecked = checked.includes(item.id);
        const itemEl = document.createElement('div');
        itemEl.className = `reminder-card ${isChecked ? 'is-completed' : ''}`;
        itemEl.innerHTML = `
          <label class="reminder-checkbox-wrapper">
            <input type="checkbox" class="reminder-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
            <span class="custom-checkmark"></span>
            <div class="reminder-content">
              <span class="reminder-tag">${escapeHtml(item.tag || '環保行動')}</span>
              <p class="reminder-text">${escapeHtml(item.text)}</p>
              <span class="reminder-co2">+ 減少約 ${item.co2Saved || 150}g 碳排放</span>
            </div>
          </label>
          <button type="button" class="btn-delete-reminder" data-id="${item.id}" title="移除此事項" aria-label="刪除">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        `;
        listContainer.appendChild(itemEl);
      });

      // 綁定勾選事件
      listContainer.querySelectorAll('.reminder-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const id = e.target.dataset.id;
          const newChecked = window.EcoReminders.toggleCheck(id);
          const isNowChecked = newChecked.includes(id);
          if (isNowChecked) {
            SoundFX.playSuccess();
            showToast('🌱 太棒了！達成一項綠色行動，減碳進度已更新！', 'success');
          } else {
            SoundFX.playPop();
          }
          renderReminders();
        });
      });

      // 綁定刪除事件
      listContainer.querySelectorAll('.btn-delete-reminder').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          window.EcoReminders.deleteReminder(id);
          SoundFX.playPop();
          showToast('已移除該項提醒', 'info');
          renderReminders();
        });
      });
    }

    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
          window.EcoReminders.addCustomReminder(text);
          input.value = '';
          SoundFX.playSuccess();
          showToast('✨ 已成功新增自訂環保行動！', 'success');
          renderReminders();
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('確定要將提醒事項恢復為預設推薦清單嗎？')) {
          window.EcoReminders.resetToDefault();
          SoundFX.playPop();
          showToast('已恢復預設環保行動清單', 'info');
          renderReminders();
        }
      });
    }

    renderReminders();
  }

  // ==========================================
  // 3. 環保小知識庫與卡片展示
  // ==========================================
  function initKnowledge() {
    const knowledgeGrid = document.getElementById('knowledgeGrid');
    if (!knowledgeGrid || !window.EcoQuiz) return;

    const articles = window.EcoQuiz.articles;
    knowledgeGrid.innerHTML = '';

    articles.forEach(art => {
      const card = document.createElement('div');
      card.className = 'knowledge-card reveal-item';
      card.innerHTML = `
        <div class="knowledge-card-header">
          <div class="knowledge-icon-badge">${art.icon}</div>
          <span class="knowledge-category">${art.category}</span>
        </div>
        <h3 class="knowledge-card-title">${escapeHtml(art.title)}</h3>
        <p class="knowledge-card-summary">${escapeHtml(art.summary)}</p>
        <div class="knowledge-detail-content" id="detail-${art.id}">
          <div class="detail-divider"></div>
          <div class="detail-text">${formatMarkdownText(art.content)}</div>
        </div>
        <button type="button" class="btn-expand-knowledge" data-target="detail-${art.id}">
          <span>閱讀詳細解析</span>
          <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
      `;
      knowledgeGrid.appendChild(card);
    });

    knowledgeGrid.querySelectorAll('.btn-expand-knowledge').forEach(btn => {
      btn.addEventListener('click', () => {
        SoundFX.playPop();
        const targetId = btn.dataset.target;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          const isOpen = targetEl.classList.toggle('is-open');
          btn.classList.toggle('is-active', isOpen);
          btn.querySelector('span').textContent = isOpen ? '收起解析' : '閱讀詳細解析';
        }
      });
    });
  }

  // ==========================================
  // 4. 互動環保測驗遊戲 (Interactive Quiz)
  // ==========================================
  function initQuiz() {
    const quizCard = document.getElementById('quizCard');
    if (!quizCard || !window.EcoQuiz) return;

    const questions = window.EcoQuiz.questions;
    let currentIdx = 0;
    let userAnswers = new Array(questions.length).fill(null);
    let score = 0;

    function renderQuestion(index) {
      const q = questions[index];
      const isAnswered = userAnswers[index] !== null;

      quizCard.innerHTML = `
        <div class="quiz-header">
          <div class="quiz-progress-badge">
            問題 ${index + 1} / ${questions.length}
          </div>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width: ${((index + 1) / questions.length) * 100}%"></div>
          </div>
        </div>
        
        <h3 class="quiz-question-text">${escapeHtml(q.question)}</h3>

        <div class="quiz-options-list">
          ${q.options.map((opt, optIdx) => {
            let stateClass = '';
            if (isAnswered) {
              if (optIdx === q.answer) {
                stateClass = 'option-correct';
              } else if (optIdx === userAnswers[index]) {
                stateClass = 'option-wrong';
              } else {
                stateClass = 'option-disabled';
              }
            }
            return `
              <button type="button" class="quiz-option-btn ${stateClass}" data-idx="${optIdx}" ${isAnswered ? 'disabled' : ''}>
                <span class="option-indicator">${['A', 'B', 'C', 'D'][optIdx]}</span>
                <span class="option-text">${escapeHtml(opt)}</span>
              </button>
            `;
          }).join('')}
        </div>

        ${isAnswered ? `
          <div class="quiz-explanation-box ${userAnswers[index] === q.answer ? 'exp-correct' : 'exp-wrong'}">
            <div class="exp-title">
              ${userAnswers[index] === q.answer ? '🎉 答對了！恭喜精準判斷！' : '💡 答錯囉！正確解答看這裡：'}
            </div>
            <p class="exp-desc">${escapeHtml(q.hint)}</p>
          </div>
        ` : ''}

        <div class="quiz-nav-footer">
          ${index > 0 ? `
            <button type="button" class="btn-quiz-prev" id="quizPrevBtn">← 上一題</button>
          ` : '<div></div>'}
          
          ${isAnswered ? (
            index < questions.length - 1 ? `
              <button type="button" class="btn-quiz-next" id="quizNextBtn">下一題 →</button>
            ` : `
              <button type="button" class="btn-quiz-finish" id="quizFinishBtn">查看測驗成果 🏆</button>
            `
          ) : `
            <span class="quiz-select-hint">請選擇一個選項以看解答</span>
          `}
        </div>
      `;

      // 綁定選項點擊
      quizCard.querySelectorAll('.quiz-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const selectedOpt = parseInt(btn.dataset.idx, 10);
          userAnswers[index] = selectedOpt;
          if (selectedOpt === q.answer) {
            SoundFX.playSuccess();
            showToast('答對了！太厲害了 🌟', 'success');
          } else {
            SoundFX.playError();
            showToast('差一點點，看看下方解析喔！', 'warning');
          }
          renderQuestion(index);
        });
      });

      const prevBtn = document.getElementById('quizPrevBtn');
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          SoundFX.playPop();
          renderQuestion(index - 1);
        });
      }

      const nextBtn = document.getElementById('quizNextBtn');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          SoundFX.playPop();
          renderQuestion(index + 1);
        });
      }

      const finishBtn = document.getElementById('quizFinishBtn');
      if (finishBtn) {
        finishBtn.addEventListener('click', () => {
          SoundFX.playSuccess();
          renderResults();
        });
      }
    }

    function renderResults() {
      score = userAnswers.reduce((acc, ans, i) => {
        return ans === questions[i].answer ? acc + 1 : acc;
      }, 0);

      const total = questions.length;
      const evaluation = window.EcoQuiz.getScoreTitle(score, total);

      quizCard.innerHTML = `
        <div class="quiz-result-view">
          <div class="result-badge-anim">🏆</div>
          <h2 class="result-title">${evaluation.title}</h2>
          <div class="result-score-tag">得分：${score} / ${total} 題（答對率 ${Math.round((score/total)*100)}%）</div>
          <p class="result-desc">${evaluation.desc}</p>
          
          <div class="result-breakdown">
            <h4>測驗回顧重點：</h4>
            <ul>
              <li>🥣 <strong>小藍桶</strong>：專收瀝乾廚餘，千萬不要包著塑膠袋投入。</li>
              <li>🗑️ <strong>橘色桶</strong>：堅硬大豬骨、蛤蜊貝殼與油污洗不掉的餐盒一定要丟這桶。</li>
              <li>♻️ <strong>藍色桶</strong>：乾淨沖洗後的寶特瓶、紙盒壓扁後投入。</li>
            </ul>
          </div>

          <div class="result-actions">
            <button type="button" class="btn-quiz-restart" id="quizRestartBtn">重新測驗挑戰 🔄</button>
            <a href="#bins" class="btn-quiz-learn">複習三色桶規範 📋</a>
          </div>
        </div>
      `;

      const restartBtn = document.getElementById('quizRestartBtn');
      if (restartBtn) {
        restartBtn.addEventListener('click', () => {
          SoundFX.playPop();
          currentIdx = 0;
          userAnswers = new Array(questions.length).fill(null);
          renderQuestion(0);
        });
      }
    }

    renderQuestion(0);
  }

  // --- 工具輔助函式 ---
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMarkdownText(text) {
    if (!text) return '';
    // 粗體轉換
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  // --- 平滑滾動與導覽列 ---
  function initNav() {
    const navLinks = document.querySelectorAll('.nav-link');
    const header = document.querySelector('.site-header');

    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('header-scrolled');
      } else {
        header.classList.remove('header-scrolled');
      }
    });

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (targetId.startsWith('#')) {
          e.preventDefault();
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });

    // 音效開關
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        SoundFX.muted = !SoundFX.muted;
        soundToggle.classList.toggle('is-muted', SoundFX.muted);
        soundToggle.setAttribute('title', SoundFX.muted ? '提示音：已靜音' : '提示音：已開啟');
        showToast(SoundFX.muted ? '🔇 提示音已關閉' : '🔊 提示音已開啟', 'info');
      });
    }
  }

  // ==========================================
  // 5. 全站入場開場動畫與滾動顯現 (Entrance Animation)
  // ==========================================
  function initEntranceAnimation() {
    const splash = document.getElementById('introSplash');
    const loaderFill = document.getElementById('splashLoaderFill');
    const skipBtn = document.getElementById('skipSplashBtn');
    const replayBtn = document.getElementById('replayIntroBtn');

    function playSplash() {
      if (!splash) return;
      splash.style.display = 'flex';
      splash.classList.remove('splash-leave');
      if (loaderFill) {
        loaderFill.style.transition = 'none';
        loaderFill.style.width = '0%';
        setTimeout(() => {
          loaderFill.style.transition = 'width 1.1s cubic-bezier(0.16, 1, 0.3, 1)';
          loaderFill.style.width = '100%';
        }, 50);
      }

      // 播放輕柔開場合聲音效
      setTimeout(() => {
        SoundFX.playSuccess();
      }, 400);

      // 自動退場
      clearTimeout(window._splashTimeout);
      window._splashTimeout = setTimeout(() => {
        closeSplash();
      }, 1400);
    }

    function closeSplash() {
      if (!splash) return;
      splash.classList.add('splash-leave');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 800);
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        SoundFX.playPop();
        closeSplash();
      });
    }

    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        SoundFX.playPop();
        playSplash();
      });
    }

    // 啟動開場動畫
    playSplash();
  }

  // 視差/滾動進場顯現觀察器 (Scroll-Reveal)
  function initScrollReveal() {
    const items = document.querySelectorAll('.reveal-item');
    if (!items.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -30px 0px'
      });

      items.forEach(item => observer.observe(item));
    } else {
      // Fallback
      items.forEach(item => item.classList.add('is-revealed'));
    }
  }

  // ==========================================
  // 6. 影片播放控制器 (Hero Video Controller - 848x480 SD)
  // ==========================================
  function initHeroVideo() {
    const video = document.getElementById('heroVideo');
    const playToggleBtn = document.getElementById('videoPlayToggle');
    const playToggleIcon = document.getElementById('videoToggleIcon');
    const muteToggleBtn = document.getElementById('videoMuteToggle');
    const muteToggleIcon = document.getElementById('videoMuteIcon');

    if (!video) return;

    function updatePlayIcon() {
      if (playToggleIcon) {
        playToggleIcon.textContent = video.paused ? '▶️' : '⏸️';
      }
      if (playToggleBtn) {
        playToggleBtn.setAttribute('title', video.paused ? '播放影片' : '暫停影片');
        playToggleBtn.setAttribute('aria-label', video.paused ? '播放影片' : '暫停影片');
      }
    }

    function updateMuteIcon() {
      if (muteToggleIcon) {
        muteToggleIcon.textContent = video.muted ? '🔇' : '🔊';
      }
      if (muteToggleBtn) {
        muteToggleBtn.setAttribute('title', video.muted ? '開啟聲音' : '靜音影片');
        muteToggleBtn.setAttribute('aria-label', video.muted ? '開啟聲音' : '靜音影片');
      }
    }

    if (playToggleBtn) {
      playToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.paused) {
          video.play().then(updatePlayIcon).catch(() => {});
        } else {
          video.pause();
          updatePlayIcon();
        }
      });
    }

    if (muteToggleBtn) {
      muteToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        updateMuteIcon();
        showToast(video.muted ? '🔇 影片已靜音' : '🔊 影片聲音已開啟', 'info');
      });
    }

    // 點擊影片本體亦可播放/暫停
    video.addEventListener('click', () => {
      if (video.paused) {
        video.play().then(updatePlayIcon).catch(() => {});
      } else {
        video.pause();
        updatePlayIcon();
      }
    });

    video.addEventListener('play', updatePlayIcon);
    video.addEventListener('pause', updatePlayIcon);

    // 偵測影片錯誤 (若尚未放置 video.mp4 檔案)
    video.addEventListener('error', () => {
      const fallbackNotice = document.getElementById('videoFallbackNotice');
      if (fallbackNotice) {
        fallbackNotice.style.display = 'flex';
      }
    });

    video.addEventListener('loadeddata', () => {
      const fallbackNotice = document.getElementById('videoFallbackNotice');
      if (fallbackNotice) {
        fallbackNotice.style.display = 'none';
      }
      updatePlayIcon();
      updateMuteIcon();
    });

    // 嘗試自動播放
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        updatePlayIcon();
      }).catch(() => {
        updatePlayIcon();
      });
    }
  }

  // 頁面加載完成後啟動
  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initEntranceAnimation();
    initScrollReveal();
    initBinSearch();
    initReminders();
    initKnowledge();
    initQuiz();
    initHeroVideo();
  });

})();
