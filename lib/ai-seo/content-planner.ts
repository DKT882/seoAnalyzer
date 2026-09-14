import {
  AdultContentProfile,
  AdultSEOContext,
  AIContentGenerationRequest,
  AISearchIntent,
  ContentBlueprint,
  ContentBlueprintSection,
  ContentIntelligencePlan,
  ContentProfile,
  EvidenceAvailability,
} from './content-types';
import { SEOEvidence } from './types';

export class ContentIntelligencePlanner {
  /**
   * Evaluates available evidence signals from Phases 1–8 without assuming external data.
   */
  public static checkEvidenceAvailability(
    req: AIContentGenerationRequest,
    evidence?: Partial<SEOEvidence>
  ): EvidenceAvailability {
    const hasKeyword = !!(
      req.primaryKeyword ||
      evidence?.keywords?.targetKeyword ||
      (evidence?.keywords?.userSpecifiedKeywords && evidence.keywords.userSpecifiedKeywords.length > 0)
    );
    const hasSerp = !!(
      evidence?.serp ||
      (evidence as any)?.serpData ||
      (evidence?.competitors?.contentGapsVsTopRanked && evidence.competitors.contentGapsVsTopRanked.length > 0)
    );
    const hasCrawl = !!(
      evidence?.technical ||
      evidence?.url ||
      (req.internalLinks && req.internalLinks.length > 0)
    );
    const hasCompetitor = !!(
      evidence?.competitors &&
      ((evidence.competitors.contentGapsVsTopRanked && evidence.competitors.contentGapsVsTopRanked.length > 0) ||
        (evidence.competitors.topCompetitorUrls && evidence.competitors.topCompetitorUrls.length > 0))
    );

    return {
      keywordEvidence: hasKeyword,
      serpEvidence: hasSerp,
      crawlEvidence: hasCrawl,
      competitorEvidence: hasCompetitor,
    };
  }

  /**
   * Deterministically classifies search intent with confidence and rationale.
   */
  public static classifySearchIntent(
    mainTopic: string,
    primaryKeyword: string,
    contentType: string,
    explicitIntent?: AISearchIntent | string
  ): { type: AISearchIntent; confidence: number; explanation: string } {
    if (
      explicitIntent &&
      ['informational', 'commercial', 'transactional', 'navigational', 'mixed'].includes(
        explicitIntent.toLowerCase()
      )
    ) {
      return {
        type: explicitIntent.toLowerCase() as AISearchIntent,
        confidence: 0.95,
        explanation: `User explicitly specified search intent as '${explicitIntent}'.`,
      };
    }

    const query = `${mainTopic} ${primaryKeyword}`.toLowerCase();

    // Transactional indicators
    if (
      contentType === 'product-description' ||
      /\b(buy|order|purchase|price|pricing|cost|shop|coupon|discount|deal|cheap|for sale)\b/.test(query)
    ) {
      return {
        type: 'transactional',
        confidence: 0.92,
        explanation:
          'Search terms and page format indicate purchase readiness, evaluating specifications, pricing, and buying criteria.',
      };
    }

    // Commercial investigation indicators
    if (
      /\b(best|top|review|reviews|vs|versus|compare|comparison|recommended|alternative|alternatives|guide to choosing)\b/.test(
        query
      ) ||
      contentType === 'category-description'
    ) {
      return {
        type: 'commercial',
        confidence: 0.9,
        explanation:
          'User is comparing options, looking for evaluation criteria, top recommendations, and trade-offs before deciding.',
      };
    }

    // Navigational indicators
    if (/\b(login|sign in|portal|official website|account|support desk|contact us)\b/.test(query)) {
      return {
        type: 'navigational',
        confidence: 0.88,
        explanation:
          'Search query seeks a specific brand destination, portal, or direct navigational resource.',
      };
    }

    // Default Informational
    return {
      type: 'informational',
      confidence: 0.92,
      explanation:
        'User is seeking educational knowledge, step-by-step guidance, fundamental explanations, or answers to questions.',
    };
  }

  /**
   * Constructs the AdultSEOContext for legitimate adult-industry websites, products, and wellness guides.
   */
  public static constructAdultContext(
    req: AIContentGenerationRequest,
    _evidence?: Partial<SEOEvidence>
  ): AdultSEOContext {
    let subprofile: AdultContentProfile = req.adultProfile || 'adult-products';
    const combinedText = `${req.mainTopic || ''} ${req.primaryKeyword || ''} ${req.contentType || ''}`.toLowerCase();

    if (!req.adultProfile) {
      if (/\b(wellness|sexual health|couples guide|wellness guide|intimacy|kegel|pelvic|relationship)\b/i.test(combinedText)) {
        subprofile = 'sexual-wellness';
      } else if (/\b(call girl|call girls|escort|escorts|companionship|incall|outcall|vip companion|companion service)\b/i.test(combinedText)) {
        subprofile = 'escort-services';
      } else if (/\b(story|stories|erotica|sensual romance|novel|chapter|fiction|erotic story)\b/i.test(combinedText)) {
        subprofile = 'adult-stories';
      } else if (/\b(creator|profile|performer|model|biography|onlyfans|fansly)\b/i.test(combinedText)) {
        subprofile = 'adult-creator';
      } else if (/\b(video|clip|scene|movie|stream|trailer|playback)\b/i.test(combinedText)) {
        subprofile = 'adult-video';
      } else if (/\b(community|forum|board|group|club|discussion)\b/i.test(combinedText)) {
        subprofile = 'adult-community';
      } else if (/\b(entertainment|portal|hub|directory|agency)\b/i.test(combinedText)) {
        subprofile = 'adult-entertainment';
      } else {
        subprofile = 'adult-products';
      }
    }

    if (subprofile === 'escort-services') {
      return {
        isAdultSite: true,
        profile: 'escort-services',
        ageRestricted: true,
        contentClassification: 'adult-service',
        audience: req.targetAudience || 'Adults 18+ seeking verified companionship, social accompaniment, or VIP escort services',
        safeSearchConsiderations: [
          'Escort and adult companionship services are subject to strict adult search filtering and local regulatory compliance.',
          'Focus on professional companionship terminology, booking etiquette, discretion, and legitimate directory standards.',
          'Ensure prominent age-verification disclaimers (Strictly 18+ only).',
        ],
        trustRequirements: [
          'Strict age-verification (18+) and mutual consent compliance for all providers and clients.',
          'Clear client screening procedures, security protocols, and strict discretion guarantees.',
          'Transparent booking etiquette, duration guidelines, and cancellation policies.',
          'Zero tolerance for human trafficking or non-consensual exploitation.',
        ],
        restrictedClaims: [
          'STRICT ANTI-FABRICATION: Never invent real individual provider names, telephone numbers, private residential addresses, or personal contact info without verified site evidence.',
          'Do not generate non-consensual, illegal, or exploitative service descriptions.',
        ],
        schemaRecommendations: ['LocalBusiness', 'Service', 'FAQPage', 'BreadcrumbList'],
        schemaRestrictions: ['Do not invent unverified personal identities or individual phone numbers in schema markup.'],
      };
    }

    if (subprofile === 'adult-stories') {
      return {
        isAdultSite: true,
        profile: 'adult-stories',
        ageRestricted: true,
        contentClassification: 'adult-literature',
        audience: req.targetAudience || 'Adult readers 18+ of romantic fiction, sensual literature, and narrative erotica',
        safeSearchConsiderations: [
          'Adult fiction and erotica literature are classified under mature creative content.',
          'Maintain artistic, narrative-rich prose and descriptive storytelling rather than spammy keywords.',
          'Clear 18+ mature content warnings on story archives.',
        ],
        trustRequirements: [
          'Exclusively consenting adult characters (18+ only) within all narrative arcs.',
          'Engaging narrative pacing, character development, and atmospheric world-building.',
          'Clear content warnings, tropes, and genre tags for reader transparency.',
        ],
        restrictedClaims: [
          'STRICT ZERO-TOLERANCE: Absolutely no underage, non-consensual, incestuous, or coercive storylines under any circumstances.',
          'Do not claim real-world autobiographical events unless explicitly provided as creative nonfiction.',
        ],
        schemaRecommendations: ['CreativeWork', 'ShortStory', 'Article', 'BreadcrumbList'],
        schemaRestrictions: [],
      };
    }

    if (subprofile === 'sexual-wellness') {
      return {
        isAdultSite: true,
        profile: 'sexual-wellness',
        ageRestricted: false,
        contentClassification: 'sexual-wellness',
        audience: req.targetAudience || 'Adults, couples, and individuals seeking evidence-based sexual health and wellness education',
        safeSearchConsiderations: [
          'Educational wellness guides are generally indexable under standard search settings when maintaining a medical and educational tone.',
          'Avoid gratuitous or sensationalized explicit descriptions that trigger aggressive SafeSearch filtering.',
          'Focus on physiological principles, ergonomics, hygiene, and communication.',
        ],
        trustRequirements: [
          'Evidence-backed sexual health and wellness guidance.',
          'Body-safe hygiene, cleaning, and anatomical safety instructions.',
          'Non-judgmental, inclusive, and professional tone.',
          'Clear disclaimers recommending professional healthcare consultation where applicable.',
        ],
        restrictedClaims: [
          'Do not fabricate medical diagnoses or clinical cure guarantees.',
          'Do not invent anatomical changes or unsupported physiological claims.',
          'Do not add unnecessary graphic or sensationalized explicit descriptions.',
        ],
        schemaRecommendations: ['Article', 'FAQPage', 'MedicalWebPage', 'BreadcrumbList'],
        schemaRestrictions: ['Do not claim licensed medical author credentials unless provided in evidence.'],
      };
    }

    if (subprofile === 'adult-creator') {
      return {
        isAdultSite: true,
        profile: 'adult-creator',
        ageRestricted: true,
        contentClassification: 'adult',
        audience: req.targetAudience || 'Subscribers and consenting adult fans',
        safeSearchConsiderations: [
          'Creator profiles are subject to adult search classifications and SafeSearch filtering.',
          'Maintain professional personal branding and verified platform links.',
        ],
        trustRequirements: [
          'Verified creator identity and consent compliance.',
          'Transparent subscription tiers, deliverable schedules, and platform links.',
          'Clear boundary and communication guidelines for community interactions.',
        ],
        restrictedClaims: [
          'STRICT ANTI-FABRICATION: Never invent age, location, measurements, personal history, relationship status, or sexual preferences unless explicitly provided in site evidence.',
          'Do not fabricate reviews, subscriber counts, or testimonials.',
        ],
        schemaRecommendations: ['ProfilePage', 'Person', 'BreadcrumbList'],
        schemaRestrictions: ['Do not invent schema properties for unverified personal data.'],
      };
    }

    if (subprofile === 'adult-video') {
      return {
        isAdultSite: true,
        profile: 'adult-video',
        ageRestricted: true,
        contentClassification: 'adult-video',
        audience: req.targetAudience || 'Adults 18+ seeking categorized video content',
        safeSearchConsiderations: [
          'Video content is strictly classified under adult SafeSearch filters.',
          'Descriptive titles and tags assist internal search and categorized discovery.',
        ],
        trustRequirements: [
          'Accurate descriptive title and category tagging without clickbait.',
          'Valid video duration, resolution, and thumbnail representation.',
          'Performer age-verification compliance (2257/regulatory standards).',
        ],
        restrictedClaims: [
          'Do not generate deceptive or misleading video titles.',
          'Do not invent fake duration, resolution, or embed URLs.',
        ],
        schemaRecommendations: ['VideoObject', 'BreadcrumbList'],
        schemaRestrictions: ['Do not attach invalid thumbnail URLs or unverified duration timestamps.'],
      };
    }

    if (subprofile === 'adult-community' || subprofile === 'adult-entertainment') {
      return {
        isAdultSite: true,
        profile: subprofile,
        ageRestricted: true,
        contentClassification: 'adult',
        audience: req.targetAudience || 'Adult community members and consenting enthusiasts',
        safeSearchConsiderations: [
          'Community forums and entertainment portals are subject to adult classification.',
          'Clear age gating and content moderation policies help maintain indexation integrity.',
        ],
        trustRequirements: [
          'Clear community rules, code of conduct, and moderation procedures.',
          'Age verification and privacy protection policies.',
          'Transparent reporting mechanisms for unconsented or abusive behavior.',
        ],
        restrictedClaims: ['Do not invent fake user activity statistics or fabricated discussions.'],
        schemaRecommendations: ['DiscussionForumPosting', 'WebPage', 'BreadcrumbList'],
        schemaRestrictions: [],
      };
    }

    // Default: adult-products
    return {
      isAdultSite: true,
      profile: 'adult-products',
      ageRestricted: true,
      contentClassification: 'adult-product',
      audience: req.targetAudience || 'Adults & Consenting Individuals seeking reliable product information',
      safeSearchConsiderations: [
        'Adult product pages may receive restricted visibility on SafeSearch-filtered queries.',
        'Prioritize neutral anatomical/product terminology over sensationalized language to maximize organic indexability.',
        'Ensure clear age-verification compliance on destination URLs.',
      ],
      trustRequirements: [
        'Accurate product materials and body-safe certifications (medical-grade silicone, body-safe ABS/glass, phthalate-free).',
        'Clear dimensions, waterproof ratings, power/charging specifications, and noise levels.',
        'Hygienic cleaning, sanitization, and material compatibility (water-based vs silicone lubricants).',
        'Discreet billing and packaging information.',
        'Transparent return, warranty, and customer support terms.',
      ],
      restrictedClaims: [
        'Do not claim medical or anatomical enhancement without clinical evidence.',
        'Do not invent fabricated customer reviews, ratings, or test results.',
        'Do not invent non-existent specifications or compatibility guarantees.',
      ],
      schemaRecommendations: [
        'Product',
        'hasAdultConsideration (https://schema.org/SexualContentConsideration)',
        'FAQPage',
        'BreadcrumbList',
      ],
      schemaRestrictions: [
        'Only include AggregateRating or Offer prices if real data is provided in evidence.',
        'Avoid non-compliant schema tags.',
      ],
    };
  }

  /**
   * Allocates section-level word budget matching the requested target words and content type.
   */
  public static buildSectionWordBudget(
    contentType: string,
    totalTargetWords: number,
    intent: AISearchIntent,
    topic: string,
    keyword: string,
    contentProfile?: ContentProfile,
    adultProfile?: AdultContentProfile
  ): ContentBlueprintSection[] {
    const target = Math.max(50, totalTargetWords);

    // =========================================================================
    // ADULT SUBPROFILE SPECIALIZED BLUEPRINTS
    // =========================================================================
    if (contentProfile === 'adult') {
      if (adultProfile === 'adult-products' || (!adultProfile && contentType === 'product-description')) {
        const pIntro = Math.round(target * 0.15);
        const pMaterials = Math.round(target * 0.25);
        const pFeatures = Math.round(target * 0.25);
        const pCare = Math.round(target * 0.2);
        const pFaq = Math.round(target * 0.1);
        const pCta = Math.max(30, target - (pIntro + pMaterials + pFeatures + pCare + pFaq));

        return [
          {
            heading: `Overview & Ergonomic Design of ${topic}`,
            purpose: 'Introduce the product, ergonomic contours, target use-case, and build quality standards.',
            targetWords: pIntro,
            requiredTopics: ['design overview', 'ergonomic form', 'target use cases'],
            requiredQuestions: [`What makes ${topic} unique in its category?`],
            requiredEntities: [topic, keyword, 'ergonomic design'],
            evidence: ['Product overview', 'Design specifications'],
          },
          {
            heading: 'Body-Safe Materials, Certifications & Build Quality',
            purpose: 'Detail medical-grade materials, hypoallergenic standards, waterproof ratings, and phthalate-free construction.',
            targetWords: pMaterials,
            requiredTopics: ['medical-grade silicone', 'body-safe materials', 'waterproof rating', 'phthalate-free'],
            requiredQuestions: ['Is this product made from body-safe, certified materials?'],
            requiredEntities: ['body-safe materials', 'medical-grade silicone', 'waterproof'],
            evidence: ['Material certifications', 'Manufacturer specifications'],
          },
          {
            heading: `Performance Highlights & Key Features for ${keyword}`,
            purpose: 'Explain power output, motor modes, whisper-quiet decibel levels, battery life, and USB magnetic charging.',
            targetWords: pFeatures,
            requiredTopics: ['intensity settings', 'whisper-quiet motor', 'magnetic USB charging', 'battery runtime'],
            requiredQuestions: ['How long does the battery last and how quiet is the motor?'],
            requiredEntities: ['battery life', 'whisper-quiet', 'magnetic charging'],
            evidence: ['Feature specifications'],
          },
          {
            heading: 'Cleaning, Sanitization & Material Compatibility Guide',
            purpose: 'Provide step-by-step cleaning instructions, antibacterial soap advice, and lubricant compatibility (water-based only).',
            targetWords: pCare,
            requiredTopics: ['cleaning and sanitization', 'lubricant compatibility', 'water-based lubricant', 'proper storage'],
            requiredQuestions: ['How do I safely clean and store this product?'],
            requiredEntities: ['sanitization', 'water-based lubricant', 'hygienic storage'],
            evidence: ['Care & maintenance guidelines'],
          },
          {
            heading: 'Frequently Asked Questions',
            purpose: 'Address discreet shipping, packaging privacy, warranty coverage, and common first-time user inquiries.',
            targetWords: pFaq,
            requiredTopics: ['discreet packaging', 'warranty coverage', 'travel lock'],
            requiredQuestions: ['Is packaging completely discreet and unmarked?'],
            requiredEntities: ['discreet packaging', 'warranty'],
            evidence: ['Customer FAQs'],
          },
          {
            heading: 'Summary & Buying Advice',
            purpose: 'Deliver concise buying verdict and recommended accessories (e.g. water-based lubricant).',
            targetWords: pCta,
            requiredTopics: ['buying advice', 'recommended accessories'],
            requiredQuestions: ['Is this product suitable for my requirements?'],
            requiredEntities: [topic],
            evidence: ['Buyer decision framework'],
          },
        ];
      }

      if (adultProfile === 'sexual-wellness') {
        const numSections = target >= 1000 ? 7 : 6;
        const wIntro = Math.round(target * 0.12);
        const wFund = Math.round(target * 0.22);
        const wPhys = Math.round(target * 0.22);
        const wPract = Math.round(target * 0.2);
        const wCare = Math.round(target * 0.12);
        const wFaq = Math.round(target * 0.08);
        const wConc = Math.max(40, target - (wIntro + wFund + wPhys + wPract + wCare + wFaq));

        return [
          {
            heading: `Understanding ${topic}: Educational Foundations`,
            purpose: 'Establish healthy, non-judgmental educational context for sexual wellness and intimacy.',
            targetWords: wIntro,
            requiredTopics: ['wellness context', 'body positivity', 'educational foundation'],
            requiredQuestions: [`What are the core fundamentals of ${keyword}?`],
            requiredEntities: [topic, keyword, 'sexual wellness'],
            evidence: ['Educational wellness principles'],
          },
          {
            heading: 'Physiological, Anatomical & Psychological Principles',
            purpose: 'Explain physiological mechanisms, partner communication, consent, and stress reduction factors.',
            targetWords: wFund,
            requiredTopics: ['physiology', 'communication', 'consent', 'stress reduction'],
            requiredQuestions: ['How does intimacy impact overall well-being and stress?'],
            requiredEntities: ['physiology', 'communication', 'mind-body connection'],
            evidence: ['Physiological evidence'],
          },
          {
            heading: 'Practical Guidelines, Techniques & Best Practices',
            purpose: 'Provide actionable, step-by-step best practices for individuals and couples.',
            targetWords: wPhys,
            requiredTopics: ['practical guidance', 'partner communication', 'best practices', 'comfort'],
            requiredQuestions: ['What are effective methods to enhance intimacy and comfort?'],
            requiredEntities: ['best practices', 'partner connection'],
            evidence: ['Practical wellness guidelines'],
          },
          {
            heading: 'Body-Safe Product Selection, Materials & Hygiene',
            purpose: 'Explain how to evaluate body-safe materials, avoid harmful additives (parabens, phthalates), and maintain hygiene.',
            targetWords: wPract,
            requiredTopics: ['body-safe selection', 'additive avoidance', 'hygiene standards', 'lubricant types'],
            requiredQuestions: ['What ingredients and materials should be avoided for sensitive skin?'],
            requiredEntities: ['body safety', 'hygiene standards', 'lubricant selection'],
            evidence: ['Material safety guidance'],
          },
          {
            heading: 'Common Misconceptions, Myths & Healthy Expectations',
            purpose: 'Debunk societal myths, media misconceptions, and performance anxiety traps.',
            targetWords: wCare,
            requiredTopics: ['myth debunking', 'performance expectations', 'healthy mindset'],
            requiredQuestions: ['What common myths hinder healthy intimacy?'],
            requiredEntities: ['misconceptions', 'healthy mindset'],
            evidence: ['Clinical wellness insights'],
          },
          {
            heading: 'Frequently Asked Questions',
            purpose: 'Answer top reader wellness questions with empathy and authoritative clarity.',
            targetWords: wFaq,
            requiredTopics: ['wellness questions', 'comfort advice', 'doctor consultation'],
            requiredQuestions: ['When should someone consult a healthcare professional?'],
            requiredEntities: ['healthcare advice', 'clarifications'],
            evidence: ['Wellness FAQs'],
          },
          {
            heading: 'Conclusion & Key Takeaways for Long-Term Wellness',
            purpose: 'Synthesize core insights into actionable, positive next steps.',
            targetWords: wConc,
            requiredTopics: ['wellness synthesis', 'empowerment', 'key takeaways'],
            requiredQuestions: ['What is the primary takeaway for lasting wellness?'],
            requiredEntities: [topic],
            evidence: ['Summary conclusions'],
          },
        ];
      }

      if (adultProfile === 'adult-creator') {
        const cIntro = Math.round(target * 0.2);
        const cThemes = Math.round(target * 0.3);
        const cTiers = Math.round(target * 0.25);
        const cRules = Math.round(target * 0.15);
        const cFaq = Math.max(30, target - (cIntro + cThemes + cTiers + cRules));

        return [
          {
            heading: `About & Official Profile Overview for ${topic}`,
            purpose: 'Introduce the verified creator branding, official platform presence, and content themes.',
            targetWords: cIntro,
            requiredTopics: ['creator branding', 'official platforms', 'content focus'],
            requiredQuestions: [`What content themes does ${topic} create?`],
            requiredEntities: [topic, keyword, 'official profile'],
            evidence: ['Verified platform profile'],
          },
          {
            heading: 'Content Themes, Schedules & Creative Highlights',
            purpose: 'Outline regular posting schedules, themed photo/video sets, and direct subscriber perks.',
            targetWords: cThemes,
            requiredTopics: ['posting schedule', 'content categories', 'creative highlights'],
            requiredQuestions: ['What can subscribers expect on a weekly basis?'],
            requiredEntities: ['content schedule', 'member perks'],
            evidence: ['Platform publication schedule'],
          },
          {
            heading: 'Subscription Tiers & Verified Member Benefits',
            purpose: 'Detail official subscription pricing, VIP tier benefits, and messaging availability based on verified facts.',
            targetWords: cTiers,
            requiredTopics: ['subscription tiers', 'member benefits', 'messaging access'],
            requiredQuestions: ['What are the official subscription options?'],
            requiredEntities: ['subscription tiers', 'benefits'],
            evidence: ['Verified tier structure'],
          },
          {
            heading: 'Community Guidelines, Respect & Interaction Standards',
            purpose: 'Set clear boundaries, privacy expectations, and mutual respect guidelines for subscribers.',
            targetWords: cRules,
            requiredTopics: ['community rules', 'respectful interaction', 'privacy standards'],
            requiredQuestions: ['What are the rules for direct messaging and comments?'],
            requiredEntities: ['community standards', 'boundaries'],
            evidence: ['Community code of conduct'],
          },
          {
            heading: 'Frequently Asked Questions & Official Links',
            purpose: 'Answer questions about payment methods, device compatibility, and official link hubs.',
            targetWords: cFaq,
            requiredTopics: ['billing', 'official links', 'accessibility'],
            requiredQuestions: ['Where can fans access the verified official channels?'],
            requiredEntities: ['official channels', 'FAQs'],
            evidence: ['Creator FAQs'],
          },
        ];
      }

      if (adultProfile === 'escort-services') {
        const eIntro = Math.round(target * 0.20);
        const eSafety = Math.round(target * 0.22);
        const eServices = Math.round(target * 0.24);
        const eBooking = Math.round(target * 0.18);
        const eFaq = Math.max(30, target - (eIntro + eSafety + eServices + eBooking));

        return [
          {
            heading: `Premium Companionship & Service Overview for ${topic}`,
            purpose: 'Introduce the companion agency/directory scope, VIP standards, and professional accompaniment services.',
            targetWords: eIntro,
            requiredTopics: ['service overview', 'professional companionship', 'VIP standards', 'directory scope'],
            requiredQuestions: [`What companionship services are offered for ${topic}?`],
            requiredEntities: [topic, keyword, 'professional companionship'],
            evidence: ['Service directory overview'],
          },
          {
            heading: 'Discretion, Privacy & Safety Protocols',
            purpose: 'Detail client privacy guarantees, secure verification, encrypted communication, and safety standards.',
            targetWords: eSafety,
            requiredTopics: ['strict discretion', 'privacy guarantees', 'client screening', 'safety standards'],
            requiredQuestions: ['How are client privacy and safety maintained?'],
            requiredEntities: ['discretion', 'privacy protocols', 'screening'],
            evidence: ['Safety and privacy policy'],
          },
          {
            heading: 'Accompaniment Occasions & Etiquette Guidelines',
            purpose: 'Describe social accompaniment for business dinners, private travel, formal galas, and respectful client etiquette.',
            targetWords: eServices,
            requiredTopics: ['social accompaniment', 'travel companion', 'dinner dates', 'client etiquette'],
            requiredQuestions: ['What occasions are suitable for companionship booking?'],
            requiredEntities: ['social accompaniment', 'etiquette'],
            evidence: ['Service categories'],
          },
          {
            heading: 'Screening, Reservation Process & Booking Policies',
            purpose: 'Outline the step-by-step reservation process, advance booking requirements, deposit policies, and incall/outcall terms.',
            targetWords: eBooking,
            requiredTopics: ['booking process', 'screening requirements', 'advance reservations', 'incall and outcall terms'],
            requiredQuestions: ['What is the procedure for booking an accompaniment session?'],
            requiredEntities: ['reservation process', 'booking policy'],
            evidence: ['Reservation guidelines'],
          },
          {
            heading: 'Frequently Asked Questions & 18+ Client Disclaimers',
            purpose: 'Answer common client questions regarding rates, cancellation policies, age compliance (18+ only), and discreet billing.',
            targetWords: eFaq,
            requiredTopics: ['rate transparency', 'age verification', 'cancellation terms', 'discreet billing'],
            requiredQuestions: ['What should first-time clients know before reserving?'],
            requiredEntities: ['FAQs', 'disclaimers', '18+ compliance'],
            evidence: ['Client FAQs'],
          },
        ];
      }

      if (adultProfile === 'adult-stories') {
        const sIntro = Math.round(target * 0.18);
        const sDynamics = Math.round(target * 0.22);
        const sArc = Math.round(target * 0.28);
        const sClimax = Math.round(target * 0.20);
        const sEpilogue = Math.max(30, target - (sIntro + sDynamics + sArc + sClimax));

        return [
          {
            heading: `Chapter Premise & Atmospheric Setting: ${topic}`,
            purpose: 'Establish the narrative scene, sensory environment, mood, and initial character presence.',
            targetWords: sIntro,
            requiredTopics: ['setting the scene', 'sensory atmosphere', 'introductory mood'],
            requiredQuestions: [`How does the story of ${topic} begin?`],
            requiredEntities: [topic, keyword, 'narrative atmosphere'],
            evidence: ['Story premise', 'Sensual literature framework'],
          },
          {
            heading: 'Character Dynamics, Chemistry & Rising Tension',
            purpose: 'Develop character personalities, mutual attraction, witty or intimate dialogue, and romantic chemistry.',
            targetWords: sDynamics,
            requiredTopics: ['character chemistry', 'dialogue', 'mutual attraction', 'tension'],
            requiredQuestions: ['What drives the connection between the characters?'],
            requiredEntities: ['character dynamics', 'chemistry'],
            evidence: ['Character profiles', 'Romantic tension arc'],
          },
          {
            heading: 'Core Narrative Arc & Intimate Passion',
            purpose: 'Depict the central romantic encounter with evocative, consenting, and passionate storytelling.',
            targetWords: sArc,
            requiredTopics: ['consensual intimacy', 'passionate narrative', 'sensory details', 'emotional connection'],
            requiredQuestions: ['How does the intimate encounter unfold?'],
            requiredEntities: ['sensory narrative', 'consensual romance'],
            evidence: ['Narrative progression'],
          },
          {
            heading: 'Climax & Emotional Resonance',
            purpose: 'Deliver the crescendo of the narrative, blending physical intimacy with deep emotional resonance.',
            targetWords: sClimax,
            requiredTopics: ['narrative crescendo', 'emotional resonance', 'shared vulnerability'],
            requiredQuestions: ['How does the emotional bond culminate?'],
            requiredEntities: ['emotional crescendo', 'climax'],
            evidence: ['Story resolution'],
          },
          {
            heading: 'Epilogue & Thematic Story Insights',
            purpose: 'Conclude with reflective aftermath, character reflections, and literary romance themes.',
            targetWords: sEpilogue,
            requiredTopics: ['aftermath reflection', 'romance themes', 'literary takeaway'],
            requiredQuestions: ['What makes this story meaningful for adult romance readers?'],
            requiredEntities: [topic],
            evidence: ['Story epilogue'],
          },
        ];
      }
    }

    // 1. Product Description Archetype (typically 200 - 600 words)
    if (contentType === 'product-description') {
      const pIntro = Math.round(target * 0.2);
      const pSpecs = Math.round(target * 0.28);
      const pBenefits = Math.round(target * 0.27);
      const pFaq = Math.round(target * 0.15);
      const pCta = Math.max(30, target - (pIntro + pSpecs + pBenefits + pFaq));

      return [
        {
          heading: `Overview & Value Proposition of ${topic}`,
          purpose: 'Introduce the product, its primary function, and target user persona.',
          targetWords: pIntro,
          requiredTopics: ['core purpose', 'target audience', 'headline benefit'],
          requiredQuestions: [`What makes ${topic} stand out?`],
          requiredEntities: [topic, keyword],
          evidence: ['Product attributes', 'Authoritative feature list'],
        },
        {
          heading: 'Technical Specifications & Build Architecture',
          purpose: 'Detail hardware/material specifications, dimensions, durability, and compatibility.',
          targetWords: pSpecs,
          requiredTopics: ['specifications', 'materials', 'compatibility', 'connectivity'],
          requiredQuestions: ['What are the technical specs?', 'Is it compatible with my setup?'],
          requiredEntities: ['specifications', 'connectivity', 'durability'],
          evidence: ['Verified specification data'],
        },
        {
          heading: 'Performance Highlights & Everyday Benefits',
          purpose: 'Explain real-world advantages, ergonomics, and practical performance.',
          targetWords: pBenefits,
          requiredTopics: ['performance', 'ergonomics', 'efficiency', 'comfort'],
          requiredQuestions: ['How does it perform under sustained use?'],
          requiredEntities: ['performance', 'ergonomics'],
          evidence: ['Use-case scenarios'],
        },
        {
          heading: 'Frequently Asked Questions',
          purpose: 'Address common user pre-purchase hesitations and maintenance questions.',
          targetWords: pFaq,
          requiredTopics: ['warranty', 'maintenance', 'common queries'],
          requiredQuestions: [`How do I configure and maintain ${topic}?`],
          requiredEntities: ['maintenance', 'setup'],
          evidence: ['Common buyer inquiries'],
        },
        {
          heading: 'Summary & Buying Advice',
          purpose: 'Provide concise decision advice and clear next steps.',
          targetWords: pCta,
          requiredTopics: ['verdict', 'who should buy'],
          requiredQuestions: ['Is this the right choice for me?'],
          requiredEntities: [topic],
          evidence: ['Selection criteria'],
        },
      ];
    }

    // 2. Category Description Archetype (typically 200 - 500 words)
    if (contentType === 'category-description') {
      const cIntro = Math.round(target * 0.3);
      const cFeatures = Math.round(target * 0.35);
      const cGuidance = Math.round(target * 0.25);
      const cFaq = Math.max(30, target - (cIntro + cFeatures + cGuidance));

      return [
        {
          heading: `Explore Our Collection of ${topic}`,
          purpose: 'Orient buyers to the category range, quality standards, and key sub-types.',
          targetWords: cIntro,
          requiredTopics: ['category scope', 'sub-types', 'quality standards'],
          requiredQuestions: [`What types of ${topic} are available?`],
          requiredEntities: [topic, keyword],
          evidence: ['Category taxonomy'],
        },
        {
          heading: `Key Attributes Across Our ${topic} Selection`,
          purpose: 'Highlight shared features, materials, and technological advancements in this collection.',
          targetWords: cFeatures,
          requiredTopics: ['key features', 'materials', 'innovation'],
          requiredQuestions: ['What features should I look for?'],
          requiredEntities: ['attributes', 'quality'],
          evidence: ['Catalog standards'],
        },
        {
          heading: 'How to Choose the Right Option for Your Needs',
          purpose: 'Provide decision criteria, use-case mapping, and sizing/compatibility advice.',
          targetWords: cGuidance,
          requiredTopics: ['selection guidance', 'use cases', 'budget considerations'],
          requiredQuestions: ['Which model fits my requirements?'],
          requiredEntities: ['decision factors'],
          evidence: ['Buyer guidance'],
        },
        {
          heading: 'Category FAQ',
          purpose: 'Answer frequent questions regarding shipping, returns, and category-wide support.',
          targetWords: cFaq,
          requiredTopics: ['support', 'orders', 'compatibility'],
          requiredQuestions: [`What should I know before purchasing ${topic}?`],
          requiredEntities: ['customer service'],
          evidence: ['Support FAQs'],
        },
      ];
    }

    // 3. Commercial Comparison / Buyer's Guide (800 - 2000+ words)
    if (intent === 'commercial') {
      const numSections = target >= 1200 ? 7 : target >= 800 ? 6 : 5;
      const introWords = Math.round(target * 0.1);
      const criteriaWords = Math.round(target * 0.18);
      const coreBreakdownWords = Math.round(target * 0.28);
      const practicalWords = Math.round(target * 0.18);
      const mistakesWords = Math.round(target * 0.12);
      const faqWords = Math.round(target * 0.08);
      const concWords = Math.max(40, target - (introWords + criteriaWords + coreBreakdownWords + practicalWords + mistakesWords + faqWords));

      return [
        {
          heading: `Comprehensive Guide to Choosing the Best ${topic}`,
          purpose: 'Deliver quick verdict, problem context, and key recommendation criteria.',
          targetWords: introWords,
          requiredTopics: ['market overview', 'quick recommendations', 'target users'],
          requiredQuestions: [`What are the top considerations for ${keyword}?`],
          requiredEntities: [topic, keyword],
          evidence: ['Market landscape'],
        },
        {
          heading: 'Key Evaluation Criteria: What Truly Matters',
          purpose: 'Examine primary performance indicators, build quality, precision, and ergonomics.',
          targetWords: criteriaWords,
          requiredTopics: ['evaluation criteria', 'performance metrics', 'ergonomics', 'durability'],
          requiredQuestions: ['What features distinguish top-tier options from budget alternatives?'],
          requiredEntities: ['benchmarks', 'specifications', 'ergonomics'],
          evidence: ['Engineering standards'],
        },
        {
          heading: `In-Depth Comparison & Feature Breakdown for ${keyword}`,
          purpose: 'Compare top configurations, sensor technologies, battery life, and connectivity.',
          targetWords: coreBreakdownWords,
          requiredTopics: ['feature comparison', 'sensor precision', 'connectivity', 'weight balance'],
          requiredQuestions: ['How do leading configurations compare in everyday performance?'],
          requiredEntities: ['connectivity', 'precision', 'sensor'],
          evidence: ['Feature comparisons'],
        },
        {
          heading: 'Practical Buying Advice & Use-Case Matching',
          purpose: 'Guide users according to specific needs, grip styles, game genres, or workflows.',
          targetWords: practicalWords,
          requiredTopics: ['use-case matching', 'grip styles', 'work vs gaming', 'customization'],
          requiredQuestions: ['Which choice best suits my specific use case?'],
          requiredEntities: ['use cases', 'customization'],
          evidence: ['User personas'],
        },
        {
          heading: 'Common Mistakes & Traps to Avoid',
          purpose: 'Highlight misleading marketing claims, latency myths, and poor value traps.',
          targetWords: mistakesWords,
          requiredTopics: ['misleading claims', 'dpi myths', 'weight preferences', 'battery traps'],
          requiredQuestions: ['What common pitfalls should buyers steer clear of?'],
          requiredEntities: ['pitfalls', 'myths'],
          evidence: ['Expert insights'],
        },
        {
          heading: 'Frequently Asked Questions',
          purpose: 'Address top questions with concise, clear, and actionable answers.',
          targetWords: faqWords,
          requiredTopics: ['charging', 'polling rate', 'maintenance'],
          requiredQuestions: [
            `Is wireless as fast as wired for ${topic}?`,
            `How long does the battery typically last?`,
          ],
          requiredEntities: ['polling rate', 'latency'],
          evidence: ['Technical FAQs'],
        },
        {
          heading: 'Final Verdict & Summary',
          purpose: 'Provide a structured summary, top takeaway, and clear action path.',
          targetWords: concWords,
          requiredTopics: ['summary verdict', 'next steps'],
          requiredQuestions: ['What is the final recommendation?'],
          requiredEntities: [topic],
          evidence: ['Summary conclusions'],
        },
      ];
    }

    // 4. Informational Article / Deep Guide Archetype (Default for informational, 600 - 2500+ words)
    const introW = Math.round(target * 0.1);
    const fundamentalsW = Math.round(target * 0.22);
    const practicalW = Math.round(target * 0.26);
    const deepDiveW = Math.round(target * 0.2);
    const faqW = Math.round(target * 0.12);
    const concW = Math.max(40, target - (introW + fundamentalsW + practicalW + deepDiveW + faqW));

    return [
      {
        heading: `Introduction: Understanding ${topic}`,
        purpose: 'Establish context, definition, search intent answer, and why this topic matters today.',
        targetWords: introW,
        requiredTopics: ['definition', 'core importance', 'search intent context'],
        requiredQuestions: [`What is ${topic} and why is ${keyword} important?`],
        requiredEntities: [topic, keyword],
        evidence: ['Introductory concepts'],
      },
      {
        heading: 'Core Fundamentals & Key Principles',
        purpose: 'Explain the underlying mechanisms, terminology, and foundational concepts thoroughly.',
        targetWords: fundamentalsW,
        requiredTopics: ['fundamentals', 'mechanisms', 'core principles'],
        requiredQuestions: ['How does it operate under standard conditions?'],
        requiredEntities: ['mechanisms', 'architecture'],
        evidence: ['Foundational evidence'],
      },
      {
        heading: 'Step-by-Step Implementation & Best Practices',
        purpose: 'Provide actionable, practical guidance with concrete examples and workflows.',
        targetWords: practicalW,
        requiredTopics: ['implementation steps', 'best practices', 'practical examples'],
        requiredQuestions: ['What are the recommended steps for implementation?'],
        requiredEntities: ['workflow', 'best practices'],
        evidence: ['Actionable workflows'],
      },
      {
        heading: 'Advanced Strategies, Nuances & Troubleshooting',
        purpose: 'Explore edge cases, trade-offs, common pitfalls, and advanced optimizations.',
        targetWords: deepDiveW,
        requiredTopics: ['advanced techniques', 'common pitfalls', 'troubleshooting'],
        requiredQuestions: ['What edge cases and challenges should be anticipated?'],
        requiredEntities: ['troubleshooting', 'optimization'],
        evidence: ['Advanced insights'],
      },
      {
        heading: 'Frequently Asked Questions',
        purpose: 'Answer top query questions directly with authoritative clarity.',
        targetWords: faqW,
        requiredTopics: ['frequent questions', 'clarifications'],
        requiredQuestions: [
          `What are the most critical factors for ${topic}?`,
          `How quickly can results be realized?`,
        ],
        requiredEntities: ['clarifications'],
        evidence: ['Common user questions'],
      },
      {
        heading: 'Conclusion & Key Takeaways',
        purpose: 'Synthesize the primary insights into a clear, actionable summary.',
        targetWords: concW,
        requiredTopics: ['summary', 'actionable takeaways'],
        requiredQuestions: ['What are the key next steps?'],
        requiredEntities: [topic],
        evidence: ['Final takeaways'],
      },
    ];
  }

  /**
   * Constructs the full ContentIntelligencePlan from request, evidence, and deterministic rules.
   */
  public static constructPlan(
    req: AIContentGenerationRequest,
    evidence?: Partial<SEOEvidence>
  ): ContentIntelligencePlan {
    const topic = req.mainTopic?.trim() || 'General Topic';
    const keyword = req.primaryKeyword?.trim() || topic;
    const contentType = req.contentType || 'blog-article';
    const targetWords = req.wordLimit && req.wordLimit > 0 ? req.wordLimit : 800;

    const evidenceAvailability = this.checkEvidenceAvailability(req, evidence);
    const intentResult = this.classifySearchIntent(topic, keyword, contentType, req.searchIntent);

    // Secondary keywords & related terms
    const secondaryKeywords: string[] = Array.isArray(req.secondaryKeywords)
      ? req.secondaryKeywords
      : typeof req.secondaryKeywords === 'string'
      ? req.secondaryKeywords.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const relatedTerms: string[] = Array.isArray(req.relatedTopics)
      ? req.relatedTopics
      : typeof req.relatedTopics === 'string'
      ? req.relatedTopics.split(',').map((s) => s.trim()).filter(Boolean)
      : [
          `${topic} guide`,
          `${keyword} best practices`,
          'technical specifications',
          'performance optimization',
        ];

    const entities = [
      topic,
      keyword,
      'Search Intent',
      'User Experience',
      'Core Architecture',
      'Implementation Standards',
    ];

    const questions = [
      `What makes ${topic} essential for ${keyword}?`,
      `How do you properly evaluate and select the best ${topic}?`,
      `What are the common mistakes when working with ${keyword}?`,
      `How can performance and reliability be maximized?`,
    ];

    // Topic clusters
    const topicClusters: ContentIntelligencePlan['topicClusters'] = [
      {
        topic: `Foundations of ${topic}`,
        importance: 'critical',
        evidence: ['Core intent alignment', 'Verified industry definitions'],
      },
      {
        topic: `Practical Implementation & ${keyword}`,
        importance: 'critical',
        evidence: ['Actionable procedural guidance', 'Step-by-step workflow'],
      },
      {
        topic: 'Performance Optimization & Trade-Offs',
        importance: 'important',
        evidence: ['Specification comparisons', 'Technical benchmarks'],
      },
      {
        topic: 'Common Mistakes & Troubleshooting',
        importance: 'supporting',
        evidence: ['User friction points', 'Troubleshooting patterns'],
      },
    ];

    // SERP patterns & gaps
    const serpPatterns = {
      recurringTopics: [
        'Clear structural hierarchy (H2 -> H3)',
        'Direct answer to search query in opening section',
        'Practical evaluation criteria or actionable steps',
        'Structured FAQ addressing buyer/user hesitations',
      ],
      recurringQuestions: questions.slice(0, 3),
      commonFormats: ['In-depth guide with structured comparison tables', 'Step-by-step breakdowns'],
      evidenceBacked: evidenceAvailability.serpEvidence,
    };

    const contentGaps = [
      'Unbiased comparison of trade-offs rather than generic promotional claims',
      'Specific practical advice on setup, configuration, and maintenance',
      'Clear, actionable guidance for different user experience levels',
    ];

    const differentiationOpportunities = [
      'Provide concrete, evidence-backed explanations instead of repetitive high-level fluff',
      'Include structured bullet points and decision frameworks for fast scanning',
      'Incorporate clear schema recommendations and complete metadata packages',
    ];

    const isAdult = req.contentProfile === 'adult' || req.isAdultSite === true;
    const adultContext = isAdult ? this.constructAdultContext(req, evidence) : undefined;

    // Section word budget
    const requiredSections = this.buildSectionWordBudget(
      contentType,
      targetWords,
      intentResult.type,
      topic,
      keyword,
      isAdult ? 'adult' : req.contentProfile || 'general',
      adultContext?.profile
    );

    // Internal link opportunities
    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const internalLinkOpportunities =
      req.internalLinks && req.internalLinks.length > 0
        ? req.internalLinks.map((l) => ({
            url: l.targetPage,
            anchorSuggestion: l.suggestedAnchor || keyword,
            reason: 'Connects related topic clusters to enhance site crawlability and topical authority.',
          }))
        : [
            {
              url: `/${slug}`,
              anchorSuggestion: topic,
              reason: 'Primary topic silo hub page connecting related guides.',
            },
            {
              url: `/${slug}/guides`,
              anchorSuggestion: `${topic} Guides`,
              reason: 'Supporting educational cluster page.',
            },
          ];

    // Schema recommendations
    const schemaRecommendation = adultContext
      ? adultContext.schemaRecommendations
      : contentType === 'product-description'
      ? ['Product', 'BreadcrumbList', 'Offer']
      : contentType === 'faq'
      ? ['FAQPage', 'BreadcrumbList']
      : ['Article', 'BreadcrumbList'];

    // Metadata plan
    const metadataPlan = {
      title: `${topic}: The Definitive Guide to ${keyword}`,
      metaDescription: `Discover expert insights on ${topic} and ${keyword}. Learn key features, best practices, and actionable recommendations.`,
      slug,
      h1: `${topic}: Expert Insights & Strategic Guide`,
    };

    return {
      primaryTopic: topic,
      primaryKeyword: keyword,
      contentProfile: isAdult ? 'adult' : req.contentProfile || 'general',
      adultContext,
      safeSearchConsiderations: adultContext?.safeSearchConsiderations,
      searchIntent: intentResult,
      audience: req.targetAudience || adultContext?.audience || 'Industry practitioners, buyers, and enthusiastic learners',
      userGoal: isAdult
        ? `Provide reliable, professional, and compliant guidance regarding ${keyword}, satisfying user search intent with verified facts and body-safe standards.`
        : `Thoroughly understand ${topic}, resolve search intent regarding ${keyword}, and make informed decisions with practical guidance.`,
      secondaryKeywords,
      relatedTerms,
      entities,
      questions,
      topicClusters,
      serpPatterns,
      contentGaps,
      differentiationOpportunities,
      requiredSections,
      internalLinkOpportunities,
      schemaRecommendation,
      metadataPlan,
    };
  }

  /**
   * Produces the intermediate ContentBlueprint object.
   */
  public static constructBlueprint(
    req: AIContentGenerationRequest,
    evidence?: Partial<SEOEvidence>
  ): ContentBlueprint {
    const plan = this.constructPlan(req, evidence);
    const targetWords = req.wordLimit && req.wordLimit > 0 ? req.wordLimit : 800;

    return {
      intent: plan.searchIntent.type,
      userGoal: plan.userGoal,
      primaryTopic: req.mainTopic || 'General Topic',
      sections: plan.requiredSections,
      totalTargetWords: targetWords,
      contentProfile: plan.contentProfile,
      adultContext: plan.adultContext,
    };
  }
}
