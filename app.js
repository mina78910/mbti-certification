const form = document.querySelector('#application-form');
const examCard = document.querySelector('#exam');
const reviewCard = document.querySelector('#review');
const resultPage = document.querySelector('#results');
const questionPanel = document.querySelector('#question-panel');
const currentNumber = document.querySelector('#current-number');
const totalNumber = document.querySelector('#total-number');
const progressBar = document.querySelector('#progress-bar');
const prevButton = document.querySelector('#prev-button');
const nextButton = document.querySelector('#next-button');
const finishActions = document.querySelector('#finish-actions');
const reviewButton = document.querySelector('#review-button');
const finishButton = document.querySelector('#finish-button');
const timerDisplay = document.querySelector('#timer-display');
const reviewTimerDisplay = document.querySelector('#timer-display-review');
const timerToggle = document.querySelector('#timer-toggle');
const reviewTableBody = document.querySelector('#review-table-body');
const reviewBackButton = document.querySelector('#review-back-button');
const reviewSubmitButton = document.querySelector('#review-submit-button');
const submitModal = document.querySelector('#submit-modal');
const modalCancelButton = document.querySelector('#modal-cancel-button');
const modalConfirmButton = document.querySelector('#modal-confirm-button');
const resultBackButton = document.querySelector('#result-back-button');
const resultCompletedDate = document.querySelector('#result-completed-date');
const resultDuration = document.querySelector('#result-duration');
const resultStatus = document.querySelector('#result-status');
const resultScoreBody = document.querySelector('#result-score-body');
const resultMessage = document.querySelector('#result-message');

let questions = [];
let currentIndex = 0;
let answers = {};
let markedQuestions = {};
let remainingSeconds = 90 * 60;
let timerId = null;
let isTimerHidden = false;
const examDurationSeconds = 90 * 60;
const resultTopics = [
  '外向的直観（Ne）',
  '内向的感覚（Si）',
  '外向的思考（Te）',
  '内向的感情（Fi）',
  '外向的感情（Fe）',
  '内向的思考（Ti）',
];

async function loadQuestions() {
  const response = await fetch('./questions.json');
  if (!response.ok) {
    throw new Error('問題データを読み込めませんでした。');
  }
  questions = await response.json();
  totalNumber.textContent = questions.length;
}

function optionInputType(question) {
  return question.type === 'multiple' ? 'checkbox' : 'radio';
}

function formatCorrectAnswers(question) {
  return question.correctAnswers
    .map((answerId) => {
      const option = question.options.find(({ id }) => id === answerId);
      return option ? `${answerId}. ${option.text}` : answerId;
    })
    .join(' / ');
}

function saveCurrentAnswer() {
  const question = questions[currentIndex];
  if (!question) return;
  const checked = [...questionPanel.querySelectorAll(`input[name="${question.id}"]:checked`)].map((input) => input.value);
  answers[question.id] = checked;
  markedQuestions[question.id] = Boolean(questionPanel.querySelector('#mark-for-review')?.checked);
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function updateTimerDisplay() {
  timerDisplay.textContent = isTimerHidden ? '--:--:--' : formatTime(remainingSeconds);
  reviewTimerDisplay.textContent = timerDisplay.textContent;
}

function startTimer() {
  clearInterval(timerId);
  remainingSeconds = 90 * 60;
  updateTimerDisplay();
  timerId = setInterval(() => {
    remainingSeconds = Math.max(0, remainingSeconds - 1);
    updateTimerDisplay();
    if (remainingSeconds === 0) {
      clearInterval(timerId);
      finishExam();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function showExamPage(index = currentIndex) {
  currentIndex = Math.min(Math.max(index, 0), questions.length - 1);
  document.body.classList.add('exam-mode');
  document.body.classList.remove('review-mode', 'result-mode');
  reviewCard.classList.add('is-hidden');
  resultPage.classList.add('is-hidden');
  examCard.classList.remove('is-hidden');
  renderQuestion();
  examCard.scrollIntoView({ behavior: 'smooth' });
}

function renderQuestion() {
  const question = questions[currentIndex];
  const selectedAnswers = answers[question.id] || [];
  const isMarked = Boolean(markedQuestions[question.id]);
  const inputType = optionInputType(question);
  currentNumber.textContent = currentIndex + 1;
  progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
  prevButton.disabled = currentIndex === 0;
  nextButton.textContent = '次へ >';
  finishActions.classList.toggle('is-hidden', currentIndex !== questions.length - 1);

  questionPanel.innerHTML = `
    <div>
      <span class="question-meta">${currentIndex + 1} of ${questions.length}.</span>
      <p class="question-text"> ${question.question}</p>
    </div>
    <p class="question-prompt">What is the best answer?</p>
    <div class="options">
      ${question.options.map((option) => `
        <label class="option-row">
          <input type="${inputType}" name="${question.id}" value="${option.id}" ${selectedAnswers.includes(option.id) ? 'checked' : ''} />
          <span><strong>${option.id}.</strong> ${option.text}</span>
        </label>
      `).join('')}
    </div>
    <label class="review-later">
      <input id="mark-for-review" type="checkbox" ${isMarked ? 'checked' : ''} />
      <span>Mark this item for later review.</span>
    </label>
    <div class="answer-shortcut">
      <p>ここから先は遊び用の裏技です。試験っぽさを残すため、回答・解説は少し下に隠してあります。</p>
      <button class="answer-reveal-button secondary-button" type="button" aria-controls="answer-explanation" aria-expanded="false">回答・解説を表示する</button>
    </div>
    <section id="answer-explanation" class="answer-explanation is-hidden" aria-label="回答と解説" tabindex="-1">
      <p class="answer-label">Answer / Explanation</p>
      <p><strong>正解:</strong> ${formatCorrectAnswers(question)}</p>
      <p><strong>解説:</strong> ${question.explanation}</p>
    </section>
  `;
}

function renderReviewPage() {
  reviewTableBody.innerHTML = questions.map((question, index) => {
    const selectedAnswers = answers[question.id] || [];
    const answerText = selectedAnswers.length > 0 ? selectedAnswers.join(', ') : '未回答';
    const questionNumber = index + 1;
    const numberContent = markedQuestions[question.id]
      ? `<a href="#exam" data-question-index="${index}">No.${questionNumber}</a>`
      : `No.${questionNumber}`;

    return `
      <tr>
        <td>${numberContent}</td>
        <td>${answerText}</td>
      </tr>
    `;
  }).join('');
}

function showReviewPage() {
  saveCurrentAnswer();
  renderReviewPage();
  document.body.classList.add('review-mode');
  document.body.classList.remove('exam-mode', 'result-mode');
  examCard.classList.add('is-hidden');
  resultPage.classList.add('is-hidden');
  reviewCard.classList.remove('is-hidden');
  reviewCard.scrollIntoView({ behavior: 'smooth' });
}

function isCorrect(question) {
  const selected = [...(answers[question.id] || [])].sort();
  const correct = [...question.correctAnswers].sort();
  return selected.length === correct.length && selected.every((answer, index) => answer === correct[index]);
}

function formatJapaneseDate(date) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `合計 90 分中 ${minutes} 分${remaining > 0 ? ` ${remaining} 秒` : ''}`;
}

function getTopicScores() {
  return resultTopics.map((topic, index) => {
    const topicQuestions = questions.filter((_, questionIndex) => questionIndex % resultTopics.length === index);
    if (topicQuestions.length === 0) {
      return { topic, percentage: 0 };
    }
    const correctCount = topicQuestions.filter(isCorrect).length;
    return {
      topic,
      percentage: Math.round((correctCount / topicQuestions.length) * 100),
    };
  });
}

function finishExam() {
  saveCurrentAnswer();
  const correctCount = questions.filter(isCorrect).length;
  const percentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const isPassed = percentage >= 70;
  const elapsedSeconds = examDurationSeconds - remainingSeconds;
  resultCompletedDate.textContent = formatJapaneseDate(new Date());
  resultDuration.textContent = formatDuration(elapsedSeconds);
  resultStatus.textContent = isPassed ? '合格' : '不合格';
  resultScoreBody.innerHTML = getTopicScores().map(({ topic, percentage: topicPercentage }) => `
    <div class="result-score-row" role="row">
      <div role="cell">${topic}</div>
      <div role="cell">${topicPercentage}%</div>
    </div>
  `).join('');
  resultMessage.textContent = isPassed
    ? 'おめでとうございます！このたびは、認定試験に見事合格され、MBTI 認定 Web試験に認定されました。認定プロフェッショナルが集う、世界規模のコミュニティへのご参加を、心より歓迎いたします。'
    : '今回は合格基準に届きませんでした。トピック別の正答率を確認し、復習のうえ再受験をご検討ください。';
  stopTimer();
  document.body.classList.remove('exam-mode', 'review-mode');
  document.body.classList.add('result-mode');
  examCard.classList.add('is-hidden');
  reviewCard.classList.add('is-hidden');
  resultPage.classList.remove('is-hidden');
  resultPage.scrollIntoView({ behavior: 'smooth' });
}

function openSubmitModal() {
  if (typeof submitModal.showModal === 'function') {
    submitModal.showModal();
    return;
  }
  submitModal.setAttribute('open', '');
}

function closeSubmitModal() {
  if (typeof submitModal.close === 'function') {
    submitModal.close();
    return;
  }
  submitModal.removeAttribute('open');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (questions.length === 0) {
    await loadQuestions();
  }
  document.body.classList.add('exam-mode');
  document.body.classList.remove('review-mode', 'result-mode');
  examCard.classList.remove('is-hidden');
  reviewCard.classList.add('is-hidden');
  resultPage.classList.add('is-hidden');
  currentIndex = 0;
  answers = {};
  markedQuestions = {};
  renderQuestion();
  startTimer();
  examCard.scrollIntoView({ behavior: 'smooth' });
});

prevButton.addEventListener('click', () => {
  saveCurrentAnswer();
  currentIndex = Math.max(0, currentIndex - 1);
  renderQuestion();
});

nextButton.addEventListener('click', () => {
  saveCurrentAnswer();
  if (currentIndex < questions.length - 1) {
    currentIndex += 1;
    renderQuestion();
  }
});

questionPanel.addEventListener('click', (event) => {
  const revealButton = event.target.closest('.answer-reveal-button');
  if (!revealButton) return;

  const answerExplanation = questionPanel.querySelector('#answer-explanation');
  if (!answerExplanation) return;

  answerExplanation.classList.remove('is-hidden');
  revealButton.setAttribute('aria-expanded', 'true');
  answerExplanation.scrollIntoView({ behavior: 'smooth', block: 'start' });
  answerExplanation.focus({ preventScroll: true });
});

reviewButton.addEventListener('click', showReviewPage);
finishButton.addEventListener('click', openSubmitModal);

reviewTableBody.addEventListener('click', (event) => {
  const link = event.target.closest('[data-question-index]');
  if (!link) return;
  event.preventDefault();
  showExamPage(Number(link.dataset.questionIndex));
});

reviewBackButton.addEventListener('click', () => showExamPage(currentIndex));
reviewSubmitButton.addEventListener('click', openSubmitModal);
modalCancelButton.addEventListener('click', closeSubmitModal);
modalConfirmButton.addEventListener('click', () => {
  closeSubmitModal();
  finishExam();
});

resultBackButton.addEventListener('click', () => {
  document.body.classList.remove('review-mode', 'result-mode');
  resultPage.classList.add('is-hidden');
  document.querySelector('#application').scrollIntoView({ behavior: 'smooth' });
});

submitModal.addEventListener('click', (event) => {
  if (event.target === submitModal) {
    closeSubmitModal();
  }
});

timerToggle.addEventListener('click', () => {
  isTimerHidden = !isTimerHidden;
  timerToggle.textContent = isTimerHidden ? '表示' : '非表示';
  timerToggle.setAttribute('aria-pressed', String(isTimerHidden));
  updateTimerDisplay();
});

loadQuestions().catch((error) => {
  questionPanel.innerHTML = `<p class="incorrect">${error.message}</p>`;
});
