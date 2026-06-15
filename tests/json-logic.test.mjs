import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../questions.json', import.meta.url), 'utf8'));
const questions = data.questions;

function optionInputType(question) {
  return question.type === 'multiple' ? 'checkbox' : 'radio';
}

function isCorrect(question, selectedAnswers = []) {
  const selected = [...selectedAnswers].sort();
  const correct = [...question.correctAnswers].sort();
  return selected.length === correct.length && selected.every((answer, index) => answer === correct[index]);
}

function topicScores(categories, scoredQuestions, answersByQuestionId) {
  return categories.map((topic) => {
    const topicQuestions = scoredQuestions.filter((question) => question.category === topic);
    if (topicQuestions.length === 0) return { topic, percentage: 0 };

    const totalPoints = topicQuestions.reduce((sum, question) => sum + (question.points || 1), 0);
    const earnedPoints = topicQuestions
      .filter((question) => isCorrect(question, answersByQuestionId[question.id] || []))
      .reduce((sum, question) => sum + (question.points || 1), 0);

    return { topic, percentage: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0 };
  });
}

function examScore(scoredQuestions, answersByQuestionId) {
  const totalPoints = scoredQuestions.reduce((sum, question) => sum + (question.points || 1), 0);
  const earnedPoints = scoredQuestions
    .filter((question) => isCorrect(question, answersByQuestionId[question.id] || []))
    .reduce((sum, question) => sum + (question.points || 1), 0);

  return totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
}

function correctAnswerMap(scoredQuestions) {
  return Object.fromEntries(scoredQuestions.map((question) => [question.id, question.correctAnswers]));
}

assert.equal(typeof data.exam, 'object', 'exam metadata must exist');
assert.equal(data.exam.passingScore, 60, 'passing score should match certification threshold');
assert.equal(data.exam.timeLimitMinutes, 20, 'time limit should be 20 minutes');
assert.deepEqual(data.categories, [
  '8つの心理機能の定義',
  '心理機能の特徴・実践',
  '心理機能と16タイプの対応付け',
]);
assert.equal(questions.length, 24, 'exam should contain 24 questions');

const questionIds = new Set();
for (const [index, question] of questions.entries()) {
  assert.match(question.id, /^Q\d{3}$/, `question ${index + 1} id should use QNNN format`);
  assert.equal(questionIds.has(question.id), false, `${question.id} must be unique`);
  questionIds.add(question.id);

  assert.ok(data.categories.includes(question.category), `${question.id} category must be declared`);
  assert.ok(['single', 'multiple'].includes(question.type), `${question.id} type must be supported`);
  assert.equal(optionInputType(question), question.type === 'multiple' ? 'checkbox' : 'radio');
  assert.ok(Array.isArray(question.options), `${question.id} options must be an array`);
  assert.ok(question.options.length >= 2, `${question.id} should have at least two options`);
  assert.ok(Array.isArray(question.correctAnswers), `${question.id} correctAnswers must be an array`);

  const optionIds = new Set();
  for (const option of question.options) {
    assert.match(option.id, /^[A-Z]$/, `${question.id} option id should be a single uppercase letter`);
    assert.equal(optionIds.has(option.id), false, `${question.id} option ${option.id} must be unique`);
    optionIds.add(option.id);
    assert.ok(option.text?.trim(), `${question.id} option ${option.id} must have text`);
    assert.ok(option.explanation?.trim(), `${question.id} option ${option.id} must have an explanation`);
  }

  for (const answerId of question.correctAnswers) {
    assert.ok(optionIds.has(answerId), `${question.id} correct answer ${answerId} must exist in options`);
  }

  if (question.type === 'single') {
    assert.equal(question.correctAnswers.length, 1, `${question.id} single-select question must have one correct answer`);
  } else {
    assert.ok(question.correctAnswers.length > 1, `${question.id} multiple-select question should have multiple correct answers`);
  }
}

assert.deepEqual(
  Object.fromEntries(data.categories.map((category) => [category, questions.filter((question) => question.category === category).length])),
  {
    '8つの心理機能の定義': 8,
    '心理機能の特徴・実践': 8,
    '心理機能と16タイプの対応付け': 8,
  },
  'questions should be evenly distributed across categories',
);

const allCorrectAnswers = correctAnswerMap(questions);
assert.equal(examScore(questions, allCorrectAnswers), 100, 'all correct answers should score 100%');
assert.equal(examScore(questions, {}), 0, 'unanswered exam should score 0%');
assert.deepEqual(
  topicScores(data.categories, questions, allCorrectAnswers),
  data.categories.map((topic) => ({ topic, percentage: 100 })),
  'all correct answers should score 100% in every category',
);
assert.deepEqual(
  topicScores(data.categories, questions, {}),
  data.categories.map((topic) => ({ topic, percentage: 0 })),
  'unanswered exam should score 0% in every category',
);

const singleQuestion = questions.find((question) => question.type === 'single');
assert.equal(isCorrect(singleQuestion, singleQuestion.correctAnswers), true, 'single-select exact answer should be correct');
assert.equal(isCorrect(singleQuestion, []), false, 'single-select unanswered should be incorrect');
assert.equal(isCorrect(singleQuestion, [...singleQuestion.correctAnswers, 'Z']), false, 'single-select extra answer should be incorrect');

const multipleQuestion = questions.find((question) => question.type === 'multiple');
assert.equal(isCorrect(multipleQuestion, multipleQuestion.correctAnswers), true, 'multiple-select exact answer should be correct');
assert.equal(isCorrect(multipleQuestion, [...multipleQuestion.correctAnswers].reverse()), true, 'multiple-select answer order should not matter');
assert.equal(isCorrect(multipleQuestion, multipleQuestion.correctAnswers.slice(0, -1)), false, 'multiple-select partial answer should be incorrect');
assert.equal(isCorrect(multipleQuestion, [...multipleQuestion.correctAnswers, 'Z']), false, 'multiple-select extra answer should be incorrect');

console.log('JSON schema, answer logic, scoring logic, and category distribution checks passed.');
