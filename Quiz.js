import React, { useState } from 'react';

const quizQuestions = [
  { question: "What does HTML stand for?", options: ["Hyper Text Markup Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language"], answer: 0 },
  { question: "Which programming language is used for web apps?", options: ["PHP", "Python", "JavaScript", "All of the above"], answer: 3 },
  { question: "What does CSS stand for?", options: ["Creative Style System", "Cascading Style Sheets", "Computer Style Sheets"], answer: 1 },
  { question: "Which symbol is used for comments in JavaScript?", options: ["//", "/* */", "#"], answer: 0 },
  { question: "Inside which HTML element do we put JavaScript?", options: ["<javascript>", "<js>", "<script>"], answer: 2 },
  { question: "Which company developed Java?", options: ["Microsoft", "Sun Microsystems", "Google"], answer: 1 },
  { question: "What is React?", options: ["A JavaScript framework", "A JavaScript library", "A programming language"], answer: 1 },
  { question: "What does API stand for?", options: ["Application Programming Interface", "Applied Program Internet", "Application Program Internet"], answer: 0 },
  { question: "Which SQL statement is used to extract data?", options: ["GET", "EXTRACT", "SELECT"], answer: 2 },
  { question: "Which operator is used to assign a value to a variable in most languages?", options: ["=", "==", ":="], answer: 0 }
];

export default function Quiz({ onFinish }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState(Array(quizQuestions.length).fill(null));
  const [quizCompleted, setQuizCompleted] = useState(false);

  const handleAnswer = (optionIndex) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestion] = optionIndex;
    setAnswers(updatedAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setQuizCompleted(true);
      if (onFinish) onFinish();
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const score = answers.reduce((total, ans, index) => {
    return ans === quizQuestions[index].answer ? total + 1 : total;
  }, 0);

  const honourScore = Math.floor(50 + Math.random() * 50);

  let message = "Keep it up!";
  let messageColor = "white";
  if (honourScore > 80) {
    message = "🌟 Excellent! You stayed super focused.";
    messageColor = "#4CAF50";
  } else if (honourScore > 50) {
    message = "⚠️ Good attempt! Try to stay a bit more focused.";
    messageColor = "#ff9800";
  } else {
    message = "❌ You looked away too much. Focus is key, keep practicing!";
    messageColor = "#f44336";
  }

  return (
    <div>
      {!quizCompleted ? (
        <>
          <h2>Question {currentQuestion + 1} of {quizQuestions.length}</h2>
          <p>{quizQuestions[currentQuestion].question}</p>
          {quizQuestions[currentQuestion].options.map((opt, idx) => (
            <label key={idx} style={{
              display: 'block',
              margin: '5px 0',
              padding: '8px',
              borderRadius: '4px',
              background: answers[currentQuestion] === idx ? '#d1e7dd' : '#f8f9fa',
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name={`q${currentQuestion}`}
                checked={answers[currentQuestion] === idx}
                onChange={() => handleAnswer(idx)}
                style={{ marginRight: '8px' }}
              />
              {opt}
            </label>
          ))}
          <div style={{ marginTop: '15px' }}>
            <button onClick={prevQuestion} disabled={currentQuestion === 0} style={{
              marginRight: '10px',
              padding: '8px 15px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>Previous</button>
            <button onClick={nextQuestion} style={{
              padding: '8px 15px',
              background: '#2c2c2c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              {currentQuestion < quizQuestions.length - 1 ? 'Next' : 'Finish'}
            </button>
          </div>
        </>
      ) : (
        <div className="result-container">
          <div className="result-box">
            <h2>🎉 Quiz Completed!</h2>
            <p className="score-text">📊 Your Quiz Score: <b>{score}</b> / {quizQuestions.length}</p>
            <p className="score-text">🛡 Honour Score: <b>{honourScore}</b> / 100</p>
            <p style={{ color: messageColor, fontWeight: "bold", marginTop: "10px" }}>{message}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: "15px",
                padding: "10px 20px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "0.3s"
              }}
              onMouseOver={(e) => (e.target.style.background = "#43a047")}
              onMouseOut={(e) => (e.target.style.background = "#4CAF50")}
            >
              🔄 Retake Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
