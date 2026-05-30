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
// GENERATE RESPONSE
// =========================

async function generateResponse(question, options = {}) {

    const lowerQuestion =
        question.toLowerCase().trim();

    const preferredSubject =
        options.subject || 'general';

    const questionType =
        detectQuestionType(lowerQuestion);

    const sentiment =
        detectSentiment(lowerQuestion);

    try {

        let systemPrompt = `
You are BrainBytes AI Tutor.

Rules:
- Give clear educational answers
- Keep answers beginner-friendly
- Use markdown formatting when useful
- Be concise but helpful

IMPORTANT:
- Only answer questions related to the selected subject.
- If the question is unrelated to the selected subject,
reply ONLY with:

⚠ Please switch to the correct subject filter.
`;

        // =========================
        // MATH
        // =========================

        if (preferredSubject === 'math') {

            systemPrompt += `
You are excellent at mathematics.

Help solve:
- algebra
- equations
- arithmetic
- geometry
- word problems

Show step-by-step solutions when needed.

If the user's question is NOT math-related,
reply ONLY with:

⚠ Please switch to the correct subject filter.
`;
        }

        // =========================
        // SCIENCE
        // =========================

        if (preferredSubject === 'science') {

            systemPrompt += `
You are excellent at science explanations.

Topics may include:
- biology
- chemistry
- physics
- earth science
- anatomy
- ecosystems
- astronomy

Explain concepts clearly and simply.

If the user's question is NOT science-related,
reply ONLY with:

⚠ Please switch to the correct subject filter.
`;
        }

        // =========================
        // HISTORY
        // =========================

        if (preferredSubject === 'history') {

            systemPrompt += `
You are excellent at history.

Explain:
- historical events
- wars
- presidents
- important people
- civilizations
- timelines

Keep explanations educational and factual.

If the user's question is NOT history-related,
reply ONLY with:

⚠ Please switch to the correct subject filter.
`;
        }

        // =========================
        // TECHNOLOGY
        // =========================

        if (preferredSubject === 'technology') {

            systemPrompt += `
You are excellent at programming and technology.

Help with:
- JavaScript
- Python
- Java
- HTML
- CSS
- React
- APIs
- databases
- software development

Give beginner-friendly coding explanations.

If the user's question is NOT technology-related,
reply ONLY with:

⚠ Please switch to the correct subject filter.
`;
        }

        // =========================
        // GEOGRAPHY
        // =========================

        if (preferredSubject === 'geography') {

            systemPrompt += `
You are excellent at geography.

Help explain:
- countries
- capitals
- continents
- oceans
- maps
- climates
- natural resources

Keep answers simple and educational.

If the user's question is NOT geography-related,
reply ONLY with:

⚠ Please switch to the correct subject filter.
`;
        }

        // =========================
        // ENGLISH
        // =========================

        if (preferredSubject === 'english') {

            systemPrompt += `
You are excellent at English grammar and writing.

Help with:
- grammar
- essays
- spelling
- sentence structure
- vocabulary
- paraphrasing

Keep explanations easy to understand.

If the user's question is NOT English-related,
reply ONLY with:

⚠ Please switch to the correct subject filter.
`;
        }

        // =========================
        // GENERAL
        // =========================

        if (preferredSubject === 'general') {

            systemPrompt += `
You are a helpful educational AI tutor.

You may answer:
- general knowledge
- casual questions
- educational topics
- beginner learning questions
`;
        }

        // =========================
        // AI REQUEST
        // =========================

        const completion =
            await client.chat.completions.create({

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

            temperature: 0.4,
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