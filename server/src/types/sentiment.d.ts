// Type declaration for the 'sentiment' npm package.
// @types/sentiment does not exist on npm; this provides the minimal types needed.
declare module 'sentiment' {
  interface SentimentAnalysis {
    score: number;
    comparative: number;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  }

  class Sentiment {
    analyze(phrase: string, options?: Record<string, unknown>): SentimentAnalysis;
  }

  export default Sentiment;
}
