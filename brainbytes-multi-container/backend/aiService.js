const OpenAI = require('openai');

// =========================
// GROQ CLIENT
// =========================

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
});

// =========================
// INITIALIZE AI
// =========================

const initializeAI = () => {

    console.log('BrainBytes AI initialized');

    if (!process.env.GROQ_API_KEY) {

        console.warn(
            'Warning: GROQ_API_KEY is not set.'
        );
    }
};

// =========================
// SUBJECT VALIDATION
// =========================

function validateSubject(question, subject) {

    const q = question.toLowerCase();

    const mathKeywords = [
        'solve',
        '+',
        '-',
        '*',
        '/',
        '=',
        'equation',
        'algebra',
        'geometry',
        'calculate',
        'math'
    ];

    const scienceKeywords = [
        'photosynthesis',
        'atom',
        'gravity',
        'biology',
        'chemistry',
        'physics',
        'science'
    ];

    const historyKeywords = [
        'war',
        'rizal',
        'history',
        'president',
        'independence'
    ];

    const technologyKeywords = [
        'code',
        'javascript',
        'java',
        'python',
        'programming',
        'html',
        'css',
        'technology'
    ];

    const geographyKeywords = [
        'country',
        'capital',
        'map',
        'continent',
        'ocean',
        'geography'
    ];

    // =========================
    // GENERAL FILTER
    // =========================

    if (subject === 'general') {

        if (
            mathKeywords.some(k => q.includes(k)) ||
            scienceKeywords.some(k => q.includes(k)) ||
            historyKeywords.some(k => q.includes(k)) ||
            technologyKeywords.some(k => q.includes(k)) ||
            geographyKeywords.some(k => q.includes(k))
        ) {

            return {

                valid: false,

                message:
                    '⚠ This question belongs to a specific subject. Please switch to the correct subject filter.'
            };
        }
    }

    // =========================
    // MATH
    // =========================

    if (
        subject === 'math' &&
        !mathKeywords.some(k => q.includes(k))
    ) {

        return {

            valid: false,

            message:
                '⚠ Please ask a math-related question while using the Math filter.'
        };
    }

    // =========================
    // SCIENCE
    // =========================

    if (
        subject === 'science' &&
        !scienceKeywords.some(k => q.includes(k))
    ) {

        return {

            valid: false,

            message:
                '⚠ Please ask a science-related question while using the Science filter.'
        };
    }

    // =========================
    // HISTORY
    // =========================

    if (
        subject === 'history' &&
        !historyKeywords.some(k => q.includes(k))
    ) {

        return {

            valid: false,

            message:
                '⚠ Please ask a history-related question while using the History filter.'
        };
    }

    // =========================
    // TECHNOLOGY
    // =========================

    if (
        subject === 'technology' &&
        !technologyKeywords.some(k => q.includes(k))
    ) {

        return {

            valid: false,

            message:
                '⚠ Please ask a technology-related question while using the Technology filter.'
        };
    }

    // =========================
    // GEOGRAPHY
    // =========================

    if (
        subject === 'geography' &&
        !geographyKeywords.some(k => q.includes(k))
    ) {

        return {

            valid: false,

            message:
                '⚠ Please ask a geography-related question while using the Geography filter.'
        };
    }

    return {
        valid: true
    };
}

// =========================
// GENERATE RESPONSE
// =========================

async function generateResponse(question, options = {}) {

    const lowerQuestion = question.toLowerCase().trim();
    const preferredSubject = options.subject || 'general';

    // =========================
    // VALIDATE SUBJECT
    // =========================

    const validationResult =
        validateSubject(question, preferredSubject);

    if (!validationResult.valid) {

        return {

            category: preferredSubject,
            subject: preferredSubject,
            questionType: 'general',
            sentiment: 'neutral',

            response: validationResult.message
        };
    }

    const questionType = detectQuestionType(lowerQuestion);
    const sentiment = detectSentiment(lowerQuestion);

    try {

        let systemPrompt = `
You are BrainBytes AI Tutor.

Rules:
- Give clear educational answers
- Keep answers beginner-friendly
- Use markdown formatting when useful
- Be concise but helpful
- Stay inside the selected subject only
`;

        if (preferredSubject === 'math') {

            systemPrompt += `
You are excellent at mathematics.
Show simple solutions.
Only answer math-related questions.
`;
        }

        if (preferredSubject === 'science') {

            systemPrompt += `
You are excellent at science explanations.
Only answer science-related questions.
`;
        }

        if (preferredSubject === 'history') {

            systemPrompt += `
You are excellent at history.
Only answer history-related questions.
`;
        }

        if (preferredSubject === 'technology') {

            systemPrompt += `
You are excellent at programming and technology.
Only answer technology-related questions.
`;
        }

        if (preferredSubject === 'geography') {

            systemPrompt += `
You are excellent at geography.
Only answer geography-related questions.
`;
        }

        if (preferredSubject === 'english') {

            systemPrompt += `
You are excellent at English grammar and writing.
Only answer English-related questions.
`;
        }

        if (preferredSubject === 'general') {

            systemPrompt += `
Only answer general knowledge and casual educational questions.
Reject highly specific subject-based questions.
`;
        }

        const completion = await client.chat.completions.create({

            model: 'llama-3.1-8b-instant',

            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: question
                }
            ],

            temperature: 0.7,
            max_tokens: 300
        });

        const aiResponse =
            completion.choices[0].message.content;

        return {

            category: preferredSubject,
            subject: preferredSubject,
            questionType,
            sentiment,
            response: aiResponse
        };

    } catch (error) {

        console.log(
            'Groq AI Error:',
            error.message
        );

        return {

            category: preferredSubject,
            subject: preferredSubject,
            questionType,
            sentiment,

            response:
                "⚠ AI service is temporarily unavailable. Please try again later."
        };
    }
}

// =========================
// QUESTION TYPE DETECTION
// =========================

function detectQuestionType(lowerQuestion) {

    if (
        lowerQuestion.startsWith('what is') ||
        lowerQuestion.startsWith('define')
    ) {

        return 'definition';
    }

    if (
        lowerQuestion.startsWith('how') ||
        lowerQuestion.startsWith('why') ||
        lowerQuestion.includes('explain')
    ) {

        return 'explanation';
    }

    if (
        lowerQuestion.includes('example')
    ) {

        return 'example';
    }

    return 'general';
}

// =========================
// SENTIMENT DETECTION
// =========================

function detectSentiment(lowerQuestion) {

    const frustratedKeywords = [
        'frustrat',
        'angry',
        'upset',
        'annoyed',
        'hate this',
        'not working'
    ];

    const confusedKeywords = [
        'confused',
        'not sure',
        'lost',
        'unclear',
        'stuck'
    ];

    if (
        frustratedKeywords.some(keyword =>
            lowerQuestion.includes(keyword)
        )
    ) {

        return 'frustrated';
    }

    if (
        confusedKeywords.some(keyword =>
            lowerQuestion.includes(keyword)
        )
    ) {

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