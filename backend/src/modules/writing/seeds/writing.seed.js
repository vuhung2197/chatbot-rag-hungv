import pool from '#db';

// =============================================================================
// Seed Data - Writing Exercises (30 exercises across 6 CEFR levels)
// =============================================================================

const exercises = [
    // ==================== A1 - Beginner (Sentence Building) ====================
    {
        level: 'A1', type: 'sentence',
        title: 'Introduce Yourself',
        prompt: 'Write 3-5 sentences to introduce yourself. Include your name, age, where you live, and what you like to do.',
        hints: ['My name is...', 'I am ... years old', 'I live in...', 'I like to...'],
        min_words: 10, max_words: 50
    },
    {
        level: 'A1', type: 'sentence',
        title: 'My Family',
        prompt: 'Describe your family. How many people are in your family? Who are they? Write 3-5 simple sentences.',
        hints: ['There are ... people', 'My father/mother is...', 'I have ... brother(s)/sister(s)'],
        min_words: 10, max_words: 50
    },
    {
        level: 'A1', type: 'sentence',
        title: 'My Daily Routine',
        prompt: 'Write about your daily routine. What do you do every day? Use simple present tense.',
        hints: ['I wake up at...', 'I have breakfast...', 'I go to...', 'I come home at...'],
        min_words: 15, max_words: 60
    },
    {
        level: 'A1', type: 'sentence',
        title: 'My Favorite Food',
        prompt: 'Write about your favorite food. What is it? Why do you like it? How does it taste?',
        hints: ['My favorite food is...', 'I like it because...', 'It tastes...'],
        min_words: 10, max_words: 50
    },
    {
        level: 'A1', type: 'sentence',
        title: 'The Weather Today',
        prompt: 'Look outside and describe the weather. Is it sunny, rainy, or cloudy? Is it hot or cold?',
        hints: ['Today the weather is...', 'It is ...°C', 'I can see...', 'I feel...'],
        min_words: 10, max_words: 40
    },

    // ==================== A2 - Elementary (Email/Short Paragraph) ====================
    {
        level: 'A2', type: 'email',
        title: 'Email to a Friend',
        prompt: 'Write a short email to your friend about your weekend plans. What will you do? Where will you go? Invite them to join.',
        hints: ['Dear...', 'This weekend I plan to...', 'Would you like to...?', 'See you soon'],
        min_words: 30, max_words: 80
    },
    {
        level: 'A2', type: 'email',
        title: 'Thank You Note',
        prompt: 'Write a thank you email to someone who gave you a birthday gift. Say what the gift was and why you like it.',
        hints: ['Thank you for...', 'I really like...', 'It was very kind of you'],
        min_words: 30, max_words: 80
    },
    {
        level: 'A2', type: 'sentence',
        title: 'My Hometown',
        prompt: 'Write a short paragraph (4-6 sentences) about your hometown. Describe what it looks like, what you can do there, and why you like or dislike it.',
        hints: ['I come from...', 'It is a ... city/town', 'There are many...', 'The best thing about... is...'],
        min_words: 40, max_words: 100
    },
    {
        level: 'A2', type: 'email',
        title: 'Booking a Hotel Room',
        prompt: 'Write an email to a hotel to book a room. Include: dates, number of guests, room type, and any special requests.',
        hints: ['I would like to book...', 'from... to...', 'for ... guests', 'Could you please...'],
        min_words: 40, max_words: 100
    },
    {
        level: 'A2', type: 'sentence',
        title: 'A Person I Admire',
        prompt: 'Write about a person you admire. Who is this person? What do they do? Why do you admire them?',
        hints: ['The person I admire is...', 'He/She is...', 'I admire them because...'],
        min_words: 40, max_words: 100
    },

    // ==================== B1 - Intermediate (Paragraph/Letter) ====================
    {
        level: 'B1', type: 'story',
        title: 'An Unforgettable Trip',
        prompt: 'Write about a trip you took that you will never forget. Where did you go? What happened? What made it special? Use past tenses.',
        hints: ['Last year/month I went to...', 'The most memorable moment was...', 'I felt...'],
        min_words: 80, max_words: 180
    },
    {
        level: 'B1', type: 'opinion',
        title: 'Should Students Wear Uniforms?',
        prompt: 'Do you think students should wear school uniforms? Give your opinion with at least 2 reasons. Consider both sides.',
        hints: ['In my opinion...', 'On one hand... On the other hand...', 'For example...', 'In conclusion...'],
        min_words: 80, max_words: 180
    },
    {
        level: 'B1', type: 'email',
        title: 'Complaint Letter',
        prompt: 'Write a formal email to a company complaining about a product you bought that was damaged. Describe the problem and what you want them to do.',
        hints: ['I am writing to complain about...', 'The product was...', 'I would like to request...'],
        min_words: 80, max_words: 180
    },
    {
        level: 'B1', type: 'story',
        title: 'Continue the Story',
        prompt: '"It was a dark and stormy night. Sarah heard a knock on the door. When she opened it, she couldn\'t believe her eyes..." Continue this story. What happened next?',
        hints: ['She saw...', 'Suddenly...', 'She felt...', 'In the end...'],
        min_words: 100, max_words: 200
    },
    {
        level: 'B1', type: 'opinion',
        title: 'Living in the City vs. Countryside',
        prompt: 'Which is better: living in the city or the countryside? Write about the advantages and disadvantages of each. Share your preference.',
        hints: ['Living in the city has...', 'On the other hand, the countryside...', 'Personally, I prefer...'],
        min_words: 80, max_words: 180
    },

    // ==================== B2 - Upper-Intermediate (Essay/Review) ====================
    {
        level: 'B2', type: 'opinion',
        title: 'The Impact of Social Media',
        prompt: 'Discuss the positive and negative effects of social media on society. Do the benefits outweigh the drawbacks? Support your argument with examples.',
        hints: ['Social media has transformed...', 'A significant advantage is...', 'However, critics argue...'],
        min_words: 150, max_words: 280
    },
    {
        level: 'B2', type: 'report',
        title: 'Book or Movie Review',
        prompt: 'Write a review of a book you have read or a movie you have watched recently. Include a brief summary, your opinion, and a recommendation.',
        hints: ['The story is about...', 'What I found particularly...', 'I would recommend this to...'],
        min_words: 150, max_words: 280
    },
    {
        level: 'B2', type: 'opinion',
        title: 'Online vs. Traditional Education',
        prompt: 'Compare online learning with traditional classroom education. Which method is more effective and why? Consider different perspectives.',
        hints: ['Online learning offers...', 'Traditional education provides...', 'Research suggests...'],
        min_words: 150, max_words: 280
    },
    {
        level: 'B2', type: 'report',
        title: 'Workplace Culture Report',
        prompt: 'Write a report about the ideal workplace culture. What makes employees happy and productive? Include at least 3 key factors with explanations.',
        hints: ['An ideal workplace should...', 'Research shows that...', 'In addition...', 'To sum up...'],
        min_words: 150, max_words: 280
    },
    {
        level: 'B2', type: 'story',
        title: 'A Turning Point in Life',
        prompt: 'Write about a moment or decision that changed the direction of your life. How did it affect you? What did you learn from it?',
        hints: ['Looking back...', 'At that moment, I realized...', 'This experience taught me...'],
        min_words: 150, max_words: 280
    },

    // ==================== C1 - Advanced (Essay/Report) ====================
    {
        level: 'C1', type: 'essay',
        title: 'The Future of Remote Work',
        prompt: 'Analyze the long-term implications of remote work on society, economy, and individual well-being. Consider both opportunities and challenges that this shift presents.',
        hints: ['The pandemic has accelerated...', 'From an economic perspective...', 'Furthermore...', 'It is worth noting...'],
        min_words: 250, max_words: 400
    },
    {
        level: 'C1', type: 'essay',
        title: 'Ethical Implications of AI',
        prompt: 'Discuss the ethical challenges posed by artificial intelligence in areas such as privacy, employment, and decision-making. What guidelines should be established?',
        hints: ['AI presents unprecedented...', 'Critics argue that...', 'A balanced approach would...'],
        min_words: 250, max_words: 400
    },
    {
        level: 'C1', type: 'report',
        title: 'Environmental Sustainability Plan',
        prompt: 'Write a proposal for improving environmental sustainability in your city or workplace. Include specific actions, expected outcomes, and potential challenges.',
        hints: ['The current situation...', 'I propose the following measures...', 'The expected outcome...'],
        min_words: 250, max_words: 400
    },
    {
        level: 'C1', type: 'opinion',
        title: 'Universal Basic Income',
        prompt: 'Should governments implement a Universal Basic Income (UBI)? Evaluate the economic, social, and psychological arguments for and against UBI.',
        hints: ['Proponents of UBI argue...', 'However, opponents contend...', 'Evidence from pilot programs...'],
        min_words: 250, max_words: 400
    },
    {
        level: 'C1', type: 'essay',
        title: 'Cultural Globalization',
        prompt: 'To what extent does globalization threaten cultural diversity? Discuss with reference to language, traditions, and media consumption patterns.',
        hints: ['Globalization has undeniably...', 'While some view this as...', 'A nuanced perspective reveals...'],
        min_words: 250, max_words: 400
    },

    // ==================== C2 - Mastery (Academic Essay) ====================
    {
        level: 'C2', type: 'essay',
        title: 'The Paradox of Choice',
        prompt: 'Critically analyze the paradox of choice in modern consumer societies. Drawing on psychological research, discuss how an abundance of options can lead to decision paralysis and diminished satisfaction.',
        hints: ['Schwartz (2004) posits that...', 'This phenomenon manifests...', 'Counterintuitively...'],
        min_words: 400, max_words: 600
    },
    {
        level: 'C2', type: 'essay',
        title: 'Language and Thought',
        prompt: 'Evaluate the Sapir-Whorf hypothesis and its implications for bilingual individuals. Does the language we speak shape how we perceive reality?',
        hints: ['The linguistic relativity hypothesis...', 'Empirical evidence suggests...', 'In bilingual contexts...'],
        min_words: 400, max_words: 600
    },
    {
        level: 'C2', type: 'essay',
        title: 'Democracy in the Digital Age',
        prompt: 'Analyze how digital technologies and social media platforms are reshaping democratic processes. Consider issues of misinformation, political polarization, and civic engagement.',
        hints: ['The digital revolution has fundamentally...', 'Scholars have identified...', 'This transformation raises...'],
        min_words: 400, max_words: 600
    },
    {
        level: 'C2', type: 'report',
        title: 'Education System Reform',
        prompt: 'Propose a comprehensive reform plan for the education system in your country. Address curriculum design, assessment methods, teacher training, and equity. Justify each recommendation with evidence.',
        hints: ['The current system fails to...', 'Research consistently demonstrates...', 'Implementation would require...'],
        min_words: 400, max_words: 600
    },
    {
        level: 'C2', type: 'essay',
        title: 'The Ethics of Space Colonization',
        prompt: 'Discuss the philosophical and practical considerations surrounding human colonization of other planets. Should we invest in becoming a multi-planetary species?',
        hints: ['From a utilitarian perspective...', 'The technological feasibility...', 'Ethical frameworks suggest...'],
        min_words: 400, max_words: 600
    },
];

async function seedWritingExercises() {
    console.log('🌱 Seeding writing exercises...');

    for (const ex of exercises) {
        try {
            await pool.execute(
                `INSERT INTO writing_exercises (level, type, title, prompt, hints, min_words, max_words)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
                [ex.level, ex.type, ex.title, ex.prompt, JSON.stringify(ex.hints), ex.min_words, ex.max_words]
            );
        } catch (err) {
            console.error(`❌ Error seeding "${ex.title}":`, err.message);
        }
    }

    // Count results
    const [rows] = await pool.execute('SELECT COUNT(*)::int as total FROM writing_exercises');
    console.log(`✅ Seeded writing exercises. Total: ${rows[0].total}`);
}

// Run if executed directly
if (process.argv[1]?.includes('writing.seed')) {
    seedWritingExercises()
        .then(() => process.exit(0))
        .catch(err => { console.error(err); process.exit(1); });
}

export default seedWritingExercises;
