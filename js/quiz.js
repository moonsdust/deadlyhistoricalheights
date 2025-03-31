document.addEventListener("DOMContentLoaded", function () {
    const quizContainer = document.getElementById("hook-quiz");

    // Quiz data with failMsg included for each question
    const quizData = [
        {
            question: "What season are you planning to go on your expedition?",
            options: ["Winter", "Spring", "Summer", "Autumn"],
            correct: ["Spring", "Autumn"],
            failMsg: "Spring and autumn are the best seasons for climbing the Himalayas, offering stable weather and safer conditions, while summer’s monsoon brings heavy snowfall and avalanches, and winter poses extreme cold and deadly storms."
        },
        {
            question: "Will you bring additional sources of oxygen?",
            options: ["Yes", "No"],
            correct: ["Yes"],
            failMsg: "Oxygen is critical for climbing the Himalayas, especially at altitudes above 8,000 meters (26,247 feet), known as the “death zone."
        },
        {
            question: "Are you planning on climbing one of these peaks?",
            options: ["Everest", "K2", "Denali", "No"],
            correct: ["No"],
            failMsg: "Climbing Everest, K2, and Denali is a life-threatening challenge, where brutal weather, treacherous terrain, and thin air push even the strongest to their limits—one wrong step can be fatal."
        }
    ];

    let currentQuestionIndex = 0;

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
            button.addEventListener("click", () => {
                const selectedAnswer = button.textContent;
                const correctAnswers = Array.isArray(questionData.correct)
                    ? questionData.correct
                    : [questionData.correct];

                // If the answer is wrong, show the fail message with a Next Question and a Redo Quiz button
                if (!correctAnswers.includes(selectedAnswer)) {
                    showFailMessage(questionData.failMsg);
                    return;
                }

                // If correct, transition to the next question
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
                // All questions completed
                showSuccessMessage();
            }
        }, 500);
    }

    // Show fail message with Next Question and Redo Quiz buttons
    function showFailMessage(failMsg) {
        quizContainer.innerHTML = `
            <div class="quiz-content fade-in">
                <h3>${failMsg}</h3>
                <button id="next-question-btn" class="quiz-btn">Next Question</button>
                <button id="redo-btn" class="quiz-btn">Redo Quiz</button>
            </div>
        `;

        document.getElementById("next-question-btn").addEventListener("click", function() {
            currentQuestionIndex++;
            if (currentQuestionIndex < quizData.length) {
                showQuestion();
            } else {
                showSuccessMessage();
            }
        });
        document.getElementById("redo-btn").addEventListener("click", resetQuiz);
    }

    // Show a final success message with a Redo Quiz button
    function showSuccessMessage() {
        quizContainer.innerHTML = `
            <div class="quiz-content fade-in">
                <h3>You have a basic understanding of the expedition requirements. Scroll down to learn more and good luck with your journey!</h3>
                <button id="redo-btn" class="quiz-btn">Redo Quiz</button>
            </div>
        `;

        document.getElementById("redo-btn").addEventListener("click", resetQuiz);
    }

    // Reset the quiz to its initial state and start over
    function resetQuiz() {
        currentQuestionIndex = 0;
        showQuestion();
    }

    // Start the quiz
    showQuestion();
});