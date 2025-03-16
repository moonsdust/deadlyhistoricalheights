document.addEventListener("DOMContentLoaded", function () {
    const quizContainer = document.getElementById("hook-quiz");

    // Updated quizData with failMsg included (see above)
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

                // If user picks the wrong answer, show fail message immediately
                if (!correctAnswers.includes(selectedAnswer)) {
                    showFailMessage(questionData.failMsg);
                    return; // Stop the quiz
                }

                // Otherwise, user is correct—move to next question
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
                // All questions answered correctly
                showSuccessMessage();
            }
        }, 500);
    }

    // Show an immediate fail message and stop the quiz
    function showFailMessage(failMsg) {
        quizContainer.innerHTML = `
            <div class="quiz-content fade-in">
                <h3>${failMsg}</h3>
            </div>
        `;
    }

    // Show a success message if all answers are correct
    function showSuccessMessage() {
        quizContainer.innerHTML = `
            <div class="quiz-content fade-in">
                <h3>Great job! You seem to have done your homework for this expedition! Scroll down to learn more about Himalayan expeditions</h3>
            </div>
        `;
    }

    // Start the quiz
    showQuestion();
});