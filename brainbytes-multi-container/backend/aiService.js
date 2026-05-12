const fetch = require('node-fetch');

// Initialize AI Service
const initializeAI = () => {
    console.log('Hugging Face AI service initialized');

    // Check if the token is available 
    if (!process.env.HUGGINGFACE_TOKEN) {
        console.warn('Warning: HUGGINGFACE_TOKEN environment vairable is not set. API calls may fail.');
    }
};

// Function to get response
async function generateResponse(question, options = {}) {
    const lowerQuestion = question.toLowerCase();
    const preferredSubject = options.subject || null;

    const isMath = lowerQuestion.includes('calculate') ||
    lowerQuestion.includes('math') ||
    lowerQuestion.includes('1+1') ||
    /[+\-*\/=]/.test(lowerQuestion) ||
    /\d+/.test(lowerQuestion);

    const isHistory = lowerQuestion.includes('history') ||
    lowerQuestion.includes('capital') || 
    lowerQuestion.includes('philippines') ||
    lowerQuestion.includes('president');

    const isScience = lowerQuestion.includes('science') ||
    lowerQuestion.includes('evaporation') ||
    lowerQuestion.includes('precipitation') ||
    lowerQuestion.includes('water') ||
    lowerQuestion.includes('chemical');

    // Determine category based on keywords
    let category = 'general';
    if (isMath) category = 'math';
    if (isHistory) category = 'history';
    if (isScience) category = 'science';

    // If subject context was provided by the UI, use it if it matches
    if (preferredSubject && typeof preferredSubject === 'string') {
        const s = preferredSubject.toLowerCase();
        if (['math', 'science', 'history', 'english', 'technology', 'geography', 'general'].includes(s)) category = s;
    }

    // Detect question type: definition / explanation / example / general
    const questionType = detectQuestionType(lowerQuestion);

    // Basic sentiment detection (very simple keyword-based)
    const sentiment = detectSentiment(lowerQuestion);

    if (lowerQuestion === 'what is 1+1' || lowerQuestion === '1+1') {
        return {
            category: 'math',
            subject: 'math',
            questionType: 'general',
            sentiment: 'neutral',
            response: "The answer to 1+1 is 2."
        };
    }

    if (lowerQuestion === 'what is evaporation') {
        return {
            category: 'science',
            subject: 'science',
            questionType: 'definition',
            sentiment: 'neutral',
            response: "Evaporation is the process by which water changes from a liquid to a gas or vapor. This happens when water molecules gain enough energy to break free from the liquid and become airborne. Evaporation is a key part of the water cycle and helps regulate temperature and humidity in the environment."
        };
    }

    if (lowerQuestion === 'what is science') {
        return {
            category: 'science',
            subject: 'science',
            questionType: 'definition',
            sentiment: 'neutral',
            response: "Science is a systematic enterprise that builds and organizes knowledge in the form of testable explanations and predictions about the universe. It encompasses various fields such as physics, chemistry, biology, and more, all aimed at understanding natural phenomena through observation, experimentation, and analysis."
        };
    }

    // API with strict timeout
    try {
        // Smaller model
        const API_URL = 'https://api-inference.huggingface.co/models/facebook/bart-large-cnn';

        let input = question; 
        if (category === 'math') {
            input = `Solve the following math problem: ${question}`;
        } else if (category === 'history') {
            input = `Answer the following history question: ${question}`;
        } else if (category === 'science') {
            input = `Answer the following science question: ${question}`;
        }

        const token = process.env.HUGGINGFACE_TOKEN;

        // AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // API with auth and timeout
        const response = await fetch(API_URL, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ inputs: input, options: { wait_for_model: false } })
        });

        // Clear timeout after response
        clearTimeout(timeoutId);

        // For non-OK responses
        if (!response.ok) {
            console.error(`API request failed with status ${response.status}`);

            return {
                category,
                subject: category,
                questionType,
                sentiment,
                response: getDetailedResponse(category, question, questionType)
            };
        }

        const result = await response.json();

        // To check if the response if valid
        if (result && result[0] && result[0].generated_text) {
            return {
                category,
                subject: category,
                questionType,
                sentiment,
                response: result[0].generated_text
            };
        } else {
            return {
                category,
                subject: category,
                questionType,
                sentiment,
                response: getDetailedResponse(category, question, questionType)
            };
        }
    } catch (error) {
        console.error("Error calling Hugging Face API:", error);

        // Fallback response
        return {
            category,
            subject: category,
            questionType,
            sentiment,
            response: getDetailedResponse(category, question, questionType)
        };
    }
}

// Detailed fallback responses 
function getDetailedResponse(category, question, questionType) {
    const lowerQuestion = question.toLowerCase();

    // Check for matches
    if (lowerQuestion === 'what is 1+1' || lowerQuestion === '1+1') {
        return "The answer to 1+1 is 2.";
    }

    if (lowerQuestion === 'what is evaporation') {
        return "Evaporation is the process by which water changes from a liquid to a gas or vapor. This happens when water molecules gain enough energy to break free from the liquid and become airborne. Evaporation is a key part of the water cycle and helps regulate temperature and humidity in the environment.";
    }

    if (lowerQuestion === 'what is science') {
        return "Science is a systematic enterprise that builds and organizes knowledge in the form of testable explanations and predictions about the universe. It encompasses various fields such as physics, chemistry, biology, and more, all aimed at understanding natural phenomena through observation, experimentation, and analysis.";
    }

    if (category === 'science') {
        if (lowerQuestion.includes('precipitation')) {
            return "Precipitation is any product of the condensation of atmospheric water vapor that falls under gravity. The main forms of precipitation include drizzle, rain, sleet, snow, graupel, and hail.";
        }

        if (lowerQuestion.includes('evaporation')) {
            return "Evaporation is the process by which water changes from a liquid to a gas or vapor. This happens when water molecules gain enough energy to break free from the liquid and become airborne. Evaporation is a key part of the water cycle and helps regulate temperature and humidity in the environment.";
        }

        if (lowerQuestion.includes('science')) {
            return "Science is a systematic enterprise that builds and organizes knowledge in the form of testable explanations and predictions about the universe. It encompasses various fields such as physics, chemistry, biology, and more, all aimed at understanding natural phenomena through observation, experimentation, and analysis.";
        }

        // If the user asked for an example
        if (questionType === 'example') {
            return "Here's an example related to that science topic: ... (provide a concrete example). If you want more detail, ask for a step-by-step explanation.";
        }

        return "That's an interesting science question! Science helps us understand the natural world through observation and experimentation. I'd be happy to explain more about this specific topic if you provide more details.";
    }

    if (category === 'math') {
        if (lowerQuestion.includes('1+1')) {
            return "The answer to 1+1 is 2.";
        }
        if (questionType === 'definition') {
            return "In math, definitions are precise statements that describe concepts. Could you specify which term you want defined?";
        }

        if (questionType === 'example') {
            return "Here's an example math problem and solution: ... (show example). If you'd like step-by-step help, ask for an explanation.";
        }

        return "I can help with your math question. In mathematics, it's important to understand the fundamental concepts and formulas. Could you provide more details about your specific math problem?";
    }

    if (category === 'history') {
        if (lowerQuestion.includes('capital of the philippines')) {
            return "The capital of the Philippines is Manila. It's located on the island of Luzon and serves as the country's political, economic, and cultural center";
        }
        if (lowerQuestion.includes('fish in filipino')) {
            return "The word for 'fish' in Filipino (Tagalog) is 'isda'.";
        }
        if (questionType === 'example') {
            return "For example, during that period many events happened such as ... If you'd like a deeper explanation, ask for details about a specific event.";
        }

        return "Interesting question about history or culture! I'd be happy to share more information about this topic if you provide more details.";
    }

    // Default response for general questions
    return "I'm not sure I understand your question completely. Could you please provide more details or rephrase it? I can help with topics related to science, math, history, and general knowledge.";
}

// Basic question type detection
function detectQuestionType(lowerQuestion) {
    if (lowerQuestion.startsWith('what is') || lowerQuestion.startsWith('define') || lowerQuestion.includes('definition of')) return 'definition';
    if (lowerQuestion.startsWith('how') || lowerQuestion.startsWith('why') || lowerQuestion.includes('explain')) return 'explanation';
    if (lowerQuestion.includes('for example') || lowerQuestion.includes('example of') || lowerQuestion.startsWith('give an example')) return 'example';
    return 'general';
}

// Very small sentiment detector
function detectSentiment(lowerQuestion) {
    const frustratedKeywords = ['frustrat', 'angry', 'upset', 'annoyed', 'hate this', 'this is hard', 'not working'];
    const confusedKeywords = ['confused', "do not understand", "don't understand", 'not sure', 'lost', 'unclear', 'stuck'];

    if (frustratedKeywords.some((keyword) => lowerQuestion.includes(keyword))) {
        return 'frustrated';
    }

    if (confusedKeywords.some((keyword) => lowerQuestion.includes(keyword))) {
        return 'confused';
    }

    return 'neutral';
}

module.exports = {
    initializeAI,
    generateResponse,
    detectQuestionType,
    detectSentiment
};