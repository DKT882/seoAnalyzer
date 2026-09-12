import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { auditContentAndSemantics } from '../lib/content/contentAuditor';
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
import { PAGE_TYPE_DEPTH_BENCHMARKS } from '../lib/constants';

describe('Phase 6.1: Real-World Content Intelligence Audit & Calibration', () => {

  // =========================================================================
  // FIXTURE 01: E-commerce product with natural repeated product name
  // =========================================================================
  test('Fixture 01: E-commerce Product with natural repeated product name', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Sony WH-1000XM5 Wireless Headphones | AudioWorld</title></head>
        <body>
          <nav><a href="/">Home</a> <a href="/headphones">Headphones</a></nav>
          <main>
            <h1>Sony WH-1000XM5 Wireless Noise Cancelling Headphones</h1>
            <p>The Sony WH-1000XM5 Wireless Headphones rewrite the rules for distraction-free listening with industry-leading noise cancellation. Featuring two processors and eight microphones, background noise is attenuated across all frequency bands for an immersive personal acoustic environment.</p>
            <p class="pricing">Price: $399.99 | In Stock | <button>Add to Cart</button> | <button>Buy Now</button></p>
            <h2>Product Specifications & Battery Life</h2>
            <p>Weight: 250 grams. Driver unit: 30mm carbon fiber composite dome. Frequency response: 4Hz to 40,000Hz via LDAC. Battery life delivers up to 30 hours of continuous playback with active noise cancellation enabled, and rapid USB-PD charging yields 3 hours of playback from a 3-minute charge.</p>
            <h2>What's Included in the Box</h2>
            <p>Package includes the Sony WH-1000XM5 Wireless Headphones, collapsible carrying case, 1.2m headphone cable with gold-plated stereo mini plug, and USB-C charging cable.</p>
          </main>
          <footer>&copy; 2026 AudioWorld. All rights reserved.</footer>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://store.example.com/products/sony-wh1000xm5-wireless-headphones',
      html,
      title: 'Sony WH-1000XM5 Wireless Headphones | AudioWorld',
      metaDescription: 'Buy Sony WH-1000XM5 Wireless Noise Cancelling Headphones for $399.99 with fast shipping.',
      h1Text: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
      headings: [
        { level: 1, text: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones' },
        { level: 2, text: 'Product Specifications & Battery Life' },
        { level: 2, text: 'What\'s Included in the Box' },
      ],
      schemas: [{ type: 'Product', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.pageType.detectedType, 'PRODUCT');
    assert.equal(audit.pageType.confidence, 'HIGH');
    assert.equal(audit.searchIntent.primaryIntent, 'TRANSACTIONAL');
    // Verify NO false positive repetition penalty on natural product name
    assert.equal(audit.repetition.isRepetitive, false, 'Natural product name must NOT trigger spam repetition');
    assert.ok(audit.contentDepth.isAdequateForPageType, 'Word count (>80) should be adequate for product page');
    assert.ok(audit.score.overall >= 90, 'Should receive a strong semantic score');
  });

  // =========================================================================
  // FIXTURE 02: E-commerce category with many product names
  // =========================================================================
  test('Fixture 02: E-commerce Category with many product names', () => {
    const html = `
      <html>
        <head><title>Wireless Earbuds & Headphones Catalog | AudioStore</title></head>
        <body>
          <header><nav><a href="/">Home</a></nav></header>
          <main>
            <h1>Wireless Earbuds & Headphones Collection</h1>
            <p>Explore our curated selection of high-fidelity wireless audio gear for music lovers, gamers, and remote professionals. Compare battery life, noise cancellation capabilities, and water resistance ratings across all top brands.</p>
            <div class="product-grid">
              <div class="item"><h3>Apple AirPods Pro 2</h3><p>Active noise cancelling with H2 chip, adaptive audio, and 30-hour MagSafe charging case. Price: $249.00 In Stock.</p></div>
              <div class="item"><h3>Sony WF-1000XM5</h3><p>High-resolution audio with dual feedback mics, dynamic driver X, and multipoint Bluetooth connectivity. Price: $299.99 In Stock.</p></div>
              <div class="item"><h3>Bose QuietComfort Ultra</h3><p>Spatial audio with custom tune sound calibration, world-class noise cancellation, and all-day comfort fit. Price: $299.00 In Stock.</p></div>
              <div class="item"><h3>Sennheiser Momentum True Wireless 4</h3><p>Audiophile sound profile with lossless audio support, Auracast broadcasting, and 30-hour battery life. Price: $299.95 In Stock.</p></div>
              <div class="item"><h3>JBL Live Pro 2</h3><p>True adaptive noise cancelling with 40-hour total battery, 6 beamforming microphones, and IPX5 water resistance. Price: $149.95 In Stock.</p></div>
            </div>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://store.example.com/collections/wireless-earbuds',
      html,
      title: 'Wireless Earbuds & Headphones Catalog | AudioStore',
      metaDescription: 'Shop our wide selection of wireless earbuds and noise cancelling headphones.',
      h1Text: 'Wireless Earbuds & Headphones Collection',
      headings: [
        { level: 1, text: 'Wireless Earbuds & Headphones Collection' },
        { level: 3, text: 'Apple AirPods Pro 2' },
        { level: 3, text: 'Sony WF-1000XM5' },
        { level: 3, text: 'Bose QuietComfort Ultra' },
        { level: 3, text: 'Sennheiser Momentum True Wireless 4' },
        { level: 3, text: 'JBL Live Pro 2' },
      ],
      schemas: [{ type: 'CollectionPage', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.pageType.detectedType, 'CATEGORY_PAGE');
    assert.equal(audit.repetition.isRepetitive, false, 'Listing multiple product names must not trigger repetition spam');
    assert.ok(audit.contentDepth.isAdequateForPageType);
    assert.ok(audit.score.overall >= 80);
  });

  // =========================================================================
  // FIXTURE 03: Short service landing page
  // =========================================================================
  test('Fixture 03: Short service landing page (150 words, high value)', () => {
    const html = `
      <html>
        <head><title>Cloud Migration Consulting Services | Enterprise Cloud</title></head>
        <body>
          <main>
            <h1>Enterprise Cloud Migration Services</h1>
            <p>Accelerate your digital infrastructure modernization with our zero-downtime AWS, Azure, and Google Cloud migration consulting services. We help engineering teams transition complex legacy monoliths to elastic, resilient cloud-native architectures with complete security compliance.</p>
            <h2>Our Structured Migration Process</h2>
            <p>We perform comprehensive infrastructure audits, dependency mapping, automated database schema conversion, data pipeline synchronization, and post-cutover performance validation to ensure zero business disruption throughout the cutover window.</p>
            <h2>Enterprise Offerings & Reliability Engineering</h2>
            <p>Our consulting offerings include workload assessment, Kubernetes container re-platforming, multi-cloud disaster recovery strategy, automated infrastructure as code with Terraform, cost governance, and 24/7 reliability engineering support.</p>
            <h2>Customized Migration Roadmap</h2>
            <p>Contact our solutions architecture team today for a customized enterprise migration roadmap, architecture review, and transparent project quote tailored to your business SLA requirements.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://agency.example.com/services/cloud-migration',
      html,
      title: 'Cloud Migration Consulting Services | Enterprise Cloud',
      metaDescription: 'Expert cloud migration services for AWS and Azure. Secure, scalable, and zero downtime.',
      h1Text: 'Enterprise Cloud Migration Services',
      headings: [
        { level: 1, text: 'Enterprise Cloud Migration Services' },
        { level: 2, text: 'Our Structured Migration Process' },
        { level: 2, text: 'Enterprise Offerings & Reliability Engineering' },
        { level: 2, text: 'Customized Migration Roadmap' },
      ],
      schemas: [{ type: 'Service', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.pageType.detectedType, 'SERVICE');
    assert.ok(audit.contentDepth.isAdequateForPageType, '150+ words meets service page adequacy benchmark (120+ words)');
    assert.equal(audit.headingRelationships.unsupportedHeadingsCount, 0);
    assert.ok(audit.score.overall >= 85);
  });

  // =========================================================================
  // FIXTURE 04: Long low-value service page with repetition
  // =========================================================================
  test('Fixture 04: Long low-value service page with duplicate paragraphs', () => {
    const repeatedPara = 'Our New York SEO agency provides the best New York SEO services for businesses looking for New York SEO ranking solutions.';
    const html = `
      <html>
        <head><title>New York SEO Agency Services</title></head>
        <body>
          <main>
            <h1>New York SEO Agency Services</h1>
            <h2>Best New York SEO</h2>
            <p>${repeatedPara}</p>
            <h2>Top Rated New York SEO</h2>
            <p>${repeatedPara}</p>
            <h2>Affordable New York SEO</h2>
            <p>${repeatedPara}</p>
            <h2>Professional New York SEO</h2>
            <p>${repeatedPara}</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://spammy-services.example.com/seo-agency-new-york',
      html,
      title: 'New York SEO Agency Services',
      metaDescription: 'Best New York SEO agency services for your business.',
      h1Text: 'New York SEO Agency Services',
      headings: [
        { level: 1, text: 'New York SEO Agency Services' },
        { level: 2, text: 'Best New York SEO' },
        { level: 2, text: 'Top Rated New York SEO' },
        { level: 2, text: 'Affordable New York SEO' },
        { level: 2, text: 'Professional New York SEO' },
      ],
      schemas: [],
    });

    assert.equal(audit.repetition.isRepetitive, true, 'Exact repeated paragraphs must be flagged as repetitive');
    assert.ok(audit.repetition.repetitiveSentencesCount >= 3);
    assert.ok(audit.score.deductions.some((d) => d.ruleCode === 'CONTENT_REPETITION'));
  });

  // =========================================================================
  // FIXTURE 05: Excellent 250-word article
  // =========================================================================
  test('Fixture 05: Excellent 250-word article with concise structure', () => {
    const html = `
      <html>
        <head><title>Interactive Git Rebase Guide | DevTips</title></head>
        <body>
          <main>
            <h1>Interactive Git Rebase Step-by-Step Guide</h1>
            <p>Interactive rebase is one of Git's most powerful tools for cleaning up messy commit histories before merging pull requests. It allows software engineers to combine, edit, reword, or drop commits deterministically.</p>
            <h2>Starting the Rebase Session</h2>
            <p>Run git rebase -i HEAD~3 in your terminal to open the interactive editor with your last three commits listed in chronological order from oldest to newest.</p>
            <h2>Command Options</h2>
            <p>Use pick to keep a commit unchanged, squash to combine multiple commits into one descriptive message, or fixup to discard the commit log while keeping changes intact.</p>
            <h2>Resolving Merge Conflicts</h2>
            <p>When conflicts occur during rebase, resolve the conflicted files in your editor, stage them with git add, and resume the rebase execution using git rebase --continue.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://devblog.example.com/quick-tips/git-rebase-interactive-guide',
      html,
      title: 'Interactive Git Rebase Guide | DevTips',
      metaDescription: 'Learn how to use interactive git rebase with pick, squash, and fixup commands.',
      h1Text: 'Interactive Git Rebase Step-by-Step Guide',
      headings: [
        { level: 1, text: 'Interactive Git Rebase Step-by-Step Guide' },
        { level: 2, text: 'Starting the Rebase Session' },
        { level: 2, text: 'Command Options' },
        { level: 2, text: 'Resolving Merge Conflicts' },
      ],
      schemas: [{ type: 'Article', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.pageType.detectedType, 'ARTICLE');
    assert.equal(audit.headingRelationships.unsupportedHeadingsCount, 0);
    assert.equal(audit.repetition.isRepetitive, false);
    // Score remains solid due to perfect structure and zero repetition
    assert.ok(audit.score.structuralClarity >= 85);
  });

  // =========================================================================
  // FIXTURE 06: Excellent 500-word article
  // =========================================================================
  test('Fixture 06: Excellent 500-word article with comprehensive topical coverage', () => {
    const html = `
      <html>
        <head><title>Mastering TypeScript Generics in Modern Web Apps</title></head>
        <body>
          <main>
            <h1>Mastering TypeScript Generics in Modern Web Applications</h1>
            <p>TypeScript generics provide a powerful mechanism to write flexible, reusable code components while maintaining complete static type safety across your entire application codebase. Instead of relying on unsafe type assertions or the any type which disables compiler verification, generics capture caller types dynamically and enforce strict contract boundaries across functions, interfaces, classes, and complex asynchronous state machines.</p>
            <h2>Understanding Generic Type Parameters</h2>
            <p>Generic type parameters act as placeholders for types that are specified when the function, interface, or class is instantiated. Instead of using the any type which disables compile-time type checking, generics capture the exact argument types and propagate them through return values and inner closures cleanly. This guarantees that calling code receives precise IDE autocomplete suggestions and compile-time refactoring guarantees.</p>
            <h2>Constraining Generics with Extends</h2>
            <p>You can enforce constraints on generic parameters using the extends keyword. For instance, creating a constraint that requires objects to contain an identifier property guarantees property access without runtime exceptions. This pattern is foundational for repository patterns, database query builders, and type-safe API client wrappers that interact with diverse backend microservices.</p>
            <h2>Utility Types Built on Generics</h2>
            <p>TypeScript includes powerful built-in utility types such as Partial, Required, Record, Readonly, and Pick that transform domain types dynamically. Combining these utility types with mapped types and template literal types enables clean domain modeling and robust API request validation layers without redundant type declarations.</p>
            <h2>Advanced Conditional and Mapped Types</h2>
            <p>By pairing generics with conditional type expressions using the infer keyword, developers can extract element types from arrays, unwrap Promise return types, and construct deeply nested immutable data schemas with absolute precision.</p>
            <h2>Practical Production Recommendations</h2>
            <p>Always name generic arguments descriptively when multiple parameters exist (such as TEntity, TKey, or TResponse rather than opaque single-letter variables), prefer type inference when invoking generic functions, and avoid over-constraining interfaces unnecessarily to preserve consumer flexibility across large monorepos.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://devblog.example.com/articles/mastering-typescript-generics',
      html,
      title: 'Mastering TypeScript Generics in Modern Web Apps',
      metaDescription: 'Comprehensive guide to TypeScript generics, type constraints, and utility types.',
      h1Text: 'Mastering TypeScript Generics in Modern Web Applications',
      headings: [
        { level: 1, text: 'Mastering TypeScript Generics in Modern Web Applications' },
        { level: 2, text: 'Understanding Generic Type Parameters' },
        { level: 2, text: 'Constraining Generics with Extends' },
        { level: 2, text: 'Utility Types Built on Generics' },
        { level: 2, text: 'Advanced Conditional and Mapped Types' },
        { level: 2, text: 'Practical Production Recommendations' },
      ],
      schemas: [{ type: 'Article', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.pageType.detectedType, 'ARTICLE');
    assert.equal(audit.searchIntent.primaryIntent, 'INFORMATIONAL');
    assert.ok(audit.contentDepth.isAdequateForPageType);
    assert.ok(audit.score.overall >= 85);
    assert.ok(audit.primaryTopics.some((t) => t.topic.includes('generics') || t.topic.includes('typescript')));
  });

  // =========================================================================
  // FIXTURE 07: 3000-word repetitive article
  // =========================================================================
  test('Fixture 07: 3000-word repetitive article with artificial padding', () => {
    const chunk = 'The quick guide to digital marketing requires understanding search engines, social media algorithms, and content marketing funnel strategies for modern business growth. ';
    const paragraph = chunk.repeat(4);
    
    let html = '<html><body><main><h1>The Complete Guide to Digital Marketing</h1>';
    for (let i = 1; i <= 12; i++) {
      html += `<h2>Section ${i}: Digital Marketing Principles</h2><p>${paragraph}</p>`;
    }
    html += '</main></body></html>';

    const headings = [{ level: 1, text: 'The Complete Guide to Digital Marketing' }];
    for (let i = 1; i <= 12; i++) {
      headings.push({ level: 2, text: `Section ${i}: Digital Marketing Principles` });
    }

    const audit = auditContentAndSemantics({
      url: 'https://content-farm.example.com/digital-marketing-guide',
      html,
      title: 'The Complete Guide to Digital Marketing',
      metaDescription: 'Comprehensive digital marketing guide for modern businesses.',
      h1Text: 'The Complete Guide to Digital Marketing',
      headings,
      schemas: [{ type: 'Article', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.repetition.isRepetitive, true, 'Massive paragraph duplication must be detected');
    assert.ok(audit.score.deductions.some((d) => d.ruleCode === 'CONTENT_REPETITION'));
    assert.ok(audit.score.originalityAndSubstance < 70);
  });

  // =========================================================================
  // FIXTURE 08: Documentation page with concise sections
  // =========================================================================
  test('Fixture 08: Documentation page with concise sections and code tables', () => {
    const html = `
      <html>
        <head><title>API Authentication Reference | DevPortal</title></head>
        <body>
          <main>
            <h1>Authentication API Reference</h1>
            <p>All API requests must include a valid Bearer token in the HTTP Authorization header to authenticate against the v1 gateway. Tokens are signed JWT credentials with cryptographic validation against our centralized identity provider service.</p>
            <h2>Generate API Token</h2>
            <p>Send an authenticated POST request to /v1/auth/tokens with your client_id and client_secret parameters in the JSON payload to receive an active access token. Ensure that requests are transmitted exclusively over secure TLS 1.3 encrypted channels.</p>
            <h2>Token Request Parameters</h2>
            <p>Required payload parameters include client_id (string identifier), client_secret (confidential string key), grant_type (client_credentials or authorization_code), and optional scope (space-separated string permissions list defining granular resource access).</p>
            <h2>Token Response Structure</h2>
            <p>Successful response returns access_token (JWT string), token_type (Bearer string constant), expires_in (integer seconds indicating token validity duration), and refresh_token (optional string credential for offline access renewal without re-authenticating).</p>
            <h2>Refresh Token Grant Workflow</h2>
            <p>When access tokens expire, client applications should issue a refresh request with grant_type=refresh_token and the stored refresh_token to obtain a new access credential without re-prompting users for credentials.</p>
            <h2>Error Status Codes & Rate Limits</h2>
            <p>Returns 401 Unauthorized for invalid or expired credentials, 403 Forbidden for insufficient role permissions, and 429 Too Many Requests when organization rate limits of 100 requests per second are exceeded.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://docs.example.com/api/v1/auth/tokens',
      html,
      title: 'API Authentication Reference | DevPortal',
      metaDescription: 'Technical reference documentation for API authentication tokens.',
      h1Text: 'Authentication API Reference',
      headings: [
        { level: 1, text: 'Authentication API Reference' },
        { level: 2, text: 'Generate API Token' },
        { level: 2, text: 'Token Request Parameters' },
        { level: 2, text: 'Token Response Structure' },
        { level: 2, text: 'Refresh Token Grant Workflow' },
        { level: 2, text: 'Error Status Codes & Rate Limits' },
      ],
      schemas: [{ type: 'TechArticle', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.pageType.detectedType, 'DOCUMENTATION');
    assert.ok(audit.contentDepth.isAdequateForPageType);
    assert.equal(audit.headingRelationships.unsupportedHeadingsCount, 0);
    assert.ok(audit.score.overall >= 85);
  });

  // =========================================================================
  // FIXTURE 09: FAQ with short answers
  // =========================================================================
  test('Fixture 09: FAQ with short, direct answers', () => {
    const html = `
      <html>
        <head><title>Frequently Asked Questions | StoreSupport</title></head>
        <body>
          <main>
            <h1>Frequently Asked Questions</h1>
            <h2>How long does standard shipping take?</h2>
            <p>Standard domestic shipping takes 3-5 business days from the dispatch date for all continental destinations.</p>
            <h2>Do you offer international delivery?</h2>
            <p>Yes, we ship to over 50 countries worldwide via DHL Express with complete customs clearance handling.</p>
            <h2>What is your customer return policy?</h2>
            <p>You can return any unused items in original packaging within 30 days of delivery for a full refund or exchange.</p>
            <h2>How can I track my package?</h2>
            <p>Once your order ships, an automated tracking number and carrier portal link will be emailed to your account.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://service.example.com/support/shipping-faq',
      html,
      title: 'Frequently Asked Questions | StoreSupport',
      metaDescription: 'Frequently asked questions regarding shipping, delivery times, and returns.',
      h1Text: 'Frequently Asked Questions',
      headings: [
        { level: 1, text: 'Frequently Asked Questions' },
        { level: 2, text: 'How long does standard shipping take?' },
        { level: 2, text: 'Do you offer international delivery?' },
        { level: 2, text: 'What is your customer return policy?' },
        { level: 2, text: 'How can I track my package?' },
      ],
      schemas: [{ type: 'FAQPage', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.pageType.detectedType, 'FAQ');
    assert.equal(audit.headingRelationships.unsupportedHeadingsCount, 0);
    assert.ok(audit.contentDepth.isAdequateForPageType, 'Short FAQ answers must pass depth adequacy');
    assert.ok(audit.score.overall >= 88);
  });

  // =========================================================================
  // FIXTURE 10: FAQ with strong detailed answers
  // =========================================================================
  test('Fixture 10: FAQ with strong, comprehensive compliance answers', () => {
    const html = `
      <html>
        <head><title>Enterprise Security & Compliance FAQ | CloudSecure</title></head>
        <body>
          <main>
            <h1>Enterprise Security & Compliance FAQ</h1>
            <h2>Is your cloud infrastructure SOC2 Type II certified?</h2>
            <p>Yes, our systems undergo annual independent third-party SOC2 Type II audits covering security, availability, and data confidentiality controls with full audit reports available under NDA for enterprise customers.</p>
            <h2>How is customer data encrypted at rest and in transit?</h2>
            <p>All sensitive customer data is encrypted at rest using AES-256 with customer-managed encryption keys (CMEK) and in transit using TLS 1.3 cryptographic protocols with perfect forward secrecy and automated certificate rotation.</p>
            <h2>How do you handle GDPR data deletion requests?</h2>
            <p>We provide programmatic automated API endpoints for Right-to-be-Forgotten requests, guaranteeing cryptographic erasure across primary relational databases and immutable backup snapshots within 30 calendar days.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://fintech.example.com/faq/security-and-compliance',
      html,
      title: 'Enterprise Security & Compliance FAQ | CloudSecure',
      metaDescription: 'Detailed answers to questions about SOC2 compliance, encryption, and GDPR policies.',
      h1Text: 'Enterprise Security & Compliance FAQ',
      headings: [
        { level: 1, text: 'Enterprise Security & Compliance FAQ' },
        { level: 2, text: 'Is your cloud infrastructure SOC2 Type II certified?' },
        { level: 2, text: 'How is customer data encrypted at rest and in transit?' },
        { level: 2, text: 'How do you handle GDPR data deletion requests?' },
      ],
      schemas: [{ type: 'FAQPage', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.pageType.detectedType, 'FAQ');
    assert.ok(audit.contentDepth.isAdequateForPageType);
    assert.ok(audit.score.overall >= 90);
  });

  // =========================================================================
  // FIXTURE 11: Local business page
  // =========================================================================
  test('Fixture 11: Local business page with operating hours and address', () => {
    const html = `
      <html>
        <head><title>Austin Family Dental Clinic | Dr. Smith DDS</title></head>
        <body>
          <main>
            <h1>Austin Family Dental Clinic</h1>
            <p>Providing compassionate, comprehensive dental care for patients of all ages in downtown Austin, Texas.</p>
            <h2>Clinic Location & Office Hours</h2>
            <p>Address: 123 Congress Avenue, Suite 400, Austin, TX 78701. Phone: (512) 555-0199.</p>
            <p>Office Hours: Monday through Friday from 8:00 AM to 5:00 PM. Saturday appointments available by request.</p>
            <h2>Our Dental Services</h2>
            <p>Preventative cleanings, porcelain crowns, teeth whitening, and emergency dental care. Call today to schedule your visit.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://drsmithdental.example.com/austin-clinic',
      html,
      title: 'Austin Family Dental Clinic | Dr. Smith DDS',
      metaDescription: 'Compassionate family dental care in downtown Austin. Call (512) 555-0199 for appointments.',
      h1Text: 'Austin Family Dental Clinic',
      headings: [
        { level: 1, text: 'Austin Family Dental Clinic' },
        { level: 2, text: 'Clinic Location & Office Hours' },
        { level: 2, text: 'Our Dental Services' },
      ],
      schemas: [{ type: 'LocalBusiness', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.pageType.detectedType, 'LOCAL_BUSINESS');
    assert.equal(audit.searchIntent.primaryIntent, 'LOCAL');
    assert.ok(audit.contentDepth.isAdequateForPageType);
    assert.ok(audit.score.overall >= 88);
  });

  // =========================================================================
  // FIXTURE 12: Local business page with excessive boilerplate
  // =========================================================================
  test('Fixture 12: Local business page with high boilerplate ratio', () => {
    const html = `
      <html>
        <body>
          <header>
            <nav>
              <a href="/a">Link 1</a><a href="/b">Link 2</a><a href="/c">Link 3</a>
              <a href="/d">Link 4</a><a href="/e">Link 5</a><a href="/f">Link 6</a>
            </nav>
          </header>
          <main>
            <h1>Austin Plumbing Services</h1>
            <p>Local plumbing repairs in Austin, Texas. Call (512) 555-0144 for 24/7 service.</p>
          </main>
          <footer>
            <div class="boilerplate-links">
              <a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/disclaimer">Disclaimer</a>
              <a href="/sitemap">Sitemap</a><a href="/about">About Us</a><a href="/contact">Contact</a>
              <p>&copy; 2026 Directory Services Inc. All rights reserved across all jurisdictions.</p>
            </div>
          </footer>
        </body>
      </html>
    `;

    const extraction = extractContentBlocks(html);
    assert.ok(extraction.boilerPlateRatio > 0.4, 'Boilerplate ratio should reflect extensive header/footer links');
    assert.ok(extraction.mainContentText.includes('Austin Plumbing Services'));
  });

  // =========================================================================
  // FIXTURE 13: SaaS landing page
  // =========================================================================
  test('Fixture 13: SaaS landing page with features and pricing CTA', () => {
    const html = `
      <html>
        <head><title>CloudFlow - Continuous Deployment Platform for Engineering Teams</title></head>
        <body>
          <main>
            <h1>Enterprise Continuous Deployment Platform</h1>
            <p>Ship software with speed and confidence. CloudFlow automates testing, progressive canary rollouts, and instant rollbacks for modern cloud applications across AWS, GCP, and Kubernetes clusters. Our cloud-native control plane orchestrates deployment pipelines seamlessly.</p>
            <h2>Automated Canary Rollouts</h2>
            <p>Analyze latency and error rate metrics in real-time to progressively shift production traffic from baseline to canary pods automatically based on statistical anomaly detection algorithms. Fine-tune traffic step percentages and observation windows to minimize risk.</p>
            <h2>Instant Automated Rollbacks</h2>
            <p>Safeguard user experience with one-click rollbacks triggered automatically upon Service Level Objective breach detection during active deployment windows. Health check probes continuously inspect container readiness and error logs.</p>
            <h2>Simple Pricing for Growing Teams</h2>
            <p>Plans start at $49/month per developer seat with unlimited deployment pipelines and 99.99% uptime SLA. Start your 14-day free trial today or speak with our solutions engineering team.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://cloudflow.io/features/continuous-deployment',
      html,
      title: 'CloudFlow - Continuous Deployment Platform for Engineering Teams',
      metaDescription: 'Enterprise continuous deployment platform with automated canaries and rollbacks.',
      h1Text: 'Enterprise Continuous Deployment Platform',
      headings: [
        { level: 1, text: 'Enterprise Continuous Deployment Platform' },
        { level: 2, text: 'Automated Canary Rollouts' },
        { level: 2, text: 'Instant Automated Rollbacks' },
        { level: 2, text: 'Simple Pricing for Growing Teams' },
      ],
      schemas: [],
    });

    assert.ok(audit.contentDepth.isAdequateForPageType);
    assert.equal(audit.headingRelationships.unsupportedHeadingsCount, 0);
    assert.ok(audit.score.overall >= 85);
  });

  // =========================================================================
  // FIXTURE 14: Comparison page
  // =========================================================================
  test('Fixture 14: Comparison page with balanced commercial investigation signals', () => {
    const html = `
      <html>
        <head><title>Next.js vs Remix: Complete 2026 Framework Comparison</title></head>
        <body>
          <main>
            <h1>Next.js vs Remix: Which Framework Should You Choose in 2026?</h1>
            <p>Choosing the right React framework between Next.js and Remix depends on your engineering team's caching needs, rendering architecture, and backend integration requirements. Both frameworks have matured significantly over multiple major releases, offering first-class server-side rendering, nested layout routing, and optimized web performance primitives for modern full-stack web applications. In this comprehensive comparison, we analyze architectural tradeoffs, bundle sizes, developer ergonomics, data fetching models, and long-term ecosystem stability.</p>
            <h2>Rendering Architecture and Data Loading Models</h2>
            <p>Next.js relies heavily on React Server Components, server actions, and nested layouts with granular caching layers. This architectural design enables developers to fetch data directly inside asynchronous server components while keeping sensitive tokens off client bundles. In contrast, Remix emphasizes web standard Request and Response handlers, loader functions, and action mutations that work progressively without heavy client runtime overhead or complex cache invalidation bugs.</p>
            <h2>Performance Benchmarks and Server Overhead</h2>
            <p>Both frameworks deliver outstanding Core Web Vitals when deployed to distributed edge networks with optimized bundle splitting and image optimization pipelines. Remix maintains a smaller client-side bundle size footprint because it relies directly on browser standard form submissions and optimistic UI updates, while Next.js offers deeper out-of-the-box incremental static regeneration for high-traffic editorial pages with millions of static routes.</p>
            <h2>Ecosystem Maturity and Deployment Flexibility</h2>
            <p>Next.js boasts deep integration with Vercel infrastructure alongside full standalone Docker deployment support for self-hosted Kubernetes clusters. Remix, backed by Shopify, provides exceptional flexibility for running on Cloudflare Workers, Node.js servers, Fastly Compute, and AWS Lambda with zero vendor lock-in and minimal platform-specific configuration.</p>
            <h2>Final Verdict and Engineering Recommendation</h2>
            <p>Our recommendation: Choose Next.js for large content-driven platforms, media publications, and e-commerce websites needing incremental static caching. Choose Remix for highly dynamic, form-heavy SaaS web applications, complex dashboards, and teams that prioritize standards-based web primitives and minimal client-side state management overhead.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://techreview.example.com/comparisons/nextjs-vs-remix-2026',
      html,
      title: 'Next.js vs Remix: Complete 2026 Framework Comparison',
      metaDescription: 'Detailed comparison of Next.js vs Remix covering performance, caching, and developer experience.',
      h1Text: 'Next.js vs Remix: Which Framework Should You Choose in 2026?',
      headings: [
        { level: 1, text: 'Next.js vs Remix: Which Framework Should You Choose in 2026?' },
        { level: 2, text: 'Rendering Architecture and Data Loading Models' },
        { level: 2, text: 'Performance Benchmarks and Server Overhead' },
        { level: 2, text: 'Ecosystem Maturity and Deployment Flexibility' },
        { level: 2, text: 'Final Verdict and Engineering Recommendation' },
      ],
      schemas: [{ type: 'Article', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.searchIntent.primaryIntent, 'COMMERCIAL_INVESTIGATION');
    assert.equal(audit.searchIntent.confidence, 'HIGH');
    assert.ok(audit.contentDepth.isAdequateForPageType);
    assert.ok(audit.score.overall >= 85);
  });

  // =========================================================================
  // FIXTURE 15: Commercial investigation page
  // =========================================================================
  test('Fixture 15: Commercial investigation page with buyer review signals', () => {
    const html = `
      <html>
        <head><title>Top 5 Ergonomic Office Chairs Review (2026 Guide)</title></head>
        <body>
          <main>
            <h1>Top 5 Ergonomic Office Chairs: Comprehensive Review</h1>
            <p>We tested over 20 top ergonomic office chairs for lumbar support, adjustability, build durability, and overall value. Finding the right ergonomic seating is crucial for avoiding chronic lower back strain during long work sessions in home offices and corporate workplaces. Our testing methodology evaluates spinal alignment, breathable upholstery materials, and mechanical adjustments across diverse body types and desk configurations.</p>
            <h2>1. Herman Miller Aeron - Best Overall Support</h2>
            <p>The Herman Miller Aeron remains an industry icon for premium ergonomics. Pros: Unmatched Pellicle 8Z mesh breathability, harmonic tilt mechanism with forward tilt engagement, and PostureFit SL sacral support that stabilizes the base of the spine. Cons: Premium price tag and lack of built-in headrest. Pricing starts at $1,295 with a comprehensive 12-year manufacturer warranty covering all mechanical parts and mesh fabric.</p>
            <h2>2. Steelcase Gesture - Best for Adjustability</h2>
            <p>Engineered for multi-device workflows, the Steelcase Gesture adapts naturally to posture changes when switching between laptop typing, phone calls, and tablet drawing. Pros: 360-degree rotating armrests, synchronized seat depth glide, and flexible contoured backrest. Cons: Heavy steel frame makes relocation difficult. Pricing: $1,150 with extensive custom fabric and leather options.</p>
            <h2>3. Secretlab Titan Evo - Best Hybrid Performance</h2>
            <p>Secretlab bridges gaming aesthetics with genuine ergonomic utility and robust build quality. Pros: Magnetic memory foam head pillow, four-way L-ADAPT internal lumbar support system, and durable hybrid leatherette that resists peeling. Cons: Firmer cold-cure seat base than traditional mesh models. Pricing: $549 with a 5-year extended warranty included.</p>
            <h2>Key Buying Factors to Consider</h2>
            <p>Before purchasing, measure your desk height, verify whether you prefer breathable mesh or cushioned foam, and confirm warranty return windows to ensure optimal ergonomic comfort.</p>
            <h2>Our Recommendation & Final Buyer Verdict</h2>
            <p>For most remote professionals working 8+ hours daily, the Herman Miller Aeron remains our top recommendation for long-term spinal health and durability, while the Secretlab Titan Evo offers the best value under $600 for users seeking versatile hybrid seating.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://buyerguide.example.com/best-ergonomic-office-chairs',
      html,
      title: 'Top 5 Ergonomic Office Chairs Review (2026 Guide)',
      metaDescription: 'Expert review and comparison of the top 5 ergonomic office chairs for home offices.',
      h1Text: 'Top 5 Ergonomic Office Chairs: Comprehensive Review',
      headings: [
        { level: 1, text: 'Top 5 Ergonomic Office Chairs: Comprehensive Review' },
        { level: 2, text: '1. Herman Miller Aeron - Best Overall Support' },
        { level: 2, text: '2. Steelcase Gesture - Best for Adjustability' },
        { level: 2, text: '3. Secretlab Titan Evo - Best Hybrid Performance' },
        { level: 2, text: 'Key Buying Factors to Consider' },
        { level: 2, text: 'Our Recommendation & Final Buyer Verdict' },
      ],
      schemas: [{ type: 'Article', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.searchIntent.primaryIntent, 'COMMERCIAL_INVESTIGATION');
    assert.ok(audit.contentDepth.isAdequateForPageType);
    assert.ok(audit.score.overall >= 85);
  });

  // =========================================================================
  // FIXTURE 16: Transactional product page
  // =========================================================================
  test('Fixture 16: Transactional product page with cart and price indicators', () => {
    const html = `
      <html>
        <head><title>Ergonomic Vertical Mouse Pro | ShopTech</title></head>
        <body>
          <main>
            <h1>Ergonomic Vertical Mouse Pro</h1>
            <p>Scientific ergonomic design encourages healthy natural wrist and arm positioning for smoother movement and less overall muscle strain during intensive computer work. The 57-degree vertical handshake angle reduces forearm pronation by up to 10 percent compared to conventional mice.</p>
            <p class="pricing">Price: $79.99 | Status: In Stock | <button>Add to Cart</button> | <button>Buy Now</button></p>
            <h2>Key Hardware Specifications & Compatibility</h2>
            <ul>
              <li>Connectivity: Dual wireless 2.4GHz USB receiver and Bluetooth 5.0 pairing.</li>
              <li>Tracking Sensor: 4000 DPI high-precision optical sensor with dynamic switching.</li>
              <li>Battery Life: Rechargeable 500mAh lithium-ion battery with 60-day runtime.</li>
              <li>OS Compatibility: Full plug-and-play support for Windows, macOS, and Linux.</li>
            </ul>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://shop.example.com/checkout/instant-buy-ergonomic-mouse',
      html,
      title: 'Ergonomic Vertical Mouse Pro | ShopTech',
      metaDescription: 'Buy Ergonomic Vertical Mouse Pro for $79.99 with free express shipping.',
      h1Text: 'Ergonomic Vertical Mouse Pro',
      headings: [
        { level: 1, text: 'Ergonomic Vertical Mouse Pro' },
        { level: 2, text: 'Key Hardware Specifications & Compatibility' },
      ],
      schemas: [{ type: 'Product', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.pageType.detectedType, 'PRODUCT');
    assert.equal(audit.searchIntent.primaryIntent, 'TRANSACTIONAL');
    assert.ok(audit.contentDepth.isAdequateForPageType);
    assert.ok(audit.score.overall >= 90);
  });

  // =========================================================================
  // FIXTURE 17: Ambiguous intent page
  // =========================================================================
  test('Fixture 17: Ambiguous page handled safely without forced classification', () => {
    const html = `
      <html>
        <head><title>System Information Portal</title></head>
        <body>
          <main>
            <h1>System Status Notice</h1>
            <p>Welcome to the portal overview. Reference ID: 74829.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://random-portal.example.com/page-7482',
      html,
      title: 'System Information Portal',
      metaDescription: 'System status and general portal notices.',
      h1Text: 'System Status Notice',
      headings: [{ level: 1, text: 'System Status Notice' }],
      schemas: [],
    });

    // Should classify cautiously
    assert.ok(audit.pageType.confidence === 'LOW' || audit.pageType.confidence === 'UNKNOWN');
    assert.equal(audit.repetition.isRepetitive, false);
    assert.ok(audit.score.overall > 0, 'Scorer must calculate safe numeric score without NaN or crash');
  });

  // =========================================================================
  // FIXTURE 18: Page with many headings but weak body support
  // =========================================================================
  test('Fixture 18: Page with many headings but weak body support', () => {
    const html = `
      <html>
        <head><title>Cloud Architecture Overview</title></head>
        <body>
          <main>
            <h1>Cloud Architecture Overview</h1>
            <h2>Scalability</h2>
            <p>Good scaling.</p>
            <h2>Security</h2>
            <p>Top security.</p>
            <h2>Reliability</h2>
            <h2>Observability</h2>
            <p>Metrics logs.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://empty-outline.example.com/cloud-guide',
      html,
      title: 'Cloud Architecture Overview',
      metaDescription: 'Overview of cloud architecture components.',
      h1Text: 'Cloud Architecture Overview',
      headings: [
        { level: 1, text: 'Cloud Architecture Overview' },
        { level: 2, text: 'Scalability' },
        { level: 2, text: 'Security' },
        { level: 2, text: 'Reliability' },
        { level: 2, text: 'Observability' },
      ],
      schemas: [],
    });

    assert.ok(audit.headingRelationships.unsupportedHeadingsCount >= 2);
    assert.ok(audit.score.deductions.some((d) => d.ruleCode === 'CONTENT_HEADING_WITHOUT_SUPPORT' || d.ruleCode === 'CONTENT_INSUFFICIENT_DEPTH'));
  });

  // =========================================================================
  // FIXTURE 19: Page with few headings but excellent content
  // =========================================================================
  test('Fixture 19: Page with few headings but excellent substantive essay content', () => {
    const essayContent = `
      Distributed computing systems have undergone a profound philosophical transition over the past decade. 
      Rather than treating network partitions as catastrophic edge cases, modern consensus protocols assume constant partial failure 
      and build deterministic reconciliation primitives directly into state machine replication engines.
      
      From Raft to Paxos, the fundamental insight remains consistent: linearizable writes require strict quorum agreement across 
      active replicas, while read operations can leverage lease timers to achieve sub-millisecond local latency without sacrificing serializability.
      
      Furthermore, the emergence of immutable event logs has decoupled storage durability from compute evaluation, enabling elastic autoscaling 
      and zero-downtime cluster topology reconfigurations across multi-region cloud infrastructures.
    `;

    const html = `
      <html>
        <head><title>The Evolution of Distributed Systems Architecture</title></head>
        <body>
          <main>
            <h1>The Evolution of Distributed Systems Architecture</h1>
            <p>${essayContent}</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://essay.example.com/the-future-of-distributed-systems',
      html,
      title: 'The Evolution of Distributed Systems Architecture',
      metaDescription: 'An architectural examination of consensus protocols, Raft, Paxos, and distributed state machines.',
      h1Text: 'The Evolution of Distributed Systems Architecture',
      headings: [{ level: 1, text: 'The Evolution of Distributed Systems Architecture' }],
      schemas: [{ type: 'Article', rawJson: '{}', isValid: true }],
    });

    assert.equal(audit.headingRelationships.unsupportedHeadingsCount, 0);
    assert.equal(audit.repetition.isRepetitive, false);
    assert.ok(audit.score.originalityAndSubstance >= 80);
  });

  // =========================================================================
  // FIXTURE 20: Page with strong topical coverage and concise CLI syntax
  // =========================================================================
  test('Fixture 20: Page with strong topical coverage and concise CLI syntax', () => {
    const html = `
      <html>
        <head><title>Docker CLI Command Reference & Cheat Sheet | DevDocs</title></head>
        <body>
          <main>
            <h1>Docker CLI Command Reference & Cheat Sheet</h1>
            <p>Essential Docker commands for container lifecycle management, multi-container orchestration, image building, network debugging, system maintenance, and volume persistence across cloud development environments. Reference these syntax examples for fast terminal workflows.</p>
            <h2>Container Lifecycle Management</h2>
            <p>Run docker run -d --name app-container -p 8080:80 nginx to launch detached background containers with mapped port bindings. Use docker ps -a to inspect container states, docker stop to gracefully shut down instances, and docker logs -f to stream container console output in real-time.</p>
            <h2>Image Building and Registry Publishing</h2>
            <p>Execute docker build -t my-app:v1.0 . to build container images from local Dockerfile instructions. Use docker image ls to view image layers, and execute docker push registry.example.com/my-app:v1.0 to publish tagged images to your private container registry.</p>
            <h2>Multi-Container Docker Compose Workflows</h2>
            <p>Use docker compose up -d to orchestrate multi-tier services defined in compose.yaml configuration files. Run docker compose ps to monitor healthy service replicas, and execute docker compose down -v to tear down containers alongside attached local volumes.</p>
            <h2>System Maintenance and Resource Cleanup</h2>
            <p>Reclaim local disk storage by executing docker system prune -af to remove unused container images, stopped containers, dangling build caches, and orphaned network interfaces across your development workstation.</p>
            <h2>Volume and Network Debugging</h2>
            <p>Create persistent storage with docker volume create data_vol, and mount volumes with -v data_vol:/app/data. Inspect bridge container networks using docker network inspect bridge, and connect running containers with docker network connect.</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://docs.example.com/docker/command-cheatsheet',
      html,
      title: 'Docker CLI Command Reference & Cheat Sheet | DevDocs',
      metaDescription: 'Quick reference guide for common Docker CLI commands and container management.',
      h1Text: 'Docker CLI Command Reference & Cheat Sheet',
      headings: [
        { level: 1, text: 'Docker CLI Command Reference & Cheat Sheet' },
        { level: 2, text: 'Container Lifecycle Management' },
        { level: 2, text: 'Image Building and Registry Publishing' },
        { level: 2, text: 'Multi-Container Docker Compose Workflows' },
        { level: 2, text: 'System Maintenance and Resource Cleanup' },
        { level: 2, text: 'Volume and Network Debugging' },
      ],
      schemas: [{ type: 'TechArticle', rawJson: '{}', isValid: true }],
    });

    assert.ok(audit.primaryTopics.some((t) => t.topic.includes('docker')));
    assert.equal(audit.headingRelationships.unsupportedHeadingsCount, 0);
    assert.ok(audit.contentDepth.isAdequateForPageType);
    assert.ok(audit.score.overall >= 85);
  });

  // =========================================================================
  // SECTION 4 & 5: FALSE POSITIVE AND FALSE NEGATIVE AUDIT SUITE
  // =========================================================================
  test('False Positive Guard: Legitimate contact page with 40 words is not penalized', () => {
    const html = `
      <html>
        <body>
          <main>
            <h1>Contact Acme Corp Support</h1>
            <p>For customer inquiries, technical assistance, or billing questions, please reach out to our dedicated support team using any of the direct communication channels below. We respond within 24 business hours.</p>
            <p>Email: support@example.com</p>
            <p>Phone: +1-800-555-0199</p>
            <p>Office Address: 100 Main Street, Suite 500, San Francisco, CA 94105</p>
          </main>
        </body>
      </html>
    `;

    const audit = auditContentAndSemantics({
      url: 'https://example.com/contact',
      html,
      title: 'Contact Acme Corp Support',
      metaDescription: 'Get in touch with Acme Corp support team via email or phone.',
      h1Text: 'Contact Acme Corp Support',
      headings: [{ level: 1, text: 'Contact Acme Corp Support' }],
      schemas: [],
    });

    assert.equal(audit.pageType.detectedType, 'CONTACT');
    assert.ok(audit.contentDepth.isAdequateForPageType, '40 words is adequate for a contact page (benchmark: 25+ words)');
    assert.ok(!audit.score.deductions.some((d) => d.ruleCode === 'CONTENT_INSUFFICIENT_DEPTH'));
  });

  test('False Positive Guard: Stopwords and UI terms are strictly excluded from topic extraction', () => {
    const topicIntel = extractTopicIntelligence({
      title: 'Read More Articles - January 2026 Blog Archive',
      metaDescription: 'Click here to read more posts published by author today.',
      h1Text: 'Welcome to our Blog Home Menu',
      headings: [{ level: 2, text: 'Search and Submit Details' }],
      blocks: [
        {
          id: 'b1',
          type: 'paragraph',
          tag: 'p',
          text: 'Read more articles and click here to subscribe to newsletter cookies settings.',
          wordCount: 12,
          isMainContent: true,
          locationIndex: 1,
        },
      ],
      mainContentText: 'Read more articles and click here to subscribe to newsletter cookies settings.',
    });

    const allExtractedTopics = [...topicIntel.primaryTopics, ...topicIntel.secondaryTopics].map((t) => t.topic.toLowerCase());
    assert.ok(!allExtractedTopics.includes('read more'), 'Should not extract "read more"');
    assert.ok(!allExtractedTopics.includes('click here'), 'Should not extract "click here"');
    assert.ok(!allExtractedTopics.includes('january'), 'Should not extract "january"');
    assert.ok(!allExtractedTopics.includes('cookies'), 'Should not extract "cookies"');
  });

  test('Content Gap Safety: Never hallucinates requirements without explicit on-page evidence', () => {
    const gaps = detectContentGaps({
      pageType: 'ARTICLE',
      headingRelationships: {
        totalHeadings: 2,
        supportedHeadingsCount: 2,
        unsupportedHeadingsCount: 0,
        headingsWithoutContent: [],
        headingTopicDriftCount: 0,
        headings: [
          { headingText: 'Introduction to Rust', level: 2, supportingWordCount: 50, hasDirectContent: true, subHeadingCount: 0, keyConceptsCovered: ['rust'], isSupported: true },
          { headingText: 'Memory Safety Guarantees', level: 2, supportingWordCount: 60, hasDirectContent: true, subHeadingCount: 0, keyConceptsCovered: ['memory'], isSupported: true },
        ],
        summary: 'All headings supported.',
      },
      primaryTopics: [],
      blocks: [
        { id: 'b1', type: 'paragraph', tag: 'p', text: 'Rust provides memory safety guarantees without garbage collection through its innovative ownership and borrowing model.', wordCount: 22, isMainContent: true, locationIndex: 1 },
      ],
      mainContentText: 'Rust provides memory safety guarantees without garbage collection...',
    });

    // Zero gaps should be invented when article is well structured and no target keywords missing
    assert.equal(gaps.length, 0, 'Must NOT hallucinate arbitrary topic requirements');
  });

  test('Semantic Scorer Deduplication: Thin content deducts once without compounding duplicate penalties', () => {
    const score = calculateSemanticContentScore({
      pageType: 'ARTICLE',
      contentDepth: {
        status: 'VERY_THIN',
        mainWordCount: 15,
        paragraphCount: 1,
        sectionCount: 1,
        averageWordsPerSection: 15,
        isAdequateForPageType: false,
        explanation: 'Article is very thin (15 words; benchmark: ~300+ words).',
      },
      headingRelationships: {
        totalHeadings: 1,
        supportedHeadingsCount: 0,
        unsupportedHeadingsCount: 1,
        headingsWithoutContent: ['Empty Section'],
        headingTopicDriftCount: 0,
        headings: [],
        summary: '1 unsupported heading.',
      },
      repetition: {
        isRepetitive: false,
        repetitivePhrases: [],
        repetitiveSentencesCount: 0,
        vocabularyDiversityScore: 90,
        summary: 'No repetition.',
      },
      pageTypeRules: {
        pageType: 'ARTICLE',
        rulesEvaluated: [],
        passedCount: 0,
        failedCount: 2,
        summary: 'Failed 2 quality rules.',
      },
      primaryTopics: [],
      searchIntent: {
        primaryIntent: 'INFORMATIONAL',
        confidence: 'HIGH',
        signals: [],
        explanation: 'Informational query.',
      },
    });

    // Verify deduplication: ONLY CONTENT_INSUFFICIENT_DEPTH deducted (not stacked with heading and rule deductions)
    assert.equal(score.deductions.length, 1);
    assert.equal(score.deductions[0].ruleCode, 'CONTENT_INSUFFICIENT_DEPTH');
    assert.equal(score.overall, 80); // 100 - 20 = 80
  });

});
