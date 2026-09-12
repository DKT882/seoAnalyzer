import {
  ContentContributionAnalysis,
  ContentSectionContribution,
  ContentSignalHeatmapItem,
  OnPageData,
  LinksAnalysis,
  ImagesAnalysis,
  SchemaItem,
  KeywordItem,
  EntityItem,
} from '@/types';
import { CONTENT_SECTION_WEIGHTS } from '@/lib/constants';

export interface ContentContributionInput {
  onPage: OnPageData;
  links: LinksAnalysis;
  images: ImagesAnalysis;
  schemas: SchemaItem[];
  keywords: KeywordItem[];
  entities: EntityItem[];
  pageUrl: string;
  targetKeywords?: string[];
}

export function calculateContentContribution(
  input: ContentContributionInput
): ContentContributionAnalysis {
  const { onPage, links, images, schemas, keywords, entities, targetKeywords } = input;

  const hasTargetKeywords = Array.isArray(targetKeywords) && targetKeywords.length > 0;
  const cleanTargetKeywords = hasTargetKeywords
    ? targetKeywords.map((k) => k.toLowerCase().trim()).filter(Boolean)
    : [];

  const primaryKeywords = keywords
    .filter((k) => k.category === 'primary')
    .map((k) => k.keyword.toLowerCase().trim());
  const secondaryKeywords = keywords
    .filter((k) => k.category === 'secondary')
    .map((k) => k.keyword.toLowerCase().trim());
  const entityNames = entities.map((e) => e.name.toLowerCase().trim());

  const activeFocusTerms = hasTargetKeywords && cleanTargetKeywords.length > 0 ? cleanTargetKeywords : primaryKeywords;
  const primaryTopic = activeFocusTerms[0] || onPage.title || 'General Subject';

  const checkKeywordsInText = (text: string, kwList: string[]): string[] => {
    const textLower = text.toLowerCase();
    return kwList.filter((kw) => textLower.includes(kw));
  };

  const sections: ContentSectionContribution[] = [];
  const heatmap: ContentSignalHeatmapItem[] = [];

  // 1. TITLE
  const titleText = onPage.title || '';
  const titleMatches = checkKeywordsInText(titleText, activeFocusTerms);
  const titleSecMatches = checkKeywordsInText(titleText, secondaryKeywords);
  let titleScore = 0;
  const titleFindings: string[] = [];
  const titleRecs: string[] = [];

  if (titleText) {
    titleScore += 40;
    if (titleMatches.length > 0) {
      titleScore += 40;
      titleFindings.push(
        hasTargetKeywords
          ? `Contains target keyword(s): "${titleMatches.join(', ')}"`
          : `Reflects primary page topic: "${titleMatches.join(', ')}"`
      );
    } else {
      titleRecs.push(
        hasTargetKeywords
          ? `Consider naturally incorporating the target topic "${cleanTargetKeywords[0]}" into the <title> tag.`
          : `Consider naturally reflecting the page's primary topic ("${primaryTopic}") in the <title> tag.`
      );
    }
    if (titleText.length >= 35 && titleText.length <= 65) {
      titleScore += 20;
      titleFindings.push(`Optimal title length (${titleText.length} characters).`);
    }
  } else {
    titleRecs.push('Missing <title> tag. Add a descriptive title immediately.');
  }

  sections.push({
    sectionId: 'title',
    sectionName: 'Page Title (<title>)',
    weight: CONTENT_SECTION_WEIGHTS.TITLE,
    signalScore: Math.min(100, titleScore),
    keywordCoverageRatio:
      activeFocusTerms.length > 0 ? Math.round((titleMatches.length / activeFocusTerms.length) * 100) : 50,
    primaryKeywordCount: titleMatches.length,
    secondaryKeywordCount: titleSecMatches.length,
    prominenceRank: 1,
    contentDepthWordCount: titleText.split(/\s+/).filter(Boolean).length,
    findings:
      titleFindings.length > 0
        ? titleFindings
        : [
            hasTargetKeywords
              ? 'Title does not currently contain supplied target keywords.'
              : 'Title does not prominently reflect primary extracted topics.',
          ],
    recommendations: titleRecs,
  });

  // 2. H1 HEADING
  const h1Items = onPage.headings.items.filter((h) => h.level === 1);
  const h1Text = h1Items.map((h) => h.text).join(' ');
  const h1Matches = checkKeywordsInText(h1Text, activeFocusTerms);
  const h1SecMatches = checkKeywordsInText(h1Text, secondaryKeywords);
  let h1Score = 0;
  const h1Findings: string[] = [];
  const h1Recs: string[] = [];

  if (h1Items.length === 1) {
    h1Score += 40;
    h1Findings.push('Single, clear <h1> tag present.');

    if (h1Matches.length > 0) {
      h1Score += 50;
      h1Findings.push(
        hasTargetKeywords
          ? `Targets supplied keyword: "${h1Matches.join(', ')}"`
          : `Communicates primary page topic: "${h1Matches.join(', ')}"`
      );
    } else {
      h1Findings.push(
        hasTargetKeywords
          ? `H1 does not clearly align with the supplied target keyword ("${cleanTargetKeywords[0]}").`
          : `H1 has weak alignment with the primary topic identified from the page content ("${primaryTopic}").`
      );
      h1Recs.push(
        hasTargetKeywords
          ? `Consider naturally incorporating the primary target topic into the <h1> headline while keeping it readable.`
          : `Rewrite the <h1> headline so it clearly describes the page's primary topic ("${primaryTopic}").`
      );
    }
    h1Score += 10;
  } else if (h1Items.length > 1) {
    h1Score += 25;
    h1Findings.push(`Multiple <h1> headings detected (${h1Items.length} found).`);
    h1Recs.push('Keep one clear primary H1 for the page and restructure the other headings as H2/H3 where they represent subsections.');
  } else {
    h1Findings.push('No <h1> heading detected.');
    h1Recs.push(
      hasTargetKeywords
        ? `Add an <h1> heading defining the primary subject and naturally featuring "${cleanTargetKeywords[0]}".`
        : `Add an <h1> heading defining the primary subject of the page.`
    );
  }

  sections.push({
    sectionId: 'h1',
    sectionName: 'Primary Heading (<h1>)',
    weight: CONTENT_SECTION_WEIGHTS.H1,
    signalScore: Math.min(100, h1Score),
    keywordCoverageRatio:
      activeFocusTerms.length > 0 ? Math.round((h1Matches.length / activeFocusTerms.length) * 100) : 50,
    primaryKeywordCount: h1Matches.length,
    secondaryKeywordCount: h1SecMatches.length,
    prominenceRank: 2,
    contentDepthWordCount: h1Text.split(/\s+/).filter(Boolean).length,
    findings: h1Findings,
    recommendations: h1Recs,
  });

  // 3. INTRODUCTION
  let introScore = onPage.wordCount >= 200 ? 75 : onPage.wordCount >= 100 ? 50 : 25;
  const introFindings: string[] = [`Initial content introduces topic (${Math.min(onPage.wordCount, 150)} words sampled).`];
  const introRecs: string[] = [];
  if (onPage.wordCount < 250) {
    introRecs.push('Expand introduction to provide clear answers within the first 100 words.');
  }

  sections.push({
    sectionId: 'introduction',
    sectionName: 'Introduction & Lead Paragraphs',
    weight: CONTENT_SECTION_WEIGHTS.INTRODUCTION,
    signalScore: Math.min(100, introScore),
    keywordCoverageRatio: 70,
    primaryKeywordCount: Math.min(2, activeFocusTerms.length),
    secondaryKeywordCount: Math.min(3, secondaryKeywords.length),
    prominenceRank: 3,
    contentDepthWordCount: Math.min(200, onPage.wordCount),
    findings: introFindings,
    recommendations: introRecs,
  });

  // 4. H2/H3 SUBHEADINGS
  const subHeadings = onPage.headings.items.filter((h) => h.level === 2 || h.level === 3);
  const subText = subHeadings.map((h) => h.text).join(' ');
  const subMatches = checkKeywordsInText(subText, activeFocusTerms);
  const subSecMatches = checkKeywordsInText(subText, secondaryKeywords);
  let subScore = 0;
  const subFindings: string[] = [];
  const subRecs: string[] = [];

  if (subHeadings.length >= 3) {
    subScore += 50;
    subFindings.push(`${subHeadings.length} subheadings (H2/H3) structure the article.`);
    if (subSecMatches.length >= 2 || subMatches.length >= 1) {
      subScore += 40;
      subFindings.push(
        hasTargetKeywords
          ? `Subheadings reinforce topical coverage: "${subSecMatches.slice(0, 3).join(', ')}"`
          : `Subheadings cover secondary topics: "${subSecMatches.slice(0, 3).join(', ')}"`
      );
    } else {
      subRecs.push('Add secondary and supporting subtopics to H2/H3 subheadings to improve section hierarchy.');
    }
    subScore += 10;
  } else {
    subScore = 30;
    subRecs.push('Add more H2/H3 subheadings to break content into modular topical sections.');
  }

  sections.push({
    sectionId: 'h2h3',
    sectionName: 'Subheadings (<h2> & <h3>)',
    weight: CONTENT_SECTION_WEIGHTS.H2_H3,
    signalScore: Math.min(100, subScore),
    keywordCoverageRatio:
      secondaryKeywords.length > 0 ? Math.round((subSecMatches.length / secondaryKeywords.length) * 100) : 40,
    primaryKeywordCount: subMatches.length,
    secondaryKeywordCount: subSecMatches.length,
    prominenceRank: 4,
    contentDepthWordCount: subText.split(/\s+/).filter(Boolean).length,
    findings: subFindings.length > 0 ? subFindings : ['Limited subheading depth detected.'],
    recommendations: subRecs,
  });

  // 5. BODY PARAGRAPHS
  let bodyScore = 0;
  const bodyFindings: string[] = [];
  const bodyRecs: string[] = [];
  if (onPage.wordCount >= 1000) {
    bodyScore = 95;
    bodyFindings.push(`Comprehensive content depth (${onPage.wordCount} words across ${onPage.paragraphsCount} paragraphs).`);
  } else if (onPage.wordCount >= 600) {
    bodyScore = 80;
    bodyFindings.push(`Solid content depth (${onPage.wordCount} words).`);
  } else if (onPage.wordCount >= 300) {
    bodyScore = 60;
    bodyFindings.push(`Moderate word count (${onPage.wordCount} words).`);
    bodyRecs.push('Expand content depth with supporting examples, case studies, or FAQs.');
  } else {
    bodyScore = 30;
    bodyFindings.push(`Thin content detected (${onPage.wordCount} words).`);
    bodyRecs.push('Substantially expand body content to satisfy user search intent.');
  }

  sections.push({
    sectionId: 'body',
    sectionName: 'Body Content & Depth',
    weight: CONTENT_SECTION_WEIGHTS.BODY_PARAGRAPHS,
    signalScore: bodyScore,
    keywordCoverageRatio: 85,
    primaryKeywordCount: activeFocusTerms.length,
    secondaryKeywordCount: secondaryKeywords.length,
    prominenceRank: 5,
    contentDepthWordCount: onPage.wordCount,
    findings: bodyFindings,
    recommendations: bodyRecs,
  });

  // 6. STRUCTURED DATA / SCHEMA
  let schemaScore = 0;
  const schemaFindings: string[] = [];
  const schemaRecs: string[] = [];
  if (schemas.length > 0) {
    schemaScore = 90;
    const types = schemas.map((s) => s.type).join(', ');
    schemaFindings.push(`Detected schema types: ${types}`);
  } else {
    schemaScore = 20;
    schemaRecs.push('Add Schema.org structured data (Article, Organization, BreadcrumbList, FAQPage).');
  }

  sections.push({
    sectionId: 'schema',
    sectionName: 'Structured Data & Schema',
    weight: CONTENT_SECTION_WEIGHTS.SCHEMA,
    signalScore: schemaScore,
    keywordCoverageRatio: schemas.length > 0 ? 80 : 0,
    primaryKeywordCount: schemas.length > 0 ? 1 : 0,
    secondaryKeywordCount: 0,
    prominenceRank: 6,
    contentDepthWordCount: schemas.length * 20,
    findings: schemaFindings.length > 0 ? schemaFindings : ['No structured data found.'],
    recommendations: schemaRecs,
  });

  // 7. LISTS & SCANNABILITY
  let listScore = onPage.listsCount >= 3 ? 90 : onPage.listsCount > 0 ? 70 : 35;
  const listFindings =
    onPage.listsCount > 0 ? [`${onPage.listsCount} list(s) detected aiding readability.`] : ['No lists detected.'];
  const listRecs = onPage.listsCount === 0 ? ['Add bulleted or numbered lists for key takeaways.'] : [];

  sections.push({
    sectionId: 'lists',
    sectionName: 'Lists & Scannable Elements',
    weight: CONTENT_SECTION_WEIGHTS.LISTS,
    signalScore: listScore,
    keywordCoverageRatio: onPage.listsCount > 0 ? 60 : 0,
    primaryKeywordCount: onPage.listsCount > 0 ? 1 : 0,
    secondaryKeywordCount: onPage.listsCount > 0 ? 2 : 0,
    prominenceRank: 7,
    contentDepthWordCount: onPage.listsCount * 15,
    findings: listFindings,
    recommendations: listRecs,
  });

  // 8. INTERNAL LINKING
  let linkScore = links.internalLinksCount >= 5 ? 90 : links.internalLinksCount > 0 ? 65 : 25;
  const linkFindings =
    links.internalLinksCount > 0
      ? [`${links.internalLinksCount} internal links connect related content.`]
      : ['No internal links detected.'];
  const linkRecs = links.internalLinksCount < 3 ? ['Add contextual internal links to related guides or category pages.'] : [];

  sections.push({
    sectionId: 'links',
    sectionName: 'Internal Links & Anchor Equity',
    weight: CONTENT_SECTION_WEIGHTS.INTERNAL_LINKS,
    signalScore: linkScore,
    keywordCoverageRatio: links.internalLinksCount > 0 ? 70 : 10,
    primaryKeywordCount: Math.min(2, activeFocusTerms.length),
    secondaryKeywordCount: Math.min(3, secondaryKeywords.length),
    prominenceRank: 8,
    contentDepthWordCount: links.internalLinksCount * 5,
    findings: linkFindings,
    recommendations: linkRecs,
  });

  // 9. IMAGE ALT TEXT
  let altScore = images.altCoverageRatio >= 90 ? 95 : images.altCoverageRatio >= 60 ? 70 : 30;
  const altFindings = [
    `${images.withAlt} of ${images.totalImages} images have ALT text (${Math.round(images.altCoverageRatio)}% coverage).`,
  ];
  const altRecs = images.missingAlt > 0 ? [`Add descriptive ALT text to ${images.missingAlt} image(s).`] : [];

  sections.push({
    sectionId: 'images_alt',
    sectionName: 'Image ALT Context',
    weight: CONTENT_SECTION_WEIGHTS.IMAGE_ALT,
    signalScore: altScore,
    keywordCoverageRatio: images.altCoverageRatio,
    primaryKeywordCount: images.withAlt > 0 ? 1 : 0,
    secondaryKeywordCount: images.withAlt > 1 ? 1 : 0,
    prominenceRank: 9,
    contentDepthWordCount: images.withAlt * 8,
    findings: altFindings,
    recommendations: altRecs,
  });

  // 10. TABLES
  let tableScore = onPage.tablesCount > 0 ? 85 : 40;
  sections.push({
    sectionId: 'tables',
    sectionName: 'Tables & Tabular Data',
    weight: CONTENT_SECTION_WEIGHTS.TABLES,
    signalScore: tableScore,
    keywordCoverageRatio: onPage.tablesCount > 0 ? 60 : 20,
    primaryKeywordCount: 0,
    secondaryKeywordCount: onPage.tablesCount > 0 ? 1 : 0,
    prominenceRank: 10,
    contentDepthWordCount: onPage.tablesCount * 30,
    findings: onPage.tablesCount > 0 ? [`${onPage.tablesCount} data table(s) found.`] : ['No tabular data.'],
    recommendations: onPage.tablesCount === 0 ? ['Include comparison or structured tables where appropriate.'] : [],
  });

  // Build Heatmap Items
  sections.forEach((sec) => {
    let intensity: ContentSignalHeatmapItem['intensity'] = 'critical';
    if (sec.signalScore >= 80) intensity = 'exceptional';
    else if (sec.signalScore >= 60) intensity = 'strong';
    else if (sec.signalScore >= 40) intensity = 'moderate';

    heatmap.push({
      sectionId: sec.sectionId,
      sectionName: sec.sectionName,
      signalScore: sec.signalScore,
      intensity,
      primaryKeywordsFound: activeFocusTerms.slice(0, 2),
      entitiesFound: entityNames.slice(0, 3),
      recommendation: sec.recommendations[0] || 'Optimized section signal.',
    });
  });

  // Calculate Weighted Overall Contribution Score (0-100)
  const overallContributionScore = Math.round(
    sections.reduce((acc, sec) => acc + sec.signalScore * sec.weight, 0)
  );

  // Identify Strongest and Weakest sections
  const sortedSections = [...sections].sort((a, b) => b.signalScore - a.signalScore);
  const strongestSection = sortedSections[0]?.sectionName || 'Body Content';
  const weakestSection = sortedSections[sortedSections.length - 1]?.sectionName || 'Structured Data';

  // Calculate Topic Coverage Score across sections (0-100)
  const topicCoverageScore = Math.round(
    sections.reduce((acc, sec) => acc + (sec.keywordCoverageRatio || 0) * sec.weight, 0)
  );

  const summary = `Estimated SEO Content Contribution is ${overallContributionScore}/100. Strongest signal area is ${strongestSection}, while ${weakestSection} presents the primary optimization opportunity.`;

  return {
    overallContributionScore,
    topicCoverageScore,
    isTargetMode: hasTargetKeywords,
    targetKeywordsCount: cleanTargetKeywords.length,
    sections,
    heatmap,
    strongestSection,
    weakestSection,
    summary,
  };
}
