const form = document.querySelector('#application-form');
const examCard = document.querySelector('#exam');
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

let questions = [];
let currentIndex = 0;
let answers = {};

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
  const checked = [...questionPanel.querySelectorAll('input:checked')].map((input) => input.value);
  answers[question.id] = checked;
}

function renderQuestion() {
  const question = questions[currentIndex];
  const selectedAnswers = answers[question.id] || [];
  const inputType = optionInputType(question);
  currentNumber.textContent = currentIndex + 1;
  progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
  prevButton.disabled = currentIndex === 0;
  nextButton.textContent = currentIndex === questions.length - 1 ? '回答を保存' : '次の問題';
  finishActions.classList.toggle('is-hidden', currentIndex !== questions.length - 1);

  questionPanel.innerHTML = `
    <div class="question-meta">${question.id} / ${question.type === 'multiple' ? '複数選択' : '単一選択'}</div>
    <p class="question-text">${question.question}</p>
    <div class="options">
      ${question.options.map((option) => `
        <label class="option-row">
          <input type="${inputType}" name="${question.id}" value="${option.id}" ${selectedAnswers.includes(option.id) ? 'checked' : ''} />
          <span><strong>${option.id}.</strong> ${option.text}</span>
        </label>
      `).join('')}
    </div>
  `;
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
  examCard.classList.add('is-hidden');
  resultCard.classList.remove('is-hidden');
  resultCard.scrollIntoView({ behavior: 'smooth' });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (questions.length === 0) {
    await loadQuestions();
  }
  examCard.classList.remove('is-hidden');
  resultCard.classList.add('is-hidden');
  currentIndex = 0;
  answers = {};
  renderQuestion();
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

reviewButton.addEventListener('click', () => {
  saveCurrentAnswer();
  currentIndex = 0;
  renderQuestion();
});

finishButton.addEventListener('click', finishExam);

loadQuestions().catch((error) => {
  questionPanel.innerHTML = `<p class="incorrect">${error.message}</p>`;
});
