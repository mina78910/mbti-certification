const form = document.querySelector('#application-form');
const examCard = document.querySelector('#exam');
const reviewCard = document.querySelector('#review');
const resultCard = document.querySelector('#result');
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

let questions = [];
let currentIndex = 0;
let answers = {};
let markedQuestions = {};
let remainingSeconds = 90 * 60;
let timerId = null;
let isTimerHidden = false;

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
  reviewCard.classList.add('is-hidden');
  resultCard.classList.add('is-hidden');
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
  nextButton.textContent = 'Next >';
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
  examCard.classList.add('is-hidden');
  resultCard.classList.add('is-hidden');
  reviewCard.classList.remove('is-hidden');
  reviewCard.scrollIntoView({ behavior: 'smooth' });
}

function isCorrect(question) {
  const selected = [...(answers[question.id] || [])].sort();
  const correct = [...question.correctAnswers].sort();
  return selected.length === correct.length && selected.every((answer, index) => answer === correct[index]);
}

function finishExam() {
  saveCurrentAnswer();
  const correctCount = questions.filter(isCorrect).length;
  resultCard.innerHTML = `
    <h2>試験結果</h2>
    <p>${questions.length}問中 ${correctCount}問正解です。お疲れさまでした。</p>
    ${questions.map((question) => `
      <div class="result-item">
        <p><strong>${question.id}</strong> ${question.question}</p>
        <p class="${isCorrect(question) ? 'correct' : 'incorrect'}">${isCorrect(question) ? '正解' : '不正解'}</p>
        <p>あなたの回答: ${(answers[question.id] || []).join(', ') || '未回答'} / 正解: ${question.correctAnswers.join(', ')}</p>
        <p>${question.explanation}</p>
      </div>
    `).join('')}
  `;
  stopTimer();
  document.body.classList.remove('exam-mode');
  examCard.classList.add('is-hidden');
  reviewCard.classList.add('is-hidden');
  resultCard.classList.remove('is-hidden');
  resultCard.scrollIntoView({ behavior: 'smooth' });
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
  examCard.classList.remove('is-hidden');
  reviewCard.classList.add('is-hidden');
  resultCard.classList.add('is-hidden');
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

submitModal.addEventListener('click', (event) => {
  if (event.target === submitModal) {
    closeSubmitModal();
  }
});

timerToggle.addEventListener('click', () => {
  isTimerHidden = !isTimerHidden;
  timerToggle.textContent = isTimerHidden ? 'Show' : 'Hide';
  timerToggle.setAttribute('aria-pressed', String(isTimerHidden));
  updateTimerDisplay();
});

loadQuestions().catch((error) => {
  questionPanel.innerHTML = `<p class="incorrect">${error.message}</p>`;
});
