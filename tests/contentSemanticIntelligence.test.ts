import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ContentBlock } from '../types';
import { extractContentBlocks } from '../lib/content/contentExtractor';
import { classifyPageType } from '../lib/content/pageTypeClassifier';
import { classifySearchIntent } from '../lib/content/intentClassifier';
import { extractTopicIntelligence } from '../lib/content/topicIntelligence';
import { evaluateContentDepth } from '../lib/content/topicalCoverage';
import { auditHeadingRelationships } from '../lib/content/headingRelationship';
import { detectContentGaps } from '../lib/content/contentGapDetector';
import { analyzeContentRepetition } from '../lib/content/repetitionAnalyzer';
import { evaluatePageTypeRules } from '../lib/content/pageTypeRules';
import { calculateSemanticContentScore } from '../lib/content/semanticScorer';
import { auditContentAndSemantics } from '../lib/content/contentAuditor';

describe('Phase 6: Content & Semantic SEO Intelligence Test Suite', () => {
  // =========================================================================
  // 1. BLOCK EXTRACTION & BOILERPLATE SEPARATION
  // =========================================================================
  test('1. Block Extraction: correctly separates main content from headers, footers, navs, and cookie banners', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Extraction</title></head>
        <body>
          <header class="navbar"><nav><a href="/">Home</a> <a href="/about">About</a></nav></header>
          <div class="cookie-banner"><p>We use cookies on this site.</p></div>
          <main>
            <h1>Understanding Server Components</h1>
            <p>React Server Components allow developers to render UI on the server with zero client-side JavaScript bundle footprint.</p>
            <p>This improves initial page load performance and reduces time to interactive.</p>
          </main>
          <footer><p>&copy; 2026 Example Corp. All rights reserved.</p></footer>
        </body>
      </html>
    `;

    const result = extractContentBlocks(html);

    assert.ok(result.mainContentBlocks.length >= 3, 'Should extract at least 3 main content blocks');
    assert.ok(result.excludedBlocks.length >= 2, 'Should isolate header, nav, cookie banner, or footer as excluded blocks');
    assert.ok(result.mainContentWordCount > 20, 'Main content word count should reflect article text');
    assert.ok(result.excludedWordCount > 0, 'Excluded word count should track boilerplate');
    assert.ok(result.mainContentText.includes('React Server Components'), 'Main text should contain core article text');
    assert.ok(!result.mainContentText.includes('We use cookies'), 'Main text must NOT include cookie banner');
  });

  test('2. Content Density & Ratio: calculates content-to-html and boilerplate ratios', () => {
    const html = `
      <html>
        <body>
          <main>
            <h1>High Density Technical Article</h1>
            <p>Content-to-HTML ratio provides a clean heuristic for textual richness versus script or markup overhead.</p>
          </main>
        </body>
      </html>
    `;
    const result = extractContentBlocks(html);
    assert.ok(result.contentToHtmlRatio > 0, 'Should have positive content-to-html ratio');
    assert.ok(result.boilerPlateRatio >= 0, 'Should have valid boilerplate ratio');
  });

  // =========================================================================
  // 2. PAGE TYPE CLASSIFICATION
  // =========================================================================
  test('3. Page Type: accurately classifies ARTICLE from editorial signals and schema', () => {
    const result = classifyPageType({
      url: 'https://example.com/blog/understanding-rendering-patterns',
      title: 'Understanding Modern Web Rendering Patterns | Tech Blog',
      metaDescription: 'A deep architectural guide comparing SSR, SSG, ISR, and CSR rendering models.',
      headings: [
        { level: 1, text: 'Understanding Modern Web Rendering Patterns' },
        { level: 2, text: 'Server-Side Rendering (SSR)' },
        { level: 2, text: 'Static Site Generation (SSG)' },
      ],
      schemas: [{ type: 'Article', rawJson: '{}', isValid: true }],
      mainContentText: 'Modern web architectures provide multiple rendering paradigms for web performance...',
    });

    assert.equal(result.detectedType, 'ARTICLE');
    assert.equal(result.confidence, 'HIGH');
    assert.ok(result.detectedSignals.length >= 2);
  });

  test('4. Page Type: accurately classifies PRODUCT from e-commerce schema, price, and cart markers', () => {
    const result = classifyPageType({
      url: 'https://example.com/products/noise-cancelling-headphones-pro',
      title: 'Pro Wireless Headphones - Active Noise Cancelling | AudioStore',
      metaDescription: 'Buy Pro Wireless Headphones with 40-hour battery life. $299. In Stock.',
      headings: [
        { level: 1, text: 'Pro Wireless Active Noise Cancelling Headphones' },
        { level: 2, text: 'Technical Specifications' },
        { level: 2, text: 'Customer Reviews' },
      ],
      schemas: [{ type: 'Product', rawJson: '{}', isValid: true }],
      mainContentText: 'SKU: WH-1000XM5. Price: $299.99. In stock now. Add to cart for free express shipping.',
    });

    assert.equal(result.detectedType, 'PRODUCT');
    assert.equal(result.confidence, 'HIGH');
  });

  test('5. Page Type: accurately classifies CONTACT page from URL and contact coordinates', () => {
    const result = classifyPageType({
      url: 'https://example.com/contact-us',
      title: 'Contact Us | Acme Corporation',
      metaDescription: 'Get in touch with our team via email, phone, or contact form.',
      headings: [{ level: 1, text: 'Get in Touch' }, { level: 2, text: 'Send Us a Message' }],
      schemas: [],
      mainContentText: 'Office address: 123 Innovation Way, Suite 400. Phone: (555) 019-2834. Email: info@example.com. Submit form below.',
    });

    assert.equal(result.detectedType, 'CONTACT');
    assert.ok(result.confidence === 'HIGH' || result.confidence === 'MEDIUM');
  });

  test('6. Page Type: accurately classifies FAQ page from FAQ schema and Q&A structure', () => {
    const result = classifyPageType({
      url: 'https://example.com/faq',
      title: 'Frequently Asked Questions | Help Center',
      metaDescription: 'Find answers to common questions about billing, account setup, and security.',
      headings: [
        { level: 1, text: 'Frequently Asked Questions' },
        { level: 2, text: 'How do I reset my password?' },
        { level: 2, text: 'What payment methods do you accept?' },
      ],
      schemas: [{ type: 'FAQPage', rawJson: '{}', isValid: true }],
      mainContentText: 'Q: How do I reset my password? A: Navigate to settings and click reset...',
    });

    assert.equal(result.detectedType, 'FAQ');
    assert.equal(result.confidence, 'HIGH');
  });

  test('7. Page Type: accurately classifies DOCUMENTATION from /docs URL and code references', () => {
    const result = classifyPageType({
      url: 'https://example.com/docs/api-reference',
      title: 'API Reference & SDK Integration | DevDocs',
      metaDescription: 'Complete REST API reference and JavaScript SDK syntax.',
      headings: [{ level: 1, text: 'REST API Authentication' }, { level: 2, text: 'Parameters & Return Types' }],
      schemas: [{ type: 'TechArticle', rawJson: '{}', isValid: true }],
      mainContentText: 'curl https://api.example.com/v1/auth -H "Authorization: Bearer token". Parameters: returns JSON payload.',
    });

    assert.equal(result.detectedType, 'DOCUMENTATION');
  });

  test('8. Page Type: conservatively defaults to UNKNOWN / LOW confidence when signals are ambiguous', () => {
    const result = classifyPageType({
      url: 'https://example.com/random-page-123',
      title: 'Welcome to Our Website',
      metaDescription: 'General company page.',
      headings: [{ level: 1, text: 'Welcome' }],
      schemas: [],
      mainContentText: 'Some general welcome text without distinctive structural indicators or markup.',
    });

    assert.ok(result.detectedType === 'UNKNOWN' || result.confidence === 'LOW');
  });

  // =========================================================================
  // 3. SEARCH INTENT INFERENCE
  // =========================================================================
  test('9. Search Intent: classifies INFORMATIONAL intent from instructional guides', () => {
    const result = classifySearchIntent({
      pageType: 'ARTICLE',
      title: 'How to Configure Next.js Route Handlers: Step-by-Step Guide',
      metaDescription: 'Learn how to build RESTful API route handlers in Next.js App Router.',
      h1Text: 'How to Configure Next.js Route Handlers',
      mainContentText: 'In this tutorial, you will learn how to create GET and POST route handlers in Next.js.',
    });

    assert.equal(result.primaryIntent, 'INFORMATIONAL');
    assert.equal(result.confidence, 'HIGH');
  });

  test('10. Search Intent: classifies TRANSACTIONAL intent from purchasing cues', () => {
    const result = classifySearchIntent({
      pageType: 'PRODUCT',
      title: 'Buy Premium Espresso Machine | 20% Discount & Free Shipping',
      metaDescription: 'Order your Espresso Machine online today with free shipping and checkout guarantee.',
      h1Text: 'Premium Espresso Machine Pro',
      mainContentText: 'Buy online now. Add to cart for $499 with discount code COFFEE20. Checkout securely.',
    });

    assert.equal(result.primaryIntent, 'TRANSACTIONAL');
    assert.ok(result.confidence === 'HIGH' || result.confidence === 'MEDIUM');
  });

  test('11. Search Intent: classifies COMMERCIAL_INVESTIGATION for comparative reviews', () => {
    const result = classifySearchIntent({
      pageType: 'ARTICLE',
      title: 'Top 10 Best Project Management Tools: 2026 Comparison & Review',
      metaDescription: 'Compare the best project management software with pros, cons, and pricing breakdown.',
      h1Text: 'Best Project Management Tools Compared',
      mainContentText: 'We tested the top 10 tools. Here is our detailed comparison with pros and cons and our verdict.',
    });

    assert.equal(result.primaryIntent, 'COMMERCIAL_INVESTIGATION');
  });

  test('12. Search Intent: handles MIXED intent with cautious secondary categorization', () => {
    const result = classifySearchIntent({
      pageType: 'ARTICLE',
      title: 'How to Choose Running Shoes + Best Models to Buy in 2026',
      metaDescription: 'A complete buyer guide explaining running shoe biomechanics plus top models with discount links.',
      h1Text: 'Running Shoes Guide & Top Picks',
      mainContentText: 'Learn what shoe fit matches your gait. Buy now with special discount pricing and order online.',
    });

    assert.ok(result.primaryIntent === 'MIXED' || result.secondaryIntent !== undefined);
  });

  // =========================================================================
  // 4. TOPICAL COVERAGE & CONTEXTUAL DEPTH
  // =========================================================================
  test('13. Topical Depth: accurately recognizes DEEPLY_COVERED topics across title, H1, H2, and body', () => {
    const blocks: ContentBlock[] = [
      { id: 'b1', type: 'paragraph', tag: 'p', text: 'Micro-frontend architecture decomposes monolithic web applications into decoupled micro-apps.', wordCount: 15, isMainContent: true, locationIndex: 1 },
      { id: 'b2', type: 'paragraph', tag: 'p', text: 'With module federation, each micro-frontend can be built and deployed independently without rebuilding the host.', wordCount: 18, isMainContent: true, locationIndex: 2 },
      { id: 'b3', type: 'paragraph', tag: 'p', text: 'Implementing micro-frontend architecture improves continuous deployment agility in large teams.', wordCount: 14, isMainContent: true, locationIndex: 3 },
    ];
    const extracted = extractTopicIntelligence({
      title: 'Micro-Frontend Architecture Guide',
      metaDescription: 'Master micro-frontend architecture with module federation and independent deployments.',
      h1Text: 'Micro-Frontend Architecture in Enterprise Applications',
      headings: [
        { level: 2, text: 'What is Micro-Frontend Architecture?' },
        { level: 2, text: 'Module Federation vs Iframe Composition' },
        { level: 2, text: 'Independent Deployment Pipelines' },
      ],
      blocks,
      mainContentText: 'Micro-frontend architecture decomposes monolithic web applications into decoupled micro-apps. With module federation, each micro-frontend can be built and deployed independently. Implementing micro-frontend architecture improves agility.',
    });

    assert.ok(extracted.primaryTopics.length > 0);
    const mainTopic = extracted.primaryTopics.find((t) => t.topic.includes('micro') || t.topic.includes('frontend'));
    assert.ok(mainTopic !== undefined, 'Should detect micro-frontend as primary topic');
    assert.ok(mainTopic.occurrences >= 2);
  });

  test('14. Contextual Depth Guard (False-Positive Prevention): 40-word Contact page is ADEQUATE and NOT penalized', () => {
    const blocks: ContentBlock[] = [
      { id: 'b1', type: 'heading', tag: 'h1', text: 'Contact Us', wordCount: 2, isMainContent: true, locationIndex: 1, headingLevel: 1 },
      { id: 'b2', type: 'paragraph', tag: 'p', text: 'Email us at support@example.com or call (555) 123-4567. We respond within 24 hours.', wordCount: 16, isMainContent: true, locationIndex: 2 },
      { id: 'b3', type: 'paragraph', tag: 'p', text: 'Office address: 500 Tech Blvd, San Francisco, CA.', wordCount: 8, isMainContent: true, locationIndex: 3 },
    ];

    const depth = evaluateContentDepth('CONTACT', 26, blocks);

    assert.equal(depth.isAdequateForPageType, true, 'Short contact page must be deemed adequate');
    assert.ok(depth.status === 'ADEQUATE' || depth.status === 'SUBSTANTIAL');
  });

  test('15. Contextual Depth Guard (False-Positive Prevention): 150-word Product page is ADEQUATE', () => {
    const blocks: ContentBlock[] = [
      { id: 'b1', type: 'heading', tag: 'h1', text: 'Wireless Mouse Pro', wordCount: 3, isMainContent: true, locationIndex: 1, headingLevel: 1 },
      { id: 'b2', type: 'paragraph', tag: 'p', text: 'High precision 4000 DPI sensor with silent click switches and rechargeable battery.', wordCount: 13, isMainContent: true, locationIndex: 2 },
      { id: 'b3', type: 'paragraph', tag: 'p', text: 'Includes USB-C receiver and 2-year warranty. Dimensions: 120mm x 65mm x 38mm.', wordCount: 12, isMainContent: true, locationIndex: 3 },
    ];

    const depth = evaluateContentDepth('PRODUCT', 120, blocks);

    assert.equal(depth.isAdequateForPageType, true, 'Product page with 120 words must be deemed adequate');
  });

  test('16. Contextual Depth Guard (True-Negative): 90-word Article is THIN and flagged appropriately', () => {
    const blocks: ContentBlock[] = [
      { id: 'b1', type: 'heading', tag: 'h1', text: 'How Quantum Computing Works', wordCount: 4, isMainContent: true, locationIndex: 1, headingLevel: 1 },
      { id: 'b2', type: 'paragraph', tag: 'p', text: 'Quantum computers use qubits instead of bits. That is all.', wordCount: 10, isMainContent: true, locationIndex: 2 },
    ];

    const depth = evaluateContentDepth('ARTICLE', 90, blocks);

    assert.equal(depth.isAdequateForPageType, false, 'Article with 90 words must be flagged as thin');
    assert.ok(depth.status === 'THIN' || depth.status === 'VERY_THIN');
  });

  // =========================================================================
  // 5. HEADING RELATIONSHIP & CONTENT SUPPORT
  // =========================================================================
  test('17. Heading Relationships: passes when all headings have supporting content', () => {
    const headings = [
      { level: 1, text: 'Complete SEO Guide' },
      { level: 2, text: 'On-Page Optimization' },
      { level: 2, text: 'Technical SEO Auditing' },
    ];
    const blocks: ContentBlock[] = [
      { id: 'b1', type: 'heading', tag: 'h1', text: 'Complete SEO Guide', wordCount: 3, headingLevel: 1, isMainContent: true, locationIndex: 1 },
      { id: 'b2', type: 'paragraph', tag: 'p', text: 'This guide covers foundational strategies for organic search optimization across modern search platforms.', wordCount: 16, isMainContent: true, locationIndex: 2 },
      { id: 'b3', type: 'heading', tag: 'h2', text: 'On-Page Optimization', wordCount: 2, headingLevel: 2, isMainContent: true, locationIndex: 3 },
      { id: 'b4', type: 'paragraph', tag: 'p', text: 'On-page SEO includes optimizing title tags, heading hierarchies, meta descriptions, and keyword placement.', wordCount: 16, isMainContent: true, locationIndex: 4 },
      { id: 'b5', type: 'heading', tag: 'h2', text: 'Technical SEO Auditing', wordCount: 3, headingLevel: 2, isMainContent: true, locationIndex: 5 },
      { id: 'b6', type: 'paragraph', tag: 'p', text: 'Technical SEO ensures efficient crawlability, correct canonicalization, and valid robots directives.', wordCount: 14, isMainContent: true, locationIndex: 6 },
    ];

    const result = auditHeadingRelationships(headings, blocks);

    assert.equal(result.unsupportedHeadingsCount, 0, 'Should have 0 unsupported headings');
    assert.equal(result.supportedHeadingsCount, 3, 'All 3 headings should be supported');
    assert.equal(result.headingsWithoutContent.length, 0);
  });

  test('18. Heading Relationships: detects empty headings with 0 words underneath', () => {
    const headings = [
      { level: 1, text: 'Main Title' },
      { level: 2, text: 'Empty Section A' },
      { level: 2, text: 'Empty Section B' },
      { level: 2, text: 'Populated Section C' },
    ];
    const blocks: ContentBlock[] = [
      { id: 'b1', type: 'heading', tag: 'h1', text: 'Main Title', wordCount: 2, headingLevel: 1, isMainContent: true, locationIndex: 1 },
      { id: 'b2', type: 'heading', tag: 'h2', text: 'Empty Section A', wordCount: 3, headingLevel: 2, isMainContent: true, locationIndex: 2 },
      { id: 'b3', type: 'heading', tag: 'h2', text: 'Empty Section B', wordCount: 3, headingLevel: 2, isMainContent: true, locationIndex: 3 },
      { id: 'b4', type: 'heading', tag: 'h2', text: 'Populated Section C', wordCount: 3, headingLevel: 2, isMainContent: true, locationIndex: 4 },
      { id: 'b5', type: 'paragraph', tag: 'p', text: 'This section has plenty of explanatory words describing the topic thoroughly.', wordCount: 14, isMainContent: true, locationIndex: 5 },
    ];

    const result = auditHeadingRelationships(headings, blocks);

    assert.ok(result.unsupportedHeadingsCount >= 2, 'Should flag at least 2 unsupported headings');
    assert.ok(result.headingsWithoutContent.includes('Empty Section A'));
    assert.ok(result.headingsWithoutContent.includes('Empty Section B'));
  });

  // =========================================================================
  // 6. CONTENT GAP DETECTION
  // =========================================================================
  test('19. Content Gap: detects empty heading promise as explicit content gap', () => {
    const headingBlocks: ContentBlock[] = [
      { id: 'b1', type: 'heading', tag: 'h2', text: 'Pricing & Licensing Options', wordCount: 4, headingLevel: 2, isMainContent: true, locationIndex: 1 },
    ];
    const headingRelationships = auditHeadingRelationships(
      [{ level: 2, text: 'Pricing & Licensing Options' }],
      headingBlocks
    );

    const gaps = detectContentGaps({
      pageType: 'ARTICLE',
      headingRelationships,
      primaryTopics: [],
      blocks: [],
      mainContentText: 'No pricing text here.',
    });

    assert.ok(gaps.length >= 1);
    assert.equal(gaps[0].topic, 'Pricing & Licensing Options');
    assert.equal(gaps[0].priority, 'HIGH');
  });

  test('20. Content Gap: detects missing explicit target keyword when supplied by user', () => {
    const headingRelationships = auditHeadingRelationships([], []);
    const gaps = detectContentGaps({
      pageType: 'ARTICLE',
      headingRelationships,
      primaryTopics: [],
      blocks: [],
      mainContentText: 'This article discusses general javascript frameworks and web design.',
      targetKeywords: ['nextjs dynamic rendering'],
    });

    assert.ok(gaps.some((g) => g.topic === 'nextjs dynamic rendering'));
  });

  test('21. Content Gap: does NOT invent unprovoked or hallucinated required topics', () => {
    const recipeBlocks: ContentBlock[] = [
      { id: 'b1', type: 'heading', tag: 'h1', text: 'Simple Recipe', wordCount: 2, headingLevel: 1, isMainContent: true, locationIndex: 1 },
      { id: 'b2', type: 'paragraph', tag: 'p', text: 'Here are the ingredients and instructions for making a quick salad.', wordCount: 14, isMainContent: true, locationIndex: 2 },
      { id: 'b3', type: 'heading', tag: 'h2', text: 'Ingredients', wordCount: 1, headingLevel: 2, isMainContent: true, locationIndex: 3 },
      { id: 'b4', type: 'paragraph', tag: 'p', text: 'Tomatoes, cucumbers, olive oil, and feta cheese mixed in a bowl.', wordCount: 12, isMainContent: true, locationIndex: 4 },
    ];
    const headingRelationships = auditHeadingRelationships(
      [{ level: 1, text: 'Simple Recipe' }, { level: 2, text: 'Ingredients' }],
      recipeBlocks
    );

    const gapBlocks: ContentBlock[] = [
      { id: 'b2', type: 'paragraph', tag: 'p', text: 'Here are the ingredients and instructions for making a quick salad with full steps.', wordCount: 22, isMainContent: true, locationIndex: 2 },
    ];

    const gaps = detectContentGaps({
      pageType: 'ARTICLE',
      headingRelationships,
      primaryTopics: [],
      blocks: gapBlocks,
      mainContentText: 'Here are the ingredients and instructions for making a quick salad. Tomatoes, cucumbers, olive oil.',
    });

    // Should not hallucinate random topics like "You forgot to discuss the history of olive oil"
    assert.equal(gaps.length, 0);
  });

  // =========================================================================
  // 7. REPETITION & VOCABULARY DIVERSITY
  // =========================================================================
  test('22. Repetition: detects duplicated sentences and spam repetition', () => {
    const blocks: ContentBlock[] = [
      { id: 'b1', type: 'paragraph', tag: 'p', text: 'The best cheap running shoes offer superior comfort and high durability for all athletes.', wordCount: 15, isMainContent: true, locationIndex: 1 },
      { id: 'b2', type: 'paragraph', tag: 'p', text: 'The best cheap running shoes offer superior comfort and high durability for all athletes.', wordCount: 15, isMainContent: true, locationIndex: 2 },
      { id: 'b3', type: 'paragraph', tag: 'p', text: 'The best cheap running shoes offer superior comfort and high durability for all athletes.', wordCount: 15, isMainContent: true, locationIndex: 3 },
    ];

    const result = analyzeContentRepetition(
      blocks,
      'The best cheap running shoes offer superior comfort. The best cheap running shoes offer superior comfort. The best cheap running shoes offer superior comfort.'
    );

    assert.equal(result.isRepetitive, true);
    assert.ok(result.repetitiveSentencesCount >= 2);
  });

  test('23. Repetition: does NOT falsely penalize natural product model and specification repetition', () => {
    const blocks: ContentBlock[] = [
      { id: 'b1', type: 'paragraph', tag: 'p', text: 'The Dell XPS 15 features a 15.6-inch OLED display with 3.5K resolution.', wordCount: 12, isMainContent: true, locationIndex: 1 },
      { id: 'b2', type: 'paragraph', tag: 'p', text: 'Connectivity on the Dell XPS 15 includes Thunderbolt 4 USB-C ports and SD card reader.', wordCount: 15, isMainContent: true, locationIndex: 2 },
      { id: 'b3', type: 'paragraph', tag: 'p', text: 'Thermal management in the Dell XPS 15 maintains steady performance under heavy workloads.', wordCount: 14, isMainContent: true, locationIndex: 3 },
    ];

    const result = analyzeContentRepetition(
      blocks,
      'The Dell XPS 15 features an OLED display. Connectivity on the Dell XPS 15 includes USB-C. Thermal management in the Dell XPS 15 maintains performance.'
    );

    assert.equal(result.isRepetitive, false, 'Legitimate brand/model mentions must not trigger repetition penalties');
  });

  // =========================================================================
  // 8. PAGE TYPE CONTENT RULES
  // =========================================================================
  test('24. Page Type Rules: evaluates ARTICLE editorial rules', () => {
    const articleHeadingBlocks: ContentBlock[] = [
      { id: 'b1', type: 'heading', tag: 'h1', text: 'Title', wordCount: 1, headingLevel: 1, isMainContent: true, locationIndex: 1 },
      { id: 'b2', type: 'heading', tag: 'h2', text: 'Section', wordCount: 1, headingLevel: 2, isMainContent: true, locationIndex: 2 },
      { id: 'b3', type: 'paragraph', tag: 'p', text: 'A long substantive paragraph with detailed editorial insights explaining everything in detail.', wordCount: 16, isMainContent: true, locationIndex: 3 },
    ];
    const headingRelationships = auditHeadingRelationships(
      [{ level: 1, text: 'Title' }, { level: 2, text: 'Section' }],
      articleHeadingBlocks
    );
    const contentDepth = evaluateContentDepth('ARTICLE', 500, []);

    const assessment = evaluatePageTypeRules({
      pageType: 'ARTICLE',
      mainContentText: 'A long substantive article...',
      blocks: [],
      headingRelationships,
      contentDepth,
    });

    assert.equal(assessment.pageType, 'ARTICLE');
    assert.ok(assessment.rulesEvaluated.length >= 3);
  });

  // =========================================================================
  // 9. TRANSPARENT SCORING & DEDUPLICATION LEDGER
  // =========================================================================
  test('25. Root-Cause Deduplication: thin content deducts penalty once without compounding penalties', () => {
    const contentDepth = evaluateContentDepth('ARTICLE', 40, []);
    const headingRelationships = auditHeadingRelationships([], []);
    const repetition = analyzeContentRepetition([], 'Short text.');
    const pageTypeRules = evaluatePageTypeRules({
      pageType: 'ARTICLE',
      mainContentText: 'Short text.',
      blocks: [],
      headingRelationships,
      contentDepth,
    });
    const searchIntent = classifySearchIntent({
      pageType: 'ARTICLE',
      title: 'Thin Page',
      metaDescription: '',
      mainContentText: 'Short text.',
    });

    const score = calculateSemanticContentScore({
      pageType: 'ARTICLE',
      contentDepth,
      headingRelationships,
      repetition,
      pageTypeRules,
      primaryTopics: [],
      searchIntent,
    });

    assert.ok(score.overall < 90, 'Score should reflect thin content deduction');
    // Verify deduplication: CONTENT_INSUFFICIENT_DEPTH deducted once
    const depthDeductions = score.deductions.filter((d) => d.ruleCode === 'CONTENT_INSUFFICIENT_DEPTH');
    assert.equal(depthDeductions.length, 1, 'Must deduct thin content penalty exactly once');
  });

  test('26. Semantic Sub-Scores: verifies topicalDepth, structuralClarity, intentSatisfaction, and originality', () => {
    const contentDepth = evaluateContentDepth('ARTICLE', 800, []);
    const hBlocks: ContentBlock[] = [
      { id: 'b1', type: 'heading', tag: 'h1', text: 'H1', wordCount: 1, headingLevel: 1, isMainContent: true, locationIndex: 1 },
      { id: 'b2', type: 'paragraph', tag: 'p', text: 'Detailed text for H1...', wordCount: 20, isMainContent: true, locationIndex: 2 },
      { id: 'b3', type: 'heading', tag: 'h2', text: 'H2', wordCount: 1, headingLevel: 2, isMainContent: true, locationIndex: 3 },
      { id: 'b4', type: 'paragraph', tag: 'p', text: 'Detailed text for H2...', wordCount: 20, isMainContent: true, locationIndex: 4 },
    ];
    const headingRelationships = auditHeadingRelationships(
      [{ level: 1, text: 'H1' }, { level: 2, text: 'H2' }],
      hBlocks
    );
    const repetition = analyzeContentRepetition([], 'Diverse vocabulary...');
    const pageTypeRules = evaluatePageTypeRules({
      pageType: 'ARTICLE',
      mainContentText: 'Rich text...',
      blocks: [],
      headingRelationships,
      contentDepth,
    });
    const searchIntent = classifySearchIntent({
      pageType: 'ARTICLE',
      title: 'How to Build Microservices: Complete Guide',
      metaDescription: 'A guide to microservices.',
      mainContentText: 'Tutorial on microservices.',
    });

    const score = calculateSemanticContentScore({
      pageType: 'ARTICLE',
      contentDepth,
      headingRelationships,
      repetition,
      pageTypeRules,
      primaryTopics: [{ topic: 'microservices', status: 'DEEPLY_COVERED', occurrences: 6, locationsFound: ['H1', 'Body'], isMainTopic: true }],
      searchIntent,
    });

    assert.ok(score.topicalDepth >= 85, 'Topical depth should be high for 800 words');
    assert.ok(score.structuralClarity >= 85, 'Structural clarity should be high with supported headings');
    assert.ok(score.intentSatisfaction >= 80, 'Intent satisfaction should be high');
    assert.ok(score.originalityAndSubstance >= 80, 'Originality should be high');
    assert.ok(score.overall >= 90, 'Overall score should be high for fully optimized content');
  });

  // =========================================================================
  // 10. END-TO-END ORCHESTRATOR & RECOMMENDATIONS
  // =========================================================================
  test('27. End-to-End Auditor: processes full HTML and emits structured recommendations', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Clean Architecture Guide</title></head>
        <body>
          <main>
            <h1>Clean Architecture in Modern TypeScript</h1>
            <p>Clean architecture decouples software design from external database and framework dependencies.</p>
            <h2>Dependency Inversion Principle</h2>
            <p>High-level policy modules should not depend on low-level implementation details. Both should depend on abstractions.</p>
            <h2>Entity and Use Case Layers</h2>
            <!-- Empty section: intentional gap -->
          </main>
        </body>
      </html>
    `;

    const result = auditContentAndSemantics({
      url: 'https://example.com/blog/clean-architecture-typescript',
      html,
      title: 'Clean Architecture in Modern TypeScript | Tech Guide',
      metaDescription: 'Learn how to apply Clean Architecture principles in TypeScript applications.',
      h1Text: 'Clean Architecture in Modern TypeScript',
      headings: [
        { level: 1, text: 'Clean Architecture in Modern TypeScript' },
        { level: 2, text: 'Dependency Inversion Principle' },
        { level: 2, text: 'Entity and Use Case Layers' },
      ],
      schemas: [{ type: 'Article', rawJson: '{}', isValid: true }],
    });

    assert.equal(result.pageType.detectedType, 'ARTICLE');
    assert.equal(result.searchIntent.primaryIntent, 'INFORMATIONAL');
    assert.ok(result.extraction.mainContentWordCount > 20);
    assert.ok(result.score.overall > 0 && result.score.overall <= 100);

    // Empty section should generate structured recommendation
    assert.ok(result.headingRelationships.unsupportedHeadingsCount >= 1);
    const emptyHeadingRec = result.recommendations.find(
      (r) => r.code === 'CONTENT_HEADING_WITHOUT_SUPPORT'
    );
    assert.ok(emptyHeadingRec !== undefined, 'Should produce empty heading recommendation');
    assert.ok(emptyHeadingRec.before && emptyHeadingRec.after, 'Recommendation must include before/after');
    assert.ok(emptyHeadingRec.expectedBenefit, 'Recommendation must include expected benefit');
  });

  test('28. End-to-End Auditor: target keyword mode matches locations and identifies missing keywords', () => {
    const html = `
      <html>
        <head><title>SEO Analysis Tool</title></head>
        <body>
          <main>
            <h1>Automated SEO Analysis Tool</h1>
            <p>This automated SEO analysis tool audits website crawlability and metadata.</p>
          </main>
        </body>
      </html>
    `;

    const result = auditContentAndSemantics({
      url: 'https://example.com',
      html,
      title: 'SEO Analysis Tool',
      metaDescription: 'SEO analysis tool.',
      h1Text: 'Automated SEO Analysis Tool',
      headings: [{ level: 1, text: 'Automated SEO Analysis Tool' }],
      schemas: [],
      targetKeywords: ['seo analysis tool', 'backlink checker api'],
    });

    assert.equal(result.isTargetMode, true);
    assert.ok(result.targetKeywordAlignment !== undefined);
    assert.ok(result.targetKeywordAlignment.gaps.includes('backlink checker api'));
    assert.ok(!result.targetKeywordAlignment.gaps.includes('seo analysis tool'));
  });

  test('29. End-to-End Auditor: handles zero content gracefully without crashing', () => {
    const result = auditContentAndSemantics({
      url: 'https://example.com/empty',
      html: '<html><body></body></html>',
      title: '',
      metaDescription: '',
      headings: [],
      schemas: [],
    });

    assert.equal(result.pageType.detectedType, 'UNKNOWN');
    assert.equal(result.extraction.mainContentWordCount, 0);
    assert.ok(result.score.overall <= 85);
  });

  test('30. End-to-End Auditor: preserves deterministic results across repeated invocations', () => {
    const options = {
      url: 'https://example.com/blog/test',
      html: '<main><h1>Deterministic Test</h1><p>Testing reproducibility of scores and classifications.</p></main>',
      title: 'Deterministic Test',
      metaDescription: 'Testing reproducibility.',
      h1Text: 'Deterministic Test',
      headings: [{ level: 1, text: 'Deterministic Test' }],
      schemas: [],
    };

    const run1 = auditContentAndSemantics(options);
    const run2 = auditContentAndSemantics(options);

    assert.equal(run1.pageType.detectedType, run2.pageType.detectedType);
    assert.equal(run1.searchIntent.primaryIntent, run2.searchIntent.primaryIntent);
    assert.equal(run1.score.overall, run2.score.overall);
    assert.equal(run1.extraction.mainContentWordCount, run2.extraction.mainContentWordCount);
  });
});
