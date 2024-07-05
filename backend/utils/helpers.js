export const convertTagArray = (keywords) => {
    let keywordArray = [];
    if (keywords) {
        if (typeof keywords === 'string') keywordArray = keywords.split(',');
        else if (Array.isArray(keywords)) keywordArray = keywords.map(keyword => String(keyword));
    }
    return keywordArray.map(keyword => keyword.trim()).filter(Boolean);
};

export const getTrendingEvents = (events) => {
    const keywordCounts = {};
    const eventsByKeyword = {};

    events.forEach(event => {
        event.keywords.forEach(keyword => {
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            if (!eventsByKeyword[keyword]) {
                eventsByKeyword[keyword] = [];
            }
            eventsByKeyword[keyword].push(event);
        });
    });

    const trendingKeyword = Object.keys(keywordCounts).reduce((a, b) => 
        keywordCounts[a] > keywordCounts[b] ? a : b
    );

    const totalTags = Object.values(keywordCounts).reduce((sum, count) => sum + count, 0);
    const numberOfTags = keywordCounts[trendingKeyword];
    const percentageOfTotalTags = (numberOfTags / totalTags) * 100;

    return {
        trendingEvents: eventsByKeyword[trendingKeyword] || [],
        trendingTag: trendingKeyword,
        percentageOfTotalTags: percentageOfTotalTags.toFixed(2),
        numberOfTags: numberOfTags
    };
};
