document.addEventListener("DOMContentLoaded", function () {
    const quizContainer = document.getElementById("hook-quiz");

    const quizData = [
        {
            question: "What season are you planning to go on your expedition?",
            options: ["Winter", "Spring", "Summer", "Autumn"],
            correct: ["Spring", "Autumn"]
        },
        {
            question: "Will you bring additional sources of oxygen?",
            options: ["Yes", "No"],
            correct: ["Yes"]
        },
        {
            question: "Are you planning on climbing one of these peaks?",
            options: ["Everest", "K2", "Denali", "No"],
            correct: ["No"]
        },
        {
            question: "Sample Question?",
            options: ["A", "B", "C", "D"],
            correct: ["A"]
        }
    ];

    let currentQuestionIndex = 0;
    let hasIncorrectAnswer = false;

    function showQuestion() {
        const questionData = quizData[currentQuestionIndex];
        
        quizContainer.innerHTML = `
            <div class="quiz-content fade-in">
                <h3>${questionData.question}</h3>
                <div id="quiz-options" class="quiz-options">
                    ${questionData.options
                        .map(option => `<button class="quiz-btn">${option}</button>`)
                        .join("")}
                </div>
            </div>
        `;

        document.querySelectorAll(".quiz-btn").forEach(button => {
            button.addEventListener("click", function () {
                const selectedAnswer = this.textContent;
                const correctAnswers = Array.isArray(questionData.correct) ? questionData.correct : [questionData.correct];

                if (!correctAnswers.includes(selectedAnswer)) {
                    hasIncorrectAnswer = true;
                }

                transitionToNextQuestion();
            });
        });
    }

    function transitionToNextQuestion() {
        const quizContent = document.querySelector(".quiz-content");
        quizContent.classList.add("fade-out");

        setTimeout(() => {
            currentQuestionIndex++;
            if (currentQuestionIndex < quizData.length) {
                showQuestion();
            } else {
                showResult();
            }
        }, 500);
    }

    function showResult() {
        quizContainer.innerHTML = `
            <div class="quiz-content fade-in">
                <h3>${hasIncorrectAnswer 
                    ? "Unfortunately, you got some answers wrong. You are not well prepared for your expedition" 
                    : "Great job! You seem to have done your homework for this expedition!"}
                </h3>
            </div>
        `;
    }

    // Start the quiz
    showQuestion();
});
