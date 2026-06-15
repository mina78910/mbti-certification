const form = document.querySelector('#application-form');
const examCard = document.querySelector('#exam');
const reviewCard = document.querySelector('#review');
const resultPage = document.querySelector('#results');
const questionPanel = document.querySelector('#question-panel');
const answerPanel = document.querySelector('#answer-panel');
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

let examConfig = {};
let categories = [];
let questions = [];
let sourceQuestions = [];
let currentIndex = 0;
let answers = {};
let markedQuestions = {};
let revealedExplanations = {};
let remainingSeconds = 20 * 60;
let timerId = null;
let isTimerHidden = false;
let examDurationSeconds = 20 * 60;

function shuffleItems(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

const optionDisplayLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function withDisplayLabels(options) {
  return options.map((option, index) => ({
    ...option,
    displayLabel: optionDisplayLabels[index] || String(index + 1),
  }));
}

function prepareQuestions(rawQuestions) {
  const preparedQuestions = rawQuestions.map((question) => {
    const options = examConfig.shuffleOptions ? shuffleItems(question.options) : [...question.options];

    return {
      ...question,
      options: withDisplayLabels(options),
    };
  });

  return examConfig.shuffleQuestions ? shuffleItems(preparedQuestions) : preparedQuestions;
}

async function loadQuestions() {
  const response = await fetch('./questions.json');
  if (!response.ok) {
    throw new Error('問題データを読み込めませんでした。');
  }
  const examData = await response.json();
  examConfig = examData.exam || {};
  categories = examData.categories || [];
  sourceQuestions = examData.questions || examData;
  questions = prepareQuestions(sourceQuestions);
  examDurationSeconds = (examConfig.timeLimitMinutes || 20) * 60;
  remainingSeconds = examDurationSeconds;
  totalNumber.textContent = questions.length;
  document.querySelector('#exam-title').textContent = examConfig.title || 'MBTI Certification Exam';
  updateTimerDisplay();
}

function optionInputType(question) {
  return question.type === 'multiple' ? 'checkbox' : 'radio';
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
  remainingSeconds = examDurationSeconds;
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
  const isExplanationRevealed = Boolean(revealedExplanations[question.id]);
  currentNumber.textContent = currentIndex + 1;
  progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
  prevButton.disabled = currentIndex === 0;
  nextButton.textContent = '次へ >';
  finishActions.classList.remove('is-hidden');

  questionPanel.innerHTML = `
    <div class="question-stem">
      <span class="question-meta">${currentIndex + 1} of ${questions.length}.</span>
      <span class="question-text"> ${question.question}</span>
    </div>
    <div class="options">
      ${question.options.map((option) => `
        <label class="option-row">
          <input type="${inputType}" name="${question.id}" value="${option.id}" ${selectedAnswers.includes(option.id) ? 'checked' : ''} />
          <span><strong>${option.displayLabel}.</strong> ${option.text}</span>
        </label>
      `).join('')}
    </div>
    <label class="review-later">
      <input id="mark-for-review" type="checkbox" ${isMarked ? 'checked' : ''} />
      <span>この問題をマークしておき、後で見直す</span>
    </label>
  `;

  answerPanel.innerHTML = `
    <button class="answer-toggle-button secondary-button" type="button" aria-expanded="${isExplanationRevealed}" aria-controls="answer-explanation-content">
      回答・解説を表示する
    </button>
    <div id="answer-explanation-content" class="answer-explanation-content ${isExplanationRevealed ? '' : 'is-hidden'}">
      <p class="answer-heading">正解</p>
      <p class="answer-correct">${getCorrectAnswerText(question)}</p>
      <p class="answer-heading">解説</p>
      <p class="answer-copy">${question.explanation}</p>
    </div>
  `;
}

function renderReviewPage() {
  reviewTableBody.innerHTML = questions.map((question, index) => {
    const selectedAnswers = answers[question.id] || [];
    const answerText = selectedAnswers.length > 0
      ? selectedAnswers
        .map((answerId) => question.options.find(({ id }) => id === answerId)?.displayLabel || answerId)
        .join(', ')
      : '未回答';
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

function getCorrectAnswerText(question) {
  return question.correctAnswers
    .map((answerId) => {
      const option = question.options.find(({ id }) => id === answerId);
      return option ? `${option.displayLabel}. ${option.text}` : answerId;
    })
    .join(' / ');
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
  const totalMinutes = Math.round(examDurationSeconds / 60);
  return `合計 ${totalMinutes} 分中 ${minutes} 分${remaining > 0 ? ` ${remaining} 秒` : ''}`;
}

function getTopicScores() {
  return categories.map((topic) => {
    const topicQuestions = questions.filter((question) => question.category === topic);
    if (topicQuestions.length === 0) {
      return { topic, percentage: 0 };
    }
    const totalPoints = topicQuestions.reduce((sum, question) => sum + (question.points || 1), 0);
    const earnedPoints = topicQuestions
      .filter(isCorrect)
      .reduce((sum, question) => sum + (question.points || 1), 0);
    return {
      topic,
      percentage: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0,
    };
  });
}

function finishExam() {
  saveCurrentAnswer();
  const totalPoints = questions.reduce((sum, question) => sum + (question.points || 1), 0);
  const earnedPoints = questions
    .filter(isCorrect)
    .reduce((sum, question) => sum + (question.points || 1), 0);
  const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passingScore = examConfig.passingScore || 80;
  const isPassed = scorePercentage >= passingScore;
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
    : `今回は合格基準（${passingScore}%）に届きませんでした。カテゴリ別の正答率は参考値として確認し、復習のうえ再受験をご検討ください。`;
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
  questions = prepareQuestions(sourceQuestions);
  totalNumber.textContent = questions.length;
  currentIndex = 0;
  answers = {};
  markedQuestions = {};
  revealedExplanations = {};
  renderQuestion();
  startTimer();
  examCard.scrollIntoView({ behavior: 'smooth' });
});

prevButton.addEventListener('click', () => {
  saveCurrentAnswer();
  currentIndex = Math.max(0, currentIndex - 1);
  renderQuestion();
});

answerPanel.addEventListener('click', (event) => {
  const button = event.target.closest('.answer-toggle-button');
  if (!button) return;
  saveCurrentAnswer();
  const question = questions[currentIndex];
  revealedExplanations[question.id] = true;
  renderQuestion();
});

nextButton.addEventListener('click', () => {
  saveCurrentAnswer();
  if (currentIndex < questions.length - 1) {
    currentIndex += 1;
    renderQuestion();
  }
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
  answerPanel.innerHTML = '';
});
