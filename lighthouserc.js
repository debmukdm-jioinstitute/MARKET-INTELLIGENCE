module.exports = {
  ci: {
    collect: {
      url: [
        'https://getmarketintelligence.in/Home',
        'https://getmarketintelligence.in/markets',
        'https://getmarketintelligence.in/macro',
        'https://getmarketintelligence.in/funds',
        'https://getmarketintelligence.in/indicators/nifty50_pe',
      ],
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--no-sandbox --headless --disable-gpu',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['warn', { minScore: 0.90 }],
        'categories:best-practices': ['warn', { minScore: 0.90 }],
        'categories:seo': ['warn', { minScore: 0.90 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
